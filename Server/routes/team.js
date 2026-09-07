import express from 'express';
import Team from '../models/Team.js';
import User from '../models/User.js';
import fetchUser from '../middleware/fetchUser.js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────
const generateInviteKey = () => crypto.randomBytes(4).toString('hex').toUpperCase(); // "A1B2C3D4"

const createTransporter = () => nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
});

const KEY_EXPIRY_DAYS = 7;

// ════════════════════════════════════════════════════════════════
// POST /api/team/create
// Create a new team — user becomes admin, gets first invite key
// ════════════════════════════════════════════════════════════════
router.post('/create', fetchUser, async (req, res) => {
  try {
    const { teamName } = req.body;

    if (!teamName || teamName.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Team name must be at least 2 characters' });
    }

    // Check if user already manages/owns a team
    let existingTeam = await Team.findOne({
      $or: [
        { admin: req.user.id },
        ...(req.user.teamId ? [{ _id: req.user.teamId }] : [])
      ]
    });

    if (existingTeam) {
      if (!existingTeam.inviteKey || !existingTeam.inviteKeyExpiry) {
        existingTeam.inviteKey = generateInviteKey();
        existingTeam.inviteKeyExpiry = new Date(Date.now() + KEY_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
        existingTeam.inviteKeyActive = true;
      }
      if (teamName && teamName.trim()) {
        existingTeam.teamName = teamName.trim();
      }
      if (!existingTeam.admin) {
        existingTeam.admin = req.user.id;
      }
      await existingTeam.save();

      await User.findByIdAndUpdate(req.user.id, {
        role: 'team',
        teamId: existingTeam._id,
        teamStatus: 'approved'
      });

      return res.json({
        success: true,
        message: 'Team workspace ready!',
        team: {
          _id:             existingTeam._id,
          teamName:        existingTeam.teamName,
          inviteKey:       existingTeam.inviteKey,
          inviteKeyExpiry: existingTeam.inviteKeyExpiry,
          inviteLink:      `${process.env.FRONTEND_URL || 'http://localhost:5173'}/join/${existingTeam.inviteKey}`
        }
      });
    }

    const inviteKey    = generateInviteKey();
    const inviteExpiry = new Date(Date.now() + KEY_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const team = await Team.create({
      teamName:        teamName.trim(),
      admin:           req.user.id,
      members:         [req.user.id],
      inviteKey,
      inviteKeyExpiry: inviteExpiry,
      inviteKeyActive: true,
      pendingMembers:  []
    });

    // Update user role → team, status → approved (admin is auto-approved)
    await User.findByIdAndUpdate(req.user.id, {
      role:       'team',
      teamId:     team._id,
      teamStatus: 'approved',
      teamJoinedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Team created successfully!',
      team: {
        _id:             team._id,
        teamName:        team.teamName,
        inviteKey:       team.inviteKey,
        inviteKeyExpiry: team.inviteKeyExpiry,
        inviteLink:      `${process.env.FRONTEND_URL || 'http://localhost:5173'}/join/${team.inviteKey}`
      }
    });
  } catch (err) {
    console.error('Team create error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/team/generate-invite
// Admin regenerates invite key (old key immediately invalidated)
// ════════════════════════════════════════════════════════════════
router.post('/generate-invite', fetchUser, async (req, res) => {
  try {
    const team = await Team.findOne({ admin: req.user.id });
    if (!team) return res.status(404).json({ success: false, error: 'No team found for this admin' });

    const newKey    = generateInviteKey();
    const newExpiry = new Date(Date.now() + KEY_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    team.inviteKey        = newKey;
    team.inviteKeyExpiry  = newExpiry;
    team.inviteKeyActive  = true;
    await team.save();

    res.json({
      success:         true,
      message:         'New invite key generated!',
      inviteKey:       newKey,
      inviteKeyExpiry: newExpiry,
      inviteLink:      `${process.env.FRONTEND_URL || 'http://localhost:5173'}/join/${newKey}`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/team/toggle-key
// Admin activate / deactivate current key without regenerating
// ════════════════════════════════════════════════════════════════
router.post('/toggle-key', fetchUser, async (req, res) => {
  try {
    const team = await Team.findOne({ admin: req.user.id });
    if (!team) return res.status(404).json({ success: false, error: 'Team not found' });

    team.inviteKeyActive = !team.inviteKeyActive;
    await team.save();

    res.json({ success: true, inviteKeyActive: team.inviteKeyActive,
               message: `Invite key ${team.inviteKeyActive ? 'activated' : 'deactivated'}` });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/team/validate-invite/:key
// Validate an invite key (used on register page — no auth required)
// ════════════════════════════════════════════════════════════════
router.get('/validate-invite/:key', async (req, res) => {
  try {
    const key  = req.params.key.toUpperCase();
    const team = await Team.findOne({ inviteKey: key }).populate('admin', 'name');

    if (!team) return res.json({ success: false, valid: false, error: 'Invalid invite key' });
    if (!team.isInviteKeyValid()) return res.json({ success: false, valid: false, error: 'Invite key expired or deactivated' });

    res.json({
      success:  true,
      valid:    true,
      teamName: team.teamName,
      expiresAt: team.inviteKeyExpiry
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/team/send-email-invite
// Admin sends email invite with magic link
// ════════════════════════════════════════════════════════════════
router.post('/send-email-invite', fetchUser, async (req, res) => {
  try {
    const { emails } = req.body; // array of email strings
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ success: false, error: 'Provide at least one email' });
    }

    const user = await User.findById(req.user.id);
    let team = await Team.findOne({
      $or: [
        { admin: req.user.id },
        ...(user?.teamId ? [{ _id: user.teamId }] : [])
      ]
    });

    if (!team) return res.status(404).json({ success: false, error: 'Team not found. Please create a team first.' });

    if (!team.inviteKey || !team.inviteKeyExpiry || !team.isInviteKeyValid()) {
      team.inviteKey = generateInviteKey();
      team.inviteKeyExpiry = new Date(Date.now() + KEY_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      team.inviteKeyActive = true;
      await team.save();
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return res.status(500).json({ success: false, error: 'Email not configured on server' });
    }

    const inviteLink  = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/join/${team.inviteKey}`;
    const transporter = createTransporter();

    const results = await Promise.allSettled(
      emails.map(email =>
        transporter.sendMail({
          from:    process.env.GMAIL_USER,
          to:      email.trim(),
          subject: `🎉 You're invited to join "${team.teamName}"`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#0f172a;color:#fff;border-radius:12px;padding:32px;">
              <h2 style="color:#60a5fa;margin-bottom:8px;">Team Invitation</h2>
              <p style="color:#94a3b8;">You've been invited to join <strong style="color:#fff">${team.teamName}</strong>.</p>
              <p style="color:#94a3b8;">Click below to register and join the team:</p>
              <a href="${inviteLink}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Accept Invitation</a>
              <p style="color:#64748b;font-size:13px;">Or use invite key: <strong style="color:#a78bfa;font-size:16px;letter-spacing:2px">${team.inviteKey}</strong></p>
              <p style="color:#64748b;font-size:12px;">Link expires: ${new Date(team.inviteKeyExpiry).toLocaleDateString()}</p>
            </div>
          `
        })
      )
    );

    const sent     = results.filter(r => r.status === 'fulfilled').length;
    const failed   = results.filter(r => r.status === 'rejected').length;

    res.json({ success: true, message: `Invites sent: ${sent}, failed: ${failed}` });
  } catch (err) {
    console.error('Email invite error:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/team/pending-members
// Admin gets list of pending approval requests
// ════════════════════════════════════════════════════════════════
router.get('/pending-members', fetchUser, async (req, res) => {
  try {
    const team = await Team.findOne({ admin: req.user.id })
      .populate('pendingMembers.userId', 'name email phoneno createdAt');

    if (!team) return res.status(404).json({ success: false, error: 'Team not found' });

    res.json({ success: true, pendingMembers: team.pendingMembers, teamName: team.teamName });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/team/approve/:userId
// Admin approves a pending member
// ════════════════════════════════════════════════════════════════
router.post('/approve/:userId', fetchUser, async (req, res) => {
  try {
    const { userId } = req.params;

    const team = await Team.findOne({ admin: req.user.id });
    if (!team) return res.status(404).json({ success: false, error: 'Team not found' });

    // Remove from pending
    const pendingIndex = team.pendingMembers.findIndex(p => p.userId.toString() === userId);
    if (pendingIndex === -1) return res.status(404).json({ success: false, error: 'User not in pending list' });

    team.pendingMembers.splice(pendingIndex, 1);

    // Add to members if not already there
    if (!team.members.map(m => m.toString()).includes(userId)) {
      team.members.push(userId);
    }
    await team.save();

    // Update user status
    await User.findByIdAndUpdate(userId, {
      teamStatus:  'approved',
      teamJoinedAt: new Date()
    });

    // Notify via Socket.IO (if app open)
    if (global.io) {
      global.io.to(`user_${userId}`).emit('team:approval-update', {
        status:   'approved',
        teamName: team.teamName,
        message:  `🎉 You've been approved to join "${team.teamName}"!`
      });
    }

    // Get user info for response
    const approvedUser = await User.findById(userId).select('name email');
    res.json({ success: true, message: `${approvedUser?.name || 'User'} approved successfully!`, userId });
  } catch (err) {
    console.error('Approve error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/team/reject/:userId
// Admin rejects a pending member
// ════════════════════════════════════════════════════════════════
router.post('/reject/:userId', fetchUser, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const team = await Team.findOne({ admin: req.user.id });
    if (!team) return res.status(404).json({ success: false, error: 'Team not found' });

    // Remove from pending
    team.pendingMembers = team.pendingMembers.filter(p => p.userId.toString() !== userId);
    await team.save();

    // Update user status
    await User.findByIdAndUpdate(userId, { teamStatus: 'rejected' });

    // Notify via Socket.IO (if app open)
    if (global.io) {
      global.io.to(`user_${userId}`).emit('team:approval-update', {
        status:  'rejected',
        reason:  reason || '',
        message: 'Your team join request was rejected. You can re-apply with a valid invite key.'
      });
    }

    res.json({ success: true, message: 'User rejected', userId });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/team/reapply
// Rejected user re-applies with a new valid invite key (max 5 attempts)
// ════════════════════════════════════════════════════════════════
router.post('/reapply', fetchUser, async (req, res) => {
  try {
    const { inviteKey } = req.body;
    if (!inviteKey) return res.status(400).json({ success: false, error: 'Invite key is required' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    if (user.teamStatus !== 'rejected') {
      return res.status(400).json({ success: false, error: 'Only rejected users can re-apply' });
    }

    const MAX_ATTEMPTS = 5;
    if ((user.teamApplyCount || 0) >= MAX_ATTEMPTS) {
      return res.status(403).json({
        success: false,
        error: `Maximum ${MAX_ATTEMPTS} attempts reached. Contact team admin directly.`
      });
    }

    const key  = inviteKey.trim().toUpperCase();
    const team = await Team.findOne({ inviteKey: key });

    if (!team) return res.status(400).json({ success: false, valid: false, error: 'Invalid invite key' });
    if (!team.isInviteKeyValid()) {
      return res.status(400).json({ success: false, error: 'Invite key expired or deactivated' });
    }

    // Update user
    const newCount = (user.teamApplyCount || 0) + 1;
    await User.findByIdAndUpdate(req.user.id, {
      teamId:         team._id,
      teamStatus:     'pending',
      teamApplyCount: newCount
    });

    // Add to pending queue
    const alreadyPending = team.pendingMembers.some(p => p.userId.toString() === req.user.id);
    if (!alreadyPending) {
      team.pendingMembers.push({ userId: req.user.id, requestedAt: new Date(), attemptCount: newCount });
      await team.save();
    }

    // Notify admin
    if (global.io) {
      global.io.to(`admin_${team.admin}`).emit('team:new-pending', {
        teamId:   team._id,
        teamName: team.teamName,
        user: { id: req.user.id, name: user.name, email: user.email, requestedAt: new Date() }
      });
    }

    res.json({
      success:      true,
      message:      `Re-application submitted! Waiting for admin approval. (${newCount}/${MAX_ATTEMPTS} attempts used)`,
      attemptsUsed: newCount,
      attemptsLeft: MAX_ATTEMPTS - newCount
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/team/my-status
// User checks their own team status
// ════════════════════════════════════════════════════════════════
router.get('/my-status', fetchUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    let teamInfo = null;
    if (user.teamId) {
      const team = await Team.findById(user.teamId).select('teamName inviteKeyExpiry');
      if (team) teamInfo = { teamName: team.teamName };
    }

    res.json({
      success:        true,
      teamStatus:     user.teamStatus,
      teamApplyCount: user.teamApplyCount,
      attemptsLeft:   5 - (user.teamApplyCount || 0),
      role:           user.role,
      teamInfo
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/team/info
// Admin gets their team info (key, members, pending count)
// ════════════════════════════════════════════════════════════════
router.get('/info', fetchUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    let team = await Team.findOne({
      $or: [
        { admin: req.user.id },
        ...(user?.teamId ? [{ _id: user.teamId }] : [])
      ]
    })
      .populate('members', 'name email photo role teamStatus')
      .populate('pendingMembers.userId', 'name email phoneno');

    if (!team) return res.status(404).json({ success: false, error: 'No team found' });

    // Auto-fix: if existing team has no admin, assign current user as admin
    if (!team.admin) {
      team.admin = req.user.id;
    }

    // Auto-fix: if existing team has no inviteKey or expired, generate one
    if (!team.inviteKey || !team.inviteKeyExpiry) {
      team.inviteKey = generateInviteKey();
      team.inviteKeyExpiry = new Date(Date.now() + KEY_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      team.inviteKeyActive = true;
    }
    if (!team.teamName) {
      team.teamName = 'My Team';
    }
    await team.save();

    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/join/${team.inviteKey}`;

    res.json({
      success: true,
      team: {
        _id:              team._id,
        teamName:         team.teamName,
        membersCount:     team.members ? team.members.length : 0,
        members:          team.members || [],
        pendingCount:     team.pendingMembers ? team.pendingMembers.length : 0,
        pendingMembers:   team.pendingMembers || [],
        inviteKey:        team.inviteKey,
        inviteKeyExpiry:  team.inviteKeyExpiry,
        inviteKeyActive:  team.inviteKeyActive,
        inviteKeyValid:   team.isInviteKeyValid(),
        inviteLink
      }
    });
  } catch (err) {
    console.error('team info error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ════════════════════════════════════════════════════════════════
// DELETE /api/team/remove-member/:userId   (admin removes a member)
// ════════════════════════════════════════════════════════════════
router.delete('/remove-member/:userId', fetchUser, async (req, res) => {
  try {
    const { userId } = req.params;

    const team = await Team.findOne({ admin: req.user.id });
    if (!team) return res.status(404).json({ success: false, error: 'Team not found' });

    if (userId === req.user.id) {
      return res.status(400).json({ success: false, error: 'Admin cannot remove themselves' });
    }

    team.members = team.members.filter(m => m.toString() !== userId);
    await team.save();

    await User.findByIdAndUpdate(userId, {
      teamId:      null,
      teamStatus:  null,
      role:        'single',
      teamJoinedAt: null
    });

    res.json({ success: true, message: 'Member removed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── Legacy routes kept for backward compatibility ─────────────────
router.post('/join', fetchUser, async (req, res) => {
  res.status(410).json({ success: false, error: 'This endpoint is deprecated. Use invite key flow instead.' });
});
router.get('/:teamId/members', fetchUser, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId).populate('members', '-password');
    if (!team) return res.status(404).json({ error: 'Team not found' });
    res.json({ success: true, members: team.members });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
