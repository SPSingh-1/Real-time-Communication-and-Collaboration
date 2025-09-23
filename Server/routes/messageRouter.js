import dotenv from 'dotenv';
dotenv.config();
import Message from '../models/Message.js';
import FileModel from '../models/File.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

export default function setupchatSocketHandlers(io) {
  io.on('connection', async (socket) => {
    console.log('Socket connected:', socket.id);

    // Initialize connection with role-based rooms
    socket.on('init', async (token) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        socket.userId = userId;
        socket.role = decoded.role || 'single';
        socket.teamId = decoded.teamId || null;
        socket.globalId = decoded.globalId || null;

        // Join only allowed rooms
        if (socket.role === 'single') {
          socket.join(`user:${userId}`);
        } else if (socket.role === 'team' && socket.teamId) {
          socket.join(`team:${socket.teamId}`);
        } else if (socket.role === 'global' && socket.globalId) {
          socket.join('global');
        }

        console.log(
          `User ${userId} connected -> role: ${socket.role}, team: ${socket.teamId || 'N/A'}, global: ${socket.globalId || 'N/A'}`
        );

        // Build filter for initial messages
        let filter = {};
        if (socket.role === 'single') {
          filter = { scope: 'single', user: userId };
        } else if (socket.role === 'team' && socket.teamId) {
          filter = { scope: 'team', teamId: socket.teamId };
        } else if (socket.role === 'global') {
          filter = { scope: 'global' };
        }

        // Fetch messages
        const messages = await Message.find(filter)
          .sort({ createdAt: 1 })
          .limit(100)
          .populate('user', 'name email')
          .populate({
            path: 'replyTo',
            populate: { path: 'user', select: 'name email' }
          })
          .populate('reactions.user', 'name')
          .populate('fileRef'); // Populate file reference

        socket.emit('initMessages', { userId, messages, role: socket.role });
      } catch (err) {
        console.error('Socket auth error:', err.message);
        socket.emit('authError', 'Invalid token');
      }
    });

    // Send message (enhanced with file support)
    socket.on('message', async (msg) => {
      if (!socket.userId) return;

      try {
        const messageData = {
          text: msg.text,
          user: socket.userId,
          replyTo: msg.replyTo || null,
          scope: socket.role,
          teamId: socket.role === 'team' ? socket.teamId : null,
          globalId: socket.role === 'global' ? socket.globalId : null
        };

        // Handle file attachments
        if (msg.fileUrl) {
          messageData.fileUrl = msg.fileUrl;
          messageData.fileType = msg.fileType;
          messageData.fileName = msg.fileName;
          messageData.isFileMessage = true;

          // If this is a file message, try to find the corresponding file record
          try {
            const fileRecord = await FileModel.findOne({
              fileUrl: msg.fileUrl,
              uploadedById: socket.userId,
              scope: socket.role
            });
            if (fileRecord) {
              messageData.fileRef = fileRecord._id;
            }
          } catch (fileErr) {
            console.warn('Could not find file record for message:', fileErr.message);
          }
        }

        const saved = await Message.create(messageData);

        const populated = await Message.findById(saved._id)
          .populate('user', 'name email')
          .populate({
            path: 'replyTo',
            populate: { path: 'user', select: 'name email' }
          })
          .populate('reactions.user', 'name')
          .populate('fileRef');

        // Emit only in the right room
      if (socket.role === 'single') {
        socket.emit('message', populated);
      } else if (socket.role === 'team' && socket.teamId) {
        io.to(`team:${socket.teamId}`).emit('message', populated);
      } else if (socket.role === 'global') {
        io.to('global').emit('message', populated);
      }
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('messageError', 'Failed to send message');
      }
    });

    // Delete message (enhanced with file cleanup)
    socket.on('deleteMessage', async (id) => {
      try {
        const msg = await Message.findById(id).populate('fileRef');
        if (msg && msg.user.toString() === socket.userId) {
          
          // If message has file attachment, optionally clean up file record
          if (msg.fileRef && msg.isFileMessage) {
            try {
              // Only delete file if it's only referenced by this message
              const otherMessagesWithFile = await Message.countDocuments({
                fileRef: msg.fileRef._id,
                _id: { $ne: id }
              });
              
              if (otherMessagesWithFile === 0) {
                // No other messages reference this file, safe to delete
                await FileModel.findByIdAndDelete(msg.fileRef._id);
                console.log(`File record ${msg.fileRef._id} cleaned up with message deletion`);
              }
            } catch (fileErr) {
              console.warn('Error cleaning up file record:', fileErr.message);
            }
          }

          await msg.deleteOne();

          if (socket.role === 'single') {
            io.to(`user:${socket.userId}`).emit('messageDeleted', id);
          } else if (socket.role === 'team') {
            io.to(`team:${socket.teamId}`).emit('messageDeleted', id);
          } else if (socket.role === 'global') {
            io.to('global').emit('messageDeleted', id);
          }
        }
      } catch (err) {
        console.error('Delete error:', err.message);
      }
    });

    // Edit message
    socket.on('editMessage', async ({ id, text }) => {
      try {
        const msg = await Message.findOneAndUpdate(
          { _id: id, user: socket.userId },
          { text, updatedAt: new Date() },
          { new: true }
        )
          .populate('user', 'name email')
          .populate({
            path: 'replyTo',
            populate: { path: 'user', select: 'name email' }
          })
          .populate('reactions.user', 'name')
          .populate('fileRef');

        if (msg) {
          if (socket.role === 'single') {
            io.to(`user:${socket.userId}`).emit('messageUpdated', msg);
          } else if (socket.role === 'team') {
            io.to(`team:${socket.teamId}`).emit('messageUpdated', msg);
          } else if (socket.role === 'global') {
            io.to('global').emit('messageUpdated', msg);
          }
        }
      } catch (err) {
        console.error('Edit error:', err.message);
      }
    });

    // React to message
    socket.on('react-to-message', async ({ messageId, emoji, userId }) => {
      if (!userId || userId !== socket.userId) return;

      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        const userObjectId = new mongoose.Types.ObjectId(userId);

        const existingReactionIndex = message.reactions.findIndex(
          (r) => r.user.equals(userObjectId) && r.emoji === emoji
        );

        if (existingReactionIndex !== -1) {
          // remove reaction
          message.reactions.splice(existingReactionIndex, 1);
        } else {
          // replace or add new
          const userExistingReactionIndex = message.reactions.findIndex((r) =>
            r.user.equals(userObjectId)
          );
          if (userExistingReactionIndex !== -1) {
            message.reactions[userExistingReactionIndex].emoji = emoji;
          } else {
            message.reactions.push({ user: userObjectId, emoji });
          }
        }

        await message.save();

        const populatedMessage = await Message.findById(messageId)
          .populate('user', 'name email')
          .populate({
            path: 'replyTo',
            populate: { path: 'user', select: 'name email' }
          })
          .populate('reactions.user', 'name')
          .populate('fileRef');

        if (socket.role === 'single') {
          io.to(`user:${socket.userId}`).emit('message-reaction', {
            messageId,
            reactions: populatedMessage.reactions
          });
        } else if (socket.role === 'team') {
          io.to(`team:${socket.teamId}`).emit('message-reaction', {
            messageId,
            reactions: populatedMessage.reactions
          });
        } else if (socket.role === 'global') {
          io.to('global').emit('message-reaction', {
            messageId,
            reactions: populatedMessage.reactions
          });
        }
      } catch (error) {
        console.error('Error handling reaction:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });
}