// routes/dashboard.js - REAL-TIME LIVE DATA VERSION
import express from "express";
import mongoose from "mongoose";
import fetchUser from "../middleware/fetchUser.js";
import User from "../models/User.js";
import Team from "../models/Team.js";
import Global from "../models/Global.js";
import Message from "../models/Message.js";
import PersonalMessage from "../models/PersonalMessage.js";
import Task from "../models/Task.js";
import File from "../models/File.js";
import Complaint from "../models/Complaint.js";
import Report from "../models/Report.js";
import ScheduledMeeting from "../models/ScheduledMeeting.js";
import Note from "../models/Note.js";
import { TeamClient } from "../models/TeamCRM.js";

const router = express.Router();

// Team-Scoped / User-Scoped Live Stats Endpoint
router.get("/stats", fetchUser, async (req, res) => {
  try {
    const { user } = req;
    const userId = user.id;
    const userObjId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
    const dbUser = await User.findById(userId).lean();
    const actualTeamId = dbUser?.teamId || user.teamId;

    // ── TEAM SCOPED STATS ──────────────────────────────────────────
    if (actualTeamId) {
      let team = await Team.findById(actualTeamId).populate("members").lean();
      if (!team && typeof actualTeamId === "string") {
        team = await Team.findOne({ teamId: actualTeamId }).populate("members").lean();
      }

      const teamObjId = team?._id || (mongoose.Types.ObjectId.isValid(actualTeamId) ? new mongoose.Types.ObjectId(actualTeamId) : null);
      const teamCustomId = team?.teamId || (typeof actualTeamId === 'string' ? actualTeamId : null);
      const teamIds = [teamObjId, teamCustomId, String(actualTeamId), String(teamObjId)].filter(Boolean);

      const memberObjIds = (team?.members || []).map(m => m._id);
      const memberStrIds = (team?.members || []).map(m => String(m._id));
      const allMemberIds = Array.from(new Set([...memberObjIds, ...memberStrIds, userId, userObjId])).filter(Boolean);

      const [
        groupMessagesCount,
        personalMessagesCount,
        teamFiles,
        teamTasksCount,
        teamClientsCount,
        teamComplaintsCount,
        teamReportsCount,
        teamNotesCount,
        teamMeetingsCount
      ] = await Promise.all([
        Message.countDocuments({
          $or: [
            { teamId: { $in: teamIds } },
            { user: { $in: allMemberIds } }
          ]
        }),
        PersonalMessage.countDocuments({
          $or: [
            { teamId: { $in: teamIds } },
            { sender: { $in: allMemberIds } },
            { receiver: { $in: allMemberIds } }
          ]
        }),
        File.find({
          $or: [
            { teamId: { $in: teamIds } },
            { uploadedById: { $in: allMemberIds } }
          ]
        }, { size: 1 }).lean(),
        Task.countDocuments({
          $or: [
            { teamId: { $in: teamIds } },
            { createdBy: { $in: allMemberIds } }
          ]
        }),
        TeamClient.countDocuments({ teamId: { $in: teamIds } }),
        Complaint.countDocuments({ teamId: { $in: teamIds } }),
        Report.countDocuments({ teamId: { $in: teamIds } }),
        Note.countDocuments({
          $or: [
            { teamId: { $in: teamIds } },
            { user: { $in: allMemberIds } }
          ]
        }),
        ScheduledMeeting.countDocuments({ teamId: { $in: teamIds } })
      ]);

      const teamMessagesCount = groupMessagesCount + personalMessagesCount;
      const filesStorageBytes = teamFiles.reduce((sum, f) => sum + (f.size || 0), 0);
      const messagesStorageBytes = teamMessagesCount * 450;
      const tasksStorageBytes = teamTasksCount * 1200;
      const crmStorageBytes = teamClientsCount * 2500;
      const reportsStorageBytes = teamReportsCount * 2000;
      const complaintsStorageBytes = teamComplaintsCount * 1500;
      const notesStorageBytes = teamNotesCount * 600;
      const meetingsStorageBytes = teamMeetingsCount * 1000;

      const teamStats = [
        { name: "Files", count: teamFiles.length, storageSize: filesStorageBytes, nindexes: 3 },
        { name: "Messages", count: teamMessagesCount, storageSize: messagesStorageBytes, nindexes: 2 },
        { name: "Tasks", count: teamTasksCount, storageSize: tasksStorageBytes, nindexes: 2 },
        { name: "Team CRM", count: teamClientsCount, storageSize: crmStorageBytes, nindexes: 2 },
        { name: "Reports", count: teamReportsCount, storageSize: reportsStorageBytes, nindexes: 1 },
        { name: "Complaints", count: teamComplaintsCount, storageSize: complaintsStorageBytes, nindexes: 1 },
        { name: "Notes", count: teamNotesCount, storageSize: notesStorageBytes, nindexes: 1 },
        { name: "Meetings", count: teamMeetingsCount, storageSize: meetingsStorageBytes, nindexes: 1 }
      ];

      return res.json(teamStats);
    }

    // ── SINGLE USER SCOPED STATS ───────────────────────────────────
    const [
      userMessagesCount,
      userFiles,
      userTasksCount,
      userNotesCount
    ] = await Promise.all([
      Message.countDocuments({ user: userObjId || userId }),
      File.find({ uploadedById: userObjId || userId }, { size: 1 }).lean(),
      Task.countDocuments({ $or: [{ createdBy: userObjId || userId }, { assignedTo: user.name }] }),
      Note.countDocuments({ user: userObjId || userId })
    ]);

    const userFilesStorage = userFiles.reduce((sum, f) => sum + (f.size || 0), 0);

    const singleStats = [
      { name: "Files", count: userFiles.length, storageSize: userFilesStorage, nindexes: 2 },
      { name: "Messages", count: userMessagesCount, storageSize: userMessagesCount * 400, nindexes: 2 },
      { name: "Tasks", count: userTasksCount, storageSize: userTasksCount * 1200, nindexes: 2 },
      { name: "Notes", count: userNotesCount, storageSize: userNotesCount * 500, nindexes: 1 }
    ];

    res.json(singleStats);
  } catch (err) {
    console.error("Error fetching scoped dashboard stats:", err);
    res.status(500).json({ error: err.message });
  }
});

