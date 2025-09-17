import express from 'express';
import Complaint from '../models/Complaint.js';
import User from '../models/User.js';
import fetchUser from '../middleware/fetchUser.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Helper function for cloudinary upload
const uploadToCloudinary = (fileBuffer, folder, resourceType = "auto") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

// CREATE COMPLAINT
router.post('/create', 
  fetchUser,
  upload.array('attachments', 5),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('complaintType').optional().isIn(['technical', 'service', 'harassment', 'discrimination', 'policy', 'other']),
    body('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
    body('department').optional().isIn(['hr', 'it', 'admin', 'management', 'legal']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const {
        title,
        description,
        complaintType = 'other',
        severity = 'medium',
        location = '',
        witnessDetails = '',
        expectedResolution = '',
        incidentDate,
        isConfidential = true,
        isAnonymous = false,
        followUpRequired = false,
        followUpDate = null,
        assignedTo = null,
        department = 'admin',
        dueDate = null
      } = req.body;

      // Handle file uploads
      let attachments = [];
      if (req.files && req.files.length > 0) {
        for (let file of req.files) {
          const uploaded = await uploadToCloudinary(file.buffer, 'complaints');
          attachments.push({
            filename: file.originalname,
            url: uploaded.secure_url,
            type: file.mimetype
          });
        }
      }

      // Create complaint with scope based on user role
      const complaintData = {
        user: req.user.id,
        userName: isAnonymous ? 'Anonymous' : req.user.name,
        userPhoto: isAnonymous ? '' : (req.user.photo || ''),
        title,
        description,
        complaintType,
        severity,
        location,
        witnessDetails,
        expectedResolution,
        incidentDate: incidentDate ? new Date(incidentDate) : new Date(),
        isConfidential: isConfidential === 'true',
        isAnonymous: isAnonymous === 'true',
        followUpRequired: followUpRequired === 'true',
        attachments,
        scope: req.user.role,
        teamId: req.user.teamId || null,
        globalId: req.user.globalId || null,
        department
      };

      // Handle assignment
      if (assignedTo && assignedTo !== 'null') {
        complaintData.assignedTo = assignedTo;
        complaintData.assignedBy = req.user.id;
        if (dueDate) complaintData.dueDate = new Date(dueDate);
      }

      // Set follow-up date if required
      if (followUpRequired && followUpDate) {
        complaintData.followUpDate = new Date(followUpDate);
      }

      const complaint = await Complaint.create(complaintData);
      await complaint.populate('user assignedTo', 'name email photo');

      res.json({
        success: true,
        message: 'Complaint submitted successfully',
        complaint
      });

    } catch (error) {
      console.error('Create complaint error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create complaint',
        details: error.message 
      });
    }
  }
);

// GET ALL COMPLAINTS (with scope filtering)
router.get('/all', fetchUser, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      complaintType, 
      status, 
      severity,
      assignedTo,
      search 
    } = req.query;

    // Build query based on user's scope
    let query = req.user.getQueryScope ? req.user.getQueryScope() : {};

    // Additional filters
    if (complaintType) query.complaintType = complaintType;
    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (assignedTo) query.assignedTo = assignedTo;
    
    // Search functionality
    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { userName: { $regex: search, $options: 'i' } }
        ]
      });
    }

    const complaints = await Complaint.find(query)
      .populate('user assignedTo assignedBy', 'name email photo role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Complaint.countDocuments(query);

    res.json({
      success: true,
      complaints,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch complaints' 
    });
  }
});

// GET MY COMPLAINTS
router.get('/my', fetchUser, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const complaints = await Complaint.find({ user: req.user.id })
      .populate('assignedTo assignedBy', 'name email photo')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Complaint.countDocuments({ user: req.user.id });

    res.json({
      success: true,
      complaints,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get my complaints error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch your complaints' 
    });
  }
});

// GET ASSIGNED TO ME
router.get('/assigned', fetchUser, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    let query = { assignedTo: req.user.id };
    if (status) query.status = status;

    const complaints = await Complaint.find(query)
      .populate('user assignedBy', 'name email photo')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Complaint.countDocuments(query);

    res.json({
      success: true,
      complaints,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get assigned complaints error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch assigned complaints' 
    });
  }
});

