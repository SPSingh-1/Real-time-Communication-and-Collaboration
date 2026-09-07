// routes/fileRoutes.js - Updated File Router with Enhanced Debugging
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import FileModel from '../models/File.js';
import fetchUser from '../middleware/fetchUser.js';
import { v2 as cloudinary } from 'cloudinary';

const fileRouter = express.Router();

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// GET /files - Fetch regular files (non-chat) based on user role
fileRouter.get('/', fetchUser, async (req, res) => {
  try {
    console.log("🔍 Files request from user:", {
      id: req.user.id,
      role: req.user.role,
      teamId: req.user.teamId,
      name: req.user.name
    });

    let filter = { isFromChat: { $ne: true } }; // Exclude chat files

    // Role-based filtering
    if (req.user.role === 'single') {
      filter = { 
        ...filter,
        uploadedById: req.user.id, 
        scope: 'single' 
      };
    } else if (req.user.role === 'team') {
      if (!req.user.teamId) {
        console.log("❌ Team role but no teamId provided");
        return res.status(400).json({ error: 'Team ID required for team role' });
      }
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
    } else {
      console.log("❌ Invalid user role:", req.user.role);
      return res.status(400).json({ error: 'Invalid user role' });
    }

    console.log(`🔍 Fetching regular files with filter:`, filter);

    const files = await FileModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);

    console.log(`✅ Found ${files.length} regular files`);
    res.json(files);
    
  } catch (err) {
    console.error('❌ Fetch files error:', err);
    res.status(500).json({ error: 'Failed to fetch files', details: err.message });
  }
});

// DELETE /files/:id - Delete a regular file
fileRouter.delete('/:id', fetchUser, async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user.id;

    console.log(`🗑️ Delete request for file ${fileId} from user ${userId}`);

    const file = await FileModel.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: 'File not found.' });
    }

    console.log("🔍 File to delete:", {
      id: file._id,
      filename: file.filename,
      scope: file.scope,
      uploadedById: file.uploadedById,
      isFromChat: file.isFromChat
    });

    // Ensure this is not a chat file
    if (file.isFromChat) {
      return res.status(400).json({ 
        message: 'Cannot delete chat files through this endpoint. Use /api/chat/files/:id instead.' 
      });
    }

    // Authorization rules based on role and scope
    let isAuthorized = false;

    if (req.user.role === 'single') {
      isAuthorized = file.scope === 'single' && file.uploadedById.toString() === userId;
    } else if (req.user.role === 'team') {
      isAuthorized = file.scope === 'team' && file.teamId?.toString() === req.user.teamId;
    } else if (req.user.role === 'global') {
      isAuthorized = file.scope === 'global';
    }

    console.log("🔍 Authorization check:", {
      userRole: req.user.role,
      fileScope: file.scope,
      isAuthorized,
      userTeamId: req.user.teamId,
      fileTeamId: file.teamId?.toString()
    });

    if (!isAuthorized) {
      return res.status(403).json({ 
        message: 'Not authorized to delete this file.',
        userRole: req.user.role,
        fileScope: file.scope
      });
    }

    // Delete from Cloudinary
    const publicIdMatch = file.fileUrl.match(/\/upload\/(?:v\d+\/)?([^\/]+)\.[a-zA-Z0-9]+$/);
    if (publicIdMatch && publicIdMatch[1]) {
      const publicId = publicIdMatch[1];
      try {
        // For regular files, they're in collab_uploads folder
        await cloudinary.uploader.destroy(`collab_uploads/${publicId}`, { resource_type: 'auto' });
        console.log(`☁️ Cloudinary file collab_uploads/${publicId} deleted.`);
      } catch (cloudinaryErr) {
        console.error(`Cloudinary deletion failed for ${publicId}:`, cloudinaryErr);
      }
    }

    // Delete from MongoDB
    await FileModel.findByIdAndDelete(fileId);
    console.log(`✅ Regular file ${fileId} deleted from MongoDB.`);

    res.status(200).json({ message: 'File deleted successfully' });
    
  } catch (err) {
    console.error('❌ Delete failed:', err);
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

// GET /files/stats - Get file statistics
fileRouter.get('/stats', fetchUser, async (req, res) => {
  try {
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

    const stats = await FileModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalSize: { $sum: '$size' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const totalFiles = await FileModel.countDocuments(filter);
    
    res.json({
      totalFiles,
      byType: stats,
      scope: req.user.role
    });

  } catch (err) {
    console.error('❌ Stats error:', err);
    res.status(500).json({ error: 'Failed to get file statistics' });
  }
});

import axios from 'axios';

// GET /files/view/:id - Stream file directly to browser for preview
fileRouter.get('/view/:id', async (req, res) => {
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
    console.error('❌ Direct file stream error:', err.message);
    const file = await FileModel.findById(req.params.id);
    if (file && file.fileUrl) {
      res.redirect(file.fileUrl);
    } else {
      res.status(500).send('Unable to load file preview');
    }
  }
});

// GET /files/download/:id - Direct download with correct filename
fileRouter.get('/download/:id', async (req, res) => {
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
    console.error('❌ Direct file download error:', err.message);
    const file = await FileModel.findById(req.params.id);
    if (file && file.fileUrl) {
      res.redirect(file.fileUrl);
    } else {
      res.status(500).send('Unable to download file');
    }
  }
});

export { fileRouter };