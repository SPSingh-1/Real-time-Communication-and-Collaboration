import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'maintenance', 'feature', 'success'],
    default: 'info'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  target: {
    type: String,
    enum: ['all', 'teams', 'specific_team'],
    default: 'all'
  },
  targetTeamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  targetTeamName: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: String,
    default: 'System Super Admin'
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  }]
}, {
  timestamps: true
});

// Virtual to check if currently active and unexpired
announcementSchema.virtual('isCurrentlyActive').get(function() {
  if (!this.isActive) return false;
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  return true;
});

const Announcement = mongoose.model('Announcement', announcementSchema);
export default Announcement;
