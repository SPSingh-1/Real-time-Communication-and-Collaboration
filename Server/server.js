// backend/server.js
import dotenv from 'dotenv'; // Using ES module import syntax
dotenv.config(); // This line should be at the very top to load .env variables first

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import fs from 'fs'; // Import fs module for reading files
import path from 'path'; // Import path module for resolving file paths
import { fileURLToPath } from 'url'; // For __dirname equivalent in ES modules


// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- NEW: Import the Video Router ---
import videoRouter, { initVideoRouter } from './routes/videoRouter.js';

// Routes (existing)
import authRoutes from './routes/auth.js';
import createEventRoutes from './routes/events.js';
import notificationRoutes from './routes/notification.js';
import noteRouter from './routes/noteRouter.js';
import upload from './routes/upload.js';
import attendeeRoutes from './routes/attendeeRouter.js';
import setupSocketHandlers from './routes/messageRouter.js';
import fileUploadRoutes from './routes/fileUpload.js';
import fileRoutes from './routes/fileRoutes.js';
import taskRouter from './routes/taskRouter.js';

// Middleware and Models
import './models/User.js'; // Ensure your models are loaded

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ['http://localhost:5173', 'https://the-real-time-intraction.netlify.app'], // Your frontend origin
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true, // Allow cookies/authorization headers
    }
});

// --- Configuration for Google API (from .env) ---
// Use default empty strings if not provided, for cleaner conditional checks
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';

// --- Configuration for Jitsi Jaas (from .env and file) ---
const JITSI_APP_ID = process.env.JITSI_APP_ID;
const JITSI_KID = process.env.JITSI_KID;
const JITSI_DOMAIN = process.env.JITSI_DOMAIN; // Added JITSI_DOMAIN

// Read the Jitsi Private Key from a file
let JITSI_PRIVATE_KEY_CONTENT; // Renamed to avoid confusion with path
try {
    const privateKeyPath = process.env.JITSI_PRIVATE_KEY_PATH;
    if (!privateKeyPath) {
        throw new Error('JITSI_PRIVATE_KEY_PATH is not defined in your .env file.');
    }
    // Resolve the path correctly. Assumes private_key.pem is in the same directory as server.js
    const resolvedPrivateKeyPath = path.resolve(__dirname, privateKeyPath);
    JITSI_PRIVATE_KEY_CONTENT = fs.readFileSync(resolvedPrivateKeyPath, 'utf8');
    console.log(`Jitsi Private Key loaded successfully from ${resolvedPrivateKeyPath}.`);
} catch (error) {
    console.error('CRITICAL ERROR: Could not load Jitsi Private Key.');
    console.error(`Please ensure the "private_key.pem" file exists at the specified path (${process.env.JITSI_PRIVATE_KEY_PATH}) relative to the server.js file, and it contains your Jitsi private key.`);
    console.error(error.message);
    // It's critical for Jitsi JWT generation, so we should exit or disable related features.
    process.exit(1); // Exit if private key is not found
}


// Define the OAuth scopes your application needs
const GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/meetings.spaces.create',
    'https://www.googleapis.com/auth/meetings',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar',
];

// Initialize the video router with the loaded Google and Jitsi configuration
// This must happen after all necessary env variables and the private key are loaded
initVideoRouter({
    CLIENT_ID: GOOGLE_CLIENT_ID,
    CLIENT_SECRET: GOOGLE_CLIENT_SECRET,
    REDIRECT_URI: GOOGLE_REDIRECT_URI,
    SCOPES: GOOGLE_SCOPES,
    // Pass Jitsi Jaas credentials and the loaded private key content
    JITSI_APP_ID: JITSI_APP_ID,
    JITSI_KID: JITSI_KID,
    JITSI_PRIVATE_KEY: JITSI_PRIVATE_KEY_CONTENT, // Pass the read key content
    JITSI_DOMAIN: JITSI_DOMAIN // Pass the domain
});
console.log('Video Router initialized with Google and Jitsi configurations.');


// --- Middleware ---
app.use(cors({
    origin: ['http://localhost:5173', 'https://the-real-time-intraction.netlify.app'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Existing Routes ---
app.get('/', (req, res) => {
    res.send('API is running...');
});
app.use('/upload', upload);
app.use('/api/auth', authRoutes);
app.use('/notifications', notificationRoutes);
app.use('/notes', noteRouter);
app.use('/attendees', attendeeRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Use path.join for static serving

app.use('/collab_uploads', fileUploadRoutes);
app.use('/files', fileRoutes);
app.use('/api/tasks', taskRouter);

// Email Reminder Endpoint
// IMPORTANT: REMOVE OR CONFIGURE GMAIL_USER and GMAIL_APP_PASSWORD IN .env
app.post('/notify', async (req, res) => {
    const { email, events } = req.body;

    const GMAIL_USER = process.env.GMAIL_USER;
    const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
        console.error('Email sending failed: GMAIL_USER or GMAIL_APP_PASSWORD not configured in .env');
        return res.status(500).json({ error: 'Email sender not configured.' });
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: GMAIL_USER,
            pass: GMAIL_APP_PASSWORD
        }
    });

    const message = events.map((e, i) => `${i + 1}. ${e.title}`).join('\n');

    const mailOptions = {
        from: GMAIL_USER,
        to: email,
        subject: '📅 Event Reminder for Today',
        text: `You have the following event(s) today:\n\n${message}`
    };

    try {
        await transporter.sendMail(mailOptions);
        res.sendStatus(200);
    } catch (err) {
        console.error('❌ Email error:', err);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

app.use('/events', createEventRoutes(io));
setupSocketHandlers(io);

// --- NEW: Mount the Video Conferencing Router ---
app.use('/api', videoRouter);


// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('CRITICAL ERROR: MONGODB_URI is not defined in your .env file.');
    process.exit(1);
}
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1); // Exit process with failure
    });

// Start server
const PORT = process.env.PORT || 3001; // Use PORT from .env or default
server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`Frontend expected at http://localhost:5173`);
    console.log(`Google OAuth Client ID: ${GOOGLE_CLIENT_ID ? 'Loaded' : 'NOT LOADED (commented out in .env?)'}`);
    console.log(`Jitsi App ID: ${JITSI_APP_ID ? 'Loaded' : 'NOT LOADED - Check .env'}`);
});