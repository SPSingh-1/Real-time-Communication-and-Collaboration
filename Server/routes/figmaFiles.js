// Corrected routes/figmaFiles.js - Clean, working version
import express from 'express';
import axios from 'axios';
import FigmaToken from '../models/FigmaToken.js';
import FigmaFile from '../models/FigmaFile.js';
import fetchUser from '../middleware/fetchUser.js';

const router = express.Router();

// Helper function to get valid Figma token for user
async function getFigmaToken(userId) {
  const figmaToken = await FigmaToken.findOne({ userId, isActive: true });
  
  if (!figmaToken) {
    throw new Error('Figma not connected');
  }
  
  try {
    await axios.get('https://api.figma.com/v1/me', {
      headers: { 
        'X-Figma-Token': figmaToken.accessToken,
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    return figmaToken.accessToken;
  } catch (error) {
    console.error('Token validation failed:', error);
    figmaToken.isActive = false;
    await figmaToken.save();
    throw new Error('Personal access token is no longer valid');
  }
}

// Helper function to make authenticated Figma API requests
async function figmaApiRequest(url, token, method = 'GET', data = null) {
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
    return response.data;
  } catch (error) {
    console.error('Figma API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.message || 'Figma API request failed');
  }
}

// Test route
router.get('/test', (req, res) => {
  console.log('=== TEST ROUTE CALLED ===');
  res.json({ 
    success: true, 
    message: 'Figma files router is working',
    timestamp: new Date().toISOString()
  });
});

// Test route with authentication
router.get('/test-auth', fetchUser, (req, res) => {
  console.log('=== TEST AUTH ROUTE CALLED ===');
  res.json({ 
    success: true, 
    message: 'Figma files router with auth is working',
    user: req.user ? { id: req.user.id, name: req.user.name } : null,
    timestamp: new Date().toISOString()
  });
});

// MAIN FILES ENDPOINT - Enhanced to get all files
router.get('/files', fetchUser, async (req, res) => {
  console.log('=== GET /api/figma/files called ===');
  console.log('User ID:', req.user?.id);
  
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not authenticated' 
      });
    }

    const token = await getFigmaToken(req.user.id);
    let allFiles = [];
    
    console.log('Step 1: Getting user info...');
    const userInfo = await figmaApiRequest('https://api.figma.com/v1/me', token);
    console.log(`User: ${userInfo.handle}, Teams: ${userInfo.teams?.length || 0}`);
    
    console.log('Step 2: Getting recent files...');
    try {
      const recentFiles = await figmaApiRequest('https://api.figma.com/v1/files/recent', token);
      if (recentFiles.files && recentFiles.files.length > 0) {
        console.log(`Found ${recentFiles.files.length} recent files`);
        allFiles.push(...recentFiles.files.map(file => ({
          ...file,
          source: 'recent'
        })));
      }
    } catch (error) {
      console.log('Recent files request failed, continuing...');
    }
    
    console.log('Step 3: Getting team files...');
    if (userInfo.teams && userInfo.teams.length > 0) {
      for (const team of userInfo.teams) {
        try {
          console.log(`Processing team: ${team.name} (${team.id})`);
          
          const teamProjects = await figmaApiRequest(
            `https://api.figma.com/v1/teams/${team.id}/projects`,
            token
          );
          
          if (teamProjects.projects && teamProjects.projects.length > 0) {
            console.log(`Found ${teamProjects.projects.length} projects in team ${team.name}`);
            
            for (const project of teamProjects.projects) {
              try {
                const projectFiles = await figmaApiRequest(
                  `https://api.figma.com/v1/projects/${project.id}/files`,
                  token
                );
                
                if (projectFiles.files && projectFiles.files.length > 0) {
                  console.log(`Found ${projectFiles.files.length} files in project ${project.name}`);
                  allFiles.push(...projectFiles.files.map(file => ({
                    key: file.key,
                    name: file.name,
                    thumbnail_url: file.thumbnail_url,
                    last_modified: file.last_modified,
                    version: file.version,
                    role: file.role,
                    source: 'team',
                    team: team.name,
                    project: project.name
                  })));
                }
              } catch (projectError) {
                console.log(`Error getting files from project ${project.name}:`, projectError.message);
              }
            }
          }
        } catch (teamError) {
          console.log(`Error processing team ${team.name}:`, teamError.message);
        }
      }
    }
    
    console.log(`Step 4: Total files found: ${allFiles.length}`);
    
    // Remove duplicates based on file key
    const uniqueFiles = [];
    const seenKeys = new Set();
    
    for (const file of allFiles) {
      if (!seenKeys.has(file.key)) {
        seenKeys.add(file.key);
        uniqueFiles.push(file);
      }
    }
    
    console.log(`Step 5: Unique files after deduplication: ${uniqueFiles.length}`);
    
    // Sync with local database
    const syncedFiles = [];
    for (const file of uniqueFiles) {
      try {
        let localFile = await FigmaFile.findOneAndUpdate(
          { userId: req.user.id, figmaFileId: file.key },
          {
            userId: req.user.id,
            figmaFileId: file.key,
            name: file.name,
            thumbnail_url: file.thumbnail_url,
            version: file.version,
            role: file.role || 'viewer',
            lastModified: new Date(file.last_modified),
            'localMetadata.lastSyncedAt': new Date(),
            'localMetadata.source': file.source,
            'localMetadata.team': file.team,
            'localMetadata.project': file.project,
            teamId: req.user.teamId || null
          },
          { upsert: true, new: true }
        );
        
        syncedFiles.push(localFile);
      } catch (dbError) {
        console.error(`Error syncing file ${file.key}:`, dbError.message);
      }
    }
    
    console.log(`Step 6: Successfully synced ${syncedFiles.length} files to database`);
    
    res.json({
      success: true,
      files: syncedFiles,
      totalCount: syncedFiles.length,
      figmaUser: userInfo.handle || userInfo.email,
      sources: {
        recent: allFiles.filter(f => f.source === 'recent').length,
        team: allFiles.filter(f => f.source === 'team').length
      }
    });
    
  } catch (error) {
    console.error('=== GET /api/figma/files ERROR ===');
    console.error('Error:', error.message);
    
    const statusCode = error.message.includes('not connected') ? 400 : 
                      error.message.includes('not authenticated') ? 401 : 500;
    
    res.status(statusCode).json({ 
      success: false, 
      error: error.message
    });
  }
});

