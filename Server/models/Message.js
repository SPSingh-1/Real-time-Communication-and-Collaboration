// models/Message.js
import mongoose from 'mongoose';

const reactionSchema = new mongoose.Schema({
    emoji: {
        type: String,
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        // *** CRITICAL CORRECTION HERE: use 'User' (uppercase) if your User model is registered as 'User' ***
        // For example, if you have `mongoose.model('User', UserSchema);` in your User model file.
        // If it's `mongoose.model('user', UserSchema);`, then 'user' (lowercase) is correct.
        ref: 'user', // <<< Verify this matches your actual User model name
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const MessageSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        // Also ensure this one matches if it references your user model
        ref: 'user', // <<< Verify this matches your actual User model name
        required: true,
    },
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message', // This likely remains 'Message' as it refers to itself
        default: null,
    },
    reactions: [reactionSchema], // Array of reaction sub-documents
    // ... other fields like createdAt, updatedAt
}, { timestamps: true });

const Message = mongoose.model('Message', MessageSchema);
export default Message;