// Role-based stats endpoint - 100% REAL-TIME
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

    let roleStats;
    switch (user.role) {
      case "single":
        roleStats = await getSingleUserStatsRealTime(user, db);
        break;
      case "team":
        roleStats = await getTeamLeaderStatsRealTime(user, db);
        break;
      case "global":
      case "superadmin":
        roleStats = await getGlobalAdminStatsRealTime(user, db);
        break;
      default:
        roleStats = await getSingleUserStatsRealTime(user, db);
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
    const dbUser = await User.findById(user.id).lean();
    
    const userInfo = {
      id: user.id,
      name: dbUser?.name || user.name,
      email: dbUser?.email || user.email,
      role: dbUser?.role || user.role,
      teamId: dbUser?.teamId || user.teamId,
      globalId: user.globalId
    };

    res.json(userInfo);
  } catch (err) {
    console.error("Error fetching user info:", err);
    res.status(500).json({ error: err.message });
  }
});

// REAL-TIME Helper functions for role-based stats

async function getSingleUserStatsRealTime(user, db) {
  try {
    const userId = user.id;
    const userObjId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;

    const [
      userMessagesCount,
      userPersonalMessagesCount,
      userTasksCount,
      userFiles,
      sevenDayActivity
    ] = await Promise.all([
      Message.countDocuments({ user: userObjId || userId }),
      PersonalMessage.countDocuments({ $or: [{ sender: userObjId || userId }, { receiver: userObjId || userId }] }),
      Task.countDocuments({ $or: [{ createdBy: userObjId || userId }, { assignedTo: user.name }] }),
      File.find({ uploadedById: userObjId || userId }, { size: 1 }).lean(),
      getRealSevenDayActivity({ userIds: [userObjId || userId] })
    ]);

    const totalUserDocs = userMessagesCount + userPersonalMessagesCount + userTasksCount + userFiles.length;
    const totalStorageBytes = userFiles.reduce((sum, f) => sum + (f.size || 0), 0);

    return {
      userDocuments: userMessagesCount + userPersonalMessagesCount,
      managedUsers: 1,
      accessibleStorageMB: (totalStorageBytes / (1024 * 1024)).toFixed(2),
      teamStorage: totalStorageBytes,
      activeCollections: 4,
      teamActivity: sevenDayActivity,
      teamDocuments: totalUserDocs
    };
  } catch (err) {
    console.error("Error in getSingleUserStatsRealTime:", err);
    return getDefaultStats();
  }
}

