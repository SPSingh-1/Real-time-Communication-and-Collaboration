// routes/personalChat.js - Personal chat routes (Updated)
import express from 'express';
import PersonalMessage from '../models/PersonalMessage.js';
import User from '../models/User.js';
import fetchUser from '../middleware/fetchUser.js';

const router = express.Router();

// GET /api/personal-chat/teammates - Get all teammates for sidebar (team members)
router.get('/teammates', fetchUser, async (req, res) => {
  try {
    if (req.user.role !== 'team' || !req.user.teamId) {
      return res.status(400).json({ error: 'User must be in team role with valid teamId' });
    }

    // Get all team members except current user
    const teammates = await User.find({
      teamId: req.user.teamId,
      role: 'team',
      _id: { $ne: req.user.id }
    }).select('name email _id createdAt');

    // Get last message and unread count for each teammate
    const teammatesWithChatInfo = await Promise.all(
      teammates.map(async (teammate) => {
        const conversationId = PersonalMessage.createConversationId(req.user.id, teammate._id);
        
        // Get last message
        const lastMessage = await PersonalMessage.findOne({
          conversationId
        }).sort({ createdAt: -1 }).populate('sender', 'name');

        // Get unread count (messages sent by teammate that current user hasn't read)
        const unreadCount = await PersonalMessage.countDocuments({
          conversationId,
          sender: teammate._id,
          receiver: req.user.id,
          isRead: false
        });

        return {
          ...teammate.toObject(),
          lastMessage: lastMessage ? {
            text: lastMessage.text,
            createdAt: lastMessage.createdAt,
            senderName: lastMessage.sender.name,
            isFileMessage: lastMessage.isFileMessage,
            fileName: lastMessage.fileName
          } : null,
          unreadCount
        };
      })
    );

    // Sort by last message time (most recent first)
    teammatesWithChatInfo.sort((a, b) => {
      if (!a.lastMessage && !b.lastMessage) return 0;
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
    });

    res.json(teammatesWithChatInfo);

  } catch (err) {
    console.error('Error fetching teammates:', err);
    res.status(500).json({ error: 'Failed to fetch teammates' });
  }
});

// GET /api/personal-chat/global-users - Get all global users for sidebar (global members)
router.get('/global-users', fetchUser, async (req, res) => {
  try {
    if (req.user.role !== 'global') {
      return res.status(400).json({ error: 'User must be in global role' });
    }

    // Get all global users except current user
    const globalUsers = await User.find({
      role: 'global',
      _id: { $ne: req.user.id }
    }).select('name email _id createdAt');

    // Get last message and unread count for each global user
    const globalUsersWithChatInfo = await Promise.all(
      globalUsers.map(async (globalUser) => {
        const conversationId = PersonalMessage.createConversationId(req.user.id, globalUser._id);
        
        // Get last message
        const lastMessage = await PersonalMessage.findOne({
          conversationId
        }).sort({ createdAt: -1 }).populate('sender', 'name');

        // Get unread count (messages sent by global user that current user hasn't read)
        const unreadCount = await PersonalMessage.countDocuments({
          conversationId,
          sender: globalUser._id,
          receiver: req.user.id,
          isRead: false
        });

        return {
          ...globalUser.toObject(),
          lastMessage: lastMessage ? {
            text: lastMessage.text,
            createdAt: lastMessage.createdAt,
            senderName: lastMessage.sender.name,
            isFileMessage: lastMessage.isFileMessage,
            fileName: lastMessage.fileName
          } : null,
          unreadCount
        };
      })
    );

    // Sort by last message time (most recent first)
    globalUsersWithChatInfo.sort((a, b) => {
      if (!a.lastMessage && !b.lastMessage) return 0;
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
    });

    res.json(globalUsersWithChatInfo);

  } catch (err) {
    console.error('Error fetching global users:', err);
    res.status(500).json({ error: 'Failed to fetch global users' });
  }
});

