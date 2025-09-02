import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import User from '../models/User.js';
import Team from '../models/Team.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import fetchUser from '../middleware/fetchUser.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Enhanced JWT token generation
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      teamId: user.teamId || null,
      globalId: user.globalId || null
    },
    JWT_SECRET,
    { expiresIn: '24h' } // Extended for better UX
  );
};

// ----------------- SIGNUP -----------------
router.post(
  '/createuser',
  [
    body('name', 'Enter a valid name').isLength({ min: 3 }),
    body('email', 'Enter a valid email').isEmail(),
    body('phoneno', 'Enter a valid phone number').isMobilePhone(),
    body('password', 'Password must be at least 5 characters').isLength({ min: 5 }),
    body('role').optional().isIn(['single', 'team', 'global']).withMessage('Invalid role')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array(),
        message: 'Validation failed'
      });
    }

    try {
      const { name, email, phoneno, password, role, teamId } = req.body;

      // Check if user already exists
      let existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          error: 'User already exists with this email' 
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      let newUserData = {
        name,
        email,
        phoneno,
        password: hashedPassword,
        role: role || 'single',
        teamId: null,
        globalId: null
      };

      // Handle team role
      if (role === 'team') {
        if (!teamId || !/^[A-Za-z0-9_@]{5}$/.test(teamId)) {
          return res.status(400).json({ 
            success: false, 
            error: 'Invalid Team ID (must be exactly 5 characters: letters, numbers, _, or @)' 
          });
        }

        let team = await Team.findOne({ teamId });
        if (!team) {
          team = new Team({ 
            teamId, 
            admin: null, 
            members: [],
            createdAt: new Date()
          });
          await team.save();
        }

        newUserData.teamId = team._id;
      }

      // Handle global role
      if (role === 'global') {
        newUserData.globalId = 'GLOBAL123';
      }

      const user = await User.create(newUserData);

      // Update team admin and members if team role
      if (role === 'team') {
        let team = await Team.findById(user.teamId);
        if (!team.admin) {
          team.admin = user._id;
        }
        if (!team.members.includes(user._id)) {
          team.members.push(user._id);
        }
        await team.save();
      }

      const token = generateToken(user);
      const { password: pw, ...userData } = user._doc;
      
      // FIXED: Include token in user object for consistency
      const userWithToken = { ...userData, token };
      
      res.json({ 
        success: true, 
        token, 
        user: userWithToken, // Send user object with token included
        message: 'Account created successfully'
      });
    } catch (err) {
      console.error('Signup error:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error',
        message: 'Failed to create account'
      });
    }
  }
);

// ----------------- LOGIN -----------------
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').exists().withMessage('Password is required'),
    body('role').optional().isIn(['single', 'team', 'global']).withMessage('Invalid role')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array(),
        message: 'Invalid input data'
      });
    }

    try {
      const { email, password, role, teamId } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid email or password' 
        });
      }

      // Role validation
      if (role && role !== user.role) {
        return res.status(400).json({ 
          success: false, 
          error: `User is not registered for ${role} role` 
        });
      }

      if (role === 'team') {
        if (!user.teamId) {
          return res.status(400).json({ 
            success: false, 
            error: 'User is not part of any team' 
          });
        }

        if (teamId) {
          const team = await Team.findById(user.teamId);
          if (!team || team.teamId !== teamId) {
            return res.status(400).json({ 
              success: false, 
              error: 'Invalid Team ID for this user' 
            });
          }
        }
      }

      if (role === 'global') {
        if (!user.globalId || user.globalId !== 'GLOBAL123') {
          return res.status(400).json({ 
            success: false, 
            error: 'User is not authorized for global access' 
          });
        }
      }

      // Password verification
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid email or password' 
        });
      }

      const token = generateToken(user);
      const { password: pw, ...userData } = user._doc;
      
      // FIXED: Include token in user object
      const userWithToken = { ...userData, token };
      
      res.json({ 
        success: true, 
        token, 
        user: userWithToken, // Send user object with token included
        message: 'Login successful'
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error',
        message: 'Login failed'
      });
    }
  }
);

// ----------------- GET USER (for token validation) -----------------
router.post('/getuser', fetchUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    res.json({ 
      success: true, 
      user: {
        ...user._doc,
        token: req.header('auth-token') // Include current token
      }
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// ----------------- VALIDATE TOKEN -----------------
router.get('/validate', async (req, res) => {
  try {
    const token = req.header('auth-token') || req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'No token provided' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    res.json({ 
      success: true, 
      user: { ...user._doc, token },
      message: 'Token is valid'
    });
  } catch (err) {
    console.error('Token validation error:', err);
    res.status(401).json({ 
      success: false, 
      error: 'Invalid token' 
    });
  }
});

// ----------------- REFRESH TOKEN -----------------
router.post('/refresh', async (req, res) => {
  try {
    const token = req.header('auth-token') || req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'No token provided' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    const newToken = generateToken(user);
    const { password: pw, ...userData } = user._doc;
    
    res.json({ 
      success: true, 
      token: newToken, 
      user: { ...userData, token: newToken },
      message: 'Token refreshed successfully'
    });
  } catch (err) {
    console.error('Token refresh error:', err);
    res.status(401).json({ 
      success: false, 
      error: 'Invalid token' 
    });
  }
});

export default router;