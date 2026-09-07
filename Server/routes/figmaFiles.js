import express from 'express';
import FigmaFile from '../models/FigmaFile.js';
import fetchUser from '../middleware/fetchUser.js';

const router = express.Router();

// Helper to convert any Figma URL to interactive Embed URL
function buildFigmaEmbedUrl(rawUrl) {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  if (trimmed.includes('figma.com/embed')) {
    return trimmed;
  }
  return `https://www.figma.com/embed?embed_host=astra&url=${encodeURIComponent(trimmed)}`;
}

// Extract file key from figma url (e.g. figma.com/proto/XXXXX/... or figma.com/design/XXXXX/...)
function extractFigmaKey(rawUrl) {
  if (!rawUrl) return `fig_${Date.now()}`;
  const match = rawUrl.match(/(?:file|design|proto)\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return `fig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

// GET all Figma files (both custom added & token-synced)
router.get('/files', fetchUser, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const teamId = req.user?.teamId || null;

    const query = teamId 
      ? { $or: [{ userId }, { teamId }, { userId: String(userId) }, { teamId: String(teamId) }] }
      : { $or: [{ userId }, { userId: String(userId) }] };

    const localFiles = await FigmaFile.find(query).sort({ updatedAt: -1 });

    return res.json({
      success: true,
      files: localFiles || [],
      totalCount: localFiles?.length || 0
    });
  } catch (error) {
    console.error('Error fetching Figma files:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST add a custom Figma File / Board by URL
router.post('/custom-file', fetchUser, async (req, res) => {
  try {
    const { name, url, category, description } = req.body;
    const userId = req.user?.id || req.user?._id;
    const teamId = req.user?.teamId || null;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Project / Board title is required' });
    }
    if (!url || !url.trim() || !url.includes('figma.com')) {
      return res.status(400).json({ success: false, error: 'Valid Figma URL is required (e.g. https://www.figma.com/design/...)' });
    }

    const figmaFileId = extractFigmaKey(url);
    const embedUrl = buildFigmaEmbedUrl(url);

    const savedFile = await FigmaFile.findOneAndUpdate(
      {
        $or: [
          { figmaFileId, userId },
          { originalUrl: url.trim(), userId }
        ]
      },
      {
        $set: {
          userId,
          teamId,
          figmaFileId,
          name: name.trim(),
          originalUrl: url.trim(),
          embedUrl,
          category: category || 'UI Design',
          description: description || '',
          lastModified: new Date(),
          'localMetadata.category': category || 'UI Design',
          'localMetadata.description': description || '',
          'localMetadata.lastSyncedAt': new Date()
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({
      success: true,
      message: 'Figma board embedded successfully',
      file: savedFile
    });
  } catch (error) {
    console.error('Error adding custom Figma file:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE a Figma File / Board
router.delete('/files/:id', fetchUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    const deleted = await FigmaFile.findOneAndDelete({
      $or: [{ _id: id }, { figmaFileId: id }],
      $or: [{ userId }, { userId: String(userId) }]
    });

    return res.json({ success: true, message: 'Figma file removed' });
  } catch (error) {
    console.error('Error deleting Figma file:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH toggle favorite / update metadata
router.patch('/files/:id/metadata', fetchUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { isFavorite, category, description } = req.body;

    const updateFields = {};
    if (typeof isFavorite === 'boolean') {
      updateFields.isFavorite = isFavorite;
      updateFields['localMetadata.isFavorite'] = isFavorite;
    }
    if (category) {
      updateFields.category = category;
      updateFields['localMetadata.category'] = category;
    }
    if (description !== undefined) {
      updateFields.description = description;
      updateFields['localMetadata.description'] = description;
    }

    const updated = await FigmaFile.findOneAndUpdate(
      { $or: [{ _id: id }, { figmaFileId: id }] },
      { $set: updateFields },
      { new: true }
    );

    return res.json({ success: true, file: updated });
  } catch (error) {
    console.error('Error updating metadata:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;