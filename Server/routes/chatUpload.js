// routes/chatUpload.js - Chat File Upload Router
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import FileModel from '../models/File.js';
import fetchUser from '../middleware/fetchUser.js';

const router = express.Router();

// Multer configuration for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for chat uploads
    cb(null, true);
  }
});

// Middleware for multer error handling (5MB limit)
const handleChatMulterUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          success: false, 
          error: 'File size exceeds the 5MB limit. Please upload a file smaller than 5MB.' 
        });
      }
      return res.status(400).json({ success: false, error: err.message });
    } else if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next();
  });
};

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// POST /api/chat/upload - Upload file from chat
router.post('/upload', fetchUser, handleChatMulterUpload, async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log("💬 Chat file upload from:", {
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      teamId: req.user.teamId,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype
    });

    // Validate user data
    if (!req.user.id || !req.user.name) {
      console.log("❌ Missing user authentication data");
      return res.status(401).json({ error: 'User authentication failed' });
    }

    // Check file size
    if (file.size > 50 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds 50MB limit' });
    }

    // Upload to Cloudinary with chat_uploads folder
    console.log("☁️ Uploading to Cloudinary...");
    const base64String = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const isImage = file.mimetype.startsWith('image/');
    const isDoc = file.mimetype.includes('pdf') || file.mimetype.includes('msword') || file.mimetype.includes('officedocument') || file.originalname.match(/\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt)$/i);
    
    const uploadOptions = {
      folder: 'chat_uploads',
      resource_type: isDoc ? 'raw' : (isImage ? 'image' : 'auto'),
      public_id: `chat_${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9]/g, '_')}`,
    };

    if (isImage) {
      uploadOptions.transformation = [
        { width: 1200, crop: 'limit' },
        { quality: 'auto:good' }
      ];
    }
    
    const cloudinaryResult = await cloudinary.uploader.upload(base64String, uploadOptions);

    console.log("✅ Cloudinary upload successful:", cloudinaryResult.secure_url);

    // Determine file type
    let type = 'other';
    const mimeType = file.mimetype.toLowerCase();
    
    if (mimeType.startsWith('image/')) {
      type = 'image';
    } else if (mimeType.startsWith('video/')) {
      type = 'video';
    } else if (mimeType.startsWith('audio/')) {
      type = 'audio';
    } else if (
      mimeType.includes('pdf') || 
      mimeType.includes('msword') || 
      mimeType.includes('officedocument') ||
      mimeType.includes('text/') ||
      file.originalname.match(/\.(doc|docx|pdf|txt|rtf)$/i)
    ) {
      type = 'document';
    } else if (
      mimeType.includes('javascript') ||
      mimeType.includes('json') ||
      mimeType.includes('html') ||
      mimeType.includes('css') ||
      file.originalname.match(/\.(js|jsx|ts|tsx|py|java|c|cpp|php|sql|html|css|json)$/i)
    ) {
      type = 'code';
    }

    // Determine scope based on user role
    let scope = 'single';
    let teamId = null;

    if (req.user.role === 'team') {
      scope = 'team';
      teamId = req.user.teamId;
    } else if (req.user.role === 'global') {
      scope = 'global';
    }

    const isFromMeeting = req.body.isFromMeeting === 'true' || req.body.isFromMeeting === true;
    const meetingRoom = req.body.meetingRoom || null;
    const meetingHost = req.body.meetingHost || null;

    console.log("📊 File metadata:", {
      type,
      scope,
      teamId,
      isFromChat: !isFromMeeting,
      isFromMeeting,
      meetingRoom,
      meetingHost
    });

    // Save to MongoDB
    const newChatFile = new FileModel({
      fileUrl: cloudinaryResult.secure_url,
      filename: file.originalname,
      type,
      uploadedBy: req.user.name,
      uploadedById: req.user.id,
      scope,
      teamId,
      isFromChat: !isFromMeeting, // If from meeting, mark accordingly
      isFromMeeting,
      meetingRoom,
      meetingHost,
      meetingHostId: req.user.id,
      size: file.size,
      mimetype: file.mimetype,
      cloudinaryPublicId: cloudinaryResult.public_id,
    });

    const savedFile = await newChatFile.save();
    
    console.log(`✅ File saved: ${savedFile.filename} by ${req.user.name} (${scope} scope) [Meeting: ${isFromMeeting}]`);

    // Return the saved file data
    res.status(200).json({
      _id: savedFile._id,
      fileUrl: savedFile.fileUrl,
      filename: savedFile.filename,
      type: savedFile.type,
      uploadedBy: savedFile.uploadedBy,
      uploadedById: savedFile.uploadedById,
      scope: savedFile.scope,
      teamId: savedFile.teamId,
      isFromChat: savedFile.isFromChat,
      isFromMeeting: savedFile.isFromMeeting,
      meetingRoom: savedFile.meetingRoom,
      meetingHost: savedFile.meetingHost,
      size: savedFile.size,
      mimetype: savedFile.mimetype,
      createdAt: savedFile.createdAt,
      message: 'File uploaded successfully'
    });

  } catch (err) {
    console.error('❌ File upload error:', err);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 50MB limit' });
    }
    
    if (err.http_code === 400 && err.message.includes('Invalid')) {
      return res.status(400).json({ error: 'Invalid file format or corrupted file' });
    }

    if (err.error && err.error.message) {
      return res.status(500).json({ 
        error: 'File storage error', 
        details: 'Failed to store file in cloud storage' 
      });
    }

    res.status(500).json({ 
      error: 'File upload failed', 
      details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// GET /api/chat/files - Get chat files based on user role
router.get('/files', fetchUser, async (req, res) => {
  try {
    let filter = { isFromChat: true }; // Only chat files

    if (req.user.role === 'single') {
      filter.uploadedById = req.user.id;
      filter.scope = 'single';
    } else if (req.user.role === 'team') {
      if (!req.user.teamId) {
        return res.status(400).json({ error: 'Team ID required for team role' });
      }
      filter.teamId = req.user.teamId;
      filter.scope = 'team';
    } else if (req.user.role === 'global') {
      filter.scope = 'global';
    } else {
      return res.status(400).json({ error: 'Invalid user role' });
    }

    const chatFiles = await FileModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(chatFiles);

  } catch (err) {
    console.error('❌ Fetch chat files error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch chat files', 
      details: err.message 
    });
  }
});

// GET /api/chat/meeting-files - Get meeting-uploaded files with meeting & host metadata
router.get('/meeting-files', fetchUser, async (req, res) => {
  try {
    let filter = { isFromMeeting: true };

    if (req.user.role === 'single') {
      filter.uploadedById = req.user.id;
      filter.scope = 'single';
    } else if (req.user.role === 'team') {
      if (!req.user.teamId) {
        return res.status(400).json({ error: 'Team ID required for team role' });
      }
      filter.teamId = req.user.teamId;
      filter.scope = 'team';
    } else if (req.user.role === 'global') {
      filter.scope = 'global';
    } else {
      return res.status(400).json({ error: 'Invalid user role' });
    }

    const meetingFiles = await FileModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(meetingFiles);

  } catch (err) {
    console.error('❌ Fetch meeting files error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch meeting files', 
      details: err.message 
    });
  }
});

