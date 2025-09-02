import express from 'express';
import Note from '../models/Note.js';
import Notification from '../models/Notification.js';
import fetchUser from '../middleware/fetchUser.js';
import User from '../models/User.js';

const router = express.Router();
const GLOBAL_ID = 'Global123'; // fixed global scope ID

// GET notes for a date with enhanced role-based filtering
router.get('/:date', fetchUser, async (req, res) => {
  const { date } = req.params;
  const { type, user: filterUserId } = req.query;

  try {
    const start = new Date(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    let filter = { date: { $gte: start, $lt: end } };

    // Role-based filtering
    if (req.user.role === 'single') {
      filter = { ...filter, user: req.user.id, scope: 'single' };
    } else if (req.user.role === 'team' && req.user.teamId) {
      filter = {
        ...filter,
        $or: [
          { teamId: req.user.teamId, scope: 'team' },
          { user: req.user.id, scope: 'single' } // User can also see their own single notes
        ]
      };
    } else if (req.user.role === 'global') {
      filter = {
        ...filter,
        $or: [
          { scope: 'global', teamId: GLOBAL_ID },
          { user: req.user.id, scope: 'single' } // User can also see their own single notes
        ]
      };
    }

    // Additional filters
    if (type && ['quote', 'comment', 'important'].includes(type)) {
      filter.type = type;
    }

    // Filter by specific user (for admins or team leads)
    if (filterUserId && (req.user.role === 'global' || req.user.role === 'team')) {
      filter.user = filterUserId;
    }

    const notes = await Note.find(filter)
      .populate('user', 'name email')
      .populate('sharedWith', 'name email')
      .sort({ time: -1 });

    // Add metadata for each note
    const notesWithMetadata = notes.map(note => ({
      ...note.toObject(),
      canEdit: note.user._id.toString() === req.user.id,
      canDelete: note.user._id.toString() === req.user.id || req.user.role === 'global',
      isSharedWithMe: note.sharedWith.some(u => u._id.toString() === req.user.id)
    }));

    res.json(notesWithMetadata);
  } catch (err) {
    console.error('Failed to fetch notes:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET all notes with pagination and advanced filtering
router.get('/', fetchUser, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type, 
      startDate, 
      endDate, 
      search,
      sortBy = 'time',
      sortOrder = 'desc'
    } = req.query;

    let filter = {};

    // Role-based filtering
    if (req.user.role === 'single') {
      filter = { user: req.user.id, scope: 'single' };
    } else if (req.user.role === 'team' && req.user.teamId) {
      filter = {
        $or: [
          { teamId: req.user.teamId, scope: 'team' },
          { user: req.user.id, scope: 'single' }
        ]
      };
    } else if (req.user.role === 'global') {
      filter = {
        $or: [
          { scope: 'global', teamId: GLOBAL_ID },
          { user: req.user.id, scope: 'single' }
        ]
      };
    }

    // Additional filters
    if (type && ['quote', 'comment', 'important'].includes(type)) {
      filter.type = type;
    }

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (search) {
      filter.content = { $regex: search, $options: 'i' };
    }

    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notes, total] = await Promise.all([
      Note.find(filter)
        .populate('user', 'name email')
        .populate('sharedWith', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Note.countDocuments(filter)
    ]);

    const notesWithMetadata = notes.map(note => ({
      ...note.toObject(),
      canEdit: note.user._id.toString() === req.user.id,
      canDelete: note.user._id.toString() === req.user.id || req.user.role === 'global',
      isSharedWithMe: note.sharedWith.some(u => u._id.toString() === req.user.id)
    }));

    res.json({
      notes: notesWithMetadata,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: total,
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    console.error('Failed to fetch notes:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// CREATE note with enhanced role-based sharing
router.post('/', fetchUser, async (req, res) => {
  const { content, date, type, shareWithTeam, shareGlobally, specificUsers } = req.body;

  if (!content || !date) {
    return res.status(400).json({ error: 'Missing content or date' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let sharedWith = [];
    let scope = req.user.role;
    let teamId = null;

    // Determine scope and sharing based on user role and preferences
    if (req.user.role === 'global' && shareGlobally) {
      // Global user sharing globally
      scope = 'global';
      teamId = GLOBAL_ID;
      sharedWith = (await User.find({ _id: { $ne: req.user.id } })).map(u => u._id);
    } else if ((req.user.role === 'team' || req.user.role === 'global') && shareWithTeam && req.user.teamId) {
      // Team sharing or global user sharing with team
      scope = 'team';
      teamId = req.user.teamId;
      sharedWith = (await User.find({
        teamId: req.user.teamId,
        _id: { $ne: req.user.id }
      })).map(u => u._id);
    } else if (specificUsers && Array.isArray(specificUsers)) {
      // Specific user sharing
      scope = 'single';
      sharedWith = specificUsers;
    } else {
      // Private note
      scope = 'single';
      teamId = req.user.teamId || null;
    }

    const newNote = new Note({
      content,
      date: new Date(date),
      type: type || 'comment',
      user: req.user.id,
      sharedWith,
      scope,
      teamId
    });

    const saved = await newNote.save();
    await saved.populate([
      { path: 'user', select: 'name email' },
      { path: 'sharedWith', select: 'name email' }
    ]);

    // Create notification based on sharing scope
    let notificationText;
    let notificationScope = scope;

    if (scope === 'global') {
      notificationText = `${user.name} created a ${saved.type} note for everyone: "${saved.content.substring(0, 50)}..."`;
    } else if (scope === 'team') {
      notificationText = `${user.name} shared a ${saved.type} note with the team: "${saved.content.substring(0, 50)}..."`;
    } else if (sharedWith.length > 0) {
      notificationText = `${user.name} shared a ${saved.type} note with you: "${saved.content.substring(0, 50)}..."`;
    } else {
      notificationText = `${user.name} created a ${saved.type} note`;
      notificationScope = 'single';
    }

    const notification = new Notification({
      text: notificationText,
      type: 'comment',
      time: new Date(),
      user: req.user.id,
      scope: notificationScope,
      teamId: scope === 'team' ? req.user.teamId : (scope === 'global' ? GLOBAL_ID : null),
      globalId: scope === 'global' ? GLOBAL_ID : null,
      priority: saved.type === 'important' ? 'high' : 'medium'
    });

    await notification.save();
    req.io?.emit('notification', notification);

    // Emit note creation event
    req.io?.emit('noteCreated', {
      ...saved.toObject(),
      canEdit: true,
      canDelete: true,
      isSharedWithMe: false
    });

    res.status(201).json({
      ...saved.toObject(),
      canEdit: true,
      canDelete: true,
      isSharedWithMe: false
    });
  } catch (err) {
    console.error('Save note error:', err);
    res.status(500).json({ error: 'Failed to save note' });
  }
});

// UPDATE note with enhanced permissions
router.put('/:id', fetchUser, async (req, res) => {
  const { content, type, shareWithTeam, shareGlobally, specificUsers } = req.body;

  try {
    const note = await Note.findById(req.params.id).populate('user', 'name email');
    if (!note) return res.status(404).json({ error: 'Note not found' });

    // Permission check
    const canEdit = note.user._id.toString() === req.user.id || 
                   (req.user.role === 'global' && note.scope !== 'single');

    if (!canEdit) {
      return res.status(403).json({ 
        error: `You can't update this note (created by ${note.user.name})` 
      });
    }

    // Update basic fields
    if (content) note.content = content;
    if (type) note.type = type;

    // Update sharing if requested and user has permission
    if (req.user.id === note.user._id.toString()) {
      let sharedWith = note.sharedWith;
      let scope = note.scope;
      let teamId = note.teamId;

      if (shareGlobally && req.user.role === 'global') {
        scope = 'global';
        teamId = GLOBAL_ID;
        sharedWith = (await User.find({ _id: { $ne: req.user.id } })).map(u => u._id);
      } else if (shareWithTeam && (req.user.role === 'team' || req.user.role === 'global') && req.user.teamId) {
        scope = 'team';
        teamId = req.user.teamId;
        sharedWith = (await User.find({
          teamId: req.user.teamId,
          _id: { $ne: req.user.id }
        })).map(u => u._id);
      } else if (specificUsers && Array.isArray(specificUsers)) {
        scope = 'single';
        sharedWith = specificUsers;
      }

      note.sharedWith = sharedWith;
      note.scope = scope;
      note.teamId = teamId;
    }

    const updated = await note.save();
    await updated.populate([
      { path: 'user', select: 'name email' },
      { path: 'sharedWith', select: 'name email' }
    ]);

    // Create notification for update
    const notification = new Notification({
      text: `${note.user.name} updated a ${note.type} note`,
      type: 'comment',
      time: new Date(),
      user: req.user.id,
      scope: note.scope,
      teamId: note.scope === 'team' ? note.teamId : (note.scope === 'global' ? GLOBAL_ID : null),
      globalId: note.scope === 'global' ? GLOBAL_ID : null,
      priority: note.type === 'important' ? 'high' : 'medium'
    });

    await notification.save();
    req.io?.emit('notification', notification);
    req.io?.emit('noteUpdated', {
      ...updated.toObject(),
      canEdit: true,
      canDelete: true,
      isSharedWithMe: updated.sharedWith.some(u => u._id.toString() === req.user.id)
    });

    res.json({
      ...updated.toObject(),
      canEdit: true,
      canDelete: true,
      isSharedWithMe: updated.sharedWith.some(u => u._id.toString() === req.user.id)
    });
  } catch (err) {
    console.error('Edit note error:', err);
    res.status(500).json({ error: 'Failed to edit note' });
  }
});

// DELETE note with enhanced permissions
router.delete('/:id', fetchUser, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id).populate('user', 'name email');
    if (!note) return res.status(404).json({ error: 'Note not found' });

    // Permission check - note creator or global admin
    const canDelete = note.user._id.toString() === req.user.id || req.user.role === 'global';

    if (!canDelete) {
      return res.status(403).json({ 
        error: `You can't delete this note (created by ${note.user.name})` 
      });
    }

    await note.deleteOne();

    // Create notification for deletion
    const notification = new Notification({
      text: `${note.user.name} deleted a ${note.type} note`,
      type: 'comment',
      time: new Date(),
      user: req.user.id,
      scope: note.scope,
      teamId: note.scope === 'team' ? note.teamId : (note.scope === 'global' ? GLOBAL_ID : null),
      globalId: note.scope === 'global' ? GLOBAL_ID : null,
      priority: 'medium'
    });

    await notification.save();
    req.io?.emit('notification', notification);
    req.io?.emit('noteDeleted', { noteId: req.params.id });

    res.json({ success: true, message: 'Note deleted successfully' });
  } catch (err) {
    console.error('Delete note error:', err);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// GET note statistics
router.get('/stats/summary', fetchUser, async (req, res) => {
  try {
    let filter = {};

    // Role-based filtering
    if (req.user.role === 'single') {
      filter = { user: req.user.id, scope: 'single' };
    } else if (req.user.role === 'team' && req.user.teamId) {
      filter = {
        $or: [
          { teamId: req.user.teamId, scope: 'team' },
          { user: req.user.id, scope: 'single' }
        ]
      };
    } else if (req.user.role === 'global') {
      filter = {
        $or: [
          { scope: 'global', teamId: GLOBAL_ID },
          { user: req.user.id, scope: 'single' }
        ]
      };
    }

    const [total, byType, recent, myNotes] = await Promise.all([
      Note.countDocuments(filter),
      Note.aggregate([
        { $match: filter },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      Note.countDocuments({
        ...filter,
        time: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }),
      Note.countDocuments({ user: req.user.id })
    ]);

    res.json({
      total,
      recent,
      myNotes,
      byType: byType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      averagePerDay: total > 0 ? (total / 30).toFixed(1) : 0 // Rough estimate
    });
  } catch (err) {
    console.error('Failed to fetch note statistics:', err);
    res.status(500).json({ error: 'Failed to fetch note statistics' });
  }
});

export default router;