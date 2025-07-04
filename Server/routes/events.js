// routes/events.js
import express from 'express';
import Events from '../models/Events.js';
import Notification from '../models/Notification.js';
import fetchUser from '../middleware/fetchUser.js';

const router = express.Router();

export default function createEventRoutes(io) {
  // ✅ CREATE EVENT
  router.post('/', fetchUser, async (req, res) => {
    try {
      const { title, date, time, description } = req.body;

      const event = await Events.create({
        title,
        date,
        time,
        description: description || '', // avoid undefined
        user: req.user.id
      });
    console.log('📥 Incoming event payload:', req.body); // <-- Add this




      const populated = await Events.findById(event._id).populate('user', 'name email');

      // Broadcast new event
      io.emit('newEvent', populated);

      // Save and emit notification
      const notification = await Notification.create({
        type: 'event',
        text: `${populated.user.name} created event "${populated.title}"`,
        user: populated.user._id,
        eventId: populated._id,
        time: new Date()
      });

      io.emit('notification', notification);

      res.status(201).json(populated);
    } catch (err) {
      console.error('❌ Event create error:', err.message);
      res.status(500).json({ error: 'Failed to create event' });
    }
  });

  // ✅ UPDATE EVENT
  router.put('/:id', fetchUser, async (req, res) => {
    try {
      const { title, time, description } = req.body;

      const updated = await Events.findOneAndUpdate(
        { _id: req.params.id, user: req.user.id },
        { title, time, description },
        { new: true }
      ).populate('user', 'name email');

      if (!updated) return res.status(404).json({ error: 'Event not found' });

      io.emit('updatedEvent', updated);

      const notification = await Notification.create({
        type: 'event',
        text: `${updated.user.name} updated event "${updated.title}"`,
        user: updated.user._id,
        eventId: updated._id,
        time: new Date()
      });

      io.emit('notification', notification);

      res.status(200).json(updated);
    } catch (err) {
      console.error('❌ Event update error:', err.message);
      res.status(500).json({ error: 'Failed to update event' });
    }
  });

  // ✅ DELETE EVENT
  router.delete('/:id', fetchUser, async (req, res) => {
    try {
      const event = await Events.findById(req.params.id).populate('user', 'name email');
      if (!event) return res.status(404).json({ error: 'Event not found' });

      const deletedEventNotification = {
        type: 'event',
        text: `${event.user.name} deleted event "${event.title}"`,
        user: event.user._id,
        eventId: event._id,
        time: new Date()
      };

      await Notification.create(deletedEventNotification);
      io.emit('notification', deletedEventNotification);

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

  // ✅ GET ALL EVENTS
  router.get('/', fetchUser, async (req, res) => {
    try {
      const events = await Events.find().populate('user', 'name email');
      res.json(events);
    } catch (err) {
      console.error('❌ Event fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

  // ✅ GET EVENT BY ID
  router.get('/:id', fetchUser, async (req, res) => {
    try {
      const event = await Events.findById(req.params.id).populate('user', 'name email');
      if (!event) return res.status(404).json({ error: 'Event not found' });
      res.json(event);
    } catch (err) {
      console.error('❌ Error fetching event by ID:', err.message);
      res.status(500).json({ error: 'Failed to fetch event' });
    }
  });

  return router;
}
