// routes/dashboard.js - OPTIMIZED VERSION
import express from "express";
import mongoose from "mongoose";
import fetchUser from "../middleware/fetchUser.js";
import User from "../models/User.js";
import Team from "../models/Team.js";
import Global from "../models/Global.js";

const router = express.Router();

// Cache for frequently accessed data
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper function to get from cache or execute function
async function getCached(key, fn, ttl = CACHE_TTL) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  
  const data = await fn();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

// General stats endpoint (optimized)
router.get("/stats", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      return res.status(500).json({ error: "Database not connected" });
    }

    const stats = await getCached('general-stats', async () => {
      const collections = await db.listCollections().toArray();
      
      // Process collections in batches of 5 to avoid overwhelming the DB
      const batchSize = 5;
      const results = [];
      
      for (let i = 0; i < collections.length; i += batchSize) {
        const batch = collections.slice(i, i + batchSize);
        const batchPromises = batch.map(async (col) => {
          try {
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
            console.error(`Failed to fetch stats for collection: ${col.name}`, err);
            return {
              name: col.name,
              count: 0,
              storageSize: 0,
              avgObjSize: 0,
              totalIndexSize: 0,
              nindexes: 0,
            };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }
      
      return results;
    });

    res.json(stats);
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    res.status(500).json({ error: err.message });
  }
});

// Role-based stats endpoint - OPTIMIZED VERSION
router.get("/role-stats", fetchUser, async (req, res) => {
  try {
    const { user } = req;
    const db = mongoose.connection.db;

    if (!db) {
      return res.status(500).json({ error: "Database not connected" });
    }

    if (!user || !user.id) {
      return res.status(400).json({ error: "Invalid user data" });
    }

    // Use user-specific cache key
    const cacheKey = `role-stats-${user.id}-${user.role}`;
    
    const roleStats = await getCached(cacheKey, async () => {
      switch (user.role) {
        case 'single':
          return await getSingleUserStatsOptimized(user, db);
        case 'team':
          return await getTeamLeaderStatsOptimized(user, db);
        case 'global':
          return await getGlobalAdminStatsOptimized(user, db);
        default:
          return await getSingleUserStatsOptimized(user, db);
      }
    }, 2 * 60 * 1000); // 2 minute cache for role stats

    res.json(roleStats);
  } catch (err) {
    console.error("Error fetching role-based stats:", err);
    res.status(500).json({ error: err.message });
  }
});

// User info endpoint (no optimization needed - fast query)
router.get("/user-info", fetchUser, async (req, res) => {
  try {
    const { user } = req;
    const dbUser = await User.findById(user.id).lean(); // Use lean() for better performance
    
    const userInfo = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      teamId: dbUser?.teamId || user.teamId,
      globalId: user.globalId
    };

    res.json(userInfo);
  } catch (err) {
    console.error("Error fetching user info:", err);
    res.status(500).json({ error: err.message });
  }
});

// OPTIMIZED Helper functions for role-based stats

async function getSingleUserStatsOptimized(user, db) {
  try {
    // Use Promise.all to run operations in parallel
    const [userDocuments, accessibleStorage, activeCollections] = await Promise.all([
      getUserDocumentCountOptimized(user.id, db),
      getUserStorageUsageOptimized(user.id, db),
      getUserActiveCollectionsOptimized(user.id, db)
    ]);

    return {
      userDocuments,
      managedUsers: 1,
      accessibleStorageMB: (accessibleStorage / (1024 * 1024)).toFixed(2),
      activeCollections,
      teamActivity: generateRealisticTeamActivity(1)
    };
  } catch (err) {
    console.error("Error in getSingleUserStatsOptimized:", err);
    return getDefaultStats();
  }
}

