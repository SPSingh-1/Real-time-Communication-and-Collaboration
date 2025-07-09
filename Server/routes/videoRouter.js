// backend/VideoRouter.js
import express from 'express'; // Use import for ES modules
import { google } from 'googleapis'; // Use import for ES modules
import { OAuth2Client } from 'google-auth-library'; // Use import for ES modules

const router = express.Router(); // Create an Express Router

// --- Configuration (from your Google Cloud Project & .env) ---
// These will be passed from server.js
let CLIENT_ID;
let CLIENT_SECRET;
let REDIRECT_URI;
let SCOPES;

// Initialize OAuth2Client (will be initialized when init function is called)
let oauth2Client;
let currentUserTokens = null; // In a real app, manage this per user session/DB

// Function to initialize router with necessary credentials
export const initVideoRouter = (config) => { // Export initVideoRouter as a named export
    CLIENT_ID = config.CLIENT_ID;
    CLIENT_SECRET = config.CLIENT_SECRET;
    REDIRECT_URI = config.REDIRECT_URI;
    SCOPES = config.SCOPES;

    oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
};


// --- 1. Endpoint to initiate Google OAuth login ---
router.get('/auth/google', (req, res) => {
    if (!oauth2Client) {
        return res.status(500).json({ error: 'OAuth client not initialized. Server misconfiguration.' });
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
            return res.status(500).send('OAuth client not initialized. Server misconfiguration.');
        }
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        currentUserTokens = tokens; // Store for the current session (replace with database in production)

        console.log('Authentication successful! Tokens:', tokens);
        // Redirect back to your frontend application
        // Assuming your frontend is at http://localhost:5173
        res.redirect('http://localhost:5173/?auth_success=true');

    } catch (error) {
        console.error('Error during authentication:', error.message);
        res.status(500).send('Authentication failed.');
    }
});

// --- Middleware to check if user is authenticated for API calls ---
// This middleware should be applied to routes that require authentication
router.use((req, res, next) => {
    if (!currentUserTokens) {
        // In a production app, you'd check a session, JWT, or database for user's tokens
        return res.status(401).json({ error: 'Not authenticated. Please log in with Google.' });
    }
    oauth2Client.setCredentials(currentUserTokens);
    next();
});

// --- 3. Endpoint to Create a Google Meet Meeting ---
router.post('/create-meet-link', async (req, res) => {
    try {
        if (!oauth2Client) {
            return res.status(500).json({ error: 'OAuth client not initialized.' });
        }
        // Re-authenticate if access token is expired using refresh token
        if (oauth2Client.isTokenExpired()) {
            await oauth2Client.refreshAccessToken();
            currentUserTokens = oauth2Client.credentials; // Update stored tokens
        }

        const meet = google.meet({ version: 'v2beta', auth: oauth2Client });

        const response = await meet.spaces.create({});

        const meetingUri = response.data.meetingUri;
        const spaceId = response.data.name;

        res.json({ meetLink: meetingUri, spaceId });

    } catch (error) {
        console.error('Error creating Meet space:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to create Meet link.' });
    }
});

// --- Optional: Endpoint to Create a Google Calendar Event with Meet Link ---
router.post('/schedule-meet', async (req, res) => {
    const { summary, description, startTime, endTime, attendees } = req.body;

    try {
        if (!oauth2Client) {
            return res.status(500).json({ error: 'OAuth client not initialized.' });
        }
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
        console.error('Error scheduling Meet:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to schedule Meet with Calendar.' });
    }
});

export default router; // Export the router as the default export
