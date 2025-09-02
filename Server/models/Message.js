// models/Message.js
import mongoose from 'mongoose';

const reactionSchema = new mongoose.Schema({
    emoji: {
        type: String,
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user', // Ensure this matches your User model registration
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
        trim: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user', // Ensure this matches your User model registration
        required: true,
    },
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null,
    },
    reactions: [reactionSchema],
    
    // Role-based fields
    scope: { 
        type: String, 
        enum: ['single', 'team', 'global'], 
        required: true,
        default: 'single' 
    },
    teamId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Team', 
        default: null 
    },
    globalId: { 
        type: String, 
        default: null 
    },
    
    // Message metadata
    isStarred: {
        type: Boolean,
        default: false
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    
    // Enhanced file attachment support
    fileUrl: {
        type: String,
        default: null
    },
    fileType: {
        type: String,
        default: null
    },
    fileName: {
        type: String,
        default: null
    },
    isFileMessage: {
        type: Boolean,
        default: false
    },
    // Reference to the File document for better management
    fileRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File',
        default: null
    }
}, { 
    timestamps: true,
    // Add indexes for better query performance
    indexes: [
        { scope: 1, createdAt: -1 },
        { teamId: 1, scope: 1, createdAt: -1 },
        { user: 1, scope: 1, createdAt: -1 },
        { globalId: 1, scope: 1, createdAt: -1 },
        { isFileMessage: 1, scope: 1, createdAt: -1 }
    ]
});

// Add middleware to ensure proper scope validation
MessageSchema.pre('save', function(next) {
    if (this.scope === 'team' && !this.teamId) {
        return next(new Error('Team messages must have a teamId'));
    }
    if (this.scope === 'global' && !this.globalId) {
        this.globalId = 'GLOBAL123'; // Set default global ID
    }
    if (this.scope === 'single' && (this.teamId || this.globalId)) {
        this.teamId = null;
        this.globalId = null;
    }
    
    // Set isFileMessage based on file attachments
    if (this.fileUrl || this.fileRef) {
        this.isFileMessage = true;
    }
    
    next();
});

const Message = mongoose.model('Message', MessageSchema);
export default Message;