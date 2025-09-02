import express from 'express';
import Global from '../models/Global.js';
import User from '../models/User.js';
import fetchUser from '../middleware/fetchUser.js';

const router = express.Router();

// Fixed Global ID
const FIXED_GLOBAL_ID = "Global123";

/**
 * POST /api/global/create
 * Create the Global group (only once)
 */
router.post('/create', fetchUser, async (req, res) => {
  try {
    const existingGlobal = await Global.findOne({ globalId: FIXED_GLOBAL_ID });
    if (existingGlobal) {
      return res.status(400).json({ success: false, error: 'Global group already exists' });
    }

    // Create global group without admin
    const global = new Global({
      globalId: FIXED_GLOBAL_ID,
      members: [req.user.id]
    });
    await global.save();

    // Update user with role 'global' and globalId as string
    await User.findByIdAndUpdate(req.user.id, { role: 'global', globalId: FIXED_GLOBAL_ID });

    res.json({ success: true, message: 'Global group created successfully', global });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/global/join
 * User joins the existing Global group
 */
router.post('/join', fetchUser, async (req, res) => {
  try {
    const global = await Global.findOne({ globalId: FIXED_GLOBAL_ID });
    if (!global) return res.status(404).json({ success: false, error: 'Global group not found' });

    // Add user to members if not already
    if (!global.members.includes(req.user.id)) {
      global.members.push(req.user.id);
      await global.save();
    }

    // Update user's role and globalId
    await User.findByIdAndUpdate(req.user.id, { role: 'global', globalId: FIXED_GLOBAL_ID });

    res.json({ success: true, message: 'Joined Global group successfully', global });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/global/members
 * List all members of Global group
 */
router.get('/members', fetchUser, async (req, res) => {
  try {
    const global = await Global.findOne({ globalId: FIXED_GLOBAL_ID }).populate('members', '-password');
    if (!global) return res.status(404).json({ success: false, error: 'Global group not found' });

    res.json({ success: true, members: global.members });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
