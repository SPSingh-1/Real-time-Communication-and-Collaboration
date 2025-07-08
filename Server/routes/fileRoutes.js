import express from 'express';
import FileModel from '../models/File.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const files = await FileModel.find().sort({ createdAt: -1 });
    res.json(files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await FileModel.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;
