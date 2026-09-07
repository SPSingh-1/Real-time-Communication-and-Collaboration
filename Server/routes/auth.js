import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import User from '../models/User.js';
import Team from '../models/Team.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import fetchUser from '../middleware/fetchUser.js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_change_in_production_123456';

// ── Token generator ──────────────────────────────────────────────
const generateToken = (user) => {
  const isSuperAdmin = Boolean(
    user.isSuperAdmin ||
    user.role === 'superadmin' ||
    (process.env.SUPER_ADMIN_EMAIL && user.email?.toLowerCase() === process.env.SUPER_ADMIN_EMAIL.toLowerCase())
  );
  return jwt.sign(
    {
      id:           user._id,
      name:         user.name,
      email:        user.email,
      role:         isSuperAdmin ? 'superadmin' : user.role,
      isSuperAdmin: isSuperAdmin,
      teamId:       user.teamId   || null,
      globalId:     user.globalId || null
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// ── Nodemailer transporter ────────────────────────────────────────
const createTransporter = () => nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// ════════════════════════════════════════════════════════════════
// SIGNUP  POST /api/auth/createuser
// ════════════════════════════════════════════════════════════════
router.post(
  '/createuser',
  [
    body('name',     'Enter a valid name (min 3 chars)').isLength({ min: 3 }),
    body('email',    'Enter a valid email').isEmail(),
    body('phoneno',  'Enter a valid phone number').isMobilePhone(),
    body('password', 'Password must be at least 5 characters').isLength({ min: 5 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { name, email, phoneno, password, inviteKey } = req.body;

      // Check if email is reserved for Super Admin
      if (process.env.SUPER_ADMIN_EMAIL && email.toLowerCase() === process.env.SUPER_ADMIN_EMAIL.toLowerCase()) {
        return res.status(400).json({ success: false, error: 'This email is reserved for system administration.' });
      }

      // Check duplicate email
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ success: false, error: 'User already exists with this email' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      let newUserData = {
        name,
        email,
        phoneno,
        password:       hashedPassword,
        role:           'single',   // default; overridden if valid inviteKey
        teamId:         null,
        globalId:       null,
        teamStatus:     null,
        teamApplyCount: 0
      };

      let teamDoc   = null;
      let isPending = false;

      // ── Invite Key flow ─────────────────────────────────────────
      if (inviteKey && inviteKey.trim() !== '') {
        const key = inviteKey.trim().toUpperCase();

        teamDoc = await Team.findOne({ inviteKey: key });

        if (!teamDoc) {
          return res.status(400).json({ success: false, error: 'Invalid invite key. Please check with your admin.' });
        }
        if (!teamDoc.isInviteKeyValid()) {
          return res.status(400).json({ success: false, error: 'Invite key has expired or been deactivated. Ask admin to regenerate.' });
        }

        newUserData.role       = 'team';
        newUserData.teamId     = teamDoc._id;
        newUserData.teamStatus = 'pending';
        newUserData.teamApplyCount = 1;
        isPending = true;
      }

      const user = await User.create(newUserData);

      // ── Add to pending queue in Team doc ────────────────────────
      if (isPending && teamDoc) {
        teamDoc.pendingMembers.push({ userId: user._id, requestedAt: new Date(), attemptCount: 1 });
        await teamDoc.save();

        // Notify admin via Socket.IO (handled in server.js via global io)
        if (global.io) {
          global.io.to(`admin_${teamDoc.admin}`).emit('team:new-pending', {
            teamId:    teamDoc._id,
            teamName:  teamDoc.teamName,
            user: { id: user._id, name: user.name, email: user.email, requestedAt: new Date() }
          });
        }

        return res.json({
          success: true,
          pending: true,
          message: `Registration successful! Waiting for admin approval to join "${teamDoc.teamName}".`,
          user: { name: user.name, email: user.email, teamStatus: 'pending', role: 'team' }
        });
      }

      // ── Normal single-user registration ─────────────────────────
      const token = generateToken(user);
      const { password: _pw, ...userData } = user._doc;
      res.json({ success: true, token, user: { ...userData, token }, message: 'Account created successfully' });

    } catch (err) {
      console.error('Signup error:', err);
      res.status(500).json({ 
        success: false, 
        error: err.message || 'Internal server error',
        details: err.toString()
      });
    }
  }
);

// Helper to attach isTeamAdmin and isSuperAdmin flag
export const formatUserDataWithAdmin = async (user, token) => {
  const { password: _pw, ...userData } = user._doc || user;
  let isTeamAdmin = false;
  const isSuperAdmin = Boolean(
    user.isSuperAdmin ||
    user.role === 'superadmin' ||
    (process.env.SUPER_ADMIN_EMAIL && user.email?.toLowerCase() === process.env.SUPER_ADMIN_EMAIL.toLowerCase())
  );

  if (user.role === 'team' || user.teamId) {
    const teamDoc = await Team.findOne({ admin: user._id });
    if (teamDoc) {
      isTeamAdmin = true;
    }
  }
  return { ...userData, isTeamAdmin, isSuperAdmin, token };
};

// Ensure Super Admin account is created/synchronized with .env
export const ensureSuperAdminAccount = async () => {
  try {
    const superEmail = process.env.SUPER_ADMIN_EMAIL?.trim();
    const superPassword = process.env.SUPER_ADMIN_PASSWORD?.trim();
    const superName = process.env.SUPER_ADMIN_NAME || 'System Super Admin';

    if (!superEmail || !superPassword) return;

    let adminUser = await User.findOne({ email: superEmail.toLowerCase() });
    const hashedPassword = await bcrypt.hash(superPassword, 12);

    if (!adminUser) {
      adminUser = await User.create({
        name: superName,
        email: superEmail.toLowerCase(),
        phoneno: '0000000000',
        password: hashedPassword,
        role: 'superadmin',
        isSuperAdmin: true,
        teamStatus: null
      });
      console.log(`👑 Super Admin account created: ${superEmail}`);
    } else {
      let needsUpdate = false;
      if (adminUser.role !== 'superadmin' || !adminUser.isSuperAdmin) {
        adminUser.role = 'superadmin';
        adminUser.isSuperAdmin = true;
        needsUpdate = true;
      }
      const isMatch = await bcrypt.compare(superPassword, adminUser.password);
      if (!isMatch) {
        adminUser.password = hashedPassword;
        needsUpdate = true;
      }
      if (needsUpdate) {
        await adminUser.save();
        console.log(`👑 Super Admin account synchronized with .env credentials: ${superEmail}`);
      }
    }
  } catch (err) {
    console.error('Error ensuring super admin account:', err);
  }
};

// ════════════════════════════════════════════════════════════════
// LOGIN  POST /api/auth/login
// ════════════════════════════════════════════════════════════════
router.post(
  '/login',
  [
    body('email',    'Please enter a valid email').isEmail(),
    body('password', 'Password is required').exists()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { email, password } = req.body;
      const superEmail = process.env.SUPER_ADMIN_EMAIL?.toLowerCase()?.trim();
      const superPassword = process.env.SUPER_ADMIN_PASSWORD?.trim();

      // ── Super Admin Login Gate ──────────────────────────────────
      if (superEmail && email.toLowerCase().trim() === superEmail) {
        let adminUser = await User.findOne({ email: superEmail });
        const isEnvPassMatch = superPassword && password === superPassword;
        const isDbPassMatch = adminUser ? await bcrypt.compare(password, adminUser.password) : false;

        if (isEnvPassMatch || isDbPassMatch) {
          if (!adminUser) {
            const hashedPassword = await bcrypt.hash(superPassword || password, 12);
            adminUser = await User.create({
              name: process.env.SUPER_ADMIN_NAME || 'System Super Admin',
              email: superEmail,
              phoneno: '0000000000',
              password: hashedPassword,
              role: 'superadmin',
              isSuperAdmin: true
            });
          } else if (adminUser.role !== 'superadmin' || !adminUser.isSuperAdmin) {
            adminUser.role = 'superadmin';
            adminUser.isSuperAdmin = true;
            await adminUser.save();
          }

          const token = generateToken(adminUser);
          const formattedUser = await formatUserDataWithAdmin(adminUser, token);
          return res.json({
            success: true,
            token,
            user: formattedUser,
            message: 'Super Admin login successful'
          });
        } else {
          return res.status(400).json({ success: false, error: 'Invalid email or password' });
        }
      }

      // ── Regular User Login ──────────────────────────────────────
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ success: false, error: 'Invalid email or password' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, error: 'Invalid email or password' });
      }

      // ── Team status gate ─────────────────────────────────────────
      if (user.role === 'team') {
        if (user.teamStatus === 'pending') {
          return res.status(403).json({
            success: false,
            blocked: true,
            reason:  'pending_approval',
            message: 'Your request to join the team is pending admin approval.',
            user: { name: user.name, email: user.email, teamStatus: 'pending' }
          });
        }

        if (user.teamStatus === 'rejected') {
          const attemptsLeft = 5 - (user.teamApplyCount || 0);
          return res.status(403).json({
            success: false,
            blocked:      true,
            reason:       'rejected',
            attemptsLeft: attemptsLeft > 0 ? attemptsLeft : 0,
            message:      'Your team join request was rejected.',
            user: { name: user.name, email: user.email, teamStatus: 'rejected', teamApplyCount: user.teamApplyCount }
          });
        }
      }

      // ── Issue token ──────────────────────────────────────────────
      const token = generateToken(user);
      const formattedUser = await formatUserDataWithAdmin(user, token);
      res.json({ success: true, token, user: formattedUser, message: 'Login successful' });

    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// ════════════════════════════════════════════════════════════════
// GET USER  POST /api/auth/getuser   (existing — unchanged)
// ════════════════════════════════════════════════════════════════
router.post('/getuser', fetchUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    const formattedUser = await formatUserDataWithAdmin(user, req.header('auth-token'));
    res.json({ success: true, user: formattedUser });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ════════════════════════════════════════════════════════════════
// VALIDATE TOKEN  GET /api/auth/validate  (existing — unchanged)
// ════════════════════════════════════════════════════════════════
router.get('/validate', async (req, res) => {
  try {
    const token = req.header('auth-token') || req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, error: 'No token provided' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user    = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ success: false, error: 'User not found' });

    const formattedUser = await formatUserDataWithAdmin(user, token);
    res.json({ success: true, user: formattedUser, message: 'Token is valid' });
  } catch (err) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
});

// ════════════════════════════════════════════════════════════════
// REFRESH TOKEN  POST /api/auth/refresh  (existing — unchanged)
// ════════════════════════════════════════════════════════════════
router.post('/refresh', async (req, res) => {
  try {
    const token = req.header('auth-token') || req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, error: 'No token provided' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user    = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ success: false, error: 'User not found' });

    const newToken = generateToken(user);
    const formattedUser = await formatUserDataWithAdmin(user, newToken);
    res.json({ success: true, token: newToken, user: formattedUser });
  } catch (err) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
});

