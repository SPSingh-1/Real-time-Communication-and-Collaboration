// 📁 routes/attendeeRouter.js
import express from 'express';
import fetchUser from '../middleware/fetchUser.js';
import Attendee from '../models/Attendee.js';
import Event from '../models/Events.js';

const router = express.Router();

// Add or update attendee decision with reason
router.post('/', fetchUser, async (req, res) => {
  try {
    const { event, status, reason } = req.body;
    if (!event || !status) {
      return res.status(400).json({ error: 'Missing event or status' });
    }

    if ((status === 'busy' || status === 'declined') && (!reason || reason.trim() === '')) {
      return res.status(400).json({ error: 'Reason is required for busy/declined' });
    }

    const existing = await Attendee.findOne({ event, user: req.user.id });

    let attendee;
    if (existing) {
      existing.status = status;
      existing.reason = ['busy', 'declined'].includes(status) ? reason || '' : '';
      attendee = await existing.save();
    } else {
      attendee = await Attendee.create({
        event,
        user: req.user.id,
        status,
        reason: ['busy', 'declined'].includes(status) ? reason || '' : ''
      });
    }

    const populated = await Attendee.findById(attendee._id).populate('user', 'name email').populate('event');

    req.io?.emit('attendeeUpdate', populated);
    res.json(populated);
  } catch (err) {
    console.error('❌ Attendee POST error:', err);
    res.status(500).json({ error: 'Internal server error while updating attendee' });
  }
});

// ✅ New Route in attendeeRouter.js
router.get('/all-decisions', fetchUser, async (req, res) => {
  try {
    const all = await Attendee.find()
      .populate('user', 'name email') // include name/email
      .populate('event')
      .sort({ updatedAt: -1 });
    res.json(all);
  } catch (err) {
    console.error('❌ Fetch all decisions error:', err);
    res.status(500).json({ error: 'Failed to fetch decisions' });
  }
});


// Get all active events for decision-making (not responded yet)
router.get('/pending-events', fetchUser, async (req, res) => {
  try {
    const decidedEvents = await Attendee.find({ user: req.user.id }).distinct('event');
    const pendingEvents = await Event.find({ _id: { $nin: decidedEvents } }).sort({ date: 1 });
    res.json(pendingEvents);
  } catch (err) {
    console.error('❌ Pending events fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch pending events' });
  }
});

// Get attendees for a specific event
router.get('/:eventId', fetchUser, async (req, res) => {
  try {
    const list = await Attendee.find({ event: req.params.eventId }).populate('user', 'name email');
    res.json(list);
  } catch (err) {
    console.error('❌ Attendee GET error:', err);
    res.status(500).json({ error: 'Failed to fetch attendees' });
  }
});

export default router;
