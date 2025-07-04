import express from 'express';
import Notification from '../models/Notification.js';
import fetchUser from '../middleware/fetchUser.js';

const router = express.Router();

router.get('/', fetchUser, async (req, res) => {
  try {
    const { type } = req.query;
    const filter = type && type !== 'all' ? { type } : {};

    const notes = await Notification.find(filter)
      .sort({ time: -1 })
      .limit(50)
      .populate('user', 'name email');

    res.json(notes);
  } catch (err) {
    console.error('❌ Error in GET /notifications:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/read', fetchUser, async (req, res) => {
  try {
    const note = await Notification.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { readBy: req.user.id } },
      { new: true }
    );
    res.json(note);
  } catch (err) {
    console.error('❌ Failed to mark as read:', err.message);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

export default router;
