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

// --- NEW: Import the Video Router ---
// Corrected import: 'router' is a default export, 'initVideoRouter' is a named export
import videoRouter, { initVideoRouter } from './routes/videoRouter.js'; // Ensure .js extension for ES modules

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
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI; // Should be http://localhost:3001/oauth2callback

// --- Configuration for Jitsi Jaas (from .env and file) ---
const JITSI_APP_ID = process.env.JITSI_APP_ID;
const JITSI_KID = process.env.JITSI_KID;

// Read the Jitsi Private Key from a file
let JITSI_PRIVATE_KEY;
try {
    // Make sure 'private_key.pem' is in the same directory as server.js
    JITSI_PRIVATE_KEY = fs.readFileSync('./private_key.pem', 'utf8');
    console.log('Jitsi Private Key loaded from private_key.pem file successfully.');
} catch (error) {
    console.error('ERROR: Could not load Jitsi Private Key from private_key.pem.');
    console.error('Please ensure the "private_key.pem" file exists in the backend directory and contains your Jitsi private key.');
    console.error(error);
    JITSI_PRIVATE_KEY = null; // Set to null if loading fails
}


// Define the OAuth scopes your application needs
const GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/meetings.spaces.create', // To create new Meet spaces
    'https://www.googleapis.com/auth/meetings',               // For broader Meet API access (e.g., getting participants)
    'https://www.googleapis.com/auth/calendar.events',         // To create calendar events with Meet links
    'https://www.googleapis.com/auth/calendar',                // Broader calendar access
];

// Validate that Google environment variables are loaded
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    console.warn('WARNING: Missing Google API credentials in .env file. Google Meet features may not work.');
} else {
    // Initialize the video router with the loaded Google configuration
    initVideoRouter({
        CLIENT_ID: GOOGLE_CLIENT_ID,
        CLIENT_SECRET: GOOGLE_CLIENT_SECRET,
        REDIRECT_URI: GOOGLE_REDIRECT_URI,
        SCOPES: GOOGLE_SCOPES,
        // Also pass Jitsi Jaas credentials
        JITSI_APP_ID: JITSI_APP_ID,
        JITSI_KID: JITSI_KID,
        JITSI_PRIVATE_KEY: JITSI_PRIVATE_KEY // Pass the read key
    });
    console.log('Video Router initialized with Google and Jitsi configurations.');
}

// Validate Jitsi Jaas environment variables
if (!JITSI_APP_ID || !JITSI_KID || !JITSI_PRIVATE_KEY) {
    console.warn('WARNING: Missing Jitsi Jaas App ID, Key ID, or Private Key. Jitsi JWT authentication will not work.');
}


// --- Middleware ---
app.use(cors({
    origin: ['http://localhost:5173', 'https://the-real-time-intraction.netlify.app'], // Your frontend's actual origin
    credentials: true // Allow cookies/authorization headers to be sent
}));
app.use(express.json()); // Parses incoming requests with JSON payloads
app.use(express.urlencoded({ extended: true })); // Parses incoming requests with URL-encoded payloads

// --- Existing Routes ---
app.use('/upload', upload); // Handles chat file uploads (from './routes/upload.js')
app.use('/api/auth', authRoutes); // Ensure this path matches your auth frontend calls
app.use('/notifications', notificationRoutes);
app.use('/notes', noteRouter);
app.use('/attendees', attendeeRoutes);
app.use('/uploads', express.static('uploads')); // Serve static files from 'uploads' directory

// ✅ Mount General File Upload API
app.use('/collab_uploads', fileUploadRoutes);
app.use('/files', fileRoutes); // This is correct for listing/deleting general files

// Email Reminder Endpoint
app.post('/notify', async (req, res) => {
    const { email, events } = req.body;

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'yourgmail@gmail.com', // REMEMBER TO REPLACE THIS
            pass: 'your-app-password' // REMEMBER TO REPLACE THIS WITH AN APP PASSWORD
        }
    });

    const message = events.map((e, i) => `${i + 1}. ${e.title}`).join('\n');

    const mailOptions = {
        from: 'yourgmail@gmail.com',
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

// Events Route (needs io instance, make sure createEventRoutes can handle this)
app.use('/events', createEventRoutes(io));

// ✅ Socket.IO for messages
setupSocketHandlers(io);

// --- NEW: Mount the Task Router ---
app.use('/api/tasks', taskRouter); // This will handle all /api/tasks routes

// --- NEW: Mount the Video Conferencing Router ---
// All routes from VideoRouter.js will now be accessible under the /api prefix
// e.g., /api/auth/google, /api/google-meet/create-link, /api/jitsi/generate-jwt
app.use('/api', videoRouter);

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/realtime-collobration')
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB error:', err));

// Start server
const PORT = 3001; // Your specified backend port
server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`Frontend expected at http://localhost:5173`);
    console.log(`Google OAuth Client ID: ${GOOGLE_CLIENT_ID ? 'Loaded' : 'NOT LOADED - Check .env'}`);
    console.log(`Jitsi App ID: ${JITSI_APP_ID ? 'Loaded' : 'NOT LOADED - Check .env'}`);
});