// Debug endpoint to test Figma access
router.get('/debug-figma-access', fetchUser, async (req, res) => {
  console.log('=== DEBUGGING FIGMA ACCESS ===');
  
  try {
    const token = await getFigmaToken(req.user.id);
    const results = {};
    
    // Test 1: Get user info
    try {
      const userInfo = await figmaApiRequest('https://api.figma.com/v1/me', token);
      results.userInfo = {
        success: true,
        data: {
          id: userInfo.id,
          handle: userInfo.handle,
          email: userInfo.email,
          teamCount: userInfo.teams?.length || 0,
          teams: userInfo.teams?.map(team => ({
            id: team.id,
            name: team.name
          })) || []
        }
      };
      console.log('✅ User info successful');
    } catch (error) {
      results.userInfo = { success: false, error: error.message };
      console.log('❌ User info failed:', error.message);
    }
    
    // Test 2: Get recent files
    try {
      const recentFiles = await figmaApiRequest('https://api.figma.com/v1/files/recent', token);
      results.recentFiles = {
        success: true,
        count: recentFiles.files?.length || 0,
        files: recentFiles.files?.slice(0, 5).map(file => ({
          key: file.key,
          name: file.name,
          last_modified: file.last_modified
        })) || []
      };
      console.log('✅ Recent files successful:', recentFiles.files?.length || 0, 'files');
    } catch (error) {
      results.recentFiles = { success: false, error: error.message };
      console.log('❌ Recent files failed:', error.message);
    }
    
    // Test 3: Team files (if user info was successful)
    if (results.userInfo.success && results.userInfo.data.teams.length > 0) {
      results.teamFiles = [];
      
      for (const team of results.userInfo.data.teams.slice(0, 2)) { // Limit to first 2 teams
        try {
          const teamProjects = await figmaApiRequest(`https://api.figma.com/v1/teams/${team.id}/projects`, token);
          
          const teamResult = {
            teamId: team.id,
            teamName: team.name,
            projectCount: teamProjects.projects?.length || 0,
            projects: []
          };
          
          for (const project of (teamProjects.projects || []).slice(0, 3)) { // Limit to first 3 projects
            try {
              const projectFiles = await figmaApiRequest(`https://api.figma.com/v1/projects/${project.id}/files`, token);
              
              teamResult.projects.push({
                id: project.id,
                name: project.name,
                fileCount: projectFiles.files?.length || 0,
                files: projectFiles.files?.slice(0, 3).map(file => ({
                  key: file.key,
                  name: file.name
                })) || []
              });
            } catch (projectError) {
              teamResult.projects.push({
                id: project.id,
                name: project.name,
                error: projectError.message
              });
            }
          }
          
          results.teamFiles.push(teamResult);
        } catch (teamError) {
          results.teamFiles.push({
            teamId: team.id,
            teamName: team.name,
            error: teamError.message
          });
        }
      }
    }
    
    res.json({
      success: true,
      message: 'Figma access debugging complete',
      results
    });
    
  } catch (error) {
    console.error('Debug Figma access error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Test Figma connection endpoint
router.get('/test-connection', fetchUser, async (req, res) => {
  try {
    const token = await getFigmaToken(req.user.id);
    const userInfo = await figmaApiRequest('https://api.figma.com/v1/me', token);
    
    res.json({
      success: true,
      message: 'Figma connection is working!',
      figmaUser: {
        handle: userInfo.handle,
        email: userInfo.email
      }
    });
    
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
});

// Get specific file details
router.get('/files/:fileId', fetchUser, async (req, res) => {
  try {
    const { fileId } = req.params;
    const token = await getFigmaToken(req.user.id);
    
    const figmaFileData = await figmaApiRequest(`https://api.figma.com/v1/files/${fileId}`, token);
    
    const localFile = await FigmaFile.findOneAndUpdate(
      { userId: req.user.id, figmaFileId: fileId },
      {
        userId: req.user.id,
        figmaFileId: fileId,
        name: figmaFileData.name,
        version: figmaFileData.version,
        lastModified: new Date(figmaFileData.lastModified),
        figmaData: figmaFileData,
        'localMetadata.lastSyncedAt': new Date()
      },
      { upsert: true, new: true }
    );
    
    res.json({
      success: true,
      file: localFile,
      figmaData: figmaFileData
    });
    
  } catch (error) {
    console.error('Get Figma file error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;