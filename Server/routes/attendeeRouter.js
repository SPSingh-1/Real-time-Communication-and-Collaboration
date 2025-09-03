// 📁 routes/attendeeRouter.js
import express from 'express';
import fetchUser from '../middleware/fetchUser.js';
import Attendee from '../models/Attendee.js';
import Event from '../models/Events.js';

const router = express.Router();

/**
 * ✅ Add or update attendee decision with reason
 */
router.post('/', fetchUser, async (req, res) => {
  try {
    const { event, status, reason } = req.body;
    if (!event || !status) {
      return res.status(400).json({ error: 'Missing event or status' });
    }

    // Require reason for busy/declined
    if ((status === 'busy' || status === 'declined') && (!reason || reason.trim() === '')) {
      return res.status(400).json({ error: 'Reason is required for busy/declined' });
    }

    // Ensure event exists
    const targetEvent = await Event.findById(event);
    if (!targetEvent) return res.status(404).json({ error: 'Event not found' });

    // ✅ Role-based access check
    if (
      (req.user.role === 'single' && targetEvent.user.toString() !== req.user.id) ||
      (req.user.role === 'team' && targetEvent.teamId?.toString() !== req.user.teamId) ||
      (req.user.role === 'global' && targetEvent.scope !== 'global')
    ) {
      return res.status(403).json({ error: 'Not authorized to respond to this event' });
    }

    // Check if user already responded
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
        reason: ['busy', 'declined'].includes(status) ? reason || '' : '',
        teamId: req.user.role === 'team' ? req.user.teamId : null,
        scope: req.user.role
      });
    }

    // Populate with event + user details
    const populated = await Attendee.findById(attendee._id)
      .populate('user', 'name email')
      .populate('event');

    // 🔔 Emit real-time update
    req.io?.emit('attendeeUpdate', populated);

    res.json(populated);
  } catch (err) {
    console.error('❌ Attendee POST error:', err);
    res.status(500).json({ error: 'Internal server error while updating attendee' });
  }
});

/**
 * ✅ Get all attendee decisions (filtered by role/team/global)
 */
router.get('/all-decisions', fetchUser, async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'single') filter = { user: req.user.id, scope: 'single' };
    if (req.user.role === 'team') filter = { teamId: req.user.teamId, scope: 'team' };
    if (req.user.role === 'global') filter = { scope: 'global' };

    const all = await Attendee.find(filter)
      .populate('user', 'name email')
      .populate('event')
      .sort({ updatedAt: -1 });

    res.json(all);
  } catch (err) {
    console.error('❌ Fetch all decisions error:', err);
    res.status(500).json({ error: 'Failed to fetch decisions' });
  }
});

/**
 * ✅ Get all events pending current user's decision
 */
router.get('/pending-events', fetchUser, async (req, res) => {
  try {
    console.log('Fetching pending events for user:', req.user.id, 'role:', req.user.role, 'teamId:', req.user.teamId);
    
    // Get events user has already responded to
    const decidedEvents = await Attendee.find({ user: req.user.id }).distinct('event');
    console.log('User has responded to events:', decidedEvents);

    let eventFilter = { _id: { $nin: decidedEvents } };
    
    // Updated logic to show team events to ALL team members
    if (req.user.role === 'single') {
      eventFilter.user = req.user.id;
      eventFilter.scope = 'single';
    } else if (req.user.role === 'team') {
      // Show events created by ANY team member to ALL team members
      eventFilter.teamId = req.user.teamId;
      eventFilter.scope = 'team';
    } else if (req.user.role === 'global') {
      eventFilter.scope = 'global';
    }

    console.log('Event filter:', eventFilter);

    const pendingEvents = await Event.find(eventFilter).sort({ date: 1 });
    console.log('Found pending events:', pendingEvents.length);
    
    res.json(pendingEvents);
  } catch (err) {
    console.error('❌ Pending events fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch pending events' });
  }
});

/**
 * ✅ Get attendees for a specific event
 */
router.get('/:eventId', fetchUser, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Role-based access check
    if (
      (req.user.role === 'single' && event.user.toString() !== req.user.id) ||
      (req.user.role === 'team' && event.teamId?.toString() !== req.user.teamId) ||
      (req.user.role === 'global' && event.scope !== 'global')
    ) {
      return res.status(403).json({ error: 'Not authorized to view attendees' });
    }

    const list = await Attendee.find({ event: req.params.eventId })
      .populate('user', 'name email');
    res.json(list);
  } catch (err) {
    console.error('❌ Attendee GET error:', err);
    res.status(500).json({ error: 'Failed to fetch attendees' });
  }
});

export default router;
