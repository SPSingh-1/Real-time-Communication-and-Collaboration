import express from 'express';
import Team from '../models/Team.js';
import User from '../models/User.js';
import fetchUser from '../middleware/fetchUser.js';

const router = express.Router();

/**
 * POST /api/team/create
 * Create a new team. First user automatically becomes admin.
 */
router.post('/create', fetchUser, async (req, res) => {
  try {
    const { teamId } = req.body;

    // Validate teamId
    if (!teamId || !/^[A-Za-z0-9_@]{5}$/.test(teamId)) {
      return res.status(400).json({ error: 'Invalid Team ID (5 chars: letters, numbers, _ or @)' });
    }

    // Check if team already exists
    const existingTeam = await Team.findOne({ teamId });

    let team;
    if (!existingTeam) {
      // First user → becomes admin
      team = new Team({
        teamId,
        admin: req.user.id,
        members: [req.user.id]
      });
      await team.save();
    } else {
      // Team exists → add as member if not already
      team = existingTeam;
      if (!team.members.includes(req.user.id)) {
        team.members.push(req.user.id);
        await team.save();
      }
    }

    // Update user's teamId and role
    await User.findByIdAndUpdate(req.user.id, { teamId: team._id, role: 'team' });

    res.json({ success: true, message: existingTeam ? 'Joined team successfully' : 'Team created successfully', team });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/team/join
 * Join an existing team using the teamId
 */
router.post('/join', fetchUser, async (req, res) => {
  try {
    const { teamId } = req.body;

    if (!teamId || !/^[A-Za-z0-9_@]{5}$/.test(teamId)) {
      return res.status(400).json({ error: 'Invalid Team ID' });
    }

    // Find the team
    const team = await Team.findOne({ teamId });
    if (!team) return res.status(404).json({ error: 'Team not found' });

    // Add current user as member if not already
    if (!team.members.includes(req.user.id)) {
      team.members.push(req.user.id);
      await team.save();
    }

    // Update user's teamId and role
    await User.findByIdAndUpdate(req.user.id, { teamId: team._id, role: 'team' });

    res.json({ success: true, message: 'Joined team successfully', team });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/team/:teamId/members
 * Get all members of a team
 */
router.get('/:teamId/members', fetchUser, async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await Team.findOne({ teamId }).populate('members', '-password');

    if (!team) return res.status(404).json({ error: 'Team not found' });

    res.json({ success: true, members: team.members });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
