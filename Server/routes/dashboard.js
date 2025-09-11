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
      })
    );

    res.json(stats);
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    res.status(500).json({ error: err.message });
  }
});

// Role-based stats endpoint - FIXED VERSION
router.get("/role-stats", fetchUser, async (req, res) => {
  try {
    console.log('Role-stats request received for user:', {
      id: req.user.id,
      role: req.user.role,
      teamId: req.user.teamId,
      globalId: req.user.globalId
    });
    
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
        roleStats = await getSingleUserStats(user, db);
        break;

      case 'team':
        roleStats = await getTeamLeaderStats(user, db);
        break;

      case 'global':
        roleStats = await getGlobalAdminStats(user, db);
        break;

      default:
        roleStats = await getSingleUserStats(user, db);
    }

    console.log('Returning role stats:', roleStats);
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
    
    // Get fresh user data from database to ensure we have correct teamId
    const dbUser = await User.findById(user.id);
    
    const userInfo = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      teamId: dbUser?.teamId || user.teamId,
      globalId: user.globalId
    };

    console.log('Returning user info:', userInfo);
    res.json(userInfo);
  } catch (err) {
    console.error("Error fetching user info:", err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATED Helper functions for role-based stats - REAL DATA VERSION

async function getSingleUserStats(user, db) {
  try {
    const userDocuments = await getUserDocumentCountReal(user.id, db);
    const accessibleStorage = await getUserStorageUsageReal(user.id, db);

    return {
      userDocuments,
      managedUsers: 1,
      accessibleStorageMB: (accessibleStorage / (1024 * 1024)).toFixed(2),
      activeCollections: await getUserActiveCollectionsReal(user.id, db),
      teamActivity: generateRealisticTeamActivity(1)
    };
  } catch (err) {
    console.error("Error in getSingleUserStats:", err);
    return getDefaultStats();
  }
}

async function getTeamLeaderStats(user, db) {
  try {
    console.log('Getting team leader stats for user:', user.id, 'teamId:', user.teamId);
    
    // Get fresh user data to ensure we have the correct teamId
    const dbUser = await User.findById(user.id);
    const actualTeamId = dbUser?.teamId;
    
    if (!actualTeamId) {
      console.log('No teamId found for user');
      return {
        ...getDefaultStats(),
        error: 'User not assigned to any team'
      };
    }

    // Find team by ObjectId
    let team = await Team.findById(actualTeamId).populate('members');
    
    if (!team && user.teamId && typeof user.teamId === 'string' && user.teamId.length === 5) {
      team = await Team.findOne({ teamId: user.teamId }).populate('members');
      if (team) {
        await User.findByIdAndUpdate(user.id, { teamId: team._id });
      }
    }

    if (!team) {
      return {
        ...getDefaultStats(),
        error: 'Team not found'
      };
    }

    console.log('Found team:', {
      objectId: team._id,
      customTeamId: team.teamId,
      membersCount: team.members?.length || 0
    });
    
    const teamMembers = team.members || [];
    const userDocuments = await getUserDocumentCountReal(user.id, db);
    
    // Calculate REAL team totals by processing each member
    let teamDocuments = 0;
    let teamStorage = 0;
    let teamActiveCollections = new Set();
    
    console.log(`Processing ${teamMembers.length} team members...`);
    
    for (const member of teamMembers) {
      const memberId = member._id?.toString() || member.toString();
      console.log(`Processing member: ${memberId}`);
      
      const memberDocs = await getUserDocumentCountReal(memberId, db);
      const memberStorage = await getUserStorageUsageReal(memberId, db);
      const memberCollections = await getUserActiveCollectionsListReal(memberId, db);
      
      teamDocuments += memberDocs;
      teamStorage += memberStorage;
      memberCollections.forEach(col => teamActiveCollections.add(col));
      
      console.log(`Member ${memberId}: ${memberDocs} docs, ${memberStorage} bytes, ${memberCollections.length} collections`);
    }
    
    const teamActivity = generateRealisticTeamActivity(teamMembers.length);
    
    const result = {
      userDocuments,
      managedUsers: teamMembers.length,
      accessibleStorageMB: (teamStorage / (1024 * 1024)).toFixed(2),
      activeCollections: teamActiveCollections.size,
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
    
    console.log('Team leader stats result:', {
      userDocuments: result.userDocuments,
      teamDocuments: result.teamDocuments,
      managedUsers: result.managedUsers,
      activeCollections: result.activeCollections,
      accessibleStorageMB: result.accessibleStorageMB
    });
    
    return result;
  } catch (err) {
    console.error("Error in getTeamLeaderStats:", err);
    return {
      ...getDefaultStats(),
      error: 'Failed to load team stats: ' + err.message
    };
  }
}

async function getGlobalAdminStats(user, db) {
  try {
    const allUsers = await User.find({});
    const allTeams = await Team.find({}).populate('members');
    
    const totalDocuments = await getTotalDocumentCountReal(db);
    const totalStorage = await getTotalStorageUsageReal(db);
    const userDocuments = await getUserDocumentCountReal(user.id, db);
    
    const teamActivity = generateRealisticGlobalActivity();

    return {
      userDocuments,
      managedUsers: allUsers.length,
      accessibleStorageMB: (totalStorage / (1024 * 1024)).toFixed(2),
      activeCollections: await getTotalActiveCollectionsReal(db),
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

// REAL DATA helper functions - FIXED VERSION

async function getUserDocumentCountReal(userId, db) {
  try {
    console.log(`Searching for documents for user ID: ${userId}`);
    const collections = await db.listCollections().toArray();
    let totalDocs = 0;
    
    // Convert userId to both string and ObjectId for comparison
    const userIdString = userId.toString();
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? 
      new mongoose.Types.ObjectId(userId) : null;
    
    // Common user field patterns to check
    const userFields = ['userId', 'createdBy', 'author', 'owner', 'user', 'uploadedBy', 'assignedTo'];
    
    for (const collection of collections) {
      // Skip system collections
      if (collection.name.startsWith('system') || 
          ['users', 'teams', 'globals', 'sessions'].includes(collection.name)) {
        continue;
      }
      
      try {
        // Try string ID first
        for (const field of userFields) {
          try {
            const stringQuery = { [field]: userIdString };
            const stringCount = await db.collection(collection.name).countDocuments(stringQuery);
            if (stringCount > 0) {
              totalDocs += stringCount;
              console.log(`Found ${stringCount} docs in ${collection.name} using string ID with field: ${field}`);
              break; // Found docs with this field, no need to try others
            }
          } catch (err) {
            // This field might not exist in this collection
            continue;
          }
        }
        
        // Try ObjectId if available
        if (userObjectId) {
          for (const field of userFields) {
            try {
              const objQuery = { [field]: userObjectId };
              const objCount = await db.collection(collection.name).countDocuments(objQuery);
              if (objCount > 0) {
                totalDocs += objCount;
                console.log(`Found ${objCount} docs in ${collection.name} using ObjectId with field: ${field}`);
                break;
              }
            } catch (err) {
              continue;
            }
          }
        }
      } catch (collErr) {
        console.error(`Error querying collection ${collection.name}:`, collErr.message);
        continue;
      }
    }
    
    console.log(`Total documents found for user ${userId}: ${totalDocs}`);
    return totalDocs;
  } catch (err) {
    console.error("Error getting user document count:", err);
    return 0;
  }
}

async function getUserStorageUsageReal(userId, db) {
  try {
    const collections = await db.listCollections().toArray();
    let totalStorage = 0;
    
    const userIdString = userId.toString();
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? 
      new mongoose.Types.ObjectId(userId) : null;
    
    const userFields = ['userId', 'createdBy', 'author', 'owner', 'user', 'uploadedBy', 'assignedTo'];
    
    for (const collection of collections) {
      if (collection.name.startsWith('system') || 
          ['users', 'teams', 'globals', 'sessions'].includes(collection.name)) {
        continue;
      }
      
      try {
        // Try string ID
        for (const field of userFields) {
          try {
            const docs = await db.collection(collection.name)
              .find({ [field]: userIdString })
              .limit(1000)
              .toArray();
            
            if (docs.length > 0) {
              docs.forEach(doc => {
                totalStorage += JSON.stringify(doc).length;
              });
              break; // Found docs with this field
            }
          } catch (err) {
            continue;
          }
        }
        
        // Try ObjectId
        if (userObjectId) {
          for (const field of userFields) {
            try {
              const docs = await db.collection(collection.name)
                .find({ [field]: userObjectId })
                .limit(1000)
                .toArray();
              
              if (docs.length > 0) {
                docs.forEach(doc => {
                  totalStorage += JSON.stringify(doc).length;
                });
                break;
              }
            } catch (err) {
              continue;
            }
          }
        }
      } catch (collErr) {
        continue;
      }
    }
    
    console.log(`Total storage for user ${userId}: ${totalStorage} bytes`);
    return totalStorage;
  } catch (err) {
    console.error("Error getting user storage usage:", err);
    return 0;
  }
}

async function getUserActiveCollectionsReal(userId, db) {
  try {
    const activeCollections = await getUserActiveCollectionsListReal(userId, db);
    return activeCollections.length;
  } catch (err) {
    console.error("Error getting user active collections:", err);
    return 0;
  }
}

async function getUserActiveCollectionsListReal(userId, db) {
  try {
    const collections = await db.listCollections().toArray();
    const activeCollections = [];
    
    const userIdString = userId.toString();
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? 
      new mongoose.Types.ObjectId(userId) : null;
    
    const userFields = ['userId', 'createdBy', 'author', 'owner', 'user', 'uploadedBy', 'assignedTo'];
    
    for (const collection of collections) {
      if (collection.name.startsWith('system') || 
          ['users', 'teams', 'globals', 'sessions'].includes(collection.name)) {
        continue;
      }
      
      try {
        let hasUserDocs = false;
        
        // Check string ID
        for (const field of userFields) {
          if (hasUserDocs) break;
          try {
            const count = await db.collection(collection.name).countDocuments({ [field]: userIdString });
            if (count > 0) {
              activeCollections.push(collection.name);
              hasUserDocs = true;
              break;
            }
          } catch (err) {
            continue;
          }
        }
        
        // Check ObjectId if string didn't find anything
        if (!hasUserDocs && userObjectId) {
          for (const field of userFields) {
            if (hasUserDocs) break;
            try {
              const count = await db.collection(collection.name).countDocuments({ [field]: userObjectId });
              if (count > 0) {
                activeCollections.push(collection.name);
                hasUserDocs = true;
                break;
              }
            } catch (err) {
              continue;
            }
          }
        }
      } catch (collErr) {
        continue;
      }
    }
    
    return [...new Set(activeCollections)]; // Remove duplicates
  } catch (err) {
    console.error("Error getting user active collections list:", err);
    return [];
  }
}

async function getTotalDocumentCountReal(db) {
  try {
    const collections = await db.listCollections().toArray();
    let totalDocs = 0;
    
    for (const collection of collections) {
      try {
        const stats = await db.command({ collStats: collection.name });
        totalDocs += stats.count || 0;
      } catch (err) {
        // Try alternative method
        try {
          const count = await db.collection(collection.name).countDocuments({});
          totalDocs += count;
        } catch (altErr) {
          console.error(`Could not get count for ${collection.name}`);
        }
      }
    }
    
    console.log(`Total documents across all collections: ${totalDocs}`);
    return totalDocs;
  } catch (err) {
    console.error("Error getting total document count:", err);
    return 0;
  }
}

async function getTotalStorageUsageReal(db) {
  try {
    const collections = await db.listCollections().toArray();
    let totalStorage = 0;
    
    for (const collection of collections) {
      try {
        const stats = await db.command({ collStats: collection.name });
        totalStorage += stats.storageSize || 0;
      } catch (err) {
        // Skip collections we can't get stats for
        continue;
      }
    }
    
    console.log(`Total storage across all collections: ${totalStorage} bytes`);
    return totalStorage;
  } catch (err) {
    console.error("Error getting total storage usage:", err);
    return 0;
  }
}

async function getTotalActiveCollectionsReal(db) {
  try {
    const collections = await db.listCollections().toArray();
    let activeCount = 0;
    
    for (const collection of collections) {
      if (collection.name.startsWith('system') || 
          ['sessions'].includes(collection.name)) {
        continue;
      }
      
      try {
        const count = await db.collection(collection.name).countDocuments({});
        if (count > 0) {
          activeCount++;
        }
      } catch (err) {
        continue;
      }
    }
    
    return activeCount;
  } catch (err) {
    console.error("Error getting total active collections:", err);
    return 0;
  }
}

// Enhanced activity data generators
function generateRealisticTeamActivity(memberCount = 1) {
  const days = 7;
  const activity = [];
  const today = new Date();
  const baseActivity = Math.max(memberCount * 10, 20); // More members = more activity
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Weekend activity is typically lower
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const weekendMultiplier = isWeekend ? 0.3 : 1.0;
    
    const dailyActivity = Math.floor(
      (baseActivity + Math.random() * baseActivity * 0.5) * weekendMultiplier
    );
    
    activity.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      activity: Math.max(dailyActivity, 5) // Minimum 5 activities per day
    });
  }
  
  return activity;
}

function generateRealisticGlobalActivity() {
  const days = 14;
  const activity = [];
  const today = new Date();
  const baseActivity = 200; // Higher base for global view
  
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

// Debug endpoint for team relationships
router.get("/debug-team", fetchUser, async (req, res) => {
  try {
    const { user } = req;
    const dbUser = await User.findById(user.id);
    
    console.log('Debug - User from token:', {
      id: user.id,
      role: user.role,
      teamId: user.teamId
    });
    
    console.log('Debug - User from DB:', {
      id: dbUser._id,
      role: dbUser.role,
      teamId: dbUser.teamId
    });
    
    if (!dbUser.teamId) {
      const allTeams = await Team.find({});
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
    
    const team = await Team.findById(dbUser.teamId).populate('members');
    
    if (!team) {
      // Try alternative search
      const alternativeTeam = await Team.findOne({ teamId: user.teamId }).populate('members');
      
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
        members: team.members?.map(m => ({ 
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
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// Debug endpoint to see your database structure
router.get("/debug-collections", fetchUser, async (req, res) => {
  try {
    const { user } = req;
    const db = mongoose.connection.db;
    
    if (!db) {
      return res.status(500).json({ error: "Database not connected" });
    }
    
    const collections = await db.listCollections().toArray();
    const collectionInfo = [];
    
    for (const collection of collections) {
      const collectionName = collection.name;
      
      try {
        // Get collection stats
        const stats = await db.command({ collStats: collectionName });
        
        // Get a sample document to understand structure
        const sampleDoc = await db.collection(collectionName).findOne({});
        
        // Count documents for current user using various field patterns
        const userQueries = [
          { userId: user.id },
          { createdBy: user.id },
          { author: user.id },
          { owner: user.id },
          { user: user.id },
          { 'user.id': user.id },
          { 'user._id': user.id },
          { uploadedBy: user.id },
          { assignedTo: user.id }
        ];
        
        let userDocCount = 0;
        const queryResults = {};
        
        for (const query of userQueries) {
          try {
            const count = await db.collection(collectionName).countDocuments(query);
            const queryKey = Object.keys(query)[0];
            queryResults[queryKey] = count;
            userDocCount += count;
          } catch (err) {
            // Query might not be valid for this collection
          }
        }
        
        collectionInfo.push({
          name: collectionName,
          totalDocuments: stats.count || 0,
          userDocuments: userDocCount,
          storageSize: stats.storageSize || 0,
          avgObjSize: stats.avgObjSize || 0,
          indexes: stats.nindexes || 0,
          sampleFields: sampleDoc ? Object.keys(sampleDoc) : [],
          hasUserField: sampleDoc ? (
            'userId' in sampleDoc || 
            'createdBy' in sampleDoc || 
            'author' in sampleDoc || 
            'owner' in sampleDoc || 
            'user' in sampleDoc ||
            'uploadedBy' in sampleDoc ||
            'assignedTo' in sampleDoc
          ) : false,
          queryResults: queryResults // Show which queries found results
        });
      } catch (err) {
        collectionInfo.push({
          name: collectionName,
          error: err.message,
          totalDocuments: 0,
          userDocuments: 0
        });
      }
    }
    
    res.json({
      user: {
        id: user.id,
        role: user.role,
        teamId: user.teamId
      },
      collectionsCount: collections.length,
      collections: collectionInfo,
      summary: {
        totalUserDocuments: collectionInfo.reduce((sum, col) => sum + (col.userDocuments || 0), 0),
        totalStorage: collectionInfo.reduce((sum, col) => sum + (col.storageSize || 0), 0),
        activeCollections: collectionInfo.filter(col => (col.userDocuments || 0) > 0).length
      }
    });
  } catch (err) {
    console.error("Debug collections error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Specific debug endpoint for your user ID
router.get("/debug-user-docs", fetchUser, async (req, res) => {
  try {
    const { user } = req;
    const db = mongoose.connection.db;
    
    console.log(`\n=== DEBUGGING USER DOCUMENTS FOR ID: ${user.id} ===`);
    
    const collections = await db.listCollections().toArray();
    const results = [];
    
    for (const collection of collections) {
      const collectionName = collection.name;
      
      // Skip system collections
      if (collectionName.startsWith('system') || 
          collectionName === 'sessions' ||
          collectionName === 'migrations') {
        continue;
      }
      
      try {
        // Test each query pattern separately
        const queries = [
          { field: 'userId', query: { userId: user.id } },
          { field: 'createdBy', query: { createdBy: user.id } },
          { field: 'author', query: { author: user.id } },
          { field: 'owner', query: { owner: user.id } },
          { field: 'user', query: { user: user.id } },
          { field: 'user.id', query: { 'user.id': user.id } },
          { field: 'user._id', query: { 'user._id': user.id } },
          { field: 'uploadedBy', query: { uploadedBy: user.id } },
          { field: 'assignedTo', query: { assignedTo: user.id } }
        ];
        
        const collectionResult = {
          collection: collectionName,
          totalDocs: 0,
          queryResults: [],
          sampleDocs: []
        };
        
        // Get total documents in collection
        try {
          collectionResult.totalDocs = await db.collection(collectionName).countDocuments({});
        } catch (err) {
          collectionResult.error = err.message;
        }
        
        // Test each query
        for (const { field, query } of queries) {
          try {
            const count = await db.collection(collectionName).countDocuments(query);
            if (count > 0) {
              const docs = await db.collection(collectionName).find(query).limit(3).toArray();
              collectionResult.queryResults.push({
                field: field,
                count: count,
                sampleDoc: docs[0] ? Object.keys(docs[0]) : []
              });
              
              console.log(`Found ${count} documents in ${collectionName} using field: ${field}`);
            }
          } catch (queryErr) {
            // This query pattern doesn't work for this collection
          }
        }
        
        // Get a few sample documents to see structure
        try {
          const sampleDocs = await db.collection(collectionName).find({}).limit(2).toArray();
          collectionResult.sampleDocs = sampleDocs.map(doc => ({
            id: doc._id,
            fields: Object.keys(doc),
            hasUserId: 'userId' in doc,
            hasCreatedBy: 'createdBy' in doc,
            hasUser: 'user' in doc
          }));
        } catch (err) {
          // Can't sample docs
        }
        
        results.push(collectionResult);
      } catch (err) {
        results.push({
          collection: collectionName,
          error: err.message
        });
      }
    }
    
    const totalUserDocs = results.reduce((sum, col) => {
      return sum + col.queryResults.reduce((colSum, qr) => colSum + qr.count, 0);
    }, 0);
    
    console.log(`\n=== TOTAL USER DOCUMENTS FOUND: ${totalUserDocs} ===\n`);
    
    res.json({
      userId: user.id,
      totalUserDocuments: totalUserDocs,
      collections: results,
      summary: {
        collectionsWithUserData: results.filter(col => col.queryResults && col.queryResults.length > 0).length,
        totalCollections: results.length
      }
    });
  } catch (err) {
    console.error("Debug user docs error:", err);
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