// UPDATE COMPLAINT STATUS
router.patch('/:id/status', fetchUser, async (req, res) => {
  try {
    const { status, resolution } = req.body;
    const complaintId = req.params.id;

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ success: false, error: 'Complaint not found' });
    }

    // Check permissions
    const canUpdate = complaint.user.toString() === req.user.id || 
                     complaint.assignedTo?.toString() === req.user.id ||
                     ['team', 'global'].includes(req.user.role);

    if (!canUpdate) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to update this complaint' 
      });
    }

    complaint.status = status;
    if (resolution) complaint.resolution = resolution;
    if (status === 'resolved') {
      complaint.resolvedAt = new Date();
      complaint.resolutionDate = new Date();
    }

    await complaint.save();
    await complaint.populate('user assignedTo assignedBy', 'name email photo');

    res.json({
      success: true,
      message: 'Complaint updated successfully',
      complaint
    });

  } catch (error) {
    console.error('Update complaint error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update complaint' 
    });
  }
});

// ADD COMMENT
router.post('/:id/comment', fetchUser, async (req, res) => {
  try {
    const { content, isInternal = false } = req.body;
    const complaintId = req.params.id;

    if (!content || content.trim() === '') {
      return res.status(400).json({ success: false, error: 'Comment content is required' });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ success: false, error: 'Complaint not found' });
    }

    const comment = {
      user: req.user.id,
      userName: req.user.name,
      userPhoto: req.user.photo || '',
      content: content.trim(),
      isInternal: isInternal === 'true',
      createdAt: new Date()
    };

    complaint.comments.push(comment);
    await complaint.save();

    res.json({
      success: true,
      message: 'Comment added successfully',
      comment
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to add comment' 
    });
  }
});

// ASSIGN COMPLAINT
router.patch('/:id/assign', fetchUser, async (req, res) => {
  try {
    const { assignedTo, department = 'admin', dueDate } = req.body;
    const complaintId = req.params.id;

    // Only team/global users can assign
    if (!['team', 'global'].includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Only team leaders and global admins can assign complaints' 
      });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ success: false, error: 'Complaint not found' });
    }

    // Verify assignee exists
    const assignee = await User.findById(assignedTo);
    if (!assignee) {
      return res.status(404).json({ success: false, error: 'Assignee not found' });
    }

    complaint.assignedTo = assignedTo;
    complaint.assignedBy = req.user.id;
    complaint.department = department;
    complaint.status = 'investigating';
    if (dueDate) complaint.dueDate = new Date(dueDate);

    await complaint.save();
    await complaint.populate('user assignedTo assignedBy', 'name email photo');

    res.json({
      success: true,
      message: 'Complaint assigned successfully',
      complaint
    });

  } catch (error) {
    console.error('Assign complaint error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to assign complaint' 
    });
  }
});

// GET COMPLAINT STATISTICS
// GET COMPLAINT STATISTICS
router.get('/stats', fetchUser, async (req, res) => {
  try {
    // Build query based on user's role and scope
    let query = {};
    
    if (req.user.role === 'team' && req.user.teamId) {
      // For team users, count complaints from their team
      query = {
        $or: [
          { user: req.user.id }, // My complaints
          { teamId: req.user.teamId }, // Team complaints
          { assignedTo: req.user.id } // Assigned to me
        ]
      };
    } else if (req.user.role === 'global' && req.user.globalId) {
      // For global users, count complaints from their global scope
      query = {
        $or: [
          { user: req.user.id },
          { globalId: req.user.globalId },
          { assignedTo: req.user.id }
        ]
      };
    } else {
      // For single users, count all their complaints
      query = {
        $or: [
          { user: req.user.id },
          { assignedTo: req.user.id }
        ]
      };
    }

    console.log('Complaints stats query:', JSON.stringify(query, null, 2)); // Debug

    const stats = await Complaint.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          investigating: { $sum: { $cond: [{ $eq: ['$status', 'investigating'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } }
        }
      }
    ]);

    // Get assigned to me count
    const assignedCount = await Complaint.countDocuments({ assignedTo: req.user.id });
    const myComplaintsCount = await Complaint.countDocuments({ user: req.user.id });

    console.log('Complaints stats result:', stats[0]); // Debug

    res.json({
      success: true,
      stats: stats[0] || {
        total: 0,
        pending: 0,
        investigating: 0,
        resolved: 0,
        critical: 0
      },
      assignedToMe: assignedCount,
      myComplaints: myComplaintsCount
    });

  } catch (error) {
    console.error('Get complaint stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch complaint statistics' 
    });
  }
});

export default router;