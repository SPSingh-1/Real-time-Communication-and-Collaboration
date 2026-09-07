// routes/events.js
import express from 'express';
import Events from '../models/Events.js';
import Notification from '../models/Notification.js';
import ScheduledMeeting from '../models/ScheduledMeeting.js';
import fetchUser from '../middleware/fetchUser.js';
import cron from 'node-cron';

const router = express.Router();

export default function createEventRoutes(io) {
  // ======================
  // CRON: Cleanup old events (older than last month)
  // ======================
  cron.schedule('0 2 * * *', async () => {
    try {
      const now = new Date();
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      const result = await Events.deleteMany({
        date: { $lte: lastMonthEnd }
      });

      if (result.deletedCount > 0) {
        console.log(`🧹 Auto-cleanup: Deleted ${result.deletedCount} events older than ${lastMonthEnd.toDateString()}`);
      }
    } catch (error) {
      console.error('❌ Error during event auto-cleanup:', error.message);
    }
  });

  // ======================
  // CREATE EVENT
  // ======================
  router.post('/', fetchUser, async (req, res) => {
    try {
      const { title, date, time, description, isMeeting, meetingRoomId, callType, targetType, targetUserIds } = req.body;

      if (!title || !date) {
        return res.status(400).json({ error: 'Title and Date are required' });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const eventDate = new Date(date);
      if (isNaN(eventDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }
      if (eventDate < today) {
        return res.status(400).json({ error: 'Cannot schedule events on past dates' });
      }

      // Time validation if event is for today
      let scheduledDateTime = new Date(date);
      const timeVal = time || '10:00';
      const [hours, mins] = timeVal.split(':');
      scheduledDateTime.setHours(parseInt(hours, 10) || 0, parseInt(mins, 10) || 0, 0, 0);

      // Check if scheduled time is in the past (with 1 minute grace period)
      if (scheduledDateTime.getTime() < Date.now() - 60 * 1000) {
        return res.status(400).json({ error: 'Cannot schedule events at a past time for today' });
      }

      // If video meeting is selected, ensure we have a valid room ID
      const finalIsMeeting = Boolean(isMeeting);
      const finalRoomId = finalIsMeeting
        ? (meetingRoomId?.trim() || `meet-${Math.random().toString(36).substr(2, 6)}`)
        : '';
      const finalCallType = callType === 'audio' ? 'audio' : 'video';
      const finalTargetType = targetType === 'specific' ? 'specific' : 'all';
      const finalTargetUserIds = (finalTargetType === 'specific' && Array.isArray(targetUserIds)) ? targetUserIds : [];
      const safeTeamId = req.user.role === 'team' ? req.user.teamId : null;

      const event = await Events.create({
        title: title.trim(),
        date,
        time: timeVal,
        description: description?.trim() || '',
        user: req.user.id,
        teamId: safeTeamId,
        scope: req.user.role,   // "single" | "team" | "global"
        targetType: finalTargetType,
        targetUserIds: finalTargetUserIds,
        isMeeting: finalIsMeeting,
        meetingRoomId: finalRoomId,
        callType: finalCallType
      });

      // If isMeeting is true, also create/sync a ScheduledMeeting record and broadcast
      if (finalIsMeeting) {
        try {
          const isImmediate = scheduledDateTime.getTime() <= Date.now() + 60 * 1000;
          const scheduledMeeting = await ScheduledMeeting.create({
            title: title.trim(),
            description: description?.trim() || '',
            roomId: finalRoomId,
            callType: finalCallType,
            scheduledTime: scheduledDateTime,
            durationMinutes: 30,
            hostUser: {
              id: req.user.id,
              name: req.user.name || req.user.email || 'Host',
              email: req.user.email,
              photo: req.user.photo || ''
            },
            targetType: finalTargetType,
            targetUserIds: finalTargetUserIds,
            teamId: safeTeamId,
            scope: req.user.role || 'team',
            status: isImmediate ? 'active' : 'scheduled',
            triggered: isImmediate,
            triggeredAt: isImmediate ? new Date() : null
          });

          // Broadcast new scheduled meeting event
          if (io) {
            if (safeTeamId) {
              io.to(`team_${safeTeamId}`).emit('new-scheduled-meeting', scheduledMeeting);
            }
            io.emit('new-scheduled-meeting', scheduledMeeting);

            // If scheduled for right now, trigger instant ringing call modal!
            if (isImmediate) {
              const invitePayload = {
                roomId: finalRoomId,
                callType: finalCallType,
                hostUser: {
                  id: req.user.id,
                  name: req.user.name || req.user.email || 'Host',
                  email: req.user.email,
                  photo: req.user.photo || ''
                },
                callerUserId: null,
                meetingTitle: `⏰ Scheduled: ${title.trim()}`,
                isScheduled: true,
                targetType: finalTargetType,
                targetUserIds: finalTargetUserIds,
                timestamp: Date.now()
              };

              if (finalTargetType === 'all' && safeTeamId) {
                io.to(`team_${safeTeamId}`).emit('incoming-meeting-call', invitePayload);
              }
              io.emit('incoming-meeting-call', invitePayload);
            }
          }
        } catch (syncErr) {
          console.warn('Sync ScheduledMeeting from Event error:', syncErr.message);
        }
      }

      const populated = await Events.findById(event._id)
        .populate('user', 'name email')
        .populate('targetUserIds', 'name email');

      // 📢 Real-time event broadcasting to team or user
      if (req.user.role === 'team' && req.user.teamId) {
        io.to(`team_${req.user.teamId}`).emit('newEvent', populated);
        io.emit('newEvent', populated);
      } else {
        io.emit('newEvent', populated);
      }

      await Notification.create({
        type: 'event',
        text: `${populated.user?.name || 'User'} created ${finalIsMeeting ? 'Meeting' : 'Event'} "${populated.title}"`,
        user: populated.user?._id || req.user.id,
        eventId: populated._id,
        time: new Date(),
        scope: req.user.role,
        teamId: safeTeamId
      });

      res.status(201).json(populated);
    } catch (err) {
      console.error('❌ Event create error:', err.message);
      res.status(500).json({ error: 'Failed to create event' });
    }
  });

  // ======================
  // UPDATE EVENT
  // ======================
  router.put('/:id', fetchUser, async (req, res) => {
    try {
      const { title, date, time, description, isMeeting, meetingRoomId, callType, targetType, targetUserIds } = req.body;
      let event = await Events.findById(req.params.id);
      if (!event) return res.status(404).json({ error: 'Event not found' });

      // 🔒 Authorization
      if (
        (req.user.role === 'single' && (event.scope !== 'single' || event.user.toString() !== req.user.id)) ||
        (req.user.role === 'team' && (event.scope !== 'team' || event.teamId?.toString() !== req.user.teamId)) ||
        (req.user.role === 'global' && event.scope !== 'global')
      ) {
        return res.status(403).json({ error: 'Not authorized to update this event' });
      }

      // 🛑 Cannot edit expired/past events
      const existingDateStr = event.date.split('T')[0];
      const existingTimeStr = event.time || '23:59';
      const [exH, exM] = existingTimeStr.split(':');
      const existingDateTime = new Date(existingDateStr);
      existingDateTime.setHours(parseInt(exH, 10) || 0, (parseInt(exM, 10) || 0) + 30, 0, 0);

      if (existingDateTime.getTime() < Date.now() && req.user.role !== 'superadmin') {
        return res.status(400).json({ error: 'Past / expired events cannot be edited' });
      }

      // If new date/time provided, ensure it is not in the past
      if (date || time) {
        const checkDate = date || event.date;
        const checkTime = time || event.time || '10:00';
        const newSchedDate = new Date(checkDate);
        const [nH, nM] = checkTime.split(':');
        newSchedDate.setHours(parseInt(nH, 10) || 0, parseInt(nM, 10) || 0, 0, 0);
        if (newSchedDate.getTime() < Date.now() - 60 * 1000 && req.user.role !== 'superadmin') {
          return res.status(400).json({ error: 'Cannot reschedule event to a past date or time' });
        }
      }

      event.title = title?.trim() || event.title;
      if (date) event.date = date;
      event.time = time || event.time;
      event.description = description !== undefined ? description.trim() : event.description;
      if (isMeeting !== undefined) event.isMeeting = Boolean(isMeeting);
      if (meetingRoomId !== undefined) event.meetingRoomId = meetingRoomId;
      if (callType) event.callType = callType;
      if (targetType) event.targetType = targetType;
      if (targetUserIds !== undefined) {
        event.targetUserIds = Array.isArray(targetUserIds) ? targetUserIds : [];
      }
      const updated = await event.save();

      // Sync with ScheduledMeeting if meeting roomId exists
      if (event.meetingRoomId) {
        try {
          const schedMeeting = await ScheduledMeeting.findOne({ roomId: event.meetingRoomId });
          if (schedMeeting) {
            schedMeeting.title = event.title;
            schedMeeting.description = event.description;
            schedMeeting.callType = event.callType;
            schedMeeting.targetType = event.targetType;
            schedMeeting.targetUserIds = event.targetUserIds;
            const updatedDate = new Date(event.date);
            const [uH, uM] = (event.time || '10:00').split(':');
            updatedDate.setHours(parseInt(uH, 10) || 0, parseInt(uM, 10) || 0, 0, 0);
            schedMeeting.scheduledTime = updatedDate;
            await schedMeeting.save();

            if (io) {
              if (schedMeeting.teamId) {
                io.to(`team_${schedMeeting.teamId}`).emit('scheduled-meeting-updated', schedMeeting);
              }
              io.emit('scheduled-meeting-updated', schedMeeting);
            }
          }
        } catch (syncErr) {
          console.warn('ScheduledMeeting sync error on event update:', syncErr.message);
        }
      }

      const populated = await Events.findById(updated._id)
        .populate('user', 'name email')
        .populate('targetUserIds', 'name email');
      io.emit('updatedEvent', populated);

      await Notification.create({
        type: 'event',
        text: `${populated.user?.name || 'User'} updated event "${populated.title}"`,
        user: populated.user?._id || req.user.id,
        eventId: populated._id,
        time: new Date(),
        scope: req.user.role,
        teamId: req.user.role === 'team' ? req.user.teamId : null
      });

      res.status(200).json(populated);
    } catch (err) {
      console.error('❌ Event update error:', err.message);
      res.status(500).json({ error: 'Failed to update event' });
    }
  });

  // ======================
  // DELETE EVENT
  // ======================
  router.delete('/:id', fetchUser, async (req, res) => {
    try {
      const event = await Events.findById(req.params.id).populate('user', 'name email');
      if (!event) return res.status(404).json({ error: 'Event not found' });

      // 🔒 Authorization
      if (
        (req.user.role === 'single' && (event.scope !== 'single' || event.user.toString() !== req.user.id)) ||
        (req.user.role === 'team' && (event.scope !== 'team' || event.teamId?.toString() !== req.user.teamId)) ||
        (req.user.role === 'global' && event.scope !== 'global')
      ) {
        return res.status(403).json({ error: 'Not authorized to delete this event' });
      }

      // 🛑 Cannot delete expired/past events
      const existingDateStr = event.date.split('T')[0];
      const existingTimeStr = event.time || '23:59';
      const [exH, exM] = existingTimeStr.split(':');
      const existingDateTime = new Date(existingDateStr);
      existingDateTime.setHours(parseInt(exH, 10) || 0, (parseInt(exM, 10) || 0) + 30, 0, 0);

      if (existingDateTime.getTime() < Date.now() && req.user.role !== 'superadmin') {
        return res.status(400).json({ error: 'Past / expired events cannot be deleted' });
      }

      // If attached meeting roomId exists, remove corresponding scheduled meeting
      if (event.meetingRoomId) {
        try {
          const m = await ScheduledMeeting.findOneAndDelete({ roomId: event.meetingRoomId });
          if (m && io) {
            if (m.teamId) {
              io.to(`team_${m.teamId}`).emit('scheduled-meeting-cancelled', { meetingId: m._id });
            }
            io.emit('scheduled-meeting-cancelled', { meetingId: m._id });
          }
        } catch (mDelErr) {
          console.warn('ScheduledMeeting delete sync error:', mDelErr.message);
        }
      }

      await Notification.create({
        type: 'event',
        text: `${event.user?.name || 'User'} deleted event "${event.title}"`,
        user: event.user?._id || req.user.id,
        eventId: event._id,
        time: new Date(),
        scope: req.user.role,
        teamId: req.user.role === 'team' ? req.user.teamId : null
      });

      await event.deleteOne();

      io.emit('deletedEvent', {
        id: event._id.toString(),
        date: new Date(event.date).toDateString()
      });

      res.sendStatus(204);
    } catch (err) {
      console.error('❌ Event delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete event' });
    }
  });

// ======================
// GET ALL EVENTS (role-based)
// ======================
router.get('/', fetchUser, async (req, res) => {
  try {
    let filter = {};
    
    // Scoped queries ensuring specific events only go to targeted users or creator
    if (req.user.role === 'single') {
      filter = { user: req.user.id, scope: 'single' };
    } else if (req.user.role === 'team') {
      filter = {
        teamId: req.user.teamId,
        scope: 'team',
        $or: [
          { targetType: 'all' },
          { targetType: { $exists: false } },
          { targetType: null },
          { user: req.user.id },
          { targetUserIds: req.user.id }
        ]
      };
    } else if (req.user.role === 'global') {
      filter = {
        scope: 'global',
        $or: [
          { targetType: 'all' },
          { targetType: { $exists: false } },
          { targetType: null },
          { user: req.user.id },
          { targetUserIds: req.user.id }
        ]
      };
    }

    const events = await Events.find(filter)
      .populate('user', 'name email')
      .populate('targetUserIds', 'name email');
    
    res.json(events);
  } catch (err) {
    console.error('❌ Event fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

  // ======================
  // GET EVENT BY ID
  // ======================
  router.get('/:id', fetchUser, async (req, res) => {
    try {
      const event = await Events.findById(req.params.id).populate('user', 'name email');
      if (!event) return res.status(404).json({ error: 'Event not found' });

      // 🔒 Authorization
      if (
        (req.user.role === 'single' && (event.scope !== 'single' || event.user.toString() !== req.user.id)) ||
        (req.user.role === 'team' && (event.scope !== 'team' || event.teamId?.toString() !== req.user.teamId)) ||
        (req.user.role === 'global' && event.scope !== 'global')
      ) {
        return res.status(403).json({ error: 'Not authorized to view this event' });
      }

      res.json(event);
    } catch (err) {
      console.error('❌ Error fetching event by ID:', err.message);
      res.status(500).json({ error: 'Failed to fetch event' });
    }
  });

  return router;
}
