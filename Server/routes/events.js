// routes/events.js
import express from 'express';
import Events from '../models/Events.js';
import Notification from '../models/Notification.js';
import fetchUser from '../middleware/fetchUser.js';
import cron from 'node-cron';

const router = express.Router();

export default function createEventRoutes(io) {
  // ======================
  // CRON: Cleanup old events (older than last month)
  // ======================
  cron.schedule('0 2 * * *', async () => {
    try {
      const now = new Date();
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      const result = await Events.deleteMany({
        date: { $lte: lastMonthEnd }
      });

      if (result.deletedCount > 0) {
        console.log(`🧹 Auto-cleanup: Deleted ${result.deletedCount} events older than ${lastMonthEnd.toDateString()}`);
      }
    } catch (error) {
      console.error('❌ Error during event auto-cleanup:', error.message);
    }
  });

  // ======================
  // CREATE EVENT
  // ======================
  router.post('/', fetchUser, async (req, res) => {
    try {
      const { title, date, time, description } = req.body;

      const event = await Events.create({
        title,
        date,
        time,
        description: description || '',
        user: req.user.id,
        teamId: req.user.role === 'team' ? req.user.teamId : null,
        scope: req.user.role   // "single" | "team" | "global"
      });

      const populated = await Events.findById(event._id).populate('user', 'name email');

      io.emit('newEvent', populated);

      await Notification.create({
        type: 'event',
        text: `${populated.user.name} created event "${populated.title}"`,
        user: populated.user._id,
        eventId: populated._id,
        time: new Date(),
        scope: req.user.role,
        teamId: req.user.role === 'team' ? req.user.teamId : null
      });

      res.status(201).json(populated);
    } catch (err) {
      console.error('❌ Event create error:', err.message);
      res.status(500).json({ error: 'Failed to create event' });
    }
  });

  // ======================
  // UPDATE EVENT
  // ======================
  router.put('/:id', fetchUser, async (req, res) => {
    try {
      const { title, time, description } = req.body;

      let event = await Events.findById(req.params.id);
      if (!event) return res.status(404).json({ error: 'Event not found' });

      // 🔒 Authorization
      if (
        (req.user.role === 'single' && (event.scope !== 'single' || event.user.toString() !== req.user.id)) ||
        (req.user.role === 'team' && (event.scope !== 'team' || event.teamId?.toString() !== req.user.teamId)) ||
        (req.user.role === 'global' && event.scope !== 'global')
      ) {
        return res.status(403).json({ error: 'Not authorized to update this event' });
      }

      event.title = title || event.title;
      event.time = time || event.time;
      event.description = description || event.description;
      const updated = await event.save();

      const populated = await Events.findById(updated._id).populate('user', 'name email');
      io.emit('updatedEvent', populated);

      await Notification.create({
        type: 'event',
        text: `${populated.user.name} updated event "${populated.title}"`,
        user: populated.user._id,
        eventId: populated._id,
        time: new Date(),
        scope: req.user.role,
        teamId: req.user.role === 'team' ? req.user.teamId : null
      });

      res.status(200).json(populated);
    } catch (err) {
      console.error('❌ Event update error:', err.message);
      res.status(500).json({ error: 'Failed to update event' });
    }
  });

  // ======================
  // DELETE EVENT
  // ======================
  router.delete('/:id', fetchUser, async (req, res) => {
    try {
      const event = await Events.findById(req.params.id).populate('user', 'name email');
      if (!event) return res.status(404).json({ error: 'Event not found' });

      // 🔒 Authorization
      if (
        (req.user.role === 'single' && (event.scope !== 'single' || event.user.toString() !== req.user.id)) ||
        (req.user.role === 'team' && (event.scope !== 'team' || event.teamId?.toString() !== req.user.teamId)) ||
        (req.user.role === 'global' && event.scope !== 'global')
      ) {
        return res.status(403).json({ error: 'Not authorized to delete this event' });
      }

      await Notification.create({
        type: 'event',
        text: `${event.user.name} deleted event "${event.title}"`,
        user: event.user._id,
        eventId: event._id,
        time: new Date(),
        scope: req.user.role,
        teamId: req.user.role === 'team' ? req.user.teamId : null
      });

      await event.deleteOne();

      io.emit('deletedEvent', {
        id: event._id.toString(),
        date: new Date(event.date).toDateString()
      });

      res.sendStatus(204);
    } catch (err) {
      console.error('❌ Event delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete event' });
    }
  });

// ======================
// GET ALL EVENTS (role-based)
// ======================
router.get('/', fetchUser, async (req, res) => {
  try {
    let filter = {};
    
    // Updated logic to show proper events based on role
    if (req.user.role === 'single') {
      // Single users see only their own personal events
      filter = { user: req.user.id, scope: 'single' };
    } else if (req.user.role === 'team') {
      // Team users see all team events from their team
      filter = { teamId: req.user.teamId, scope: 'team' };
    } else if (req.user.role === 'global') {
      // Global users see all global events
      filter = { scope: 'global' };
    }

    console.log('Event filter for user:', req.user.id, 'role:', req.user.role, 'filter:', filter);

    const events = await Events.find(filter).populate('user', 'name email');
    console.log('Found events:', events.length);
    
    res.json(events);
  } catch (err) {
    console.error('❌ Event fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

  // ======================
  // GET EVENT BY ID
  // ======================
  router.get('/:id', fetchUser, async (req, res) => {
    try {
      const event = await Events.findById(req.params.id).populate('user', 'name email');
      if (!event) return res.status(404).json({ error: 'Event not found' });

      // 🔒 Authorization
      if (
        (req.user.role === 'single' && (event.scope !== 'single' || event.user.toString() !== req.user.id)) ||
        (req.user.role === 'team' && (event.scope !== 'team' || event.teamId?.toString() !== req.user.teamId)) ||
        (req.user.role === 'global' && event.scope !== 'global')
      ) {
        return res.status(403).json({ error: 'Not authorized to view this event' });
      }

      res.json(event);
    } catch (err) {
      console.error('❌ Error fetching event by ID:', err.message);
      res.status(500).json({ error: 'Failed to fetch event' });
    }
  });

  return router;
}