// DELETE /api/chat/files/:id - Delete a chat file
router.delete('/files/:id', fetchUser, async (req, res) => {
  try {
    const fileId = req.params.id;
    
    console.log(`🗑️ Chat file delete request: ${fileId} from user ${req.user.id}`);

    const file = await FileModel.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: 'Chat file not found' });
    }

    // Ensure this is a chat file
    if (!file.isFromChat) {
      return res.status(400).json({ 
        message: 'This is not a chat file. Use /files/:id endpoint instead.' 
      });
    }

    // Authorization check
    let isAuthorized = false;

    if (req.user.role === 'single') {
      isAuthorized = file.scope === 'single' && file.uploadedById.toString() === req.user.id;
    } else if (req.user.role === 'team') {
      isAuthorized = file.scope === 'team' && file.teamId?.toString() === req.user.teamId;
    } else if (req.user.role === 'global') {
      isAuthorized = file.scope === 'global';
    }

    if (!isAuthorized) {
      return res.status(403).json({ 
        message: 'Not authorized to delete this chat file',
        userRole: req.user.role,
        fileScope: file.scope
      });
    }

    // Delete from Cloudinary
    if (file.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(file.cloudinaryPublicId, { 
          resource_type: 'auto' 
        });
        console.log(`☁️ Cloudinary chat file deleted: ${file.cloudinaryPublicId}`);
      } catch (cloudinaryErr) {
        console.error(`Cloudinary deletion failed:`, cloudinaryErr);
        // Continue with MongoDB deletion even if Cloudinary fails
      }
    }

    // Delete from MongoDB
    await FileModel.findByIdAndDelete(fileId);
    console.log(`✅ Chat file ${fileId} deleted from MongoDB`);

    res.status(200).json({ message: 'Chat file deleted successfully' });

  } catch (err) {
    console.error('❌ Chat file delete error:', err);
    res.status(500).json({ 
      error: 'Failed to delete chat file', 
      details: err.message 
    });
  }
});

import axios from 'axios';

// GET /api/chat/view/:id - Stream chat file directly to browser for preview
router.get('/view/:id', async (req, res) => {
  try {
    const file = await FileModel.findById(req.params.id);
    if (!file) return res.status(404).send('File not found');

    let streamUrl = file.fileUrl;
    if (streamUrl.includes('res.cloudinary.com')) {
      if (streamUrl.includes('/image/upload/')) {
        streamUrl = streamUrl.replace('/image/upload/', '/image/upload/fl_attachment/');
      } else if (streamUrl.includes('/raw/upload/')) {
        streamUrl = streamUrl.replace('/raw/upload/', '/raw/upload/fl_attachment/');
      }
    }

    const response = await axios.get(streamUrl, { responseType: 'stream' });
    res.setHeader('Content-Type', file.mimetype || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.filename)}"`);
    response.data.pipe(res);
  } catch (err) {
    console.error('❌ Direct chat file stream error:', err.message);
    const file = await FileModel.findById(req.params.id);
    if (file && file.fileUrl) {
      res.redirect(file.fileUrl);
    } else {
      res.status(500).send('Unable to load file preview');
    }
  }
});

// GET /api/chat/download/:id - Direct download with correct filename
router.get('/download/:id', async (req, res) => {
  try {
    const file = await FileModel.findById(req.params.id);
    if (!file) return res.status(404).send('File not found');

    let streamUrl = file.fileUrl;
    if (streamUrl.includes('res.cloudinary.com')) {
      if (streamUrl.includes('/image/upload/')) {
        streamUrl = streamUrl.replace('/image/upload/', '/image/upload/fl_attachment/');
      } else if (streamUrl.includes('/raw/upload/')) {
        streamUrl = streamUrl.replace('/raw/upload/', '/raw/upload/fl_attachment/');
      }
    }

    const response = await axios.get(streamUrl, { responseType: 'stream' });
    res.setHeader('Content-Type', file.mimetype || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.filename)}"`);
    response.data.pipe(res);
  } catch (err) {
    console.error('❌ Direct chat file download error:', err.message);
    const file = await FileModel.findById(req.params.id);
    if (file && file.fileUrl) {
      res.redirect(file.fileUrl);
    } else {
      res.status(500).send('Unable to download file');
    }
  }
});

export default router;