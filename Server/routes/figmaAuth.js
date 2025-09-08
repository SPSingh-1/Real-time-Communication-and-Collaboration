// routes/figmaAuth.js - Using Personal Access Token approach
import express from 'express';
import axios from 'axios';
import User from '../models/User.js';
import FigmaToken from '../models/FigmaToken.js';
import fetchUser from '../middleware/fetchUser.js';

const router = express.Router();

// Test endpoint
router.get('/figma/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Figma auth routes are working',
    authMethod: 'Personal Access Token'
  });
});

// Connect using Personal Access Token
router.post('/figma/connect-token', fetchUser, async (req, res) => {
  try {
    const { personalToken } = req.body;
    
    if (!personalToken) {
      return res.status(400).json({
        success: false,
        error: 'Personal access token is required'
      });
    }

    console.log('Validating Figma personal token for user:', req.user.id);

    // Test the token by fetching user info
    const userInfoResponse = await axios.get('https://api.figma.com/v1/me', {
      headers: { 
        'X-Figma-Token': personalToken,
        'Accept': 'application/json'
      }
    });

    const figmaUserInfo = userInfoResponse.data;
    console.log('Figma user info retrieved:', figmaUserInfo.handle || figmaUserInfo.email);

    // Store the personal access token
    await FigmaToken.findOneAndUpdate(
      { userId: req.user.id },
      {
        userId: req.user.id,
        figmaUserId: figmaUserInfo.id,
        accessToken: personalToken, // Store personal token as access token
        refreshToken: null, // Personal tokens don't have refresh tokens
        expiresAt: null, // Personal tokens don't expire (unless manually revoked)
        figmaUserInfo: figmaUserInfo,
        isActive: true,
        tokenType: 'personal' // Mark as personal token
      },
      { upsert: true, new: true }
    );

    // Update user record
    await User.findByIdAndUpdate(req.user.id, {
      figmaConnected: true,
      figmaUserId: figmaUserInfo.id
    });

    res.json({
      success: true,
      message: 'Figma connected successfully using personal access token',
      figmaUser: figmaUserInfo
    });

  } catch (error) {
    console.error('Figma token validation error:', error);
    
    if (error.response?.status === 403) {
      return res.status(400).json({
        success: false,
        error: 'Invalid personal access token. Please check your token and try again.'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to validate Figma token'
    });
  }
});

// Get user's Figma connection status
router.get('/figma/status', fetchUser, async (req, res) => {
  try {
    console.log('Checking Figma status for user:', req.user.id);
    
    const figmaToken = await FigmaToken.findOne({ 
      userId: req.user.id, 
      isActive: true 
    });
    
    if (!figmaToken) {
      return res.json({ 
        success: true, 
        connected: false, 
        message: 'Figma not connected' 
      });
    }

    // For personal tokens, test if they're still valid
    try {
      await axios.get('https://api.figma.com/v1/me', {
        headers: { 
          'X-Figma-Token': figmaToken.accessToken,
          'Accept': 'application/json'
        }
      });

      res.json({ 
        success: true, 
        connected: true, 
        figmaUser: figmaToken.figmaUserInfo,
        tokenType: figmaToken.tokenType || 'personal'
      });

    } catch (error) {
      // Token is invalid or revoked
      figmaToken.isActive = false;
      await figmaToken.save();
      
      return res.json({ 
        success: true, 
        connected: false, 
        expired: true,
        message: 'Personal access token is no longer valid' 
      });
    }
    
  } catch (error) {
    console.error('Figma status error:', error);
    res.status(500).json({ success: false, error: 'Failed to check Figma status' });
  }
});

// Disconnect Figma
router.post('/figma/disconnect', fetchUser, async (req, res) => {
  try {
    console.log('Figma disconnect requested by user:', req.user.id);
    
    await FigmaToken.findOneAndUpdate(
      { userId: req.user.id },
      { isActive: false }
    );
    
    await User.findByIdAndUpdate(req.user.id, {
      figmaConnected: false,
      $unset: { figmaUserId: '' }
    });
    
    res.json({ 
      success: true, 
      message: 'Figma disconnected successfully' 
    });
    
  } catch (error) {
    console.error('Figma disconnect error:', error);
    res.status(500).json({ success: false, error: 'Failed to disconnect Figma' });
  }
});

export default router;