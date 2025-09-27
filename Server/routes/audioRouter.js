// backend/routes/audioRouter.js
import express from 'express';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const router = express.Router();

let CLIENT_ID;
let CLIENT_SECRET;
let REDIRECT_URI;
let SCOPES;

let JITSI_APP_ID;
let JITSI_KID;
let JITSI_PRIVATE_KEY;
let JITSI_DOMAIN;

let oauth2Client;
let currentUserTokens = null;

// Schema for role-based active audio calls - matching video structure
const roleCallSchema = new mongoose.Schema({
    roomName: { type: String, required: true, unique: true },
    callTitle: { type: String, required: true },
    userRole: { type: String, required: true, enum: ['single', 'team', 'global'] },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    globalId: { type: String, default: null },
    // Email-based team member access control
    allowedEmails: [{ type: String }], // Array of allowed team member emails
    participants: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    callType: { type: String, default: 'audio' }, // Always audio
    createdAt: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now }
});

const RoleCall = mongoose.model('RoleCall', roleCallSchema);

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Function to initialize router with necessary credentials
export const initaudioRouter = (config) => {
    CLIENT_ID = config.CLIENT_ID;
    CLIENT_SECRET = config.CLIENT_SECRET;
    REDIRECT_URI = config.REDIRECT_URI;
    SCOPES = config.SCOPES;

    JITSI_APP_ID = config.JITSI_APP_ID;
    JITSI_KID = config.JITSI_KID;
    JITSI_PRIVATE_KEY = config.JITSI_PRIVATE_KEY;
    JITSI_DOMAIN = config.JITSI_DOMAIN;

    console.log('Audio Router: Jitsi configuration received for JWT generation.');
    console.log(`Audio Router Init - Jitsi App ID: ${JITSI_APP_ID}`);
    console.log(`Audio Router Init - Jitsi Domain: ${JITSI_DOMAIN}`);
    console.log(`Audio Router Init - Jitsi KID: ${JITSI_KID}`);
    console.log(`Audio Router Init - Jitsi Private Key (first 10 chars): ${JITSI_PRIVATE_KEY ? JITSI_PRIVATE_KEY.substring(0, 10) + '...' : 'Not loaded'}`);

    // Initialize OAuth2Client if credentials are provided
    if (CLIENT_ID && CLIENT_SECRET && REDIRECT_URI) {
        oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    } else {
        console.warn('Google OAuth credentials not fully configured. Google features will be disabled.');
        oauth2Client = null;
    }
};

