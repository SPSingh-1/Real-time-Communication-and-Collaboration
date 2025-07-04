import Message from '../models/Message.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose'; // Import mongoose to use mongoose.Types.ObjectId

export default function setupSocketHandlers(io) {
    io.on('connection', async (socket) => {
        console.log('✅ Socket connected:', socket.id);

        socket.on('init', async (token) => {
            try {
                const decoded = jwt.verify(token, 'Shashi@2002');
                const userId = decoded.user.id;
                socket.userId = userId; // Store userId on the socket
                console.log(`User ${userId} connected.`);

                const messages = await Message.find({})
                    .sort({ createdAt: 1 }) // Use createdAt for consistent sorting with timestamps
                    .limit(100)
                    .populate('user', 'name email')
                    .populate({
                        path: 'replyTo',
                        populate: { path: 'user', select: 'name email' }
                    })
                    // >>> Add populate for reactions.user here for initial messages <<<
                    .populate('reactions.user', 'name'); // Ensure reaction users are populated

                socket.emit('initMessages', { userId, messages });
            } catch (err) {
                console.error('❌ Socket auth error:', err.message);
            }
        });

        socket.on('message', async (msg) => {
            if (!socket.userId) {
                console.log('Attempted to send message without userId on socket.');
                return;
            }

            try {
                const saved = await Message.create({
                    text: msg.text,
                    user: socket.userId,
                    replyTo: msg.replyTo || null,
                    // Do not set 'time' manually if you have timestamps: true in your schema
                    // Mongoose will automatically add createdAt and updatedAt
                });

                const populated = await Message.findById(saved._id)
                    .populate('user', 'name email')
                    .populate({
                        path: 'replyTo',
                        populate: { path: 'user', select: 'name email' }
                    })
                    // >>> Add populate for reactions.user here for new messages <<<
                    .populate('reactions.user', 'name'); // Ensure reaction users are populated

                io.emit('message', populated);
            } catch (error) {
                console.error('Error sending message:', error);
            }
        });

        socket.on('deleteMessage', async (id) => {
            try {
                const msg = await Message.findById(id);
                // Ensure msg.user is a string for comparison if populated to an object
                if (msg && msg.user.toString() === socket.userId) {
                    await msg.deleteOne();
                    io.emit('messageDeleted', id);
                }
            } catch (err) {
                console.error('❌ Delete error:', err.message);
            }
        });

        socket.on('editMessage', async ({ id, text }) => {
            try {
                const msg = await Message.findOneAndUpdate(
                    { _id: id, user: socket.userId },
                    { text },
                    { new: true }
                )
                    .populate('user', 'name email')
                    .populate({
                        path: 'replyTo',
                        populate: { path: 'user', select: 'name email' }
                    })
                    // >>> Add populate for reactions.user here for edited messages <<<
                    .populate('reactions.user', 'name'); // Ensure reaction users are populated

                if (msg) io.emit('messageUpdated', msg);
            } catch (err) {
                console.error('❌ Edit error:', err.message);
            }
        });

        // Handle emoji reactions
        socket.on('react-to-message', async ({ messageId, emoji, userId }) => { // <--- Receive userId here
            if (!userId) {
                console.error('Attempted to react without userId.');
                return;
            }

            try {
                const message = await Message.findById(messageId);
                if (!message) {
                    console.log("Message not found for reaction:", messageId);
                    return;
                }

                // Ensure reactions array exists
                if (!Array.isArray(message.reactions)) {
                    message.reactions = [];
                }

                // Convert userId string to ObjectId for consistent comparison and storage
                const userObjectId = new mongoose.Types.ObjectId(userId);

                // Check if the user has already reacted with this specific emoji
                const existingReactionIndex = message.reactions.findIndex(
                    r => r.user.equals(userObjectId) && r.emoji === emoji
                );

                if (existingReactionIndex !== -1) {
                    // User already reacted with this emoji, remove it (toggle off)
                    message.reactions.splice(existingReactionIndex, 1);
                } else {
                    // Check if the user has reacted with *any* emoji on this message
                    const userExistingReactionIndex = message.reactions.findIndex(
                        r => r.user.equals(userObjectId)
                    );

                    if (userExistingReactionIndex !== -1) {
                        // User has an existing reaction, update it to the new emoji
                        message.reactions[userExistingReactionIndex].emoji = emoji;
                    } else {
                        // No existing reaction from this user, add a new one
                        message.reactions.push({ user: userObjectId, emoji: emoji });
                    }
                }

                await message.save();

                // Emit updated reactions after populating the reaction users
                const populatedMessage = await Message.findById(messageId)
                    .populate('user', 'name email') // Keep message sender populated
                    .populate({ // Keep replyTo populated
                        path: 'replyTo',
                        populate: { path: 'user', select: 'name email' }
                    })
                    .populate('reactions.user', 'name'); // Crucial: Populate reaction users before emitting

                io.emit('message-reaction', { messageId, reactions: populatedMessage.reactions });
            } catch (error) {
                console.error('Error handling reaction:', error);
                if (error.name === 'ValidationError') {
                    console.error('Mongoose Validation Error details:', error.errors);
                }
            }
        });


        socket.on('disconnect', () => {
            console.log('❌ Socket disconnected:', socket.id);
        });
    });
}