// backend/server.js
import dns from 'dns';
import dotenv from 'dotenv';

// Resolve MongoDB Atlas SRV DNS query issues on Windows/Node.js
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
    if (dns.setDefaultResultOrder) {
        dns.setDefaultResultOrder('ipv4first');
    }
} catch (e) {
    console.warn('DNS server override warning:', e.message);
}

// Load environment variables FIRST before any other imports
dotenv.config();

console.log('JWT_SECRET available:', !!process.env.JWT_SECRET);
console.log('JWT_SECRET value check:', process.env.JWT_SECRET?.substring(0, 10) + '...');

// Validate critical environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_change_in_production_123456';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/realtime_collab';

if (!process.env.JWT_SECRET) {
    console.warn('⚠️  WARNING: JWT_SECRET not found in .env. Using development fallback secret.');
}

if (!process.env.MONGODB_URI) {
    console.warn('⚠️  WARNING: MONGODB_URI not found in .env. Using default mongodb://127.0.0.1:27017/realtime_collab');
}

console.log("✅ Environment configuration loaded");

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
// Import audio router
import audioRouter, { initaudioRouter } from './routes/audioRouter.js';

// Import routes
import authRoutes, { ensureSuperAdminAccount } from './routes/auth.js';
import teamRoutes from './routes/team.js';
import createEventRoutes from './routes/events.js';
import notificationRoutes from './routes/notification.js';
import noteRouter from './routes/noteRouter.js';
import attendeeRoutes from './routes/attendeeRouter.js';
import setupchatSocketHandlers from './routes/messageRouter.js';
import uploadRouter from './routes/fileUpload.js';
import { fileRouter } from './routes/fileRoutes.js';
import taskRouter from './routes/taskRouter.js';
import chatUploadRouter from './routes/chatUpload.js'; // New chat upload route
import userRouter from './routes/userRouter.js';
import figmaAuthRoutes from './routes/figmaAuth.js';
import figmaFilesRoutes from './routes/figmaFiles.js';
import dashboardRoutes from "./routes/dashboard.js";
import reportsRoutes from './routes/reports.js';
import complaintsRoutes from './routes/complaints.js';
import personalChatRoutes from './routes/personalChat.js';
import { setupPersonalChatSocketHandlers } from './routes/personalMessageRouter.js';
import { setupWebRTCSignaling } from './routes/webrtcSignaling.js';
import adminRouter from './routes/adminRouter.js';
import planRoutes from './routes/planRoutes.js';
import { createScheduledMeetingRoutes, startScheduledMeetingWorker } from './routes/scheduledMeetingRoutes.js';
import teamCrmRoutes from './routes/teamCrmRoutes.js';


// Middleware and Models
import './models/User.js';

const app = express();
const server = http.createServer(app);

// --- UPDATED CORS CONFIGURATION FOR SOCKET.IO ---
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:5173', 'https://the-real-time-intraction.netlify.app', 'https://milapp-frontend.onrender.com'],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true,
    }
});

// ✅ Make io globally accessible so route handlers can emit events
global.io = io;

// Google API Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';

// Jitsi Configuration
const JITSI_APP_ID = process.env.JITSI_APP_ID;
const JITSI_KID = process.env.JITSI_KID;
const JITSI_DOMAIN = process.env.JITSI_DOMAIN;

// Figma Configuration
const FIGMA_CLIENT_ID = process.env.FIGMA_CLIENT_ID;
const FIGMA_CLIENT_SECRET = process.env.FIGMA_CLIENT_SECRET;
const FIGMA_REDIRECT_URI = process.env.FIGMA_REDIRECT_URI;

if (!FIGMA_CLIENT_ID || !FIGMA_CLIENT_SECRET || !FIGMA_REDIRECT_URI) {
    console.warn('⚠️  WARNING: Figma credentials not found in .env file.');
    console.warn('Figma integration will not work. Required variables:');
    console.warn('- FIGMA_CLIENT_ID');
    console.warn('- FIGMA_CLIENT_SECRET');
    console.warn('- FIGMA_REDIRECT_URI');
} else {
    console.log("✅ Figma credentials loaded successfully");
}

// Read Jitsi Private Key
const rawPrivateKey = process.env.JITSI_PRIVATE_KEY;
const privateKey = rawPrivateKey ? rawPrivateKey.replace(/\\n/g, '\n').trim() : null;
if (!privateKey) {
    console.warn('⚠️  WARNING: JITSI_PRIVATE_KEY is not defined in your .env. Jitsi video calls will be disabled.');
} else {
    // Initialize video router
    initVideoRouter({
        JITSI_APP_ID: JITSI_APP_ID,
        JITSI_KID: JITSI_KID,
        JITSI_PRIVATE_KEY: privateKey,
        JITSI_DOMAIN: JITSI_DOMAIN
    });
    console.log('✅ Video Router initialized with Jitsi configurations.');

    // Initialize audio router
    initaudioRouter({
        JITSI_APP_ID: JITSI_APP_ID,
        JITSI_KID: JITSI_KID,
        JITSI_PRIVATE_KEY: privateKey,
        JITSI_DOMAIN: JITSI_DOMAIN
    });
    console.log('✅ Audio Router initialized with Jitsi configurations.');
}


// --- UPDATED CORS CONFIGURATION FOR EXPRESS ---
app.use(cors({
    origin: ['http://localhost:5173', 'https://the-real-time-intraction.netlify.app', 'https://milapp-frontend.onrender.com'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
app.use('/api/team', teamRoutes);  // ✅ Team invite + approval system
app.use('/notifications', notificationRoutes);
app.use('/notes', noteRouter);
app.use('/attendees', attendeeRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRouter);
app.use("/api/plans", planRoutes);

// File management routes
app.use('/collab_uploads', uploadRouter);  // For regular file uploads
app.use('/files', fileRouter);             // For regular file management
app.use('/api/chat', chatUploadRouter);    // For chat file uploads and management
app.use('/api/tasks', taskRouter);
app.use('/userRouter', userRouter);
app.use('/api/reports', reportsRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/personal-chat', personalChatRoutes);
setupPersonalChatSocketHandlers(io);

setupchatSocketHandlers(io);
setupWebRTCSignaling(io);

// Scheduled meetings routes & background auto-caller
const scheduledMeetingRouter = createScheduledMeetingRoutes(io);
app.use('/api/scheduled-meetings', scheduledMeetingRouter);
app.use('/scheduled-meetings', scheduledMeetingRouter);
startScheduledMeetingWorker(io);

// Figma integration routes
app.use('/api/auth', figmaAuthRoutes);
console.log(`🎨 Figma Routes: /api/auth/figma/* - Ready ✅`);
app.use('/api/figma', figmaFilesRoutes);
console.log(`🎨 Figma Integration: ${FIGMA_CLIENT_ID ? 'Ready ✅' : 'Not Configured ❌'}`);
console.log(`🔗 Figma Callback: ${FIGMA_REDIRECT_URI || 'NOT SET'}`);

// Dynamic Team CRM & Client Portal routes
app.use('/api/team-crm', teamCrmRoutes);
console.log(`💼 Team CRM Routes: /api/team-crm/* - Ready ✅`);

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

// Video conferencing routes
app.use('/api', videoRouter);

// audio conferencing routes
app.use('/api', audioRouter);

// MongoDB connection
mongoose.connect(MONGODB_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB');
        await ensureSuperAdminAccount();
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        console.warn('⚠️  Please ensure MongoDB is running locally or set MONGODB_URI in Server/.env to your MongoDB Atlas connection string.');
    });

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
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