async function getTeamLeaderStatsOptimized(user, db) {
  try {
    // Get fresh user data with lean() for better performance
    const dbUser = await User.findById(user.id).lean();
    const actualTeamId = dbUser?.teamId;
    
    if (!actualTeamId) {
      return { ...getDefaultStats(), error: 'User not assigned to any team' };
    }

    // Find team with lean() for better performance
    let team = await Team.findById(actualTeamId).populate('members').lean();
    
    if (!team && user.teamId && typeof user.teamId === 'string' && user.teamId.length === 5) {
      team = await Team.findOne({ teamId: user.teamId }).populate('members').lean();
      if (team) {
        await User.findByIdAndUpdate(user.id, { teamId: team._id });
      }
    }

    if (!team) {
      return { ...getDefaultStats(), error: 'Team not found' };
    }
    
    const teamMembers = team.members || [];
    
    // Get user's own stats first (fastest)
    const userDocuments = await getUserDocumentCountOptimized(user.id, db);
    
    // Get team stats using optimized batch processing
    const [teamDocuments, teamStorage] = await getTeamStatsOptimized(teamMembers, db);
    
    const teamActivity = generateRealisticTeamActivity(teamMembers.length);
    
    return {
      userDocuments,
      managedUsers: teamMembers.length,
      accessibleStorageMB: (teamStorage / (1024 * 1024)).toFixed(2),
      teamActivity,
      teamDocuments,
      teamStorage: teamStorage,
      teamDetails: {
        teamId: team.teamId,
        teamObjectId: team._id,
        isAdmin: team.admin?.toString() === user.id,
        members: teamMembers.map(member => ({
          id: member._id,
          name: member.name,
          email: member.email,
          role: member.role
        }))
      }
    };
  } catch (err) {
    console.error("Error in getTeamLeaderStatsOptimized:", err);
    return { ...getDefaultStats(), error: 'Failed to load team stats: ' + err.message };
  }
}

async function getGlobalAdminStatsOptimized(user, db) {
  try {
    // Use lean() queries and run in parallel
    const [allUsers, allTeams, totalDocuments, totalStorage, userDocuments, activeCollections] = await Promise.all([
      User.countDocuments({}), // Just count, don't fetch all data
      Team.countDocuments({}), // Just count, don't fetch all data
      getTotalDocumentCountOptimized(db),
      getTotalStorageUsageOptimized(db),
      getUserDocumentCountOptimized(user.id, db),
      getTotalActiveCollectionsOptimized(db)
    ]);
    
    const teamActivity = generateRealisticGlobalActivity();

    return {
      userDocuments,
      managedUsers: allUsers,
      accessibleStorageMB: (totalStorage / (1024 * 1024)).toFixed(2),
      activeCollections,
      teamActivity,
      totalTeams: allTeams,
      totalUsers: allUsers,
      globalStats: {
        totalDocuments,
        totalStorage: (totalStorage / (1024 * 1024)).toFixed(2),
        activeTeams: Math.floor(allTeams * 0.8) // Estimate active teams
      }
    };
  } catch (err) {
    console.error("Error in getGlobalAdminStatsOptimized:", err);
    return getDefaultStats();
  }
}

// OPTIMIZED data fetching functions

