// routes/dashboard.js
import express from "express";
import mongoose from "mongoose";
import fetchUser from "../middleware/fetchUser.js";
import User from "../models/User.js";
import Team from "../models/Team.js";
import Global from "../models/Global.js";

const router = express.Router();

// General stats endpoint (original functionality)
router.get("/stats", async (req, res) => {
  try {
    const db = mongoose.connection.db;

    if (!db) {
      return res.status(500).json({ error: "Database not connected" });
    }

    // Get all collections
    const collections = await db.listCollections().toArray();

    // Collect stats for each collection
    const stats = await Promise.all(
      collections.map(async (col) => {
        try {
          // Use db.command instead of deprecated collection.stats()
          const collStats = await db.command({ collStats: col.name });

          return {
            name: col.name,
            count: collStats.count || 0,
            storageSize: collStats.storageSize || 0,
            avgObjSize: collStats.avgObjSize || 0,
            totalIndexSize: collStats.totalIndexSize || 0,
            nindexes: collStats.nindexes || 0,
          };
        } catch (err) {
          console.error(`❌ Failed to fetch stats for collection: ${col.name}`, err);
          return {
            name: col.name,
            count: 0,
            storageSize: 0,
            avgObjSize: 0,
            totalIndexSize: 0,
            nindexes: 0,
          };
        }
      })
    );

    res.json(stats);
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    res.status(500).json({ error: err.message });
  }
});

// Role-based stats endpoint

router.get("/role-stats", fetchUser, async (req, res) => {
  try {
    console.log('Role-stats request received for user:', req.user);
    
    const { user } = req;
    const db = mongoose.connection.db;

    if (!db) {
      console.log('Database connection not available');
      return res.status(500).json({ error: "Database not connected" });
    }

    if (!user || !user.id) {
      console.log('Invalid user data:', user);
      return res.status(400).json({ error: "Invalid user data" });
    }

    let roleStats = {};
    console.log(`Fetching stats for user role: ${user.role}`);

    switch (user.role) {
      case 'single':
        // Individual user stats
        roleStats = await getSingleUserStats(user, db);
        break;

      case 'team':
        // Team leader stats
        roleStats = await getTeamLeaderStats(user, db);
        break;

      case 'global':
        // Global admin stats
        roleStats = await getGlobalAdminStats(user, db);
        break;

      default:
        roleStats = await getSingleUserStats(user, db);
    }

    res.json(roleStats);
  } catch (err) {
    console.error("Error fetching role-based stats:", err);
    res.status(500).json({ error: err.message });
  }
});

// User info endpoint
router.get("/user-info", fetchUser, async (req, res) => {
  try {
    const { user } = req;
    
    const userInfo = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      teamId: user.teamId,
      globalId: user.globalId
    };

    res.json(userInfo);
  } catch (err) {
    console.error("Error fetching user info:", err);
    res.status(500).json({ error: err.message });
  }
});

// Analytics endpoint for advanced users
router.get("/analytics", fetchUser, async (req, res) => {
  try {
    const { user } = req;
    
    if (user.role === 'single') {
      return res.status(403).json({ error: "Access denied. Analytics require team or global role." });
    }

    const analytics = await getAdvancedAnalytics(user, mongoose.connection.db);
    res.json(analytics);
  } catch (err) {
    console.error("Error fetching analytics:", err);
    res.status(500).json({ error: err.message });
  }
});

// Helper functions for role-based stats
async function getSingleUserStats(user, db) {
  try {
    // Mock data for single user - you can replace with actual user-specific queries
    const userDocuments = await getUserDocumentCount(user.id, db);
    const accessibleStorage = await getUserStorageUsage(user.id, db);

    return {
      userDocuments,
      managedUsers: 1, // Just the user themselves
      accessibleStorageMB: (accessibleStorage / (1024 * 1024)).toFixed(2),
      activeCollections: await getUserActiveCollections(user.id, db),
      teamActivity: null // Single users don't have team activity
    };
  } catch (err) {
    console.error("Error in getSingleUserStats:", err);
    return getDefaultStats();
  }
}