// ════════════════════════════════════════════════════════════════
// FORGOT PASSWORD  POST /api/auth/forgot-password
// ════════════════════════════════════════════════════════════════
router.post('/forgot-password', [
  body('email', 'Please enter a valid email').isEmail()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always return success (security — don't reveal if email exists)
    if (!user) {
      return res.json({ success: true, message: 'If this email exists, a reset link has been sent.' });
    }

    // Generate 1-hour reset token
    const resetToken  = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.resetPasswordToken  = resetToken;
    user.resetPasswordExpiry = resetExpiry;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      const transporter = createTransporter();
      await transporter.sendMail({
        from:    process.env.GMAIL_USER,
        to:      email,
        subject: '🔐 Password Reset Request',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#0f172a;color:#fff;border-radius:12px;padding:32px;">
            <h2 style="color:#60a5fa;margin-bottom:8px;">Reset Your Password</h2>
            <p style="color:#94a3b8;">You requested a password reset. Click the button below. This link expires in 1 hour.</p>
            <a href="${resetUrl}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Reset Password</a>
            <p style="color:#64748b;font-size:12px;">If you didn't request this, ignore this email.</p>
          </div>
        `
      });
    }

    res.json({ success: true, message: 'If this email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ════════════════════════════════════════════════════════════════
// RESET PASSWORD  POST /api/auth/reset-password/:token
// ════════════════════════════════════════════════════════════════
router.post('/reset-password/:token', [
  body('password', 'Password must be at least 5 characters').isLength({ min: 5 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { token }    = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      resetPasswordToken:  token,
      resetPasswordExpiry: { $gt: new Date() }
    });

    if (!user) return res.status(400).json({ success: false, error: 'Invalid or expired reset link.' });

    user.password             = await bcrypt.hash(password, 12);
    user.resetPasswordToken   = undefined;
    user.resetPasswordExpiry  = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully. You can now login.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ════════════════════════════════════════════════════════════════
// GOOGLE OAUTH LOGIN & SIGNUP WITH TEAM INVITE SUPPORT
// ════════════════════════════════════════════════════════════════
const getGoogleOAuthClient = () => {
  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri  = process.env.GOOGLE_REDIRECT_URI || `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    return null;
  }

  return new OAuth2Client(clientId, clientSecret, redirectUri);
};

// Initiate Google Login / Signup (supports optional ?inviteKey=...)
router.get('/google', (req, res) => {
  const oAuth2Client = getGoogleOAuthClient();
  if (!oAuth2Client) {
    return res.status(500).json({ 
      error: 'Google OAuth client not initialized. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Server/.env.' 
    });
  }

  const { inviteKey } = req.query;
  const statePayload = JSON.stringify({ inviteKey: inviteKey || null });
  const state = Buffer.from(statePayload).toString('base64');

  const authorizeUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'profile', 'email'],
    prompt: 'select_account',
    state
  });

  res.redirect(authorizeUrl);
});

