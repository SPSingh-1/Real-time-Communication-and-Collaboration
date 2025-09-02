// backend/server.js
import dotenv from 'dotenv';

// Load environment variables FIRST before any other imports
dotenv.config();

// Validate critical environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;

if (!JWT_SECRET) {
    console.error('❌ CRITICAL ERROR: JWT_SECRET is not defined in your .env file.');
    console.error('Please add JWT_SECRET=your_secret_key to your .env file');
    process.exit(1);
}

if (!MONGODB_URI) {
    console.error('❌ CRITICAL ERROR: MONGODB_URI is not defined in your .env file.');
    process.exit(1);
}

console.log("✅ JWT_SECRET loaded successfully:", JWT_SECRET);
console.log("✅ Environment variables validated");

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import video router
import videoRouter, { initVideoRouter } from './routes/videoRouter.js';

// Import routes
import authRoutes from './routes/auth.js';
import createEventRoutes from './routes/events.js';
import notificationRoutes from './routes/notification.js';
import noteRouter from './routes/noteRouter.js';
import attendeeRoutes from './routes/attendeeRouter.js';
import setupSocketHandlers from './routes/messageRouter.js';
import uploadRouter from './routes/fileUpload.js';
import { fileRouter } from './routes/fileRoutes.js';
import taskRouter from './routes/taskRouter.js';
import chatUploadRouter from './routes/chatUpload.js'; // New chat upload route

// Middleware and Models
import './models/User.js';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ['http://localhost:5173', 'https://the-real-time-intraction.netlify.app'],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true,
    }
});

// Google API Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';

// Jitsi Configuration
const JITSI_APP_ID = process.env.JITSI_APP_ID;
const JITSI_KID = process.env.JITSI_KID;
const JITSI_DOMAIN = process.env.JITSI_DOMAIN;

// Read Jitsi Private Key
let JITSI_PRIVATE_KEY_CONTENT;
try {
    const privateKeyPath = process.env.JITSI_PRIVATE_KEY_PATH;
    if (!privateKeyPath) {
        throw new Error('JITSI_PRIVATE_KEY_PATH is not defined in your .env file.');
    }
    const resolvedPrivateKeyPath = path.resolve(__dirname, privateKeyPath);
    JITSI_PRIVATE_KEY_CONTENT = fs.readFileSync(resolvedPrivateKeyPath, 'utf8');
    console.log(`✅ Jitsi Private Key loaded successfully from ${resolvedPrivateKeyPath}.`);
} catch (error) {
    console.error('❌ CRITICAL ERROR: Could not load Jitsi Private Key.');
    console.error(`Please ensure the "private_key.pem" file exists at the specified path (${process.env.JITSI_PRIVATE_KEY_PATH}) relative to the server.js file, and it contains your Jitsi private key.`);
    console.error(error.message);
    process.exit(1);
}

// OAuth scopes
const GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/meetings.spaces.create',
    'https://www.googleapis.com/auth/meetings',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar',
];

// Initialize video router
initVideoRouter({
    CLIENT_ID: GOOGLE_CLIENT_ID,
    CLIENT_SECRET: GOOGLE_CLIENT_SECRET,
    REDIRECT_URI: GOOGLE_REDIRECT_URI,
    SCOPES: GOOGLE_SCOPES,
    JITSI_APP_ID: JITSI_APP_ID,
    JITSI_KID: JITSI_KID,
    JITSI_PRIVATE_KEY: JITSI_PRIVATE_KEY_CONTENT,
    JITSI_DOMAIN: JITSI_DOMAIN
});
console.log('✅ Video Router initialized with Google and Jitsi configurations.');

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'https://the-real-time-intraction.netlify.app'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Test endpoint to verify JWT_SECRET is accessible
app.get('/api/test/jwt', (req, res) => {
    res.json({
        jwtSecretLoaded: !!process.env.JWT_SECRET,
        timestamp: new Date().toISOString(),
        message: 'JWT Secret validation endpoint'
    });
});

app.use('/api/auth', authRoutes);
app.use('/notifications', notificationRoutes);
app.use('/notes', noteRouter);
app.use('/attendees', attendeeRoutes);

// File management routes
app.use('/collab_uploads', uploadRouter);  // For regular file uploads
app.use('/files', fileRouter);             // For regular file management
app.use('/api/chat', chatUploadRouter);    // For chat file uploads and management
app.use('/api/tasks', taskRouter);

// Email notification endpoint
app.post('/notify', async (req, res) => {
    const { email, events } = req.body;

    const GMAIL_USER = process.env.GMAIL_USER;
    const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
        console.error('❌ Email sending failed: GMAIL_USER or GMAIL_APP_PASSWORD not configured in .env');
        return res.status(500).json({ error: 'Email sender not configured.' });
    }

    const transporter = nodemailer.createTransporter({
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

// Event and message handling
app.use('/events', createEventRoutes(io));
setupSocketHandlers(io);

// Video conferencing routes
app.use('/api', videoRouter);

// MongoDB connection
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`🌐 Frontend expected at http://localhost:5173`);
    console.log(`🔐 JWT_SECRET: ${JWT_SECRET ? 'Loaded ✅' : 'NOT LOADED ❌'}`);
    console.log(`🔍 Google OAuth Client ID: ${GOOGLE_CLIENT_ID ? 'Loaded ✅' : 'NOT LOADED ❌ (commented out in .env?)'}`);
    console.log(`📹 Jitsi App ID: ${JITSI_APP_ID ? 'Loaded ✅' : 'NOT LOADED ❌ - Check .env'}`);
    console.log(`💬 Chat Upload Route: /api/chat/upload - Ready ✅`);
    console.log(`📁 Chat Files Route: /api/chat/files - Ready ✅`);
    console.log('===============================================');
});