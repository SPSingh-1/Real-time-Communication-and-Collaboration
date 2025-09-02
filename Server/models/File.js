// models/File.js - Complete Updated Model
import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
    fileUrl: { type: String, required: true },
    filename: { type: String, required: true }, // Original file name
    uploadedBy: { type: String, required: true }, // User's name (e.g., "Shashi")
    uploadedById: { // User's MongoDB _id
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user', // Match your User model name
        required: true,
    },
    type: { type: String, required: true }, // Classified file type (image, video, etc.)

    // Role-based fields
    scope: { type: String, enum: ['single', 'team', 'global'], default: 'single' },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    
    // Chat file identifier
    isFromChat: { type: Boolean, default: false }, // Flag to identify files uploaded through chat
    
    // File metadata
    size: { type: Number, default: 0 }, // File size in bytes
    mimetype: { type: String, default: null }, // Original MIME type
    
    // Optional fields for better file management
    description: { type: String, default: null }, // User-provided description
    tags: [{ type: String }], // Searchable tags
    downloadCount: { type: Number, default: 0 }, // Track downloads
    isPublic: { type: Boolean, default: false }, // Public visibility flag
    
    // Cloudinary specific fields
    cloudinaryPublicId: { type: String, default: null }, // For easier deletion
    cloudinaryVersion: { type: String, default: null }, // Version tracking
    
    // Status fields
    isActive: { type: Boolean, default: true }, // Soft delete support
    lastAccessed: { type: Date, default: null }, // Track last access
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual field for human-readable file size
fileSchema.virtual('sizeFormatted').get(function() {
    if (!this.size) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(this.size) / Math.log(1024));
    return `${(this.size / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
});

// Virtual field for file age
fileSchema.virtual('ageInDays').get(function() {
    return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Indexes for better performance
fileSchema.index({ scope: 1, createdAt: -1 });
fileSchema.index({ uploadedById: 1, scope: 1, createdAt: -1 });
fileSchema.index({ teamId: 1, scope: 1, createdAt: -1 });
fileSchema.index({ isFromChat: 1, scope: 1, createdAt: -1 });
fileSchema.index({ type: 1, scope: 1 });
fileSchema.index({ tags: 1 });
fileSchema.index({ filename: 'text', description: 'text' }); // Text search

// Instance methods
fileSchema.methods.incrementDownloadCount = function() {
    this.downloadCount += 1;
    this.lastAccessed = new Date();
    return this.save();
};

fileSchema.methods.isOwnedBy = function(userId) {
    return this.uploadedById.toString() === userId.toString();
};

fileSchema.methods.canBeAccessedBy = function(user) {
    if (this.scope === 'single') {
        return this.uploadedById.toString() === user.id;
    } else if (this.scope === 'team') {
        return this.teamId && this.teamId.toString() === user.teamId;
    } else if (this.scope === 'global') {
        return true;
    }
    return false;
};

// Static methods
fileSchema.statics.getByType = function(type, userScope = {}) {
    return this.find({ 
        type, 
        isActive: true, 
        ...userScope 
    }).sort({ createdAt: -1 });
};

fileSchema.statics.getChatFiles = function(userScope = {}) {
    return this.find({ 
        isFromChat: true, 
        isActive: true, 
        ...userScope 
    }).sort({ createdAt: -1 });
};

fileSchema.statics.getRegularFiles = function(userScope = {}) {
    return this.find({ 
        isFromChat: { $ne: true }, 
        isActive: true, 
        ...userScope 
    }).sort({ createdAt: -1 });
};

fileSchema.statics.getFileStats = function(userScope = {}) {
    return this.aggregate([
        { $match: { isActive: true, ...userScope } },
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 },
                totalSize: { $sum: '$size' },
                avgSize: { $avg: '$size' }
            }
        },
        { $sort: { count: -1 } }
    ]);
};

// Pre-save middleware
fileSchema.pre('save', function(next) {
    // Extract Cloudinary public ID if not set
    if (this.fileUrl && !this.cloudinaryPublicId) {
        const match = this.fileUrl.match(/\/upload\/(?:v\d+\/)?(.+)\./);
        if (match) {
            this.cloudinaryPublicId = match[1];
        }
    }
    next();
});

// Pre-remove middleware for cleanup
fileSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
    try {
        // Clean up any references in messages
        const Message = mongoose.model('Message');
        await Message.updateMany(
            { fileRef: this._id },
            { $unset: { fileRef: "" } }
        );
        next();
    } catch (error) {
        next(error);
    }
});

const File = mongoose.model('File', fileSchema);
export default File;