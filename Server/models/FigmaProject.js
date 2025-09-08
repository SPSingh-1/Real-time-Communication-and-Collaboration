// models/FigmaProject.js - Complete model for Figma projects
import mongoose from 'mongoose';

const figmaProjectSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  figmaProjectId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  files: [{
    key: String,
    name: String,
    thumbnail_url: String,
    last_modified: Date
  }],
  localMetadata: {
    lastSyncedAt: {
      type: Date,
      default: Date.now
    }
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
figmaProjectSchema.index({ userId: 1, figmaProjectId: 1 }, { unique: true });

const FigmaProject = mongoose.model('FigmaProject', figmaProjectSchema);
export default FigmaProject;