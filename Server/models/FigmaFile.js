// Updated routes/figmaFiles.js with better error handling and debugging
import express from 'express';
import axios from 'axios';
import FigmaToken from '../models/FigmaToken.js';
import FigmaFile from '../models/FigmaFile.js';
import fetchUser from '../middleware/fetchUser.js';

const router = express.Router();

// Helper function to get valid Figma token for user
async function getFigmaToken(userId) {
  console.log('Getting Figma token for user:', userId);
  
  const figmaToken = await FigmaToken.findOne({ userId, isActive: true });
  
  if (!figmaToken) {
    console.log('No active Figma token found for user:', userId);
    throw new Error('Figma not connected');
  }
  
  console.log('Found Figma token, validating...');
  
  // For personal tokens, test if they're still valid
  try {
    await axios.get('https://api.figma.com/v1/me', {
      headers: { 
        'X-Figma-Token': figmaToken.accessToken,
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('Figma token is valid');
    return figmaToken.accessToken;
  } catch (error) {
    console.error('Token validation failed:', error.message);
    figmaToken.isActive = false;
    await figmaToken.save();
    throw new Error('Personal access token is no longer valid');
  }
}

// Helper function to make authenticated Figma API requests
async function figmaApiRequest(url, token, method = 'GET', data = null) {
  console.log(`Making Figma API request: ${method} ${url}`);
  
  const config = {
    method,
    url,
    headers: {
      'X-Figma-Token': token,
      'Accept': 'application/json'
    },
    timeout: 15000
  };
  
  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    config.headers['Content-Type'] = 'application/json';
    config.data = data;
  }
  
  try {
    const response = await axios(config);
    console.log(`Figma API request successful: ${response.status}`);
    return response.data;
  } catch (error) {
    console.error('Figma API Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
    throw new Error(error.response?.data?.message || error.message || 'Figma API request failed');
  }
}

// Get user's Figma files - UPDATED WITH BETTER ERROR HANDLING
router.get('/files', fetchUser, async (req, res) => {
  console.log('=== GET /api/figma/files called ===');
  console.log('User ID:', req.user?.id);
  console.log('User object:', req.user);
  
  try {
    if (!req.user || !req.user.id) {
      console.error('No user found in request');
      return res.status(401).json({ 
        success: false, 
        error: 'User not authenticated' 
      });
    }

    console.log('Getting Figma token...');
    const token = await getFigmaToken(req.user.id);
    
    console.log('Fetching recent files from Figma...');
    // Get recent files from Figma
    const figmaFiles = await figmaApiRequest('https://api.figma.com/v1/files/recent', token);
    
    console.log('Figma API response:', {
      filesCount: figmaFiles.files?.length || 0,
      hasFiles: !!figmaFiles.files
    });
    
    // Handle case where no files are returned
    if (!figmaFiles.files || figmaFiles.files.length === 0) {
      console.log('No files returned from Figma API');
      return res.json({
        success: true,
        files: [],
        totalCount: 0,
        message: 'No files found in your Figma account'
      });
    }
    
    console.log('Syncing files with local database...');
    // Sync with local database
    const syncedFiles = [];
    for (const file of figmaFiles.files) {
      console.log(`Processing file: ${file.name} (${file.key})`);
      
      try {
        let localFile = await FigmaFile.findOneAndUpdate(
          { userId: req.user.id, figmaFileId: file.key },
          {
            userId: req.user.id,
            figmaFileId: file.key,
            name: file.name,
            thumbnail_url: file.thumbnail_url,
            version: file.version,
            role: file.role,
            lastModified: new Date(file.last_modified),
            'localMetadata.lastSyncedAt': new Date(),
            teamId: req.user.teamId || null
          },
          { upsert: true, new: true }
        );
        
        syncedFiles.push(localFile);
        console.log(`File synced: ${localFile.name}`);
      } catch (dbError) {
        console.error(`Error syncing file ${file.key}:`, dbError.message);
        // Continue with other files even if one fails
      }
    }
    
    console.log(`Successfully synced ${syncedFiles.length} files`);
    
    res.json({
      success: true,
      files: syncedFiles,
      totalCount: syncedFiles.length
    });
    
  } catch (error) {
    console.error('=== GET /api/figma/files ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Return appropriate error response
    const statusCode = error.message.includes('not connected') ? 400 : 
                      error.message.includes('not authenticated') ? 401 : 500;
    
    res.status(statusCode).json({ 
      success: false, 
      error: error.message,
      debug: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        type: error.constructor.name
      } : undefined
    });
  }
});

// Test route to verify the router is working
router.get('/test', (req, res) => {
  console.log('=== TEST ROUTE CALLED ===');
  res.json({ 
    success: true, 
    message: 'Figma files router is working',
    timestamp: new Date().toISOString()
  });
});

export default router;