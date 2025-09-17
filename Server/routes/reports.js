import express from 'express';
import Report from '../models/Report.js';
import User from '../models/User.js';
import Team from '../models/Team.js';
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

// CREATE REPORT
router.post('/create', 
  fetchUser,
  upload.array('attachments', 5),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('category').optional().isIn(['daily', 'weekly', 'monthly', 'project', 'issue', 'feedback']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('mood').optional().isIn(['😊', '😐', '😟']),
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
        category = 'daily',
        priority = 'medium',
        mood = '😐',
        feedback = '',
        rating = 3,
        isPrivate = false,
        assignedTo = null,
        assignmentType = 'task',
        dueDate = null
      } = req.body;

      // Handle file uploads
      let attachments = [];
      if (req.files && req.files.length > 0) {
        for (let file of req.files) {
          const uploaded = await uploadToCloudinary(file.buffer, 'reports');
          attachments.push({
            filename: file.originalname,
            url: uploaded.secure_url,
            type: file.mimetype
          });
        }
      }

      // Create report with scope based on user role
      const reportData = {
        user: req.user.id,
        userName: req.user.name,
        userPhoto: req.user.photo || '',
        title,
        description,
        category,
        priority,
        mood,
        feedback,
        rating: parseInt(rating),
        isPrivate: isPrivate === 'true',
        attachments,
        scope: req.user.role,
        teamId: req.user.teamId || null,
        globalId: req.user.globalId || null
      };

      // Handle assignment
      if (assignedTo && assignedTo !== 'null') {
        reportData.assignedTo = assignedTo;
        reportData.assignedBy = req.user.id;
        reportData.assignmentType = assignmentType;
        if (dueDate) reportData.dueDate = new Date(dueDate);
      }

      const report = await Report.create(reportData);
      await report.populate('user assignedTo', 'name email photo');

      res.json({
        success: true,
        message: 'Report created successfully',
        report
      });

    } catch (error) {
      console.error('Create report error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create report',
        details: error.message 
      });
    }
  }
);

// GET ALL REPORTS (with scope filtering)
router.get('/all', fetchUser, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      status, 
      priority,
      assignedTo,
      search 
    } = req.query;

    // Build query based on user's scope
    let query = req.user.getQueryScope ? req.user.getQueryScope() : {};

    // Additional filters
    if (category) query.category = category;
    if (status) query.status = status;
    if (priority) query.priority = priority;
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

    const reports = await Report.find(query)
      .populate('user assignedTo assignedBy', 'name email photo role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Report.countDocuments(query);

    res.json({
      success: true,
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch reports' 
    });
  }
});

// GET MY REPORTS
router.get('/my', fetchUser, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const reports = await Report.find({ user: req.user.id })
      .populate('assignedTo assignedBy', 'name email photo')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Report.countDocuments({ user: req.user.id });

    res.json({
      success: true,
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get my reports error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch your reports' 
    });
  }
});

// GET ASSIGNED TO ME
router.get('/assigned', fetchUser, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    let query = { assignedTo: req.user.id };
    if (status) query.status = status;

    const reports = await Report.find(query)
      .populate('user assignedBy', 'name email photo')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Report.countDocuments(query);

    res.json({
      success: true,
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get assigned reports error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch assigned reports' 
    });
  }
});

// UPDATE REPORT STATUS
router.patch('/:id/status', fetchUser, async (req, res) => {
  try {
    const { status, feedback } = req.body;
    const reportId = req.params.id;

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    // Check permissions
    const canUpdate = report.user.toString() === req.user.id || 
                     report.assignedTo?.toString() === req.user.id ||
                     req.user.role === 'global';

    if (!canUpdate) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to update this report' 
      });
    }

    report.status = status;
    if (feedback) report.feedback = feedback;
    if (status === 'completed') report.completedAt = new Date();

    await report.save();
    await report.populate('user assignedTo assignedBy', 'name email photo');

    res.json({
      success: true,
      message: 'Report updated successfully',
      report
    });

  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update report' 
    });
  }
});

// ADD COMMENT
router.post('/:id/comment', fetchUser, async (req, res) => {
  try {
    const { content } = req.body;
    const reportId = req.params.id;

    if (!content || content.trim() === '') {
      return res.status(400).json({ success: false, error: 'Comment content is required' });
    }

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    const comment = {
      user: req.user.id,
      userName: req.user.name,
      userPhoto: req.user.photo || '',
      content: content.trim(),
      createdAt: new Date()
    };

    report.comments.push(comment);
    await report.save();

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

// ASSIGN REPORT
router.patch('/:id/assign', fetchUser, async (req, res) => {
  try {
    const { assignedTo, assignmentType = 'task', dueDate } = req.body;
    const reportId = req.params.id;

    // Only team/global users can assign
    if (!['team', 'global'].includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Only team leaders and global admins can assign reports' 
      });
    }

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    // Verify assignee exists and has appropriate access
    const assignee = await User.findById(assignedTo);
    if (!assignee) {
      return res.status(404).json({ success: false, error: 'Assignee not found' });
    }

    report.assignedTo = assignedTo;
    report.assignedBy = req.user.id;
    report.assignmentType = assignmentType;
    report.status = 'in-progress';
    if (dueDate) report.dueDate = new Date(dueDate);

    await report.save();
    await report.populate('user assignedTo assignedBy', 'name email photo');

    res.json({
      success: true,
      message: 'Report assigned successfully',
      report
    });

  } catch (error) {
    console.error('Assign report error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to assign report' 
    });
  }
});