// --- Test endpoint to verify database connection and authentication ---
router.get('/test', verifyToken, async (req, res) => {
    try {
        console.log('=== AUDIO ROUTER TEST ENDPOINT ===');
        console.log('User from token:', req.user);
        console.log('MongoDB connection state:', mongoose.connection.readyState);
        
        // Test database query
        const testCount = await RoleCall.countDocuments({});
        
        res.json({ 
            success: true,
            message: 'Audio router test successful',
            mongoState: mongoose.connection.readyState,
            totalCalls: testCount,
            user: req.user,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Audio router test failed:', error);
        res.status(500).json({ 
            error: 'Test failed', 
            details: error.message,
            mongoState: mongoose.connection.readyState
        });
    }
});

// --- Role-Based Audio Call Management Endpoints ---

// Create a new role-based audio call
router.post('/role-calls', verifyToken, async (req, res) => {
    try {
        // Check MongoDB connection first
        if (mongoose.connection.readyState !== 1) {
            console.error('MongoDB not connected. ReadyState:', mongoose.connection.readyState);
            return res.status(503).json({ 
                error: 'Database connection unavailable',
                message: 'Please try again in a moment'
            });
        }

        console.log('=== ROLE CALL REQUEST DEBUG ===');
        console.log('Request body:', req.body);
        console.log('User from token:', req.user);
        console.log('MongoDB connection state:', mongoose.connection.readyState);
        console.log('================================');
        
        const { roomName, callTitle, userRole, userId, userName, userEmail, teamId, globalId, allowedEmails } = req.body;

        // Validate required fields
        if (!roomName) {
            return res.status(400).json({ error: 'Room name is required' });
        }
        if (!callTitle) {
            return res.status(400).json({ error: 'Call title is required' });
        }
        if (!userRole) {
            return res.status(400).json({ error: 'User role is required' });
        }

        // If userId is missing from body, get it from token
        const finalUserId = userId || req.user.id || req.user._id || req.user.userId;
        const finalUserName = userName || req.user.name || req.user.username || 'Unknown User';
        const finalUserEmail = userEmail || req.user.email || 'unknown@example.com';
        
        if (!finalUserId) {
            console.error('No user ID found in request body or token:', { reqBody: req.body, reqUser: req.user });
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Validate email for team calls
        if (userRole === 'team' && !finalUserEmail) {
            return res.status(400).json({ error: 'Email is required for team calls' });
        }

        console.log('Final user data:', {
            finalUserId,
            finalUserName,
            finalUserEmail,
            userRole
        });

        // Check if call with same room name already exists (active or inactive)
        let existingCall = await RoleCall.findOne({ roomName });
        if (existingCall) {
            console.log('Found existing call:', existingCall);
            
            // If the call exists but is inactive, reactivate it
            if (!existingCall.isActive) {
                console.log('Reactivating inactive call');
                existingCall.isActive = true;
                existingCall.lastActivity = new Date();
                existingCall.participants = 1;
                
                // Update user info for reactivated call
                existingCall.userId = finalUserId;
                existingCall.userName = finalUserName;
                existingCall.userEmail = finalUserEmail;
                existingCall.userRole = userRole;
                existingCall.callTitle = callTitle;
                
                // Update team-specific fields
                if (userRole === 'team') {
                    existingCall.teamId = validatedTeamId;
                    existingCall.allowedEmails = allowedEmails || [];
                }
                if (userRole === 'global') {
                    existingCall.globalId = globalId || null;
                }
                
                await existingCall.save();
                console.log('Reactivated call:', existingCall);
                return res.json({ call: existingCall });
            }
            
            // If it's already active, check permissions for team calls
            if (existingCall.userRole === 'team' && userRole === 'team') {
                const isAllowed = existingCall.allowedEmails.includes(finalUserEmail) || 
                                existingCall.userEmail === finalUserEmail;
                
                if (!isAllowed) {
                    return res.status(403).json({ 
                        error: 'You are not authorized to join this team call. Only invited team members can join.' 
                    });
                }
            }

            // Update existing active call
            existingCall.lastActivity = new Date();
            existingCall.participants += 1;
            await existingCall.save();
            console.log('Updated existing call participants:', existingCall.participants);
            return res.json({ call: existingCall });
        }

        // Validate teamId for team calls (convert to ObjectId if needed)
        let validatedTeamId = null;
        if (userRole === 'team' && teamId && teamId !== 'null' && teamId !== 'undefined') {
            try {
                validatedTeamId = new mongoose.Types.ObjectId(teamId);
            } catch (teamIdError) {
                console.warn('Invalid teamId format, setting to null:', teamId);
                validatedTeamId = null;
            }
        }

        // Create new call
        const callData = {
            roomName,
            callTitle,
            userRole,
            userId: finalUserId,
            userName: finalUserName,
            userEmail: finalUserEmail,
            teamId: validatedTeamId,
            globalId: globalId || null,
            allowedEmails: allowedEmails || [],
            callType: 'audio'
        };

        console.log('Creating new call with data:', callData);
        
        const call = new RoleCall(callData);
        const savedCall = await call.save();
        
        console.log(`New ${userRole} audio call created successfully:`, savedCall);
        res.json({ call: savedCall });
    } catch (error) {
        console.error('Error creating role-based call - Full error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            code: error.code,
            requestBody: req.body,
            userFromToken: req.user
        });

        // Send more specific error messages
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: validationErrors,
                message: 'Please check the required fields'
            });
        }

        if (error.name === 'CastError') {
            return res.status(400).json({ 
                error: 'Invalid data format', 
                details: error.message 
            });
        }

        // Handle duplicate key error specifically
        if (error.name === 'MongoServerError' && error.code === 11000) {
            console.log('Duplicate key error - attempting to handle gracefully');
            try {
                // Find and return the existing call
                const existingCall = await RoleCall.findOne({ roomName });
                if (existingCall) {
                    // Reactivate if inactive, or update if active
                    if (!existingCall.isActive) {
                        existingCall.isActive = true;
                        existingCall.lastActivity = new Date();
                        existingCall.participants = 1;
                        await existingCall.save();
                    } else {
                        existingCall.lastActivity = new Date();
                        existingCall.participants += 1;
                        await existingCall.save();
                    }
                    return res.json({ call: existingCall });
                }
            } catch (recoveryError) {
                console.error('Failed to recover from duplicate key error:', recoveryError);
            }
            
            return res.status(409).json({ 
                error: 'Call room already exists', 
                message: 'A call with this name already exists. Please try joining the existing call or use a different name.'
            });
        }

        if (error.name === 'MongoError' || error.name === 'MongoServerError') {
            return res.status(503).json({ 
                error: 'Database error', 
                message: 'Please try again in a moment'
            });
        }

        res.status(500).json({ 
            error: 'Failed to create call',
            message: 'Internal server error occurred while creating the call',
            details: error.message
        });
    }
});