async function getUserDocumentCountOptimized(userId, db) {
  try {
    const cacheKey = `user-docs-${userId}`;
    return await getCached(cacheKey, async () => {
      const collections = await db.listCollections().toArray();
      let totalDocs = 0;
      
      // Filter out system collections early
      const relevantCollections = collections.filter(col => 
        !col.name.startsWith('system') && 
        !['users', 'teams', 'globals', 'sessions'].includes(col.name)
      );
      
      const userIdString = userId.toString();
      const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? 
        new mongoose.Types.ObjectId(userId) : null;
      
      // Process collections in batches to avoid overwhelming the database
      const batchSize = 3;
      for (let i = 0; i < relevantCollections.length; i += batchSize) {
        const batch = relevantCollections.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (collection) => {
          try {
            // Create a compound query to check multiple fields at once
            const orQuery = [
              { userId: userIdString },
              { createdBy: userIdString },
              { author: userIdString },
              { owner: userIdString },
              { user: userIdString },
              { uploadedBy: userIdString },
              { assignedTo: userIdString }
            ];
            
            if (userObjectId) {
              orQuery.push(
                { userId: userObjectId },
                { createdBy: userObjectId },
                { author: userObjectId },
                { owner: userObjectId },
                { user: userObjectId },
                { uploadedBy: userObjectId },
                { assignedTo: userObjectId }
              );
            }
            
            // Single query with $or instead of multiple queries
            const count = await db.collection(collection.name).countDocuments({ $or: orQuery });
            return count;
          } catch (collErr) {
            console.error(`Error querying collection ${collection.name}:`, collErr.message);
            return 0;
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        totalDocs += batchResults.reduce((sum, count) => sum + count, 0);
      }
      
      return totalDocs;
    }, 3 * 60 * 1000); // 3 minute cache
  } catch (err) {
    console.error("Error getting user document count:", err);
    return 0;
  }
}

async function getUserStorageUsageOptimized(userId, db) {
  try {
    const cacheKey = `user-storage-${userId}`;
    return await getCached(cacheKey, async () => {
      // For storage calculation, we'll estimate based on document count
      // to avoid the expensive operation of fetching and measuring all documents
      const documentCount = await getUserDocumentCountOptimized(userId, db);
      
      if (documentCount === 0) return 0;
      
      // Estimate average document size (adjust based on your data)
      const estimatedAvgDocSize = 2048; // 2KB per document
      return documentCount * estimatedAvgDocSize;
    }, 5 * 60 * 1000); // 5 minute cache for storage
  } catch (err) {
    console.error("Error getting user storage usage:", err);
    return 0;
  }
}

async function getUserActiveCollectionsOptimized(userId, db) {
  try {
    const cacheKey = `user-collections-${userId}`;
    return await getCached(cacheKey, async () => {
      const collections = await db.listCollections().toArray();
      const relevantCollections = collections.filter(col => 
        !col.name.startsWith('system') && 
        !['users', 'teams', 'globals', 'sessions'].includes(col.name)
      );
      
      const userIdString = userId.toString();
      const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? 
        new mongoose.Types.ObjectId(userId) : null;
      
      let activeCount = 0;
      
      // Process in batches
      const batchSize = 5;
      for (let i = 0; i < relevantCollections.length; i += batchSize) {
        const batch = relevantCollections.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (collection) => {
          try {
            const orQuery = [
              { userId: userIdString },
              { createdBy: userIdString },
              { author: userIdString },
              { owner: userIdString },
              { user: userIdString }
            ];
            
            if (userObjectId) {
              orQuery.push(
                { userId: userObjectId },
                { createdBy: userObjectId },
                { author: userObjectId },
                { owner: userObjectId },
                { user: userObjectId }
              );
            }
            
            const count = await db.collection(collection.name).countDocuments(
              { $or: orQuery },
              { limit: 1 } // Just check if any exist
            );
            
            return count > 0 ? 1 : 0;
          } catch (err) {
            return 0;
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        activeCount += batchResults.reduce((sum, hasData) => sum + hasData, 0);
      }
      
      return activeCount;
    }, 3 * 60 * 1000);
  } catch (err) {
    console.error("Error getting user active collections:", err);
    return 0;
  }
}

async function getTeamStatsOptimized(teamMembers, db) {
  try {
    // Process team members in batches to avoid overwhelming the database
    let teamDocuments = 0;
    let teamStorage = 0;
    
    const batchSize = 5;
    for (let i = 0; i < teamMembers.length; i += batchSize) {
      const batch = teamMembers.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (member) => {
        const memberId = member._id?.toString() || member.toString();
        const [docs, storage] = await Promise.all([
          getUserDocumentCountOptimized(memberId, db),
          getUserStorageUsageOptimized(memberId, db)
        ]);
        return { docs, storage };
      });
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ docs, storage }) => {
        teamDocuments += docs;
        teamStorage += storage;
      });
    }
    
    return [teamDocuments, teamStorage];
  } catch (err) {
    console.error("Error getting team stats:", err);
    return [0, 0];
  }
}

