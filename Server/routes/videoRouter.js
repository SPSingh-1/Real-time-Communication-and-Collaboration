// backend/routes/videoRouter.js
import express from 'express';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

const router = express.Router();

let CLIENT_ID;
let CLIENT_SECRET;
let REDIRECT_URI;
let SCOPES;

let JITSI_APP_ID;
let JITSI_KID;
let JITSI_PRIVATE_KEY; // This now directly holds the string content of the private key
let JITSI_DOMAIN; // Added this to store the Jitsi Domain if passed

let oauth2Client;
let currentUserTokens = null;

// Function to initialize router with necessary credentials
export const initVideoRouter = (config) => {
    CLIENT_ID = config.CLIENT_ID;
    CLIENT_SECRET = config.CLIENT_SECRET;
    REDIRECT_URI = config.REDIRECT_URI;
    SCOPES = config.SCOPES;

    JITSI_APP_ID = config.JITSI_APP_ID;
    JITSI_KID = config.JITSI_KID;
    JITSI_PRIVATE_KEY = config.JITSI_PRIVATE_KEY; // Store the key content
    JITSI_DOMAIN = config.JITSI_DOMAIN; // Store the domain

    console.log('Video Router: Jitsi configuration received for JWT generation.');
    console.log(`Video Router Init - Jitsi App ID: ${JITSI_APP_ID}`);
    console.log(`Video Router Init - Jitsi Domain: ${JITSI_DOMAIN}`);
    console.log(`Video Router Init - Jitsi KID: ${JITSI_KID}`);
    console.log(`Video Router Init - Jitsi Private Key (first 10 chars): ${JITSI_PRIVATE_KEY ? JITSI_PRIVATE_KEY.substring(0, 10) + '...' : 'Not loaded'}`);


    // Only initialize OAuth2Client if credentials are provided
    if (CLIENT_ID && CLIENT_SECRET && REDIRECT_URI) {
        oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    } else {
        console.warn('Google OAuth credentials not fully configured. Google Meet features will be disabled.');
        oauth2Client = null; // Ensure it's null if not configured
    }
};

// --- 1. Endpoint to initiate Google OAuth login ---
router.get('/auth/google', (req, res) => {
    if (!oauth2Client) {
        return res.status(500).json({ error: 'Google OAuth client not initialized. Check server configuration (e.g., .env variables).' });
    }
    const authorizeUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES.join(' '),
        prompt: 'consent',
    });
    res.redirect(authorizeUrl);
});

// --- 2. Endpoint to handle Google OAuth callback ---
router.get('/oauth2callback', async (req, res) => {
    const { code } = req.query;
    try {
        if (!oauth2Client) {
            return res.status(500).send('Google OAuth client not initialized. Server misconfiguration or missing credentials.');
        }
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        currentUserTokens = tokens;
        console.log('Authentication successful! Tokens received.');
        res.redirect('http://localhost:5173/?auth_success=true');

    } catch (error) {
        console.error('Error during Google OAuth callback:', error.message);
        res.status(500).send('Google Authentication failed.');
    }
});

// --- Google Meet Specific Routes with Middleware ---
const googleMeetRouter = express.Router();

googleMeetRouter.use((req, res, next) => {
    if (!oauth2Client || !currentUserTokens) {
        return res.status(401).json({ error: 'Not authenticated with Google or OAuth client not initialized.' });
    }
    oauth2Client.setCredentials(currentUserTokens);
    next();
});

googleMeetRouter.post('/create-link', async (req, res) => {
    try {
        if (oauth2Client.isTokenExpired()) {
            await oauth2Client.refreshAccessToken();
            currentUserTokens = oauth2Client.credentials;
        }

        const meet = google.meet({ version: 'v2beta', auth: oauth2Client });
        const response = await meet.spaces.create({});
        const meetingUri = response.data.meetingUri;
        const spaceId = response.data.name;

        res.json({ meetLink: meetingUri, spaceId });

    } catch (error) {
        console.error('Error creating Google Meet space:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to create Google Meet link.' });
    }
});