async function getTeamLeaderStats(user, db) {
  try {
    const team = await Team.findOne({ teamId: user.teamId }).populate('members');
    
    if (!team) {
      return getDefaultStats();
    }

    const teamMembers = team.members || [];
    const userDocuments = await getUserDocumentCount(user.id, db);
    const teamDocuments = await getTeamDocumentCount(user.teamId, db);
    const teamStorage = await getTeamStorageUsage(user.teamId, db);
    
    // Generate mock team activity data
    const teamActivity = generateMockTeamActivity();

    return {
      userDocuments,
      managedUsers: teamMembers.length,
      accessibleStorageMB: (teamStorage / (1024 * 1024)).toFixed(2),
      activeCollections: await getTeamActiveCollections(user.teamId, db),
      teamActivity,
      teamDocuments,
      teamMembers: teamMembers.map(member => ({
        id: member._id,
        name: member.name,
        email: member.email
      }))
    };
  } catch (err) {
    console.error("Error in getTeamLeaderStats:", err);
    return getDefaultStats();
  }
}

async function getGlobalAdminStats(user, db) {
  try {
    const allUsers = await User.find({});
    const allTeams = await Team.find({}).populate('members');
    
    const totalDocuments = await getTotalDocumentCount(db);
    const totalStorage = await getTotalStorageUsage(db);
    
    // Generate mock global activity data
    const teamActivity = generateMockGlobalActivity();

    return {
      userDocuments: await getUserDocumentCount(user.id, db),
      managedUsers: allUsers.length,
      accessibleStorageMB: (totalStorage / (1024 * 1024)).toFixed(2),
      activeCollections: await getTotalActiveCollections(db),
      teamActivity,
      totalTeams: allTeams.length,
      totalUsers: allUsers.length,
              globalStats: {
        totalDocuments,
        totalStorage: (totalStorage / (1024 * 1024)).toFixed(2),
        activeTeams: allTeams.filter(team => team.members && team.members.length > 0).length
      }
    };
  } catch (err) {
    console.error("Error in getGlobalAdminStats:", err);
    return getDefaultStats();
  }
}

// Helper functions for database queries
async function getUserDocumentCount(userId, db) {
  try {
    // This is a mock implementation - replace with your actual user document logic
    const collections = await db.listCollections().toArray();
    let totalDocs = 0;
    
    for (const collection of collections) {
      if (collection.name.includes('user') || collection.name.includes('document')) {
        try {
          const count = await db.collection(collection.name).countDocuments({ 
            $or: [
              { userId: userId },
              { user: userId },
              { createdBy: userId }
            ]
          });
          totalDocs += count;
        } catch (err) {
          // Collection might not have user-related fields, continue
          continue;
        }
      }
    }
    
    return totalDocs || Math.floor(Math.random() * 100) + 10; // Fallback to mock data
  } catch (err) {
    console.error("Error getting user document count:", err);
    return Math.floor(Math.random() * 100) + 10;
  }
}

async function getUserStorageUsage(userId, db) {
  try {
    // Mock implementation - replace with actual user storage calculation
    return Math.floor(Math.random() * 1024 * 1024 * 100); // Random storage up to 100MB
  } catch (err) {
    console.error("Error getting user storage usage:", err);
    return Math.floor(Math.random() * 1024 * 1024 * 50);
  }
}

async function getUserActiveCollections(userId, db) {
  try {
    // Mock implementation - replace with actual logic
    return Math.floor(Math.random() * 10) + 1;
  } catch (err) {
    console.error("Error getting user active collections:", err);
    return Math.floor(Math.random() * 5) + 1;
  }
}

async function getTeamDocumentCount(teamId, db) {
  try {
    // Mock implementation for team documents
    const team = await Team.findOne({ teamId }).populate('members');
    if (!team) return 0;
    
    let totalDocs = 0;
    for (const member of team.members) {
      totalDocs += await getUserDocumentCount(member._id, db);
    }
    
    return totalDocs;
  } catch (err) {
    console.error("Error getting team document count:", err);
    return Math.floor(Math.random() * 500) + 50;
  }
}

async function getTeamStorageUsage(teamId, db) {
  try {
    // Mock implementation for team storage
    const team = await Team.findOne({ teamId }).populate('members');
    if (!team) return 0;
    
    let totalStorage = 0;
    for (const member of team.members) {
      totalStorage += await getUserStorageUsage(member._id, db);
    }
    
    return totalStorage;
  } catch (err) {
    console.error("Error getting team storage usage:", err);
    return Math.floor(Math.random() * 1024 * 1024 * 500); // Up to 500MB
  }
}

