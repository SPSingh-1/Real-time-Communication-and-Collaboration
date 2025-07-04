import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Routes
import authRoutes from './routes/auth.js';
import createEventRoutes from './routes/events.js';
import notificationRoutes from './routes/notification.js';
import noteRouter from './routes/noteRouter.js';
import attendeeRoutes from './routes/attendeeRouter.js';
import setupSocketHandlers from './routes/messageRouter.js'; // ✅ message router socket handler

// Middleware and Models
import fetchUser from './middleware/fetchUser.js';
import './models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount REST routes
app.use('/api/auth', authRoutes);
app.use('/notifications', notificationRoutes);
app.use('/notes', noteRouter);
app.use('/attendees', attendeeRoutes);

// File Upload
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

app.post('/upload', fetchUser, upload.single('file'), (req, res) => {
  const user = req.user.id;
  res.json({ fileUrl: `/uploads/${req.file.filename}`, uploadedBy: user });
});

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

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/realtime-collobration')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Start server
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
