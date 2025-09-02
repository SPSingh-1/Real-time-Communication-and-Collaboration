import express from "express";
import Notification from "../models/Notification.js";
import fetchUser from "../middleware/fetchUser.js";

const router = express.Router();
const GLOBAL_ID = 'Global123'; // Fixed global scope ID

/**
 * GET notifications with enhanced role-based filtering
 * - Single: Only notifications for this specific user
 * - Team: Notifications for team members + user-specific notifications
 * - Global: All global notifications + user-specific notifications
 * - Optional filters: type, priority, read status
 */
router.get("/", fetchUser, async (req, res) => {
  try {
    const { type, priority, unread } = req.query;
    const user = req.user;

    let filter = {};

    // Role-based filtering with proper scope handling
    if (user.role === "single") {
      // Single users see only their own notifications
      filter = { 
        $or: [
          { scope: "single", user: user.id },
          { scope: "single", user: { $exists: false } } // Fallback for old notifications
        ]
      };
    } else if (user.role === "team" && user.teamId) {
      // Team users see team-wide notifications + their own
      filter = {
        $or: [
          { scope: "team", teamId: user.teamId },
          { scope: "single", user: user.id }
        ]
      };
    } else if (user.role === "global") {
      // Global users see global notifications + their own
      filter = {
        $or: [
          { scope: "global", globalId: GLOBAL_ID },
          { scope: "global" }, // Fallback for notifications without globalId
          { scope: "single", user: user.id }
        ]
      };
    }

    // Additional filters
    if (type && type !== "all" && ['event', 'comment', 'file', 'task', 'attendee'].includes(type)) {
      filter.type = type;
    }

    if (priority && ['low', 'medium', 'high'].includes(priority)) {
      filter.priority = priority;
    }

    // Unread filter
    if (unread === 'true') {
      filter.readBy = { $nin: [user.id] };
    }

    const notifications = await Notification.find(filter)
      .sort({ time: -1 })
      .limit(100) // Increased limit for better UX
      .populate("user", "name email")
      .populate("eventId", "title date")
      .populate("taskId", "taskTitle projectName");

    // Add read status for each notification
    const notificationsWithReadStatus = notifications.map(notification => ({
      ...notification.toObject(),
      isRead: notification.readBy.includes(user.id),
      readCount: notification.readBy.length
    }));

    res.json(notificationsWithReadStatus);
  } catch (err) {
    console.error("Error in GET /notifications:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET notification statistics
 */
router.get("/stats", fetchUser, async (req, res) => {
  try {
    const user = req.user;
    let filter = {};

    // Apply same role-based filtering as main GET route
    if (user.role === "single") {
      filter = { 
        $or: [
          { scope: "single", user: user.id },
          { scope: "single", user: { $exists: false } }
        ]
      };
    } else if (user.role === "team" && user.teamId) {
      filter = {
        $or: [
          { scope: "team", teamId: user.teamId },
          { scope: "single", user: user.id }
        ]
      };
    } else if (user.role === "global") {
      filter = {
        $or: [
          { scope: "global", globalId: GLOBAL_ID },
          { scope: "global" },
          { scope: "single", user: user.id }
        ]
      };
    }

    const [total, unread, byType, byPriority] = await Promise.all([
      Notification.countDocuments(filter),
      Notification.countDocuments({ ...filter, readBy: { $nin: [user.id] } }),
      Notification.aggregate([
        { $match: filter },
        { $group: { _id: "$type", count: { $sum: 1 } } }
      ]),
      Notification.aggregate([
        { $match: filter },
        { $group: { _id: "$priority", count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      total,
      unread,
      read: total - unread,
      byType: byType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byPriority: byPriority.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    });
  } catch (err) {
    console.error("Error in GET /notifications/stats:", err.message);
    res.status(500).json({ error: "Failed to fetch notification statistics" });
  }
});

/**
 * PATCH mark single notification as read
 */
router.patch("/:id/read", fetchUser, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { readBy: req.user.id } }, // Avoid duplicates
      { new: true }
    ).populate("user", "name email");

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({
      ...notification.toObject(),
      isRead: true,
      readCount: notification.readBy.length
    });
  } catch (err) {
    console.error("Failed to mark notification as read:", err.message);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

/**
 * PATCH mark multiple notifications as read
 */
router.patch("/mark-read", fetchUser, async (req, res) => {
  try {
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ error: "Invalid notification IDs provided" });
    }

    const result = await Notification.updateMany(
      { _id: { $in: notificationIds } },
      { $addToSet: { readBy: req.user.id } }
    );

    res.json({
      success: true,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
  } catch (err) {
    console.error("Failed to mark notifications as read:", err.message);
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
});

/**
 * PATCH mark all notifications as read for current user
 */
router.patch("/mark-all-read", fetchUser, async (req, res) => {
  try {
    const user = req.user;
    let filter = {};

    // Apply same role-based filtering
    if (user.role === "single") {
      filter = { 
        $or: [
          { scope: "single", user: user.id },
          { scope: "single", user: { $exists: false } }
        ]
      };
    } else if (user.role === "team" && user.teamId) {
      filter = {
        $or: [
          { scope: "team", teamId: user.teamId },
          { scope: "single", user: user.id }
        ]
      };
    } else if (user.role === "global") {
      filter = {
        $or: [
          { scope: "global", globalId: GLOBAL_ID },
          { scope: "global" },
          { scope: "single", user: user.id }
        ]
      };
    }

    // Only update notifications that haven't been read by this user
    filter.readBy = { $nin: [user.id] };

    const result = await Notification.updateMany(
      filter,
      { $addToSet: { readBy: user.id } }
    );

    res.json({
      success: true,
      modifiedCount: result.modifiedCount,
      message: `Marked ${result.modifiedCount} notifications as read`
    });
  } catch (err) {
    console.error("Failed to mark all notifications as read:", err.message);
    res.status(500).json({ error: "Failed to mark all notifications as read" });
  }
});

/**
 * DELETE notification (only for notification creator or admin)
 */
router.delete("/:id", fetchUser, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    // Check if user can delete this notification
    const canDelete = 
      notification.user.toString() === req.user.id || // Creator
      req.user.role === 'global'; // Global admin

    if (!canDelete) {
      return res.status(403).json({ error: "Not authorized to delete this notification" });
    }

    await notification.deleteOne();
    res.json({ success: true, message: "Notification deleted successfully" });
  } catch (err) {
    console.error("Failed to delete notification:", err.message);
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

/**
 * POST create notification (for system/admin use)
 */
router.post("/", fetchUser, async (req, res) => {
  try {
    const { type, text, eventId, taskId, priority = 'medium', targetUsers, targetTeam, globalScope } = req.body;

    if (!type || !text) {
      return res.status(400).json({ error: "Type and text are required" });
    }

    const notificationData = {
      type,
      text,
      user: req.user.id,
      priority,
      time: new Date()
    };

    // Add optional references
    if (eventId) notificationData.eventId = eventId;
    if (taskId) notificationData.taskId = taskId;

    // Determine scope and targeting
    if (globalScope && req.user.role === 'global') {
      notificationData.scope = 'global';
      notificationData.globalId = GLOBAL_ID;
    } else if (targetTeam && req.user.role === 'team') {
      notificationData.scope = 'team';
      notificationData.teamId = req.user.teamId;
    } else {
      notificationData.scope = 'single';
    }

    const notification = await Notification.create(notificationData);
    const populated = await Notification.findById(notification._id)
      .populate("user", "name email")
      .populate("eventId", "title date")
      .populate("taskId", "taskTitle projectName");

    // Emit real-time notification
    req.io?.emit('notification', populated);

    res.status(201).json(populated);
  } catch (err) {
    console.error("Failed to create notification:", err.message);
    res.status(500).json({ error: "Failed to create notification" });
  }
});

export default router;