// Google OAuth Callback
router.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!code) {
    return res.redirect(`${frontendUrl}/login?error=Google authentication failed`);
  }

  const oAuth2Client = getGoogleOAuthClient();
  if (!oAuth2Client) {
    return res.redirect(`${frontendUrl}/login?error=Google OAuth not configured on server`);
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // Fast extraction of user profile from Google's verified id_token
    let payload = null;
    if (tokens.id_token) {
      payload = jwt.decode(tokens.id_token);
    }
    if (!payload || !payload.email) {
      const ticket = await oAuth2Client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      payload = ticket.getPayload();
    }
    const { email, name, picture } = payload;

    // Decode state to get inviteKey
    let inviteKey = null;
    if (state) {
      try {
        const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
        inviteKey = decodedState.inviteKey;
      } catch { /* silent */ }
    }

    let user = await User.findOne({ email });

    // Existing user
    if (user) {
      if (user.role === 'team') {
        if (user.teamStatus === 'pending') {
          return res.redirect(`${frontendUrl}/pending-approval`);
        }
        if (user.teamStatus === 'rejected') {
          return res.redirect(`${frontendUrl}/rejected`);
        }
      }

      const token = generateToken(user);
      return res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    }

    // New user registration
    let role = 'single';
    let teamId = null;
    let teamStatus = null;
    let teamApplyCount = 0;
    let teamDoc = null;

    if (inviteKey && inviteKey.trim()) {
      const key = inviteKey.trim().toUpperCase();
      teamDoc = await Team.findOne({ inviteKey: key });

      if (teamDoc && teamDoc.isInviteKeyValid()) {
        role = 'team';
        teamId = teamDoc._id;
        teamStatus = 'pending';
        teamApplyCount = 1;
      }
    }

    // Create random password hash for OAuth user
    const randomPassword = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    user = await User.create({
      name: name || 'Google User',
      email,
      phoneno: '0000000000',
      password: hashedPassword,
      photo: picture || '',
      role,
      teamId,
      teamStatus,
      teamApplyCount
    });

    if (teamDoc && teamStatus === 'pending') {
      teamDoc.pendingMembers.push({ userId: user._id, requestedAt: new Date(), attemptCount: 1 });
      await teamDoc.save();

      if (global.io) {
        global.io.to(`admin_${teamDoc.admin}`).emit('team:new-pending', {
          teamId: teamDoc._id,
          teamName: teamDoc.teamName,
          user: { id: user._id, name: user.name, email: user.email, requestedAt: new Date() }
        });
      }

      return res.redirect(`${frontendUrl}/pending-approval`);
    }

    const token = generateToken(user);
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);

  } catch (err) {
    console.error('Google callback error:', err);
    res.redirect(`${frontendUrl}/login?error=Google login failed: ${encodeURIComponent(err.message)}`);
  }
});

export default router;