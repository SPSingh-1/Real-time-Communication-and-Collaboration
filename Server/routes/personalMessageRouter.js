// routes/personalMessageRouter.js - Socket handlers for personal chat
import dotenv from 'dotenv';
dotenv.config();
import PersonalMessage from '../models/PersonalMessage.js';
import FileModel from '../models/File.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

export function setupPersonalChatSocketHandlers(io) {
  io.on('connection', async (socket) => {
    console.log('Personal chat socket connected:', socket.id);
    
    // Initialize personal chat connection
    socket.on('init-personal-chat', async (token) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        socket.userId = userId;
        socket.role = decoded.role || 'single';
        socket.teamId = decoded.teamId || null;
        socket.globalId = decoded.globalId || null;

        console.log('Socket auth details:', {
          userId,
          role: socket.role,
          teamId: socket.teamId,
          globalId: socket.globalId
        });

        // FIXED: Allow both team AND global users (not just team)
        if (socket.role !== 'team' && socket.role !== 'global') {
          socket.emit('personal-chat-error', 'Personal chat only available for team and global members');
          return;
        }

        // Additional validation for team users
        if (socket.role === 'team' && !socket.teamId) {
          socket.emit('personal-chat-error', 'Team users must have a valid teamId');
          return;
        }

        // Join personal chat room for this user
        socket.join(`personal-chat:${userId}`);

        console.log(`User ${userId} connected to personal chat -> role: ${socket.role}, team: ${socket.teamId}, global: ${socket.globalId}`);

        socket.emit('personal-chat-initialized', { 
          userId, 
          role: socket.role, 
          teamId: socket.teamId,
          globalId: socket.globalId 
        });

      } catch (err) {
        console.error('Personal chat auth error:', err.message);
        socket.emit('personal-chat-error', 'Invalid token');
      }
    });

    // Join specific personal conversation
    socket.on('join-personal-conversation', async ({ teammateId }) => {
      console.log(`User ${socket.userId} attempting to join conversation with ${teammateId}`);
      
      if (!socket.userId || (socket.role !== 'team' && socket.role !== 'global')) {
        console.error('User not authorized for personal chat:', {
          userId: socket.userId,
          role: socket.role
        });
        socket.emit('personal-chat-error', 'Not authorized for personal chat');
        return;
      }

      try {
        const conversationId = PersonalMessage.createConversationId(socket.userId, teammateId);
        
        console.log(`Generated conversation ID: ${conversationId}`);
        
        // Leave previous conversation room if any
        if (socket.currentConversation) {
          socket.leave(`conversation:${socket.currentConversation}`);
          console.log(`Left previous conversation: ${socket.currentConversation}`);
        }

        // Join new conversation room
        socket.join(`conversation:${conversationId}`);
        socket.currentConversation = conversationId;
        socket.currentTeammate = teammateId;

        console.log(`User ${socket.userId} joined conversation: ${conversationId}`);
        console.log('Updated socket state:', {
          currentConversation: socket.currentConversation,
          currentTeammate: socket.currentTeammate
        });
        // Fetch messages for this conversation
        const messages = await PersonalMessage.find({
          conversationId
        })
        .sort({ createdAt: 1 })
        .limit(100)
        .populate('sender', 'name email')
        .populate('receiver', 'name email')
        .populate({
          path: 'replyTo',
          populate: { path: 'sender', select: 'name email' }
        })
        .populate('reactions.user', 'name')
        .populate('fileRef');

        console.log(`Found ${messages.length} messages for conversation ${conversationId}`);

        // Mark messages as read
        const updateResult = await PersonalMessage.updateMany({
          conversationId,
          sender: teammateId,
          receiver: socket.userId,
          isRead: false
        }, {
          isRead: true,
          readAt: new Date()
        });

        console.log(`Marked ${updateResult.modifiedCount} messages as read`);

        socket.emit('personal-conversation-messages', { 
          conversationId, 
          messages,
          teammateId 
        });

      } catch (error) {
        console.error('Error joining personal conversation:', error);
        socket.emit('personal-chat-error', 'Failed to join conversation');
      }
    });

    // Send personal message
    socket.on('send-personal-message', async (messageData) => {
      console.log('Received send-personal-message:', {
        userId: socket.userId,
        currentConversation: socket.currentConversation,
        currentTeammate: socket.currentTeammate,
        messageText: messageData.text?.substring(0, 50) + '...',
        role: socket.role
      });

      if (!socket.userId || !socket.currentConversation || !socket.currentTeammate) {
        console.error('Invalid conversation state:', {
          userId: socket.userId,
          currentConversation: socket.currentConversation,
          currentTeammate: socket.currentTeammate
        });
        socket.emit('personal-chat-error', 'Not in a valid conversation');
        return;
      }

      try {
        const personalMessageData = {
          text: messageData.text,
          sender: socket.userId,
          receiver: socket.currentTeammate,
          conversationId: socket.currentConversation,
          replyTo: messageData.replyTo || null
        };

        // Add role-specific data
        if (socket.role === 'team') {
          personalMessageData.teamId = socket.teamId;
          personalMessageData.scope = 'team';
        } else if (socket.role === 'global') {
          personalMessageData.globalId = socket.globalId;
          personalMessageData.scope = 'global';
        }

        // Handle file attachments
        if (messageData.fileUrl) {
          personalMessageData.fileUrl = messageData.fileUrl;
          personalMessageData.fileType = messageData.fileType;
          personalMessageData.fileName = messageData.fileName;
          personalMessageData.isFileMessage = true;

          // Try to find the corresponding file record
          try {
            const fileRecord = await FileModel.findOne({
              fileUrl: messageData.fileUrl,
              uploadedById: socket.userId
            });
            if (fileRecord) {
              personalMessageData.fileRef = fileRecord._id;
            }
          } catch (fileErr) {
            console.warn('Could not find file record for personal message:', fileErr.message);
          }
        }

        console.log('Creating personal message with data:', {
          text: personalMessageData.text,
          sender: personalMessageData.sender,
          receiver: personalMessageData.receiver,
          conversationId: personalMessageData.conversationId,
          scope: personalMessageData.scope
        });

        const saved = await PersonalMessage.create(personalMessageData);

        const populated = await PersonalMessage.findById(saved._id)
          .populate('sender', 'name email')
          .populate('receiver', 'name email')
          .populate({
            path: 'replyTo',
            populate: { path: 'sender', select: 'name email' }
          })
          .populate('reactions.user', 'name')
          .populate('fileRef');

        console.log('Personal message saved and populated:', populated._id);

        // Emit to conversation room (both participants)
        io.to(`conversation:${socket.currentConversation}`).emit('new-personal-message', populated);

        // Also emit to both users' personal chat rooms for updating conversation lists
        io.to(`personal-chat:${socket.userId}`).emit('conversation-updated', {
          conversationId: socket.currentConversation,
          lastMessage: populated
        });
        io.to(`personal-chat:${socket.currentTeammate}`).emit('conversation-updated', {
          conversationId: socket.currentConversation,
          lastMessage: populated
        });

        console.log('Personal message sent successfully');

      } catch (error) {
        console.error('Error sending personal message:', error);
        socket.emit('personal-chat-error', 'Failed to send message');
      }
    });

    // Delete personal message
    socket.on('delete-personal-message', async (messageId) => {
      if (!socket.userId) return;

      try {
        const msg = await PersonalMessage.findById(messageId).populate('fileRef');
        if (msg && msg.sender.toString() === socket.userId) {
          
          // Clean up file reference if needed
          if (msg.fileRef && msg.isFileMessage) {
            try {
              const otherMessagesWithFile = await PersonalMessage.countDocuments({
                fileRef: msg.fileRef._id,
                _id: { $ne: messageId }
              });
              
              if (otherMessagesWithFile === 0) {
                await FileModel.findByIdAndDelete(msg.fileRef._id);
                console.log(`File record ${msg.fileRef._id} cleaned up with personal message deletion`);
              }
            } catch (fileErr) {
              console.warn('Error cleaning up file record:', fileErr.message);
            }
          }

          const conversationId = msg.conversationId;
          await msg.deleteOne();

          // Emit to conversation room
          io.to(`conversation:${conversationId}`).emit('personal-message-deleted', messageId);
          
          console.log('Personal message deleted successfully:', messageId);
        }
      } catch (err) {
        console.error('Delete personal message error:', err.message);
        socket.emit('personal-chat-error', 'Failed to delete message');
      }
    });

    // Edit personal message
    socket.on('edit-personal-message', async ({ messageId, text }) => {
      if (!socket.userId) return;

      try {
        const msg = await PersonalMessage.findOneAndUpdate(
          { _id: messageId, sender: socket.userId },
          { text, updatedAt: new Date() },
          { new: true }
        )
        .populate('sender', 'name email')
        .populate('receiver', 'name email')
        .populate({
          path: 'replyTo',
          populate: { path: 'sender', select: 'name email' }
        })
        .populate('reactions.user', 'name')
        .populate('fileRef');

        if (msg) {
          io.to(`conversation:${msg.conversationId}`).emit('personal-message-updated', msg);
          console.log('Personal message edited successfully:', messageId);
        }
      } catch (err) {
        console.error('Edit personal message error:', err.message);
        socket.emit('personal-chat-error', 'Failed to edit message');
      }
    });

    // React to personal message
    socket.on('react-to-personal-message', async ({ messageId, emoji, userId }) => {
      if (!userId || userId !== socket.userId) return;

      try {
        const message = await PersonalMessage.findById(messageId);
        if (!message) return;

        const userObjectId = new mongoose.Types.ObjectId(userId);

        const existingReactionIndex = message.reactions.findIndex(
          (r) => r.user.equals(userObjectId) && r.emoji === emoji
        );

        if (existingReactionIndex !== -1) {
          // Remove reaction
          message.reactions.splice(existingReactionIndex, 1);
        } else {
          // Replace or add new
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

        const populatedMessage = await PersonalMessage.findById(messageId)
          .populate('sender', 'name email')
          .populate('receiver', 'name email')
          .populate({
            path: 'replyTo',
            populate: { path: 'sender', select: 'name email' }
          })
          .populate('reactions.user', 'name')
          .populate('fileRef');

        io.to(`conversation:${message.conversationId}`).emit('personal-message-reaction', {
          messageId,
          reactions: populatedMessage.reactions
        });

      } catch (error) {
        console.error('Error handling personal message reaction:', error);
        socket.emit('personal-chat-error', 'Failed to react to message');
      }
    });

    // Mark personal messages as read
    socket.on('mark-personal-messages-read', async ({ conversationId, senderId }) => {
      if (!socket.userId || !conversationId) return;

      try {
        await PersonalMessage.updateMany({
          conversationId,
          sender: senderId,
          receiver: socket.userId,
          isRead: false
        }, {
          isRead: true,
          readAt: new Date()
        });

        // Notify sender about read status
        io.to(`personal-chat:${senderId}`).emit('messages-read', {
          conversationId,
          readBy: socket.userId,
          readAt: new Date()
        });

      } catch (error) {
        console.error('Error marking personal messages as read:', error);
      }
    });

    // Leave personal conversation
    socket.on('leave-personal-conversation', () => {
      if (socket.currentConversation) {
        socket.leave(`conversation:${socket.currentConversation}`);
        console.log(`User ${socket.userId} left personal conversation: ${socket.currentConversation}`);
        socket.currentConversation = null;
        socket.currentTeammate = null;
      }
    });

    socket.on('disconnect', () => {
      console.log('Personal chat socket disconnected:', socket.id, 'User:', socket.userId);
      if (socket.currentConversation) {
        socket.leave(`conversation:${socket.currentConversation}`);
      }
      if (socket.userId) {
        socket.leave(`personal-chat:${socket.userId}`);
      }
    });
  });
}