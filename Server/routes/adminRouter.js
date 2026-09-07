import express from 'express';
import mongoose from 'mongoose';
import Team from '../models/Team.js';
import User from '../models/User.js';
import Message from '../models/Message.js';
import PersonalMessage from '../models/PersonalMessage.js';
import File from '../models/File.js';
import Task from '../models/Task.js';
import Announcement from '../models/Announcement.js';
import fetchUser from '../middleware/fetchUser.js';

const router = express.Router();

// Helper to get RoleMeeting and RoleCall models safely
const getRoleMeetingModel = () => {
  return mongoose.models.RoleMeeting || null;
};

const getRoleCallModel = () => {
  return mongoose.models.RoleCall || null;
};

// Plan defaults preset
export const PLAN_PRESETS = {
  free: {
    name: 'Free',
    price: 0,
    limits: {
      maxMembers: 5,
      maxStorageMB: 1024, // 1 GB
      maxMessages: 2000,
      maxVideoMinutes: 200,
      maxAudioMinutes: 400,
      maxTasks: 50,
      maxFiles: 50
    }
  },
  starter: {
    name: 'Starter',
    price: 19,
    limits: {
      maxMembers: 15,
      maxStorageMB: 5120, // 5 GB
      maxMessages: 15000,
      maxVideoMinutes: 1000,
      maxAudioMinutes: 2000,
      maxTasks: 200,
      maxFiles: 200
    }
  },
  pro: {
    name: 'Pro',
    price: 49,
    limits: {
      maxMembers: 50,
      maxStorageMB: 20480, // 20 GB
      maxMessages: 100000,
      maxVideoMinutes: 5000,
      maxAudioMinutes: 10000,
      maxTasks: 1000,
      maxFiles: 1000
    }
  },
  enterprise: {
    name: 'Enterprise',
    price: 149,
    limits: {
      maxMembers: 500,
      maxStorageMB: 102400, // 100 GB
      maxMessages: 1000000,
      maxVideoMinutes: 50000,
      maxAudioMinutes: 100000,
      maxTasks: 10000,
      maxFiles: 10000
    }
  }
};

// Middleware to check exclusive Super Admin access
const verifyAdminAccess = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const superEmail = process.env.SUPER_ADMIN_EMAIL?.toLowerCase()?.trim();
    const isSuperAdmin = Boolean(
      user.isSuperAdmin === true ||
      user.role === 'superadmin' ||
      (superEmail && user.email?.toLowerCase()?.trim() === superEmail)
    );

    if (!isSuperAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Exclusively restricted to Super Admin.'
      });
    }

    req.currentUserDoc = user;
    next();
  } catch (err) {
    res.status(500).json({ success: false, error: 'Authorization error: ' + err.message });
  }
};