// GET REPORT STATISTICS
// GET REPORT STATISTICS
router.get('/stats', fetchUser, async (req, res) => {
  try {
    // Build query based on user's role and scope
    let query = {};
    
    if (req.user.role === 'team' && req.user.teamId) {
      // For team users, count reports from their team
      query = {
        $or: [
          { user: req.user.id }, // My reports
          { teamId: req.user.teamId }, // Team reports
          { assignedTo: req.user.id } // Assigned to me
        ]
      };
    } else if (req.user.role === 'global' && req.user.globalId) {
      // For global users, count reports from their global scope
      query = {
        $or: [
          { user: req.user.id },
          { globalId: req.user.globalId },
          { assignedTo: req.user.id }
        ]
      };
    } else {
      // For single users, count all their reports
      query = {
        $or: [
          { user: req.user.id },
          { assignedTo: req.user.id }
        ]
      };
    }

    console.log('Reports stats query:', JSON.stringify(query, null, 2)); // Debug

    const stats = await Report.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          avgRating: { $avg: '$rating' }
        }
      }
    ]);

    // Get assigned to me count
    const assignedCount = await Report.countDocuments({ assignedTo: req.user.id });
    const myReportsCount = await Report.countDocuments({ user: req.user.id });

    console.log('Reports stats result:', stats[0]); // Debug

    res.json({
      success: true,
      stats: stats[0] || {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        avgRating: 0
      },
      assignedToMe: assignedCount,
      myReports: myReportsCount
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch statistics' 
    });
  }
});

// FIXED: GET USERS FOR ASSIGNMENT (team members or all users based on role)
router.get('/assignable-users', fetchUser, async (req, res) => {
  try {
    let query = {};
    
    console.log('=== ASSIGNABLE USERS DEBUG (FIXED) ===');
    console.log('Current user:', {
      id: req.user.id,
      role: req.user.role,
      teamId: req.user.teamId,
      teamIdType: typeof req.user.teamId,
      globalId: req.user.globalId
    });
    
    if (req.user.role === 'team') {
      // Team users can assign to team members
      if (!req.user.teamId) {
        console.log('❌ User has team role but no teamId');
        return res.status(400).json({ 
          success: false, 
          error: 'Team user must have a teamId' 
        });
      }
      
      // FIXED: Handle both string and ObjectId teamId
      let teamIdQuery;
      
      // If teamId is a string that looks like an ObjectId, convert it
      if (typeof req.user.teamId === 'string' && mongoose.Types.ObjectId.isValid(req.user.teamId)) {
        teamIdQuery = {
          $or: [
            { teamId: req.user.teamId }, // String match
            { teamId: new mongoose.Types.ObjectId(req.user.teamId) } // ObjectId match
          ]
        };
      } else if (typeof req.user.teamId === 'string') {
        // If it's a string but not a valid ObjectId (like "12345"), search by string only
        teamIdQuery = { teamId: req.user.teamId };
      } else {
        // If it's already an ObjectId
        teamIdQuery = { teamId: req.user.teamId };
      }
      
      query = {
        ...teamIdQuery,
        _id: { $ne: req.user.id }, // Exclude current user from assignments
        $or: [
          { role: 'team' },
          { role: 'employee' } // Include employees in the same team
        ]
      };
      
      console.log('Team query (FIXED):', JSON.stringify(query, null, 2));
      
    } else if (req.user.role === 'global') {
      // Global users can assign to users with global role
      query = {
        role: 'global',
        globalId: req.user.globalId,
        _id: { $ne: req.user.id } // Exclude current user
      };
      console.log('Global query:', query);
    } else {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to assign reports' 
      });
    }

    console.log('Final query being used:', JSON.stringify(query, null, 2));

    // Debug: First check what users exist
    const allUsers = await User.find({}).select('_id name email photo role teamId globalId').lean();
    console.log('=== ALL USERS IN DB ===');
    allUsers.forEach(user => {
      console.log(`User: ${user.name}, Role: ${user.role}, TeamId: ${user.teamId} (${typeof user.teamId}), GlobalId: ${user.globalId}`);
    });

    // ADDITIONAL DEBUG: Check for users with same teamId
    if (req.user.role === 'team') {
      console.log('=== USERS WITH SAME TEAM ID ===');
      const sameTeamUsers = allUsers.filter(user => {
        if (typeof req.user.teamId === 'string' && typeof user.teamId === 'string') {
          return user.teamId === req.user.teamId;
        } else if (user.teamId && req.user.teamId) {
          return user.teamId.toString() === req.user.teamId.toString();
        }
        return false;
      });
      console.log('Same team users found:', sameTeamUsers.length);
      sameTeamUsers.forEach(user => {
        console.log(`Same team: ${user.name}, Role: ${user.role}, TeamId: ${user.teamId}`);
      });
    }

    // Get assignable users
    const users = await User.find(query)
      .select('_id name email photo role teamId globalId')
      .lean();

    console.log('=== FILTERED USERS (AFTER QUERY) ===');
    console.log('Found users:', users.length);
    users.forEach(user => {
      console.log(`Found: ${user.name}, Role: ${user.role}, TeamId: ${user.teamId} (${typeof user.teamId}), GlobalId: ${user.globalId}`);
    });
    res.json({ success: true, users });

  } catch (error) {
    console.error('Get assignable users error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch assignable users' 
    });
    } 
});

export default router;