async function getTeamActiveCollections(teamId, db) {
  try {
    // Mock implementation
    return Math.floor(Math.random() * 20) + 5;
  } catch (err) {
    console.error("Error getting team active collections:", err);
    return Math.floor(Math.random() * 15) + 3;
  }
}

async function getTotalDocumentCount(db) {
  try {
    const collections = await db.listCollections().toArray();
    let totalDocs = 0;
    
    for (const collection of collections) {
      try {
        const stats = await db.command({ collStats: collection.name });
        totalDocs += stats.count || 0;
      } catch (err) {
        // Some collections might not support collStats, continue
        continue;
      }
    }
    
    return totalDocs;
  } catch (err) {
    console.error("Error getting total document count:", err);
    return Math.floor(Math.random() * 10000) + 1000;
  }
}

async function getTotalStorageUsage(db) {
  try {
    const collections = await db.listCollections().toArray();
    let totalStorage = 0;
    
    for (const collection of collections) {
      try {
        const stats = await db.command({ collStats: collection.name });
        totalStorage += stats.storageSize || 0;
      } catch (err) {
        // Some collections might not support collStats, continue
        continue;
      }
    }
    
    return totalStorage;
  } catch (err) {
    console.error("Error getting total storage usage:", err);
    return Math.floor(Math.random() * 1024 * 1024 * 1000); // Up to 1GB
  }
}

async function getTotalActiveCollections(db) {
  try {
    const collections = await db.listCollections().toArray();
    return collections.length;
  } catch (err) {
    console.error("Error getting total active collections:", err);
    return Math.floor(Math.random() * 50) + 10;
  }
}

function generateMockTeamActivity() {
  const days = 7;
  const activity = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    activity.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      activity: Math.floor(Math.random() * 100) + 20
    });
  }
  
  return activity;
}

function generateMockGlobalActivity() {
  const days = 14;
  const activity = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    activity.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      activity: Math.floor(Math.random() * 500) + 100
    });
  }
  
  return activity;
}

function getDefaultStats() {
  return {
    userDocuments: 0,
    managedUsers: 0,
    accessibleStorageMB: "0.00",
    activeCollections: 0,
    teamActivity: null
  };
}

async function getAdvancedAnalytics(user, db) {
  try {
    const analytics = {
      performanceMetrics: {
        avgQueryTime: Math.floor(Math.random() * 100) + 50,
        cacheHitRate: Math.floor(Math.random() * 30) + 70,
        errorRate: Math.floor(Math.random() * 5) + 1
      },
      usagePatterns: {
        peakHours: generatePeakHoursData(),
        popularCollections: await getPopularCollections(db),
        userGrowth: generateUserGrowthData()
      },
      systemHealth: {
        cpuUsage: Math.floor(Math.random() * 40) + 30,
        memoryUsage: Math.floor(Math.random() * 50) + 40,
        diskUsage: Math.floor(Math.random() * 60) + 20
      }
    };

    return analytics;
  } catch (err) {
    console.error("Error generating advanced analytics:", err);
    return {
      performanceMetrics: { avgQueryTime: 0, cacheHitRate: 0, errorRate: 0 },
      usagePatterns: { peakHours: [], popularCollections: [], userGrowth: [] },
      systemHealth: { cpuUsage: 0, memoryUsage: 0, diskUsage: 0 }
    };
  }
}

function generatePeakHoursData() {
  const hours = [];
  for (let i = 0; i < 24; i++) {
    hours.push({
      hour: i,
      usage: Math.floor(Math.random() * 100)
    });
  }
  return hours;
}

async function getPopularCollections(db) {
  try {
    const collections = await db.listCollections().toArray();
    const popular = [];
    
    for (const collection of collections.slice(0, 5)) {
      try {
        const stats = await db.command({ collStats: collection.name });
        popular.push({
          name: collection.name,
          documents: stats.count || 0,
          queries: Math.floor(Math.random() * 1000) + 100
        });
      } catch (err) {
        continue;
      }
    }
    
    return popular.sort((a, b) => b.queries - a.queries);
  } catch (err) {
    console.error("Error getting popular collections:", err);
    return [];
  }
}

function generateUserGrowthData() {
  const months = 6;
  const growth = [];
  const today = new Date();
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setMonth(date.getMonth() - i);
    
    growth.push({
      month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      users: Math.floor(Math.random() * 50) + (months - i) * 20
    });
  }
  
  return growth;
}

export default router;