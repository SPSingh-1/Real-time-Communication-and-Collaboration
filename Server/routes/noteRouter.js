import express from 'express';
import Note from '../models/Note.js';
import Notification from '../models/Notification.js';
import fetchUser from '../middleware/fetchUser.js';
import User from '../models/User.js';

const router = express.Router();

router.get('/:date', fetchUser, async (req, res) => {
  const { date } = req.params;
  const { type } = req.query;

  try {
    const start = new Date(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const filter = {
      date: { $gte: start, $lt: end },
      $or: [{ user: req.user.id }, { sharedWith: req.user.id }]
    };

    if (type && ['quote', 'comment', 'important'].includes(type)) {
      filter.type = type;
    }

    const notes = await Note.find(filter).populate('user', 'name');
    res.json(notes);
  } catch (err) {
    console.error('Failed to fetch notes:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', fetchUser, async (req, res) => {
  const { content, date, type } = req.body;

  if (!content || !date) {
    return res.status(400).json({ error: 'Missing content or date' });
  }

  try {
    const user = await User.findById(req.user.id);
    const allUsers = await User.find({ _id: { $ne: req.user.id } }).select('_id');
    const newNote = new Note({
      content,
      date: new Date(date),
      type: type || 'comment',
      user: req.user.id,
      sharedWith: allUsers.map(u => u._id),
    });

    const saved = await newNote.save();
    await saved.populate('user', 'name');

    const noteCreatedNotif = new Notification({
      text: `${user.name} created a ${saved.type} note: "${saved.content}"`,
      type: 'comment',
      time: new Date(),
      user: req.user.id,
    });

    await noteCreatedNotif.save();
    req.io?.emit('notification', noteCreatedNotif);

    res.json(saved);
  } catch (err) {
    console.error('Save note error:', err);
    res.status(500).json({ error: 'Failed to save note' });
  }
});

router.put('/:id', fetchUser, async (req, res) => {
  const { content, type } = req.body;

  try {
    const note = await Note.findById(req.params.id).populate('user', 'name');
    if (!note) return res.status(404).json({ error: 'Note not found' });

    if (note.user._id.toString() !== req.user.id) {
      return res.status(403).json({ error: `You can't update the note because that was created by ${note.user.name}` });
    }

    note.content = content || note.content;
    note.type = type || note.type;

    const updated = await note.save();

    const noteUpdatedNotif = new Notification({
      text: `${note.user.name} updated a ${note.type} note`,
      type: 'comment',
      time: new Date(),
      user: req.user.id,
    });

    await noteUpdatedNotif.save();
    req.io?.emit('notification', noteUpdatedNotif);

    res.json(updated);
  } catch (err) {
    console.error('Edit note error:', err);
    res.status(500).json({ error: 'Failed to edit note' });
  }
});

router.delete('/:id', fetchUser, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id).populate('user', 'name');
    if (!note) return res.status(404).json({ error: 'Note not found' });

    if (note.user._id.toString() !== req.user.id) {
      return res.status(403).json({ error: `You can't delete the note because that was created by ${note.user.name}` });
    }

    await note.deleteOne();

    const noteDeletedNotif = new Notification({
      text: `${note.user.name} deleted a ${note.type} note`,
      type: 'comment',
      time: new Date(),
      user: req.user.id,
    });

    await noteDeletedNotif.save();
    req.io?.emit('notification', noteDeletedNotif);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete note error:', err);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;
