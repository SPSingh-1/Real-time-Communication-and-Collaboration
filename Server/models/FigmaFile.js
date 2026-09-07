import mongoose from 'mongoose';

const figmaFileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  teamId: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  figmaFileId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  originalUrl: {
    type: String,
    trim: true
  },
  embedUrl: {
    type: String,
    trim: true
  },
  thumbnail_url: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    default: 'UI Design'
  },
  description: {
    type: String,
    default: ''
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  version: {
    type: String,
    default: '1.0'
  },
  role: {
    type: String,
    default: 'editor'
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  localMetadata: {
    isFavorite: { type: Boolean, default: false },
    category: { type: String, default: 'UI Design' },
    description: { type: String, default: '' },
    tags: [String],
    lastSyncedAt: { type: Date, default: Date.now }
  }
}, {
  timestamps: true
});

const FigmaFile = mongoose.models.FigmaFile || mongoose.model('FigmaFile', figmaFileSchema);
export default FigmaFile;