// backend/routes/webrtcSignaling.js
import ScheduledMeeting from '../models/ScheduledMeeting.js';

export function setupWebRTCSignaling(io) {
  // Map of roomId -> Map(socketId -> participantInfo)
  const rooms = new Map();
  // Map of socketId -> Set(roomId)
  const socketRooms = new Map();
  // Map of userId -> { roomId, socketId, userName, callType, joinedAt }
  const activeCallUsers = new Map();
  // Map of userId -> Set(socketId)
  const userSockets = new Map();
  // Map of socketId -> userId
  const socketToUser = new Map();

  // Map of roomId -> Array of drawing strokes for whiteboard history
  const roomWhiteboardLines = new Map();
  // Map of roomId -> boolean (is whiteboard open in room)
  const roomWhiteboardOpen = new Map();

  io.on('connection', (socket) => {
    // 0. Register user socket for targeted notifications
    socket.on('register-user-socket', ({ userId, teamId, role }) => {
      if (!userId) return;
      const strUserId = String(userId);
      socketToUser.set(socket.id, strUserId);

      if (!userSockets.has(strUserId)) {
        userSockets.set(strUserId, new Set());
      }
      userSockets.get(strUserId).add(socket.id);

      // Join team room for team-wide broadcasts
      if (teamId) {
        socket.join(`team_${String(teamId)}`);
      }
      if (role === 'global') {
        socket.join('global_community');
      }
      console.log(`🔌 [Socket Registered] User: ${strUserId} (Socket: ${socket.id}, Team: ${teamId || 'none'})`);
    });

    // 1. Check live availability/call status of given user IDs
    socket.on('check-users-call-status', ({ userIds }, callback) => {
      const statusMap = {};
      if (Array.isArray(userIds)) {
        for (const uid of userIds) {
          const strUid = String(uid?._id || uid?.id || uid);
          const activeInfo = activeCallUsers.get(strUid) || activeCallUsers.get(uid);
          statusMap[strUid] = {
            inCall: !!activeInfo,
            roomId: activeInfo?.roomId || null,
            callType: activeInfo?.callType || null,
          };
        }
      }
      if (typeof callback === 'function') {
        callback(statusMap);
      } else {
        socket.emit('users-call-status-response', statusMap);
      }
    });

    // 2. Dispatch Meeting Invite (@all or specific members)
    socket.on('send-meeting-invite', ({ targetType, targetUserIds, roomId, callType, hostUser, meetingTitle, teamId }) => {
      const callerUserId = String(hostUser?.id || hostUser?._id || socketToUser.get(socket.id) || '');
      const normalizedTargetIds = Array.isArray(targetUserIds)
        ? targetUserIds.map((item) => String(item?._id || item?.id || item))
        : [];

      const invitePayload = {
        roomId,
        callType: callType || 'video',
        hostUser: hostUser || { name: 'Teammate' },
        callerUserId: callerUserId || null,
        targetType: targetType || 'all',
        targetUserIds: normalizedTargetIds,
        teamId: teamId ? String(teamId) : null,
        meetingTitle: meetingTitle || `${hostUser?.name || 'Team'}'s Meeting`,
        timestamp: Date.now(),
      };

      console.log(`📞 [Meeting Invite] Sent by ${hostUser?.name} (${targetType}) for room: ${roomId} -> Targets:`, normalizedTargetIds);

      if (targetType === 'all') {
        // Broadcast to entire team room and global broadcast
        if (teamId) {
          socket.to(`team_${String(teamId)}`).emit('incoming-meeting-call', invitePayload);
        }
        socket.broadcast.emit('incoming-meeting-call', invitePayload);
      } else if (normalizedTargetIds.length > 0) {
        // Send to specific target users directly
        for (const targetUid of normalizedTargetIds) {
          if (callerUserId && targetUid === callerUserId) continue;
          const targetSockets = userSockets.get(targetUid);
          if (targetSockets && targetSockets.size > 0) {
            for (const sId of targetSockets) {
              io.to(sId).emit('incoming-meeting-call', invitePayload);
              console.log(`🚀 [Invite Dispatched] Sent to socket ${sId} for user ${targetUid}`);
            }
          }
        }
        // Broadcast fallback so client-side IncomingCallModal processes it seamlessly
        socket.broadcast.emit('incoming-meeting-call', invitePayload);
      }
    });

    // 3. User joins a call room
    socket.on('join-call-room', async ({ roomId, user, isAudioOnly }) => {
      if (!roomId) return;
      const cleanRoom = String(roomId).trim().toLowerCase();

      // Check if scheduled meeting is already ended
      try {
        const completedMeeting = await ScheduledMeeting.findOne({
          roomId: { $in: [cleanRoom, roomId] },
          status: 'completed'
        });
        if (completedMeeting) {
          socket.emit('meeting-join-rejected', {
            roomId,
            reason: 'This meeting has ended by the host and cannot be joined.'
          });
          return;
        }
      } catch (err) {
        console.warn('Completed meeting check error:', err.message);
      }

      socket.join(roomId);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
      }
      if (!socketRooms.has(socket.id)) {
        socketRooms.set(socket.id, new Set());
      }

      const roomUsers = rooms.get(roomId);
      const participantInfo = {
        socketId: socket.id,
        user: user || { id: socket.id, name: 'Anonymous' },
        isAudioOnly: !!isAudioOnly,
        audioEnabled: true,
        videoEnabled: !isAudioOnly,
        isScreenSharing: false,
        joinedAt: Date.now(),
      };

      // Track active call status for user
      const userId = user?._id || user?.id || socket.id;
      activeCallUsers.set(userId, {
        roomId,
        socketId: socket.id,
        userName: user?.name || 'User',
        callType: isAudioOnly ? 'audio' : 'video',
        joinedAt: Date.now(),
      });

      // Send existing participants to the newly joined peer
      const existingParticipants = Array.from(roomUsers.values());
      socket.emit('all-call-users', existingParticipants);

      // Add to room tracking
      roomUsers.set(socket.id, participantInfo);
      socketRooms.get(socket.id).add(roomId);

      // Broadcast to others in the room
      socket.to(roomId).emit('user-joined-call', participantInfo);

      // Broadcast status update so teammates know this user is in a call
      io.emit('user-call-status-changed', {
        userId,
        inCall: true,
        roomId,
        callType: isAudioOnly ? 'audio' : 'video',
      });

      // Async log attendance join to MongoDB
      try {
        const attendeeData = {
          userId,
          name: user?.name || user?.email || 'Attendee',
          email: user?.email || '',
          photo: user?.photo || '',
          role: user?.role || 'member',
          joinedAt: new Date()
        };

        const existingMeeting = await ScheduledMeeting.findOne({
          roomId: { $in: [cleanRoom, roomId] }
        });

        if (existingMeeting) {
          const idx = existingMeeting.attendees.findIndex((a) => String(a.userId) === String(userId));
          if (idx >= 0) {
            existingMeeting.attendees[idx].joinedAt = new Date();
            existingMeeting.attendees[idx].leftAt = null;
          } else {
            existingMeeting.attendees.push(attendeeData);
          }
          if (existingMeeting.status === 'scheduled') {
            existingMeeting.status = 'active';
          }
          await existingMeeting.save();
        } else {
          // Auto create active meeting record for ad-hoc room
          await ScheduledMeeting.create({
            title: `Meeting: ${roomId}`,
            roomId: cleanRoom,
            callType: isAudioOnly ? 'audio' : 'video',
            scheduledTime: new Date(),
            hostUser: {
              id: userId,
              name: user?.name || user?.email || 'Host',
              email: user?.email || '',
              photo: user?.photo || ''
            },
            teamId: user?.teamId || null,
            scope: user?.role || 'team',
            status: 'active',
            triggered: true,
            attendees: [attendeeData]
          });
        }
      } catch (dbJoinErr) {
        console.warn('DB attendance join log warning:', dbJoinErr.message);
      }

      console.log(`[WebRTC] ${user?.name || socket.id} joined call room: ${roomId} (Total: ${roomUsers.size})`);
    });

    // 4. In-Call Real-Time Text Messaging
    socket.on('in-call-message', async ({ roomId, message, sender }) => {
      if (!roomId || !message) return;
      const cleanRoom = String(roomId).trim().toLowerCase();
      const messagePayload = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        text: message,
        sender: sender || { name: 'Anonymous' },
        createdAt: new Date().toISOString(),
        roomId: cleanRoom
      };
      io.to(cleanRoom).emit('in-call-message', messagePayload);
      if (cleanRoom !== roomId) {
        io.to(roomId).emit('in-call-message', messagePayload);
      }

      // Persist in-call message to ScheduledMeeting
      try {
        await ScheduledMeeting.updateOne(
          { roomId: { $in: [cleanRoom, roomId] } },
          {
            $push: {
              chatMessages: {
                id: messagePayload.id,
                senderId: sender?.id || sender?._id || socket.id,
                senderName: sender?.name || 'User',
                senderPhoto: sender?.photo || '',
                text: message,
                timestamp: new Date()
              }
            }
          }
        );
      } catch (msgDbErr) {
        console.warn('DB in-call message persist error:', msgDbErr.message);
      }

      console.log(`[InCallChat] Message in ${cleanRoom} from ${sender?.name}: ${message}`);
    });

    // 5. In-Call Real-Time File Shared Notification
    socket.on('in-call-file-shared', ({ roomId, file, sender }) => {
      if (!roomId || !file) return;
      const cleanRoom = String(roomId).trim().toLowerCase();
      const payload = {
        file,
        sender: sender || { name: 'Anonymous' },
        createdAt: new Date().toISOString(),
        roomId: cleanRoom
      };
      io.to(cleanRoom).emit('in-call-file-shared', payload);
      if (cleanRoom !== roomId) {
        io.to(roomId).emit('in-call-file-shared', payload);
      }
    });

    // 5b. Host Remotely Mutes a Participant
    socket.on('host-mute-user', ({ roomId, targetSocketId, targetUserId }) => {
      const cleanRoom = String(roomId).trim().toLowerCase();
      if (targetSocketId) {
        io.to(targetSocketId).emit('host-muted-you', {
          mutedBy: socket.id,
          roomId: cleanRoom
        });
      }
      io.to(cleanRoom).emit('user-media-state-changed', {
        socketId: targetSocketId,
        type: 'audio',
        enabled: false,
      });
      console.log(`[HostAction] Host muted user socket ${targetSocketId} in ${cleanRoom}`);
    });

    // 5c. Live Raise Hand / Lower Hand Signaling
    socket.on('toggle-raise-hand', ({ roomId, isRaised, user }) => {
      if (!roomId) return;
      const cleanRoom = String(roomId).trim().toLowerCase();
      const payload = {
        socketId: socket.id,
        userId: user?._id || user?.id || socket.id,
        userName: user?.name || 'Teammate',
        isRaised: Boolean(isRaised),
        timestamp: Date.now()
      };
      io.to(cleanRoom).emit('user-raised-hand-changed', payload);
      if (cleanRoom !== roomId) {
        io.to(cleanRoom).emit('user-raised-hand-changed', payload);
      }
      console.log(`🖐️ [RaiseHand] ${user?.name || socket.id} ${isRaised ? 'raised' : 'lowered'} hand in ${cleanRoom}`);
    });

    // 5d. Host Lowers a Participant's Raised Hand
    socket.on('host-lower-hand', ({ roomId, targetSocketId, targetUserId, targetUserName }) => {
      if (!roomId) return;
      const cleanRoom = String(roomId).trim().toLowerCase();
      const payload = {
        socketId: targetSocketId,
        userId: targetUserId,
        userName: targetUserName || 'Teammate',
        isRaised: false,
        loweredByHost: true,
        timestamp: Date.now()
      };
      io.to(cleanRoom).emit('user-raised-hand-changed', payload);
      if (cleanRoom !== roomId) {
        io.to(cleanRoom).emit('user-raised-hand-changed', payload);
      }
      console.log(`🖐️ [HostAction] Host lowered hand of socket ${targetSocketId} in ${cleanRoom}`);
    });

    // 5e. Host Ends Meeting for All Participants
    socket.on('host-end-meeting-for-all', async ({ roomId, user }) => {
      if (!roomId) return;
      const cleanRoom = String(roomId).trim().toLowerCase();
      console.log(`🛑 [EndMeeting] Host ${user?.name || socket.id} ended meeting for all in: ${roomId}`);

      // Disconnect all peers in this room
      io.to(roomId).emit('meeting-ended-by-host', {
        roomId,
        endedByName: user?.name || 'Meeting Host'
      });
      if (cleanRoom !== roomId) {
        io.to(cleanRoom).emit('meeting-ended-by-host', {
          roomId: cleanRoom,
          endedByName: user?.name || 'Meeting Host'
        });
      }

      // Mark meeting as completed in database
      try {
        await ScheduledMeeting.updateMany(
          { roomId: { $in: [cleanRoom, roomId] } },
          { status: 'completed' }
        );
        io.emit('scheduled-meeting-ended', { roomId });
      } catch (err) {
        console.error('DB update meeting completed error:', err);
      }
    });

    // 6. Offer from initiator to target peer
    socket.on('call-user-offer', ({ userToCall, signalData, fromUser, isAudioOnly }) => {
      io.to(userToCall).emit('call-user-offer', {
        signalData,
        fromSocketId: socket.id,
        fromUser,
        isAudioOnly,
      });
    });

    // 7. Answer from target peer back to initiator
    socket.on('call-user-answer', ({ to, signalData }) => {
      io.to(to).emit('call-user-answer', {
        signalData,
        fromSocketId: socket.id,
      });
    });

    // 8. ICE Candidate exchange
    socket.on('ice-candidate', ({ target, candidate }) => {
      if (target) {
        io.to(target).emit('ice-candidate', {
          candidate,
          fromSocketId: socket.id,
        });
      }
    });

    // 9. Toggle Audio / Video / Screen state
    socket.on('toggle-media-state', ({ roomId, type, enabled }) => {
      if (!roomId || !rooms.has(roomId)) return;
      const roomUsers = rooms.get(roomId);
      const participant = roomUsers.get(socket.id);
      if (participant) {
        if (type === 'audio') participant.audioEnabled = enabled;
        if (type === 'video') participant.videoEnabled = enabled;
        if (type === 'screen') participant.isScreenSharing = enabled;

        io.to(roomId).emit('user-media-state-changed', {
          socketId: socket.id,
          type,
          enabled,
        });
      }
    });

    // 9a. In-Call Real-Time Collaborative Whiteboard
    socket.on('toggle-whiteboard', ({ roomId, isOpen, user }) => {
      if (!roomId) return;
      const cleanRoom = String(roomId).trim().toLowerCase();
      roomWhiteboardOpen.set(cleanRoom, Boolean(isOpen));
      const payload = {
        roomId: cleanRoom,
        isOpen: Boolean(isOpen),
        user: user || { name: 'Teammate' },
        timestamp: Date.now()
      };
      socket.to(cleanRoom).emit('whiteboard-state-changed', payload);
      if (cleanRoom !== roomId) {
        socket.to(roomId).emit('whiteboard-state-changed', payload);
      }
      console.log(`🎨 [Whiteboard] ${user?.name || socket.id} ${isOpen ? 'opened' : 'closed'} whiteboard in ${cleanRoom}`);
    });

    socket.on('request-whiteboard-history', ({ roomId }) => {
      if (!roomId) return;
      const cleanRoom = String(roomId).trim().toLowerCase();
      const lines = roomWhiteboardLines.get(cleanRoom) || roomWhiteboardLines.get(roomId) || [];
      socket.emit('whiteboard-history', { roomId: cleanRoom, lines });
    });

    socket.on('whiteboard-draw-line', ({ roomId, lineData }) => {
      if (!roomId || !lineData) return;
      const cleanRoom = String(roomId).trim().toLowerCase();
      if (!roomWhiteboardLines.has(cleanRoom)) {
        roomWhiteboardLines.set(cleanRoom, []);
      }
      const list = roomWhiteboardLines.get(cleanRoom);
      list.push(lineData);
      if (list.length > 5000) list.shift();

      socket.to(cleanRoom).emit('whiteboard-draw-line', lineData);
      if (cleanRoom !== roomId) {
        socket.to(roomId).emit('whiteboard-draw-line', lineData);
      }
    });

    socket.on('whiteboard-clear', ({ roomId }) => {
      if (!roomId) return;
      const cleanRoom = String(roomId).trim().toLowerCase();
      roomWhiteboardLines.set(cleanRoom, []);
      if (cleanRoom !== roomId) {
        roomWhiteboardLines.set(roomId, []);
      }
      socket.to(cleanRoom).emit('whiteboard-clear');
      if (cleanRoom !== roomId) {
        socket.to(roomId).emit('whiteboard-clear');
      }
    });

    // 9b. In-Call Live Polls
    socket.on('create-poll', ({ roomId, poll }) => {
      if (!roomId || !poll) return;
      const cleanRoom = String(roomId).trim().toLowerCase();
      io.to(cleanRoom).emit('new-poll', poll);
      if (cleanRoom !== roomId) {
        io.to(roomId).emit('new-poll', poll);
      }
      console.log(`📊 [Poll Created] in ${cleanRoom}: "${poll.question}"`);
    });

    socket.on('vote-poll', ({ roomId, pollId, optionIndex, voter }) => {
      if (!roomId || !pollId) return;
      const cleanRoom = String(roomId).trim().toLowerCase();
      io.to(cleanRoom).emit('poll-voted', { pollId, optionIndex, voter });
      if (cleanRoom !== roomId) {
        io.to(roomId).emit('poll-voted', { pollId, optionIndex, voter });
      }
    });

    socket.on('end-poll', ({ roomId, pollId }) => {
      if (!roomId || !pollId) return;
      const cleanRoom = String(roomId).trim().toLowerCase();
      io.to(cleanRoom).emit('poll-ended', { pollId });
      if (cleanRoom !== roomId) {
        io.to(roomId).emit('poll-ended', { pollId });
      }
    });

    // 9c. Floating Emoji Reactions
    socket.on('send-reaction', ({ roomId, emoji, senderName, senderId, id }) => {
      if (!roomId || !emoji) return;
      const cleanRoom = String(roomId).trim().toLowerCase();
      const reactionPayload = {
        id: id || `react_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        emoji,
        senderName: senderName || 'Teammate',
        senderId: senderId || socket.id,
        timestamp: Date.now()
      };
      io.to(cleanRoom).emit('floating-reaction', reactionPayload);
      if (cleanRoom !== roomId) {
        io.to(roomId).emit('floating-reaction', reactionPayload);
      }
    });

    // 10. Explicit Leave Room
    socket.on('leave-call-room', ({ roomId }) => {
      handleUserLeave(socket, roomId);
    });

    // 11. Disconnect cleanup
    socket.on('disconnect', () => {
      const userJoinedRooms = socketRooms.get(socket.id);
      if (userJoinedRooms) {
        for (const roomId of userJoinedRooms) {
          handleUserLeave(socket, roomId);
        }
        socketRooms.delete(socket.id);
      }

      // Cleanup user socket mappings
      const userId = socketToUser.get(socket.id);
      if (userId) {
        socketToUser.delete(socket.id);
        const sList = userSockets.get(userId);
        if (sList) {
          sList.delete(socket.id);
          if (sList.size === 0) {
            userSockets.delete(userId);
          }
        }
      }
    });
  });

  async function handleUserLeave(socket, roomId) {
    if (rooms.has(roomId)) {
      const roomUsers = rooms.get(roomId);
      const participant = roomUsers.get(socket.id);
      const userId = participant?.user?._id || participant?.user?.id || socketToUser.get(socket.id);

      if (userId && activeCallUsers.has(userId)) {
        activeCallUsers.delete(userId);
        io.emit('user-call-status-changed', {
          userId,
          inCall: false,
        });
      }

      // Async log attendance leave to MongoDB
      if (userId && participant?.joinedAt) {
        try {
          const cleanRoom = String(roomId).trim().toLowerCase();
          const leftAt = new Date();
          const duration = Math.max(0, Math.floor((leftAt.getTime() - participant.joinedAt) / 1000));
          
          await ScheduledMeeting.updateOne(
            { roomId: { $in: [cleanRoom, roomId] }, 'attendees.userId': userId },
            { 
              $set: { 'attendees.$.leftAt': leftAt },
              $inc: { 'attendees.$.durationSeconds': duration }
            }
          );
        } catch (dbLeaveErr) {
          console.warn('DB attendance leave log warning:', dbLeaveErr.message);
        }
      }

      roomUsers.delete(socket.id);
      socket.to(roomId).emit('user-left-call', { socketId: socket.id });
      socket.leave(roomId);

      if (roomUsers.size === 0) {
        rooms.delete(roomId);
      }
      console.log(`[WebRTC] ${socket.id} left room: ${roomId}`);
    }

    if (socketRooms.has(socket.id)) {
      socketRooms.get(socket.id).delete(roomId);
    }
  }
}
