// routes/fileUpload.js - Updated Regular File Upload Router with Enhanced Authentication
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import FileModel from '../models/File.js';
import fetchUser from '../middleware/fetchUser.js';

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// POST /collab_uploads - Upload regular file (not from chat) with enhanced debugging
router.post('/', fetchUser, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    console.log("📤 Regular upload request from user:", {
      id: req.user.id,
      name: req.user.name,
      role: req.user.role,
      teamId: req.user.teamId
    });

    console.log("🔍 File details:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    // Get authenticated user info
    const uploadedBy = req.user.name;
    const uploadedById = req.user.id;

    if (!uploadedBy || !uploadedById) {
      console.log("❌ Missing user authentication data");
      return res.status(401).json({ error: 'User authentication failed - missing user data' });
    }

    // Check file size
    if (file.size > 50 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds 50MB limit' });
    }

    console.log("☁️ Starting Cloudinary upload...");

    // Upload to Cloudinary
    const base64String = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(base64String, {
      folder: 'collab_uploads', // Different folder from chat uploads
      resource_type: 'auto',
      transformation: [{ width: 1200, crop: 'limit' }],
    });

    console.log("✅ Cloudinary upload successful:", result.secure_url);

    // Detect file type
    let type = file.mimetype;
    if (type.startsWith('image')) type = 'image';
    else if (type.startsWith('video')) type = 'video';
    else if (type.startsWith('audio')) type = 'audio';
    else if (type.includes('pdf') || type.includes('msword') || type.includes('officedocument'))
      type = 'document';
    else if (
      type.includes('javascript') ||
      type.includes('json') ||
      type.includes('html') ||
      type.includes('css') ||
      type.includes('python') ||
      file.originalname.match(/\.(js|jsx|ts|tsx|py|java|c|cpp|php|sql)$/)
    )
      type = 'code';
    else type = 'other';

    // Role-based scope determination
    let scope = 'single';
    let teamId = null;

    if (req.user.role === 'team') {
      scope = 'team';
      teamId = req.user.teamId || null;
    } else if (req.user.role === 'global') {
      scope = 'global';
    }

    console.log("📊 File metadata:", {
      type,
      scope,
      teamId,
      uploadedBy,
      uploadedById
    });

    // Save to MongoDB (regular file, not from chat)
    const newFile = new FileModel({
      fileUrl: result.secure_url,
      filename: file.originalname,
      type,
      uploadedBy,
      uploadedById,
      scope,
      teamId,
      isFromChat: false, // Explicitly mark as regular file
      size: file.size, // Store file size
      mimetype: file.mimetype, // Store mimetype
      cloudinaryPublicId: result.public_id, // Store Cloudinary public ID
    });

    const savedFile = await newFile.save();
    
    console.log(`✅ File saved to database: ${savedFile.filename} by ${uploadedBy} (${scope} scope, regular upload)`);
    
    res.json({
      ...savedFile.toObject(),
      message: 'File uploaded successfully'
    });

  } catch (err) {
    console.error('❌ Regular upload error:', err);
    console.error('❌ Full error details:', {
      message: err.message,
      stack: err.stack,
      response: err.response?.data
    });
    
    // Handle specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds limit' });
    }
    
    if (err.message.includes('Invalid image file')) {
      return res.status(400).json({ error: 'Invalid file format' });
    }

    if (err.message.includes('Cloudinary')) {
      return res.status(500).json({ error: 'File storage service error', details: 'Upload to cloud storage failed' });
    }

    res.status(500).json({ 
      error: 'Upload failed', 
      details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// GET /collab_uploads/recent - Get recent uploads
router.get('/recent', fetchUser, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    
    console.log("📊 Fetching recent uploads for user:", req.user);

    let filter = { isFromChat: { $ne: true } };

    // Role-based filtering
    if (req.user.role === 'single') {
      filter = { 
        ...filter,
        uploadedById: req.user.id, 
        scope: 'single' 
      };
    } else if (req.user.role === 'team') {
      filter = { 
        ...filter,
        teamId: req.user.teamId, 
        scope: 'team' 
      };
    } else if (req.user.role === 'global') {
      filter = { 
        ...filter,
        scope: 'global' 
      };
    }

    console.log("🔍 Recent files filter:", filter);

    const recentFiles = await FileModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('filename type fileUrl createdAt uploadedBy size');

    console.log(`✅ Found ${recentFiles.length} recent files`);
    res.json(recentFiles);

  } catch (err) {
    console.error('❌ Recent files error:', err);
    res.status(500).json({ error: 'Failed to fetch recent files' });
  }
});

// POST /collab_uploads/bulk - Bulk upload files
router.post('/bulk', fetchUser, upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    if (files.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 files allowed per bulk upload' });
    }

    console.log(`📤 Bulk upload: ${files.length} files from user ${req.user.name}`);

    const uploadedBy = req.user.name;
    const uploadedById = req.user.id;

    // Role-based scope
    let scope = 'single';
    let teamId = null;

    if (req.user.role === 'team') {
      scope = 'team';
      teamId = req.user.teamId;
    } else if (req.user.role === 'global') {
      scope = 'global';
    }

    console.log("📊 Bulk upload scope:", { scope, teamId });

    const uploadPromises = files.map(async (file, index) => {
      try {
        console.log(`🔍 Processing file ${index + 1}/${files.length}: ${file.originalname}`);

        // Check individual file size
        if (file.size > 50 * 1024 * 1024) {
          throw new Error(`File ${file.originalname} exceeds 50MB limit`);
        }

        const base64String = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        const result = await cloudinary.uploader.upload(base64String, {
          folder: 'collab_uploads',
          resource_type: 'auto',
          transformation: [{ width: 1200, crop: 'limit' }],
        });

        // Detect file type
        let type = file.mimetype;
        if (type.startsWith('image')) type = 'image';
        else if (type.startsWith('video')) type = 'video';
        else if (type.startsWith('audio')) type = 'audio';
        else if (type.includes('pdf') || type.includes('msword') || type.includes('officedocument'))
          type = 'document';
        else if (
          type.includes('javascript') ||
          type.includes('json') ||
          type.includes('html') ||
          type.includes('css') ||
          type.includes('python') ||
          file.originalname.match(/\.(js|jsx|ts|tsx|py|java|c|cpp|php|sql)$/)
        )
          type = 'code';
        else type = 'other';

        const newFile = new FileModel({
          fileUrl: result.secure_url,
          filename: file.originalname,
          type,
          uploadedBy,
          uploadedById,
          scope,
          teamId,
          isFromChat: false,
          size: file.size,
          mimetype: file.mimetype,
          cloudinaryPublicId: result.public_id,
        });

        const savedFile = await newFile.save();
        console.log(`✅ File ${index + 1} saved: ${savedFile.filename}`);
        
        return {
          ...savedFile.toObject(),
          success: true
        };

      } catch (error) {
        console.error(`❌ Error uploading ${file.originalname}:`, error);
        return { 
          filename: file.originalname, 
          error: error.message,
          success: false 
        };
      }
    });

    const results = await Promise.all(uploadPromises);
    
    const successful = results.filter(r => r.success !== false);
    const failed = results.filter(r => r.success === false);

    console.log(`📊 Bulk upload completed: ${successful.length} successful, ${failed.length} failed`);

    res.json({
      message: `Bulk upload completed: ${successful.length} successful, ${failed.length} failed`,
      successful,
      failed,
      totalUploaded: successful.length
    });

  } catch (err) {
    console.error('❌ Bulk upload error:', err);
    res.status(500).json({ error: 'Bulk upload failed', details: err.message });
  }
});

// GET /collab_uploads/test - Test endpoint for debugging regular uploads
router.get('/test', fetchUser, async (req, res) => {
  try {
    res.json({
      message: 'Regular upload endpoint authentication successful',
      user: {
        id: req.user.id,
        name: req.user.name,
        role: req.user.role,
        teamId: req.user.teamId
      },
      jwtSecretAvailable: !!process.env.JWT_SECRET,
      endpoint: '/collab_uploads',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Regular upload test endpoint error:', err);
    res.status(500).json({ error: 'Test failed', details: err.message });
  }
});

export default router;