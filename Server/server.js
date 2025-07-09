import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';

// Routes
import authRoutes from './routes/auth.js';
import createEventRoutes from './routes/events.js';
import notificationRoutes from './routes/notification.js';
import noteRouter from './routes/noteRouter.js';
import upload from './routes/upload.js'; // This is your chat upload route
import attendeeRoutes from './routes/attendeeRouter.js';
import setupSocketHandlers from './routes/messageRouter.js';
import fileUploadRoutes from './routes/fileUpload.js'; // This is your general file upload route
import fileRoutes from './routes/fileRoutes.js';
// Middleware and Models
import './models/User.js';

// --- NEW: Import the Task Router ---
import taskRouter from './routes/taskRouter.js'; // Adjust path if needed

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  }
});

// Apply middleware
app.use(cors());
app.use(express.json());

// --- Keep this for Chat Upload ---
app.use('/upload', upload); // Handles chat file uploads (from './routes/upload.js')

// Mount REST routes
app.use('/api/auth', authRoutes);
app.use('/notifications', notificationRoutes);
app.use('/notes', noteRouter);
app.use('/attendees', attendeeRoutes);
app.use('/uploads', express.static('uploads'));

// ✅ Mount Upload API
app.use('/collab_uploads', fileUploadRoutes); // Handles general file uploads (from './routes/fileUpload.js')
app.use('/files', fileRoutes); // This is correct for listing/deleting general files

// Email Reminder
app.post('/notify', async (req, res) => {
  const { email, events } = req.body;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'yourgmail@gmail.com',
      pass: 'your-app-password'
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

// Events Route (needs io instance)
app.use('/events', createEventRoutes(io));

// ✅ Socket.IO for messages
setupSocketHandlers(io);

// --- NEW: Mount the Task Router ---
app.use('/api/tasks', taskRouter); // This will handle all /api/tasks routes

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/realtime-collobration')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Start server
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
