import express from 'express';
import mongoose from 'mongoose';
import ScheduledMeeting from '../models/ScheduledMeeting.js';
import Notification from '../models/Notification.js';
import fetchUser from '../middleware/fetchUser.js';

const router = express.Router();

export function createScheduledMeetingRoutes(io) {
  // 1. GET scheduled meetings (upcoming & past)
  router.get('/', fetchUser, async (req, res) => {
    try {
      const user = req.user;
      let filter = {
        status: { $ne: 'cancelled' }
      };

      if (user.role === 'team' && user.teamId) {
        filter.$or = [
          { teamId: user.teamId },
          { 'hostUser.id': user.id },
          { targetUserIds: user.id }
        ];
      } else if (user.role === 'single') {
        filter.$or = [
          { 'hostUser.id': user.id },
          { targetUserIds: user.id }
        ];
      } else if (user.role === 'global') {
        filter.$or = [
          { scope: 'global' },
          { 'hostUser.id': user.id },
          { targetUserIds: user.id }
        ];
      }

      // Sort: closest scheduled meetings first
      const meetings = await ScheduledMeeting.find(filter).sort({ scheduledTime: -1 });
      res.json({ success: true, meetings });
    } catch (err) {
      console.error('❌ Error fetching scheduled meetings:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to fetch scheduled meetings' });
    }
  });

  // 2. POST create a new scheduled meeting
  router.post('/', fetchUser, async (req, res) => {
    try {
      const {
        title,
        description,
        roomId,
        callType,
        scheduledTime,
        durationMinutes,
        targetType,
        targetUserIds
      } = req.body;

      if (!title || !scheduledTime) {
        return res.status(400).json({ success: false, error: 'Meeting title and scheduled time are required' });
      }

      const scheduledDate = new Date(scheduledTime);
      if (isNaN(scheduledDate.getTime())) {
        return res.status(400).json({ success: false, error: 'Invalid scheduled time format' });
      }

      const finalRoomId = roomId?.trim() || `meet-${Math.random().toString(36).substr(2, 7)}`;
      const safeTeamId = req.user.teamId && mongoose.Types.ObjectId.isValid(req.user.teamId) ? req.user.teamId : null;

      const newMeeting = new ScheduledMeeting({
        title: title.trim(),
        description: description?.trim() || '',
        roomId: finalRoomId,
        callType: callType || 'video',
        scheduledTime: scheduledDate,
        durationMinutes: Number(durationMinutes) || 30,
        hostUser: {
          id: req.user.id,
          name: req.user.name || req.user.email || 'Host',
          email: req.user.email,
          photo: req.user.photo || ''
        },
        targetType: targetType || 'all',
        targetUserIds: Array.isArray(targetUserIds) ? targetUserIds : [],
        teamId: safeTeamId,
        scope: req.user.role || 'team',
        status: 'scheduled',
        triggered: false
      });

      await newMeeting.save();
      console.log(`📅 Scheduled meeting created: "${title}" by ${req.user.name || req.user.id} for ${scheduledDate.toISOString()}`);

      // Broadcast new scheduled meeting event
      if (io) {
        try {
          if (safeTeamId) {
            io.to(`team_${safeTeamId}`).emit('new-scheduled-meeting', newMeeting);
          }
          io.emit('new-scheduled-meeting', newMeeting);
        } catch (socketErr) {
          console.warn('Socket broadcast warning for scheduled meeting:', socketErr.message);
        }
      }

      // Create notification for team members (non-blocking)
      try {
        const notifScope = ['single', 'team', 'global'].includes(req.user.role) ? req.user.role : 'team';
        if (mongoose.Types.ObjectId.isValid(req.user.id)) {
          await Notification.create({
            type: 'event',
            text: `📅 ${req.user.name || 'Teammate'} scheduled a ${callType === 'audio' ? 'Voice' : 'Video'} Meeting: "${title}" for ${scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            user: req.user.id,
            time: new Date(),
            scope: notifScope,
            teamId: safeTeamId
          });
        }
      } catch (notifErr) {
        console.warn("Notification creation warning for scheduled meeting:", notifErr.message);
      }

      res.status(201).json({ success: true, meeting: newMeeting });
    } catch (err) {
      console.error('❌ Error creating scheduled meeting:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to create scheduled meeting' });
    }
  });

  // 3. PUT edit / reschedule scheduled meeting (even if time passed!)
  router.put('/:id', fetchUser, async (req, res) => {
    try {
      const meeting = await ScheduledMeeting.findById(req.params.id);
      if (!meeting) {
        return res.status(404).json({ success: false, error: 'Scheduled meeting not found' });
      }

      if (String(meeting.hostUser?.id) !== String(req.user.id) && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ success: false, error: 'Only the meeting host can edit this meeting' });
      }

      const { title, description, callType, scheduledTime, durationMinutes, targetType, targetUserIds } = req.body;

      if (title) meeting.title = title.trim();
      if (description !== undefined) meeting.description = description.trim();
      if (callType) meeting.callType = callType;
      if (scheduledTime) {
        const newDate = new Date(scheduledTime);
        if (!isNaN(newDate.getTime())) {
          meeting.scheduledTime = newDate;
          // If scheduled for future, reactivate trigger & status
          if (newDate.getTime() > Date.now() - 30 * 1000) {
            meeting.triggered = false;
            meeting.status = 'scheduled';
            meeting.triggeredAt = null;
          }
        }
      }
      if (durationMinutes) meeting.durationMinutes = Number(durationMinutes);
      if (targetType) meeting.targetType = targetType;
      if (targetUserIds) meeting.targetUserIds = Array.isArray(targetUserIds) ? targetUserIds : [];

      await meeting.save();
      console.log(`✏️ Scheduled meeting updated/rescheduled: "${meeting.title}" by ${req.user.name}`);

      if (io) {
        if (meeting.teamId) {
          io.to(`team_${meeting.teamId}`).emit('scheduled-meeting-updated', meeting);
        }
        io.emit('scheduled-meeting-updated', meeting);
      }

      res.json({ success: true, meeting });
    } catch (err) {
      console.error('❌ Error updating scheduled meeting:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to update meeting' });
    }
  });

  // 4. PUT end meeting for all
  router.put('/:id/end', fetchUser, async (req, res) => {
    try {
      const meeting = await ScheduledMeeting.findById(req.params.id);
      if (!meeting) {
        return res.status(404).json({ success: false, error: 'Scheduled meeting not found' });
      }

      if (String(meeting.hostUser?.id) !== String(req.user.id) && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ success: false, error: 'Only the meeting host can end this meeting' });
      }

      meeting.status = 'completed';
      await meeting.save();

      if (io) {
        io.to(meeting.roomId).emit('meeting-ended-by-host', { roomId: meeting.roomId });
        if (meeting.teamId) {
          io.to(`team_${meeting.teamId}`).emit('scheduled-meeting-ended', { meetingId: meeting._id });
        }
        io.emit('scheduled-meeting-ended', { meetingId: meeting._id });
      }

      res.json({ success: true, message: 'Meeting ended for all participants', meeting });
    } catch (err) {
      console.error('❌ Error ending meeting:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to end meeting' });
    }
  });

  // 5. DELETE / Delete scheduled meeting (Permanent Delete)
  router.delete('/:id', fetchUser, async (req, res) => {
    try {
      const meeting = await ScheduledMeeting.findById(req.params.id);
      if (!meeting) {
        return res.status(404).json({ success: false, error: 'Scheduled meeting not found' });
      }

      // Only host or team admin can delete
      if (String(meeting.hostUser?.id) !== String(req.user.id) && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ success: false, error: 'Only the meeting host can delete this meeting' });
      }

      const meetingId = meeting._id;
      const teamId = meeting.teamId;

      await ScheduledMeeting.findByIdAndDelete(meetingId);
      console.log(`🗑️ Scheduled meeting deleted permanently: ${meetingId}`);

      if (io) {
        try {
          if (teamId) {
            io.to(`team_${teamId}`).emit('scheduled-meeting-cancelled', { meetingId });
          }
          io.emit('scheduled-meeting-cancelled', { meetingId });
        } catch (socketErr) {
          console.warn('Socket cancel warning:', socketErr.message);
        }
      }

      res.json({ success: true, message: 'Meeting deleted successfully' });
    } catch (err) {
      console.error('❌ Error deleting scheduled meeting:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to delete meeting' });
    }
  });

  // 6. GET Single Meeting Full Details (with Attendance, Chat, Recordings)
  router.get('/:id/details', fetchUser, async (req, res) => {
    try {
      let meeting = null;
      if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        meeting = await ScheduledMeeting.findById(req.params.id);
      }
      if (!meeting) {
        meeting = await ScheduledMeeting.findOne({ roomId: req.params.id });
      }

      if (!meeting) {
        return res.status(404).json({ success: false, error: 'Meeting not found' });
      }

      res.json({ success: true, meeting });
    } catch (err) {
      console.error('❌ Error fetching meeting details:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to fetch meeting details' });
    }
  });

  // 7. POST Record Attendance Join
  router.post('/:roomId/attendance/join', fetchUser, async (req, res) => {
    try {
      const { roomId } = req.params;
      const user = req.user;
      const cleanRoom = String(roomId).trim().toLowerCase();

      let meeting = await ScheduledMeeting.findOne({
        roomId: { $in: [cleanRoom, roomId] }
      });

      // If meeting doesn't exist for this room (e.g. ad-hoc room), create an active record
      if (!meeting) {
        meeting = new ScheduledMeeting({
          title: `Meeting Room: ${roomId}`,
          roomId: cleanRoom,
          callType: 'video',
          scheduledTime: new Date(),
          hostUser: {
            id: user.id,
            name: user.name || user.email || 'Host',
            email: user.email,
            photo: user.photo || ''
          },
          teamId: user.teamId || null,
          scope: user.role || 'team',
          status: 'active',
          triggered: true
        });
      }

      // Check if user is already in attendees list
      const userIdStr = String(user.id);
      const existingAttendeeIndex = meeting.attendees.findIndex(
        (a) => String(a.userId) === userIdStr
      );

      if (existingAttendeeIndex >= 0) {
        meeting.attendees[existingAttendeeIndex].joinedAt = new Date();
        meeting.attendees[existingAttendeeIndex].leftAt = null;
      } else {
        meeting.attendees.push({
          userId: user.id,
          name: user.name || user.email || 'Attendee',
          email: user.email || '',
          photo: user.photo || '',
          role: user.role || 'member',
          joinedAt: new Date()
        });
      }

      await meeting.save();
      res.json({ success: true, attendees: meeting.attendees });
    } catch (err) {
      console.error('❌ Error logging attendance join:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8. POST Record Attendance Leave
  router.post('/:roomId/attendance/leave', fetchUser, async (req, res) => {
    try {
      const { roomId } = req.params;
      const user = req.user;
      const cleanRoom = String(roomId).trim().toLowerCase();

      const meeting = await ScheduledMeeting.findOne({
        roomId: { $in: [cleanRoom, roomId] }
      });

      if (!meeting) {
        return res.json({ success: false, message: 'Meeting not found' });
      }

      const userIdStr = String(user.id);
      const attendee = meeting.attendees.find((a) => String(a.userId) === userIdStr);

      if (attendee) {
        const leftAt = new Date();
        attendee.leftAt = leftAt;
        if (attendee.joinedAt) {
          const duration = Math.max(0, Math.floor((leftAt.getTime() - new Date(attendee.joinedAt).getTime()) / 1000));
          attendee.durationSeconds = (attendee.durationSeconds || 0) + duration;
        }
        await meeting.save();
      }

      res.json({ success: true, message: 'Attendance leave logged' });
    } catch (err) {
      console.error('❌ Error logging attendance leave:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 9. POST Save In-Call / Post-Call Meeting Chat
  router.post('/:id/chat', fetchUser, async (req, res) => {
    try {
      const { text } = req.body;
      if (!text?.trim()) {
        return res.status(400).json({ success: false, error: 'Message text is required' });
      }

      let meeting = null;
      if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        meeting = await ScheduledMeeting.findById(req.params.id);
      }
      if (!meeting) {
        meeting = await ScheduledMeeting.findOne({ roomId: req.params.id });
      }

      if (!meeting) {
        return res.status(404).json({ success: false, error: 'Meeting not found' });
      }

      const newMsg = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        senderId: req.user.id,
        senderName: req.user.name || req.user.email || 'User',
        senderPhoto: req.user.photo || '',
        text: text.trim(),
        timestamp: new Date()
      };

      meeting.chatMessages.push(newMsg);
      await meeting.save();

      if (io) {
        io.to(meeting.roomId).emit('meeting-hub-new-chat', {
          meetingId: meeting._id,
          message: newMsg
        });
      }

      res.json({ success: true, message: newMsg });
    } catch (err) {
      console.error('❌ Error saving meeting chat:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 10. POST Save Meeting Recording
  router.post('/:id/recording', fetchUser, async (req, res) => {
    try {
      const { url, title, durationSeconds, size } = req.body;
      if (!url) {
        return res.status(400).json({ success: false, error: 'Recording URL is required' });
      }

      let meeting = null;
      if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        meeting = await ScheduledMeeting.findById(req.params.id);
      }
      if (!meeting) {
        meeting = await ScheduledMeeting.findOne({ roomId: req.params.id });
      }

      if (!meeting) {
        return res.status(404).json({ success: false, error: 'Meeting not found' });
      }

      const newRec = {
        id: `rec_${Date.now()}`,
        title: title || `Recording ${meeting.recordings.length + 1}`,
        url,
        durationSeconds: Number(durationSeconds) || 0,
        recordedBy: req.user.name || 'Host',
        recordedAt: new Date(),
        size: Number(size) || 0
      };

      meeting.recordings.push(newRec);
      await meeting.save();

      res.json({ success: true, recording: newRec });
    } catch (err) {
      console.error('❌ Error saving recording:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}

/**
 * Background Worker: Checks every 20 seconds for due scheduled meetings
 * and triggers automated incoming call ringing & notifications!
 */
export function startScheduledMeetingWorker(io) {
  if (!io) return;

  console.log('⏰ Starting Scheduled Meeting Background Dispatcher...');

  setInterval(async () => {
    try {
      const now = new Date();
      const dueMeetings = await ScheduledMeeting.find({
        status: 'scheduled',
        triggered: false,
        scheduledTime: { $lte: new Date(now.getTime() + 15 * 1000) }
      });

      for (const meeting of dueMeetings) {
        meeting.triggered = true;
        meeting.status = 'active';
        meeting.triggeredAt = new Date();
        await meeting.save();

        console.log(`🔔 [AUTO-TRIGGER] Scheduled Meeting "${meeting.title}" is starting now! Dispatching incoming calls for room: ${meeting.roomId}`);

        const invitePayload = {
          roomId: meeting.roomId,
          callType: meeting.callType || 'video',
          hostUser: {
            id: meeting.hostUser?.id,
            name: meeting.hostUser?.name || 'Meeting Host',
            email: meeting.hostUser?.email,
            photo: meeting.hostUser?.photo
          },
          callerUserId: null, // Scheduled meeting rings everyone including host!
          meetingTitle: `⏰ Scheduled: ${meeting.title}`,
          isScheduled: true,
          targetType: meeting.targetType || 'all',
          targetUserIds: meeting.targetUserIds || [],
          timestamp: Date.now()
        };

        // 1. Broadcast incoming call to targeted audience and host
        if (meeting.targetType === 'all' && meeting.teamId) {
          io.to(`team_${meeting.teamId}`).emit('incoming-meeting-call', invitePayload);
        }
        io.emit('incoming-meeting-call', invitePayload);

        // 2. Broadcast scheduled meeting started event
        io.emit('scheduled-meeting-started', {
          meetingId: meeting._id,
          roomId: meeting.roomId,
          title: meeting.title,
          callType: meeting.callType,
          hostUser: meeting.hostUser
        });

        // 3. Create persistent Notification
        try {
          const notifScope = ['single', 'team', 'global'].includes(meeting.scope) ? meeting.scope : 'team';
          const safeTeamId = meeting.teamId && mongoose.Types.ObjectId.isValid(meeting.teamId) ? meeting.teamId : null;
          if (meeting.hostUser?.id && mongoose.Types.ObjectId.isValid(meeting.hostUser.id)) {
            await Notification.create({
              type: 'event',
              priority: 'high',
              text: `🔔 Scheduled Meeting "${meeting.title}" has started! Click to join room: ${meeting.roomId}`,
              user: meeting.hostUser.id,
              time: new Date(),
              scope: notifScope,
              teamId: safeTeamId
            });
          }
        } catch (notifErr) {
          console.warn('Error creating auto-trigger notification:', notifErr.message);
        }
      }
    } catch (workerErr) {
      console.error('Error in Scheduled Meeting Worker interval:', workerErr);
    }
  }, 20000);
}