googleMeetRouter.post('/schedule', async (req, res) => {
    const { summary, description, startTime, endTime, attendees } = req.body;

    try {
        if (oauth2Client.isTokenExpired()) {
            await oauth2Client.refreshAccessToken();
            currentUserTokens = oauth2Client.credentials;
        }

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const event = {
            summary: summary || 'New Team Meeting',
            description: description || 'Discussion on project updates.',
            start: {
                dateTime: startTime || new Date().toISOString(),
                timeZone: 'Asia/Kolkata',
            },
            end: {
                dateTime: endTime || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                timeZone: 'Asia/Kolkata',
            },
            attendees: attendees || [],
            conferenceData: {
                createRequest: {
                    requestId: `${Date.now()}-meet-request`,
                    conferenceSolutionKey: {
                        type: 'hangoutsMeet'
                    }
                }
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 30 },
                    { method: 'popup', minutes: 10 },
                ],
            },
        };

        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
            conferenceDataVersion: 1,
            sendUpdates: 'all'
        });

        const eventLink = response.data.htmlLink;
        const meetLink = response.data.conferenceData?.entryPoints?.[0]?.uri;

        res.json({ eventLink, meetLink });

    } catch (error) {
        console.error('Error scheduling Google Meet:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to schedule Google Meet with Calendar.' });
    }
});

router.use('/google-meet', googleMeetRouter);

// --- Jitsi Jaas JWT Generation Endpoint ---
router.post('/jitsi/generate-jwt', (req, res) => {
    const { room, userId, userName, userEmail, userAvatar, moderator } = req.body;

    if (!JITSI_APP_ID || !JITSI_PRIVATE_KEY || !JITSI_DOMAIN || !JITSI_KID) {
        console.error('Jitsi Jaas credentials missing in videoRouter for JWT generation. Check initVideoRouter call in server.js.');
        return res.status(500).json({ error: 'Jitsi Jaas credentials (App ID, Private Key, Domain, or Key ID) not fully configured on server.' });
    }

    // IMPORTANT: Ensure the 'room' variable is correctly trimmed or processed if it comes from user input.
    // Sometimes leading/trailing spaces can cause mismatches.
    const cleanRoomName = room ? String(room).trim() : '*';

    const payload = {
        aud: 'jitsi',
        iss: 'chat',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 7), // Token valid for 7 hours
        nbf: Math.floor(Date.now() / 1000) - 5, // Not before 5 seconds ago
        sub: JITSI_APP_ID,
        context: {
            features: {
                livestreaming: false,
                'outbound-call': false,
                'sip-outbound-call': false,
                transcription: false,
                recording: false,
                flip: false,
                lobby: true,
            },
            user: {
                'hidden-from-recorder': false,
                moderator: moderator || false,
                name: userName || 'Guest User',
                id: userId || `guest-${Date.now()}`,
                avatar: userAvatar || '',
                email: userEmail || 'guest@example.com',
            },
        },
        room: cleanRoomName, // Use the cleaned room name here
    };

    // Corrected JWT signing block
    try {
        const token = jwt.sign(payload, JITSI_PRIVATE_KEY, {
            algorithm: 'RS256',
            header: {
                kid: JITSI_KID, // Use the JITSI_KID from initVideoRouter
                typ: 'JWT' // Explicitly add typ
            }
        });

        console.log('Video Router: Jitsi JWT generated successfully.');
        console.log("Video Router: Generated JWT Payload:", JSON.stringify(jwt.decode(token), null, 2));
        console.log('--- Generated Encoded JWT ---');
        console.log(token); // Log the encoded token here
        console.log('-----------------------------');

        res.json({ jwt: token });
    } catch (error) {
        console.error('Video Router: Error generating Jitsi JWT:', error.message);
        if (error.name === 'JsonWebTokenError') {
            console.error('Video Router: JWT Signing Error Details:', error);
        }
        res.status(500).json({ error: 'Failed to generate Jitsi JWT. Check backend private key configuration and JWT claims.' });
    }
});

export default router;