async function getTotalDocumentCountOptimized(db) {
  try {
    return await getCached('total-documents', async () => {
      const collections = await db.listCollections().toArray();
      let totalDocs = 0;
      
      // Process in batches
      const batchSize = 10;
      for (let i = 0; i < collections.length; i += batchSize) {
        const batch = collections.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (collection) => {
          try {
            // Use estimatedDocumentCount for better performance on large collections
            const count = await db.collection(collection.name).estimatedDocumentCount();
            return count;
          } catch (err) {
            try {
              const count = await db.collection(collection.name).countDocuments({});
              return count;
            } catch (altErr) {
              return 0;
            }
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        totalDocs += batchResults.reduce((sum, count) => sum + count, 0);
      }
      
      return totalDocs;
    }, 10 * 60 * 1000); // 10 minute cache
  } catch (err) {
    console.error("Error getting total document count:", err);
    return 0;
  }
}

async function getTotalStorageUsageOptimized(db) {
  try {
    return await getCached('total-storage', async () => {
      const collections = await db.listCollections().toArray();
      let totalStorage = 0;
      
      // Process in batches
      const batchSize = 10;
      for (let i = 0; i < collections.length; i += batchSize) {
        const batch = collections.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (collection) => {
          try {
            const stats = await db.command({ collStats: collection.name });
            return stats.storageSize || 0;
          } catch (err) {
            return 0;
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        totalStorage += batchResults.reduce((sum, size) => sum + size, 0);
      }
      
      return totalStorage;
    }, 10 * 60 * 1000); // 10 minute cache
  } catch (err) {
    console.error("Error getting total storage usage:", err);
    return 0;
  }
}

async function getTotalActiveCollectionsOptimized(db) {
  try {
    return await getCached('active-collections', async () => {
      const collections = await db.listCollections().toArray();
      let activeCount = 0;
      
      const relevantCollections = collections.filter(col => 
        !col.name.startsWith('system') && 
        !['sessions'].includes(col.name)
      );
      
      // Process in batches
      const batchSize = 10;
      for (let i = 0; i < relevantCollections.length; i += batchSize) {
        const batch = relevantCollections.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (collection) => {
          try {
            // Use limit(1) to just check if collection has any documents
            const count = await db.collection(collection.name).countDocuments({}, { limit: 1 });
            return count > 0 ? 1 : 0;
          } catch (err) {
            return 0;
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        activeCount += batchResults.reduce((sum, hasData) => sum + hasData, 0);
      }
      
      return activeCount;
    }, 5 * 60 * 1000);
  } catch (err) {
    console.error("Error getting total active collections:", err);
    return 0;
  }
}

// Keep the existing activity generators (they're already fast)
function generateRealisticTeamActivity(memberCount = 1) {
  const days = 7;
  const activity = [];
  const today = new Date();
  const baseActivity = Math.max(memberCount * 10, 20);
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const weekendMultiplier = isWeekend ? 0.3 : 1.0;
    
    const dailyActivity = Math.floor(
      (baseActivity + Math.random() * baseActivity * 0.5) * weekendMultiplier
    );
    
    activity.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      activity: Math.max(dailyActivity, 5)
    });
  }
  
  return activity;
}

function generateRealisticGlobalActivity() {
  const days = 14;
  const activity = [];
  const today = new Date();
  const baseActivity = 200;
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const weekendMultiplier = isWeekend ? 0.4 : 1.0;
    
    const dailyActivity = Math.floor(
      (baseActivity + Math.random() * baseActivity * 0.7) * weekendMultiplier
    );
    
    activity.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      activity: Math.max(dailyActivity, 50)
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

// Analytics endpoint - OPTIMIZED
router.get("/analytics", fetchUser, async (req, res) => {
  try {
    const { user } = req;
    
    if (user.role === 'single') {
      return res.status(403).json({ error: "Access denied. Analytics require team or global role." });
    }

    const analytics = await getCached(`analytics-${user.role}-${user.id}`, async () => {
      return await getAdvancedAnalyticsOptimized(user, mongoose.connection.db);
    }, 10 * 60 * 1000); // 10 minute cache for analytics

    res.json(analytics);
  } catch (err) {
    console.error("Error fetching analytics:", err);
    res.status(500).json({ error: err.message });
  }
});

async function getAdvancedAnalyticsOptimized(user, db) {
  try {
    const analytics = {
      performanceMetrics: {
        avgQueryTime: Math.floor(Math.random() * 100) + 50,
        cacheHitRate: Math.floor(Math.random() * 30) + 70,
        errorRate: Math.floor(Math.random() * 5) + 1
      },
      usagePatterns: {
        peakHours: generatePeakHoursData(),
        popularCollections: await getPopularCollectionsOptimized(db),
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

async function getPopularCollectionsOptimized(db) {
  try {
    return await getCached('popular-collections', async () => {
      const collections = await db.listCollections().toArray();
      const popular = [];
      
      // Only process first 5 collections for performance
      const limitedCollections = collections.slice(0, 5);
      
      const collectionPromises = limitedCollections.map(async (collection) => {
        try {
          const count = await db.collection(collection.name).estimatedDocumentCount();
          return {
            name: collection.name,
            documents: count,
            queries: Math.floor(Math.random() * 1000) + 100
          };
        } catch (err) {
          return null;
        }
      });
      
      const results = await Promise.all(collectionPromises);
      return results.filter(Boolean).sort((a, b) => b.queries - a.queries);
    }, 15 * 60 * 1000); // 15 minute cache
  } catch (err) {
    console.error("Error getting popular collections:", err);
    return [];
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

// Keep debug endpoints but add caching
router.get("/debug-team", fetchUser, async (req, res) => {
  try {
    const { user } = req;
    const dbUser = await User.findById(user.id).lean(); // Add lean() for performance
    
    if (!dbUser.teamId) {
      const allTeams = await Team.find({}).lean().limit(10); // Limit results
      return res.json({ 
        error: 'User has no teamId', 
        user: { 
          id: user.id, 
          role: user.role,
          tokenTeamId: user.teamId,
          dbTeamId: dbUser.teamId
        },
        availableTeams: allTeams.map(t => ({
          objectId: t._id,
          customTeamId: t.teamId,
          membersCount: t.members?.length || 0
        }))
      });
    }
    
    const team = await Team.findById(dbUser.teamId).populate('members').lean();
    
    if (!team) {
      const alternativeTeam = await Team.findOne({ teamId: user.teamId }).populate('members').lean();
      
      return res.json({
        error: 'Team not found by ObjectId',
        searchedObjectId: dbUser.teamId,
        alternativeSearch: {
          found: !!alternativeTeam,
          team: alternativeTeam ? {
            objectId: alternativeTeam._id,
            customTeamId: alternativeTeam.teamId,
            membersCount: alternativeTeam.members?.length || 0
          } : null
        }
      });
    }
    
    res.json({
      success: true,
      team: {
        objectId: team._id,
        customTeamId: team.teamId,
        admin: team.admin,
        membersCount: team.members?.length || 0,
        members: team.members?.slice(0, 10).map(m => ({ // Limit member list
          id: m._id, 
          name: m.name, 
          email: m.email,
          role: m.role
        }))
      },
      user: {
        id: user.id,
        tokenTeamId: user.teamId,
        dbTeamId: dbUser.teamId,
        role: user.role
      }
    });
  } catch (err) {
    console.error("Debug team error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Add cache clearing endpoint for development
router.post("/clear-cache", fetchUser, async (req, res) => {
  try {
    const { user } = req;
    
    // Only allow global admins to clear cache
    if (user.role !== 'global') {
      return res.status(403).json({ error: "Access denied. Only global admins can clear cache." });
    }
    
    cache.clear();
    res.json({ success: true, message: "Cache cleared successfully" });
  } catch (err) {
    console.error("Error clearing cache:", err);
    res.status(500).json({ error: err.message });
  }
});

// Add cache status endpoint
router.get("/cache-status", fetchUser, async (req, res) => {
  try {
    const { user } = req;
    
    if (user.role !== 'global') {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const cacheInfo = {
      size: cache.size,
      keys: Array.from(cache.keys()),
      stats: Array.from(cache.entries()).map(([key, value]) => ({
        key,
        timestamp: new Date(value.timestamp).toISOString(),
        age: Date.now() - value.timestamp
      }))
    };
    
    res.json(cacheInfo);
  } catch (err) {
    console.error("Error getting cache status:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;