// ════════════════════════════════════════════════════════════════
// 1. GET /api/admin/platform-overview
// High-level KPI numbers & Billing Summary across entire platform
// ════════════════════════════════════════════════════════════════
router.get('/platform-overview', fetchUser, verifyAdminAccess, async (req, res) => {
  try {
    const [
      totalTeams,
      totalUsers,
      totalMessages,
      totalPersonalMessages,
      totalFiles,
      totalTasks,
      activeBroadcastsCount
    ] = await Promise.all([
      Team.countDocuments(),
      User.countDocuments(),
      Message.countDocuments(),
      PersonalMessage.countDocuments(),
      File.countDocuments(),
      Task.countDocuments(),
      Announcement.countDocuments({ isActive: true })
    ]);

    // Aggregate storage across all files
    const storageStats = await File.aggregate([
      { $group: { _id: null, totalBytes: { $sum: '$size' } } }
    ]);
    const totalStorageBytes = storageStats[0]?.totalBytes || 0;

    // Video & Audio meetings count
    const RoleMeeting = getRoleMeetingModel();
    const RoleCall = getRoleCallModel();
    const totalVideoCalls = RoleMeeting ? await RoleMeeting.countDocuments() : 0;
    const totalAudioCalls = RoleCall ? await RoleCall.countDocuments() : 0;

    // Subscriptions breakdown & Billing metrics
    const teams = await Team.find({}).select('subscription teamName').lean();
    const planBreakdown = { free: 0, starter: 0, pro: 0, enterprise: 0, custom: 0 };
    const statusBreakdown = { active: 0, trial: 0, expired: 0, suspended: 0, cancelled: 0 };
    const paymentStatusBreakdown = { paid: 0, partial: 0, pending: 0, overdue: 0, free_tier: 0 };

    let estimatedMonthlyRevenue = 0;
    let totalInvoicedAmount = 0;
    let totalCollectedAmount = 0;
    let totalDueAmount = 0;

    teams.forEach((t) => {
      const sub = t.subscription || {};
      const plan = sub.plan || 'free';
      const status = sub.status || 'active';
      const billing = sub.billing || {};

      planBreakdown[plan] = (planBreakdown[plan] || 0) + 1;
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;

      const pStatus = billing.paymentStatus || (plan === 'free' ? 'free_tier' : 'pending');
      paymentStatusBreakdown[pStatus] = (paymentStatusBreakdown[pStatus] || 0) + 1;

      if (status === 'active' || status === 'trial') {
        const price = sub.price !== undefined ? sub.price : (PLAN_PRESETS[plan]?.price || 0);
        estimatedMonthlyRevenue += price;
      }

      totalInvoicedAmount += billing.totalAmount || (sub.price || 0);
      totalCollectedAmount += billing.paidAmount || 0;
      totalDueAmount += billing.dueAmount !== undefined ? billing.dueAmount : Math.max(0, (billing.totalAmount || sub.price || 0) - (billing.paidAmount || 0));
    });

    res.json({
      success: true,
      data: {
        totalTeams,
        totalUsers,
        totalMessages: totalMessages + totalPersonalMessages,
        totalFiles,
        totalStorageBytes,
        totalStorageMB: (totalStorageBytes / (1024 * 1024)).toFixed(2),
        totalTasks,
        totalVideoCalls,
        totalAudioCalls,
        activeBroadcastsCount,
        estimatedMonthlyRevenue,
        billingSummary: {
          totalInvoiced: totalInvoicedAmount,
          totalCollected: totalCollectedAmount,
          totalDue: totalDueAmount,
          paymentStatusBreakdown
        },
        planBreakdown,
        statusBreakdown
      }
    });
  } catch (err) {
    console.error('Error fetching platform overview:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// 2. GET /api/admin/teams-usage
// Complete list of all teams with detailed usage, quota alerts & billing info
// ════════════════════════════════════════════════════════════════
router.get('/teams-usage', fetchUser, verifyAdminAccess, async (req, res) => {
  try {
    const teams = await Team.find({})
      .populate('admin', 'name email phoneno photo role createdAt')
      .populate('members', 'name email photo role')
      .sort({ createdAt: -1 })
      .lean();

    const RoleMeeting = getRoleMeetingModel();
    const RoleCall = getRoleCallModel();
    const systemAlerts = [];

    // Fetch live usage in parallel for all teams
    const teamsWithUsage = await Promise.all(
      teams.map(async (team) => {
        const teamObjId = team._id;

        const [
          teamMessagesCount,
          personalMessagesCount,
          filesAggregation,
          tasks,
          videoCallsCount,
          audioCallsCount
        ] = await Promise.all([
          Message.countDocuments({ teamId: teamObjId }),
          PersonalMessage.countDocuments({ teamId: teamObjId }),
          File.aggregate([
            { $match: { teamId: teamObjId } },
            { $group: { _id: null, count: { $sum: 1 }, totalBytes: { $sum: '$size' } } }
          ]),
          Task.find({ teamId: teamObjId }).select('taskStatus priority').lean(),
          RoleMeeting ? RoleMeeting.countDocuments({ teamId: teamObjId }) : 0,
          RoleCall ? RoleCall.countDocuments({ teamId: teamObjId }) : 0
        ]);

        const totalMessages = teamMessagesCount + personalMessagesCount;
        const totalFiles = filesAggregation[0]?.count || 0;
        const totalStorageBytes = filesAggregation[0]?.totalBytes || 0;
        const totalStorageMB = parseFloat((totalStorageBytes / (1024 * 1024)).toFixed(2));

        // Task status counts
        const tasksCount = tasks.length;
        const tasksCompleted = tasks.filter((t) => t.taskStatus === 'Completed').length;
        const tasksInProgress = tasks.filter((t) => t.taskStatus === 'In Progress').length;
        const tasksTodo = tasks.filter((t) => t.taskStatus === 'To Do' || t.taskStatus === 'Blocked').length;

        // Subscription resolution with fallbacks
        const plan = team.subscription?.plan || 'free';
        const preset = PLAN_PRESETS[plan] || PLAN_PRESETS.free;
        
        const subscription = {
          plan: team.subscription?.plan || 'free',
          status: team.subscription?.status || 'active',
          billingCycle: team.subscription?.billingCycle || 'monthly',
          price: team.subscription?.price !== undefined ? team.subscription.price : preset.price,
          currency: team.subscription?.currency || 'USD',
          startDate: team.subscription?.startDate || team.createdAt,
          expiryDate: team.subscription?.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          limits: {
            maxMembers: team.subscription?.limits?.maxMembers || preset.limits.maxMembers,
            maxStorageMB: team.subscription?.limits?.maxStorageMB || preset.limits.maxStorageMB,
            maxMessages: team.subscription?.limits?.maxMessages || preset.limits.maxMessages,
            maxVideoMinutes: team.subscription?.limits?.maxVideoMinutes || preset.limits.maxVideoMinutes,
            maxAudioMinutes: team.subscription?.limits?.maxAudioMinutes || preset.limits.maxAudioMinutes,
            maxTasks: team.subscription?.limits?.maxTasks || preset.limits.maxTasks,
            maxFiles: team.subscription?.limits?.maxFiles || preset.limits.maxFiles
          },
          notes: team.subscription?.notes || '',
          billing: {
            totalAmount: team.subscription?.billing?.totalAmount !== undefined ? team.subscription.billing.totalAmount : preset.price,
            paidAmount: team.subscription?.billing?.paidAmount || 0,
            dueAmount: team.subscription?.billing?.dueAmount !== undefined ? team.subscription.billing.dueAmount : (team.subscription?.billing?.totalAmount !== undefined ? team.subscription.billing.totalAmount - (team.subscription.billing.paidAmount || 0) : preset.price),
            paymentStatus: team.subscription?.billing?.paymentStatus || (plan === 'free' ? 'free_tier' : 'pending'),
            paymentMethod: team.subscription?.billing?.paymentMethod || 'other',
            invoiceNumber: team.subscription?.billing?.invoiceNumber || `INV-${team._id.toString().slice(-6).toUpperCase()}`,
            lastPaymentDate: team.subscription?.billing?.lastPaymentDate || null,
            nextDueDate: team.subscription?.billing?.nextDueDate || team.subscription?.expiryDate || null,
            paymentHistory: team.subscription?.billing?.paymentHistory || []
          }
        };

        const activeMembersCount = team.members?.length || 0;
        const pendingMembersCount = team.pendingMembers?.length || 0;
        const totalMembers = activeMembersCount;

        // Quota usage percentages
        const usagePercentages = {
          members: Math.min(100, Math.round((totalMembers / (subscription.limits.maxMembers || 1)) * 100)),
          storage: Math.min(100, Math.round((totalStorageMB / (subscription.limits.maxStorageMB || 1)) * 100)),
          messages: Math.min(100, Math.round((totalMessages / (subscription.limits.maxMessages || 1)) * 100)),
          tasks: Math.min(100, Math.round((tasksCount / (subscription.limits.maxTasks || 1)) * 100)),
          files: Math.min(100, Math.round((totalFiles / (subscription.limits.maxFiles || 1)) * 100))
        };

        const isExpired = subscription.expiryDate && new Date() > new Date(subscription.expiryDate);

        // 🚨 Compute Alerts for this team
        const teamAlerts = [];
        if (usagePercentages.storage >= 90) {
          const alert = {
            teamId: team._id,
            teamName: team.teamName,
            type: 'storage',
            level: usagePercentages.storage >= 100 ? 'critical' : 'warning',
            message: `Storage quota ${usagePercentages.storage}% used (${totalStorageMB} MB / ${subscription.limits.maxStorageMB} MB)`,
            percent: usagePercentages.storage
          };
          teamAlerts.push(alert);
          systemAlerts.push(alert);
        }

        if (usagePercentages.members >= 90) {
          const alert = {
            teamId: team._id,
            teamName: team.teamName,
            type: 'members',
            level: usagePercentages.members >= 100 ? 'critical' : 'warning',
            message: `Member limit ${usagePercentages.members}% reached (${totalMembers} / ${subscription.limits.maxMembers} members)`,
            percent: usagePercentages.members
          };
          teamAlerts.push(alert);
          systemAlerts.push(alert);
        }

        if (usagePercentages.messages >= 90) {
          const alert = {
            teamId: team._id,
            teamName: team.teamName,
            type: 'messages',
            level: usagePercentages.messages >= 100 ? 'critical' : 'warning',
            message: `Message limit ${usagePercentages.messages}% used (${totalMessages} / ${subscription.limits.maxMessages} messages)`,
            percent: usagePercentages.messages
          };
          teamAlerts.push(alert);
          systemAlerts.push(alert);
        }

        if (isExpired && subscription.status !== 'suspended') {
          const alert = {
            teamId: team._id,
            teamName: team.teamName,
            type: 'expiry',
            level: 'critical',
            message: `Subscription expired on ${new Date(subscription.expiryDate).toLocaleDateString()}`
          };
          teamAlerts.push(alert);
          systemAlerts.push(alert);
        }

        if (subscription.billing.paymentStatus === 'overdue' || (subscription.billing.dueAmount > 0 && subscription.billing.nextDueDate && new Date() > new Date(subscription.billing.nextDueDate))) {
          const alert = {
            teamId: team._id,
            teamName: team.teamName,
            type: 'billing',
            level: 'critical',
            message: `Payment overdue: $${subscription.billing.dueAmount} due`
          };
          teamAlerts.push(alert);
          systemAlerts.push(alert);
        }

        return {
          _id: team._id,
          teamName: team.teamName,
          admin: team.admin || null,
          membersCount: totalMembers,
          pendingMembersCount,
          createdAt: team.createdAt,
          inviteKey: team.inviteKey,
          inviteKeyActive: team.inviteKeyActive,
          subscription: {
            ...subscription,
            isExpired: isExpired && subscription.status !== 'suspended'
          },
          usage: {
            messages: totalMessages,
            teamMessages: teamMessagesCount,
            personalMessages: personalMessagesCount,
            files: totalFiles,
            storageBytes: totalStorageBytes,
            storageMB: totalStorageMB,
            tasks: tasksCount,
            tasksCompleted,
            tasksInProgress,
            tasksTodo,
            videoCalls: videoCallsCount,
            audioCalls: audioCallsCount
          },
          usagePercentages,
          alerts: teamAlerts
        };
      })
    );

    res.json({
      success: true,
      teams: teamsWithUsage,
      planPresets: PLAN_PRESETS,
      systemAlerts
    });
  } catch (err) {
    console.error('Error fetching teams usage:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// 3. PUT /api/admin/team-subscription/:teamId
// Update team subscription tier, status, expiry date, limits
// ════════════════════════════════════════════════════════════════
router.put('/team-subscription/:teamId', fetchUser, verifyAdminAccess, async (req, res) => {
  try {
    const { teamId } = req.params;
    const {
      plan,
      status,
      billingCycle,
      price,
      expiryDate,
      limits,
      notes
    } = req.body;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, error: 'Team not found' });
    }

    if (!team.subscription) {
      team.subscription = {};
    }

    // Apply plan presets if plan changed and limits not explicitly given
    if (plan && PLAN_PRESETS[plan] && !limits) {
      team.subscription.limits = { ...PLAN_PRESETS[plan].limits };
      team.subscription.price = PLAN_PRESETS[plan].price;
    }

    if (plan) team.subscription.plan = plan;
    if (status) team.subscription.status = status;
    if (billingCycle) team.subscription.billingCycle = billingCycle;
    if (price !== undefined) {
      team.subscription.price = price;
      if (team.subscription.billing) {
        team.subscription.billing.totalAmount = price;
        team.subscription.billing.dueAmount = Math.max(0, price - (team.subscription.billing.paidAmount || 0));
      }
    }
    if (expiryDate) team.subscription.expiryDate = new Date(expiryDate);
    if (notes !== undefined) team.subscription.notes = notes;

    if (limits) {
      team.subscription.limits = {
        ...team.subscription.limits,
        ...limits
      };
    }

    await team.save();

    if (global.io) {
      global.io.to(`team_${team._id}`).emit('team:subscription-updated', {
        teamId: team._id,
        subscription: team.subscription
      });
    }

    res.json({
      success: true,
      message: `Subscription for team "${team.teamName}" updated successfully`,
      subscription: team.subscription
    });
  } catch (err) {
    console.error('Error updating team subscription:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// 4. POST /api/admin/team-billing/record-payment/:teamId
// Record an installment payment or full payment for a team
// ════════════════════════════════════════════════════════════════
router.post('/team-billing/record-payment/:teamId', fetchUser, verifyAdminAccess, async (req, res) => {
  try {
    const { teamId } = req.params;
    const {
      amount,
      method,
      transactionId,
      note,
      invoiceNumber,
      nextDueDate
    } = req.body;

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Please provide a valid payment amount.' });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, error: 'Team not found' });
    }

    if (!team.subscription) {
      team.subscription = { plan: 'free', billing: {} };
    }
    if (!team.subscription.billing) {
      team.subscription.billing = {
        totalAmount: team.subscription.price || 0,
        paidAmount: 0,
        dueAmount: team.subscription.price || 0,
        paymentStatus: 'pending',
        paymentHistory: []
      };
    }

    const currentPaid = team.subscription.billing.paidAmount || 0;
    const totalAmount = team.subscription.billing.totalAmount || (team.subscription.price || paymentAmount);
    
    const newPaidAmount = currentPaid + paymentAmount;
    const newDueAmount = Math.max(0, totalAmount - newPaidAmount);

    // Determine status
    let paymentStatus = 'partial';
    if (newDueAmount === 0) {
      paymentStatus = 'paid';
    } else if (newPaidAmount === 0) {
      paymentStatus = 'pending';
    }

    // Add to history
    team.subscription.billing.paymentHistory.push({
      date: new Date(),
      amount: paymentAmount,
      method: method || 'other',
      transactionId: transactionId || '',
      note: note || '',
      recordedBy: req.currentUserDoc?.name || 'Super Admin'
    });

    team.subscription.billing.paidAmount = newPaidAmount;
    team.subscription.billing.dueAmount = newDueAmount;
    team.subscription.billing.totalAmount = totalAmount;
    team.subscription.billing.paymentStatus = paymentStatus;
    team.subscription.billing.lastPaymentDate = new Date();
    if (invoiceNumber) team.subscription.billing.invoiceNumber = invoiceNumber;
    if (nextDueDate) team.subscription.billing.nextDueDate = new Date(nextDueDate);
    if (method) team.subscription.billing.paymentMethod = method;

    await team.save();

    res.json({
      success: true,
      message: `Payment of $${paymentAmount} recorded successfully for ${team.teamName}. Status: ${paymentStatus}`,
      billing: team.subscription.billing
    });
  } catch (err) {
    console.error('Error recording payment:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// 5. PUT /api/admin/team-billing/update-bill/:teamId
// Update overall bill settings (total amount, invoice, due date, status)
// ════════════════════════════════════════════════════════════════
router.put('/team-billing/update-bill/:teamId', fetchUser, verifyAdminAccess, async (req, res) => {
  try {
    const { teamId } = req.params;
    const {
      totalAmount,
      paymentStatus,
      paymentMethod,
      invoiceNumber,
      nextDueDate
    } = req.body;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, error: 'Team not found' });
    }

    if (!team.subscription) team.subscription = {};
    if (!team.subscription.billing) team.subscription.billing = {};

    if (totalAmount !== undefined) {
      const parsedTotal = parseFloat(totalAmount) || 0;
      team.subscription.billing.totalAmount = parsedTotal;
      const currentPaid = team.subscription.billing.paidAmount || 0;
      team.subscription.billing.dueAmount = Math.max(0, parsedTotal - currentPaid);
    }

    if (paymentStatus) team.subscription.billing.paymentStatus = paymentStatus;
    if (paymentMethod) team.subscription.billing.paymentMethod = paymentMethod;
    if (invoiceNumber) team.subscription.billing.invoiceNumber = invoiceNumber;
    if (nextDueDate) team.subscription.billing.nextDueDate = new Date(nextDueDate);

    await team.save();

    res.json({
      success: true,
      message: `Billing details updated for ${team.teamName}`,
      billing: team.subscription.billing
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// 6. POST /api/admin/announcements
// Create & Broadcast system-wide or team announcements in real-time
// ════════════════════════════════════════════════════════════════
router.post('/announcements', fetchUser, verifyAdminAccess, async (req, res) => {
  try {
    const {
      title,
      message,
      type,
      priority,
      target,
      targetTeamId,
      expiresAt
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, error: 'Announcement title and message are required.' });
    }

    let targetTeamName = null;
    if (targetTeamId) {
      const team = await Team.findById(targetTeamId).select('teamName');
      targetTeamName = team?.teamName || null;
    }

    const announcement = await Announcement.create({
      title,
      message,
      type: type || 'info',
      priority: priority || 'medium',
      target: target || 'all',
      targetTeamId: targetTeamId || null,
      targetTeamName,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: req.currentUserDoc?.name || 'Super Admin',
      isActive: true
    });

    // 📢 Real-time Broadcast via Socket.IO
    if (global.io) {
      if (target === 'specific_team' && targetTeamId) {
        global.io.to(`team_${targetTeamId}`).emit('system:broadcast', announcement);
      } else {
        global.io.emit('system:broadcast', announcement);
      }
    }

    res.json({
      success: true,
      message: 'Announcement broadcasted successfully to platform users!',
      announcement
    });
  } catch (err) {
    console.error('Error creating announcement:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// 7. GET /api/admin/announcements
// List all announcements (Admin view)
// ════════════════════════════════════════════════════════════════
router.get('/announcements', fetchUser, verifyAdminAccess, async (req, res) => {
  try {
    const announcements = await Announcement.find({})
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      announcements
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// 8. DELETE /api/admin/announcements/:id
// Deactivate or delete announcement
// ════════════════════════════════════════════════════════════════
router.delete('/announcements/:id', fetchUser, verifyAdminAccess, async (req, res) => {
  try {
    const { id } = req.params;
    await Announcement.findByIdAndDelete(id);

    if (global.io) {
      global.io.emit('system:broadcast-removed', { id });
    }

    res.json({
      success: true,
      message: 'Announcement removed successfully.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// 9. GET /api/admin/active-broadcasts
// Public/User-facing endpoint to fetch active, unexpired announcements
// ════════════════════════════════════════════════════════════════
router.get('/active-broadcasts', fetchUser, async (req, res) => {
  try {
    const now = new Date();
    const query = {
      isActive: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: now } }
      ]
    };

    // Filter by target team if user is in a team
    if (req.user?.teamId) {
      query.$or = [
        { target: 'all' },
        { target: 'teams' },
        { targetTeamId: req.user.teamId }
      ];
    } else {
      query.target = 'all';
    }

    const broadcasts = await Announcement.find(query)
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.json({
      success: true,
      broadcasts
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// 10. POST /api/admin/team/:teamId/suspend-toggle
// ════════════════════════════════════════════════════════════════
router.post('/team/:teamId/suspend-toggle', fetchUser, verifyAdminAccess, async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, error: 'Team not found' });
    }

    if (!team.subscription) {
      team.subscription = { status: 'active', plan: 'free' };
    }

    const newStatus = team.subscription.status === 'suspended' ? 'active' : 'suspended';
    team.subscription.status = newStatus;
    await team.save();

    if (global.io) {
      global.io.to(`team_${team._id}`).emit('team:status-changed', {
        teamId: team._id,
        status: newStatus
      });
    }

    res.json({
      success: true,
      message: `Team status changed to ${newStatus}`,
      status: newStatus
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