async function getTeamLeaderStatsRealTime(user, db) {
  try {
    const dbUser = await User.findById(user.id).lean();
    const actualTeamId = dbUser?.teamId || user.teamId;
    
    if (!actualTeamId) {
      return { ...getDefaultStats(), error: "User not assigned to any team" };
    }

    let team = await Team.findById(actualTeamId).populate("members").lean();
    if (!team && typeof actualTeamId === "string") {
      team = await Team.findOne({ teamId: actualTeamId }).populate("members").lean();
      if (team) {
        await User.findByIdAndUpdate(user.id, { teamId: team._id });
      }
    }

    if (!team) {
      return { ...getDefaultStats(), error: "Team not found" };
    }
    
    const teamMembers = team.members || [];
    const teamObjId = team._id;
    const teamIds = [teamObjId, team.teamId, String(actualTeamId), String(teamObjId)].filter(Boolean);

    const userObjId = mongoose.Types.ObjectId.isValid(user.id) ? new mongoose.Types.ObjectId(user.id) : null;
    const userMatches = Array.from(new Set([user.id, userObjId, String(user.id)])).filter(Boolean);

    const memberObjIds = teamMembers.map(m => m._id);
    const memberStrIds = teamMembers.map(m => String(m._id));
    const allMemberIds = Array.from(new Set([...memberObjIds, ...memberStrIds, ...userMatches]));

    // Real live database queries for this team & user
    const [
      userGroupMsgs,
      userPersonalMsgs,
      teamGroupMsgs,
      teamPersonalMsgs,
      teamTasksCount,
      teamFiles,
      teamClientsCount,
      teamComplaintsCount,
      teamReportsCount,
      teamNotesCount,
      teamMeetingsCount,
      sevenDayActivity
    ] = await Promise.all([
      Message.countDocuments({ user: { $in: userMatches } }),
      PersonalMessage.countDocuments({ $or: [{ sender: { $in: userMatches } }, { receiver: { $in: userMatches } }] }),
      Message.countDocuments({ $or: [{ teamId: { $in: teamIds } }, { user: { $in: allMemberIds } }] }),
      PersonalMessage.countDocuments({ $or: [{ teamId: { $in: teamIds } }, { sender: { $in: allMemberIds } }, { receiver: { $in: allMemberIds } }] }),
      Task.countDocuments({ $or: [{ teamId: { $in: teamIds } }, { createdBy: { $in: allMemberIds } }] }),
      File.find({ $or: [{ teamId: { $in: teamIds } }, { uploadedById: { $in: allMemberIds } }] }, { size: 1 }).lean(),
      TeamClient.countDocuments({ teamId: { $in: teamIds } }),
      Complaint.countDocuments({ teamId: { $in: teamIds } }),
      Report.countDocuments({ teamId: { $in: teamIds } }),
      Note.countDocuments({ $or: [{ teamId: { $in: teamIds } }, { user: { $in: allMemberIds } }] }),
      ScheduledMeeting.countDocuments({ teamId: { $in: teamIds } }),
      getRealSevenDayActivity({ teamId: teamObjId, memberIds: allMemberIds })
    ]);

    const userTotalMessages = userGroupMsgs + userPersonalMsgs;
    const teamTotalMessages = teamGroupMsgs + teamPersonalMsgs;
    const totalTeamDocs = teamTotalMessages + teamTasksCount + teamFiles.length + teamClientsCount + teamComplaintsCount + teamReportsCount + teamNotesCount + teamMeetingsCount;
    const totalTeamStorage = teamFiles.reduce((acc, f) => acc + (f.size || 0), 0);

    return {
      userDocuments: teamTotalMessages > 0 ? teamTotalMessages : userTotalMessages,
      teamMessages: teamTotalMessages,
      managedUsers: teamMembers.length,
      accessibleStorageMB: (totalTeamStorage / (1024 * 1024)).toFixed(2),
      teamActivity: sevenDayActivity,
      teamDocuments: totalTeamDocs,
      teamStorage: totalTeamStorage,
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
    console.error("Error in getTeamLeaderStatsRealTime:", err);
    return { ...getDefaultStats(), error: "Failed to load team stats: " + err.message };
  }
}

async function getGlobalAdminStatsRealTime(user, db) {
  try {
    const [
      allUsersCount,
      allTeamsCount,
      allMessagesCount,
      allTasksCount,
      allFiles,
      userMessagesCount,
      sevenDayActivity
    ] = await Promise.all([
      User.countDocuments({}),
      Team.countDocuments({}),
      Message.countDocuments({}),
      Task.countDocuments({}),
      File.find({}, { size: 1 }).lean(),
      Message.countDocuments({ user: user.id }),
      getRealSevenDayActivity({ isGlobal: true })
    ]);

    const totalStorageBytes = allFiles.reduce((sum, f) => sum + (f.size || 0), 0);
    const totalDocs = allMessagesCount + allTasksCount + allFiles.length;

    return {
      userDocuments: userMessagesCount,
      managedUsers: allUsersCount,
      accessibleStorageMB: (totalStorageBytes / (1024 * 1024)).toFixed(2),
      activeCollections: 8,
      teamActivity: sevenDayActivity,
      totalTeams: allTeamsCount,
      totalUsers: allUsersCount,
      teamDocuments: totalDocs,
      teamStorage: totalStorageBytes,
      globalStats: {
        totalDocuments: totalDocs,
        totalStorage: (totalStorageBytes / (1024 * 1024)).toFixed(2),
        activeTeams: allTeamsCount
      }
    };
  } catch (err) {
    console.error("Error in getGlobalAdminStatsRealTime:", err);
    return getDefaultStats();
  }
}

// REAL 7-Day Activity Aggregation directly from MongoDB Timestamps
async function getRealSevenDayActivity({ teamId, memberIds, userIds, isGlobal }) {
  try {
    const days = 7;
    const dates = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      dates.push(d);
    }

    const startDate = dates[0];
    const matchFilter = { createdAt: { $gte: startDate } };

    if (teamId) {
      matchFilter.$or = [
        { teamId: teamId },
        ...(memberIds?.length ? [{ user: { $in: memberIds } }, { uploadedById: { $in: memberIds } }, { createdBy: { $in: memberIds } }] : [])
      ];
    } else if (userIds?.length) {
      matchFilter.$or = [
        { user: { $in: userIds } },
        { uploadedById: { $in: userIds } },
        { createdBy: { $in: userIds } },
        { sender: { $in: userIds } }
      ];
    }

    // Run parallel aggregation across Message, PersonalMessage, Task, and File collections
    const [messageDaily, personalMessageDaily, taskDaily, fileDaily] = await Promise.all([
      Message.aggregate([
        { $match: { createdAt: { $gte: startDate }, ...(teamId ? { $or: [{ teamId }, { user: { $in: memberIds || [] } }] } : {}) } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 }
          }
        }
      ]).catch(() => []),
      PersonalMessage.aggregate([
        { $match: { createdAt: { $gte: startDate }, ...(teamId ? { $or: [{ teamId }, { sender: { $in: memberIds || [] } }, { receiver: { $in: memberIds || [] } }] } : {}) } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 }
          }
        }
      ]).catch(() => []),
      Task.aggregate([
        { $match: { createdAt: { $gte: startDate }, ...(teamId ? { $or: [{ teamId }, { createdBy: { $in: memberIds || [] } }] } : {}) } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 }
          }
        }
      ]).catch(() => []),
      File.aggregate([
        { $match: { createdAt: { $gte: startDate }, ...(teamId ? { $or: [{ teamId }, { uploadedById: { $in: memberIds || [] } }] } : {}) } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 }
          }
        }
      ]).catch(() => [])
    ]);

    // Build count map per date YYYY-MM-DD
    const countMap = {};
    for (const item of [...messageDaily, ...personalMessageDaily, ...taskDaily, ...fileDaily]) {
      if (item._id) {
        countMap[item._id] = (countMap[item._id] || 0) + item.count;
      }
    }

    // Format output for Recharts
    return dates.map(d => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return {
        date: label,
        activity: countMap[key] || 0
      };
    });
  } catch (err) {
    console.error("Error generating real 7-day activity:", err);
    return [];
  }
}

function getDefaultStats() {
  return {
    userDocuments: 0,
    managedUsers: 0,
    accessibleStorageMB: "0.00",
    activeCollections: 0,
    teamActivity: [],
    teamDocuments: 0,
    teamStorage: 0
  };
}

export default router;