// Get active calls based on user role
router.get('/role-calls/:role', verifyToken, async (req, res) => {
    try {
        const { role } = req.params;
        const { userId, teamId, globalId, userEmail } = req.query;

        // Clean up old calls (inactive for more than 1 hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        await RoleCall.updateMany(
            { lastActivity: { $lt: oneHourAgo }, isActive: true },
            { isActive: false }
        );

        let query = { userRole: role, isActive: true, callType: 'audio' };
        
        // Apply role-based filtering
        switch (role) {
            case 'single': 
                query.userId = userId; 
                break;
            case 'team': 
                // For team calls, show calls where user is creator or invited
                query = {
                    userRole: 'team',
                    isActive: true,
                    callType: 'audio',
                    $or: [
                        { userEmail: userEmail }, // Calls created by user
                        { allowedEmails: userEmail } // Calls user is invited to
                    ]
                };
                break;
            case 'global': 
                query.globalId = globalId || 'Global123'; 
                break;
        }

        const calls = await RoleCall.find(query).sort({ createdAt: -1 });
        res.json({ calls });
    } catch (error) {
        console.error('Error fetching role-based calls:', error);
        res.status(500).json({ error: 'Failed to fetch calls' });
    }
});

// Endpoint to add team members to an existing call
router.post('/role-calls/:roomName/invite', verifyToken, async (req, res) => {
    try {
        const { roomName } = req.params;
        const { inviteEmails } = req.body; // Array of email addresses to invite
        
        const call = await RoleCall.findOne({ roomName, isActive: true, userRole: 'team' });
        if (!call) {
            return res.status(404).json({ error: 'Team call not found' });
        }

        // Check if the requester is the call creator or already allowed
        const requesterEmail = req.user.email || req.body.requesterEmail;
        const isAuthorized = call.userEmail === requesterEmail || 
                           call.allowedEmails.includes(requesterEmail);
        
        if (!isAuthorized) {
            return res.status(403).json({ error: 'Not authorized to invite members to this call' });
        }

        // Add new emails to allowed list (avoid duplicates)
        const newEmails = inviteEmails.filter(email => !call.allowedEmails.includes(email));
        call.allowedEmails.push(...newEmails);
        await call.save();

        console.log(`Team members invited to call ${roomName}:`, newEmails);
        res.json({ 
            success: true, 
            message: `${newEmails.length} team members invited`,
            allowedEmails: call.allowedEmails 
        });
    } catch (error) {
        console.error('Error inviting team members:', error);
        res.status(500).json({ error: 'Failed to invite team members' });
    }
});

// Endpoint to check if user can join a specific call
router.get('/role-calls/:roomName/access', verifyToken, async (req, res) => {
    try {
        const { roomName } = req.params;
        const { userEmail, userRole } = req.query;
        
        const call = await RoleCall.findOne({ roomName, isActive: true });
        if (!call) {
            return res.status(404).json({ error: 'Call not found' });
        }

        let canJoin = false;
        let reason = '';

        switch (call.userRole) {
            case 'single':
                canJoin = call.userId === req.user.id;
                reason = canJoin ? 'Access granted' : 'This is a private call';
                break;
            case 'team':
                canJoin = call.userEmail === userEmail || call.allowedEmails.includes(userEmail);
                reason = canJoin ? 'Access granted' : 'You are not invited to this team call';
                break;
            case 'global':
                canJoin = true;
                reason = 'Global call - open to all';
                break;
        }

        res.json({ 
            canJoin, 
            reason, 
            call: canJoin ? call : null 
        });
    } catch (error) {
        console.error('Error checking call access:', error);
        res.status(500).json({ error: 'Failed to check call access' });
    }
});