// GET /api/personal-chat/messages/:partnerId - Get messages with a specific partner (team member or global user)
router.get('/messages/:partnerId', fetchUser, async (req, res) => {
  try {
    const { partnerId } = req.params;
    
    if (req.user.role !== 'team' && req.user.role !== 'global') {
      return res.status(400).json({ error: 'User must be in team or global role' });
    }

    let partner;
    
    // Verify partner is in same role/scope
    if (req.user.role === 'team') {
      partner = await User.findOne({
        _id: partnerId,
        teamId: req.user.teamId,
        role: 'team'
      });
      
      if (!partner) {
        return res.status(404).json({ error: 'Team member not found or not in same team' });
      }
    } else if (req.user.role === 'global') {
      partner = await User.findOne({
        _id: partnerId,
        role: 'global'
      });
      
      if (!partner) {
        return res.status(404).json({ error: 'Global user not found' });
      }
    }

    const conversationId = PersonalMessage.createConversationId(req.user.id, partnerId);

    // Get messages
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

    // Mark messages as read (messages sent by partner to current user)
    await PersonalMessage.updateMany({
      conversationId,
      sender: partnerId,
      receiver: req.user.id,
      isRead: false
    }, {
      isRead: true,
      readAt: new Date()
    });

    res.json({
      messages,
      partner: {
        _id: partner._id,
        name: partner.name,
        email: partner.email
      },
      conversationId
    });

  } catch (err) {
    console.error('Error fetching personal messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// GET /api/personal-chat/conversations - Get all conversations for current user
router.get('/conversations', fetchUser, async (req, res) => {
  try {
    if (req.user.role !== 'team' && req.user.role !== 'global') {
      return res.status(400).json({ error: 'User must be in team or global role' });
    }

    let matchConditions = {
      $or: [
        { sender: req.user.id },
        { receiver: req.user.id }
      ]
    };

    // Add role-specific conditions
    if (req.user.role === 'team') {
      matchConditions.teamId = req.user.teamId;
    } else if (req.user.role === 'global') {
      matchConditions.scope = 'global'; // Assuming we add scope field to PersonalMessage
    }

    // Get all unique conversation IDs for this user
    const conversations = await PersonalMessage.aggregate([
      {
        $match: matchConditions
      },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $last: '$$ROOT' },
          totalMessages: { $sum: 1 },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$sender', req.user.id] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'lastMessage.sender',
          foreignField: '_id',
          as: 'lastMessageSender'
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    res.json(conversations);

  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// POST /api/personal-chat/mark-read/:partnerId - Mark all messages as read
router.post('/mark-read/:partnerId', fetchUser, async (req, res) => {
  try {
    const { partnerId } = req.params;
    
    if (req.user.role !== 'team' && req.user.role !== 'global') {
      return res.status(400).json({ error: 'User must be in team or global role' });
    }

    const conversationId = PersonalMessage.createConversationId(req.user.id, partnerId);

    await PersonalMessage.updateMany({
      conversationId,
      sender: partnerId,
      receiver: req.user.id,
      isRead: false
    }, {
      isRead: true,
      readAt: new Date()
    });

    res.json({ message: 'Messages marked as read' });

  } catch (err) {
    console.error('Error marking messages as read:', err);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// DELETE /api/personal-chat/message/:messageId - Delete a personal message
router.delete('/message/:messageId', fetchUser, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await PersonalMessage.findOne({
      _id: messageId,
      sender: req.user.id // Only sender can delete their own messages
    }).populate('fileRef');

    if (!message) {
      return res.status(404).json({ error: 'Message not found or not authorized' });
    }

    // Clean up file reference if needed
    if (message.fileRef && message.isFileMessage) {
      try {
        const otherMessagesWithFile = await PersonalMessage.countDocuments({
          fileRef: message.fileRef._id,
          _id: { $ne: messageId }
        });
        
        if (otherMessagesWithFile === 0) {
          await FileModel.findByIdAndDelete(message.fileRef._id);
        }
      } catch (fileErr) {
        console.warn('Error cleaning up file record:', fileErr.message);
      }
    }

    await PersonalMessage.findByIdAndDelete(messageId);
    
    res.json({ message: 'Message deleted successfully' });

  } catch (err) {
    console.error('Error deleting personal message:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;