// End a role-based call
router.delete('/role-calls/:roomName', verifyToken, async (req, res) => {
    try {
        const { roomName } = req.params;
        const call = await RoleCall.findOne({ roomName, isActive: true });
        if (call) {
            call.isActive = false;
            await call.save();
            console.log(`Role-based call ended: ${roomName}`);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error ending role-based call:', error);
        res.status(500).json({ error: 'Failed to end call' });
    }
});

// Update call activity (heartbeat)
router.put('/role-calls/:roomName/heartbeat', verifyToken, async (req, res) => {
    try {
        const { roomName } = req.params;
        const call = await RoleCall.findOne({ roomName, isActive: true });
        if (call) {
            call.lastActivity = new Date();
            await call.save();
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating call activity:', error);
        res.status(500).json({ error: 'Failed to update call activity' });
    }
});

// --- Jitsi JWT Generation for AUDIO-ONLY Calls ---
router.post('/jitsi/generate-call-jwt', async (req, res) => {
    const timeout = setTimeout(() => {
        if (!res.headersSent) {
            res.status(408).json({ error: 'Request timeout - please try again' });
        }
    }, 8000); // 8 second timeout

    try {
        const { room, userId, userName, userEmail, userAvatar, moderator, userRole, teamId, globalId } = req.body;

        if (!JITSI_APP_ID || !JITSI_PRIVATE_KEY || !JITSI_DOMAIN || !JITSI_KID) {
            return res.status(500).json({ error: 'Jitsi call credentials not configured on server.' });
        }

        // Additional email verification for team calls
        if (userRole === 'team' && room) {
            try {
                const call = await RoleCall.findOne({ roomName: room, isActive: true });
                if (call && call.userRole === 'team') {
                    const isAllowed = call.userEmail === userEmail || call.allowedEmails.includes(userEmail);
                    if (!isAllowed) {
                        return res.status(403).json({ 
                            error: 'Access denied. You are not invited to this team call.' 
                        });
                    }
                }
            } catch (error) {
                console.error('Error verifying team access:', error);
            }
        }

        const cleanRoomName = room ? String(room).trim() : '*';

        const payload = {
            aud: 'jitsi',
            iss: 'chat',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 4), // 4 hours
            nbf: Math.floor(Date.now() / 1000) - 10,
            sub: JITSI_APP_ID,
            context: {
                // AUDIO-ONLY FEATURES - Disable all video-related functionality
                features: {
                    livestreaming: false,
                    'outbound-call': false,
                    'sip-outbound-call': false,
                    transcription: false,
                    recording: false,
                    'video-sharing': false,
                    'screen-sharing': false,
                    'tile-view': false,
                    camera: false,
                    'desktop-sharing': false,
                    'fullscreen': false,
                    hangup: true,
                    chat: true,
                    mute: true,
                    'audio-only': true,
                    'kick-out': moderator || false,
                    lobby: true,
                    // Additional video disable features
                    'video-mute': false, // Disable video mute toggle (keeps video off)
                    'camera-facing-mode': false
                },
                user: {
                    'hidden-from-recorder': false,
                    moderator: moderator || false,
                    name: userName || 'Guest User',
                    id: userId || `guest-${Date.now()}`,
                    avatar: userAvatar || '',
                    email: userEmail || 'guest@example.com'
                },
                // Add role context to JWT
                role: {
                    type: userRole || 'single',
                    teamId: teamId || null,
                    globalId: globalId || null
                }
            },
            room: cleanRoomName
        };

        try {
            const token = jwt.sign(payload, JITSI_PRIVATE_KEY, {
                algorithm: 'RS256',
                header: { kid: JITSI_KID, typ: 'JWT' }
            });
            
            clearTimeout(timeout);
            console.log(`Audio Router: Jitsi JWT generated successfully for ${userRole} user: ${userName}`);
            
            res.json({ 
                jwt: token,
                config: {
                    audioOnly: true,
                    videoDisabled: true,
                    startWithVideoMuted: true,
                    startWithAudioMuted: false
                }
            }); 
        } catch (error) {
            clearTimeout(timeout);
            if (!res.headersSent) {
                console.error('Error generating audio call JWT:', error.message);
                res.status(500).json({ error: 'Failed to generate audio call JWT.' });
            }
        }
    } catch (error) {
        clearTimeout(timeout);
        if (!res.headersSent) {
            console.error('Unexpected error generating audio call JWT:', error);
            res.status(500).json({ error: 'Unexpected server error.' });
        }
    }
});

export default router;