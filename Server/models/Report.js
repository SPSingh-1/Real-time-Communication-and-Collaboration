import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userPhoto: {
    type: String,
    default: ''
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
  scope: {
    type: String,
    enum: ['single', 'team', 'global'],
    default: 'single'
  },
  
  // Report Content
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'project', 'issue', 'feedback'],
    default: 'daily'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  
  // Feedback System
  mood: {
    type: String,
    enum: ['😊', '😐', '😟'],
    default: '😐'
  },
  feedback: {
    type: String,
    default: ''
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  
  // Assignment System
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    default: null
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    default: null
  },
  assignmentType: {
    type: String,
    enum: ['complaint', 'task', 'review', 'feedback'],
    default: 'task'
  },
  dueDate: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  
  // Attachments
  attachments: [{
    filename: String,
    url: String,
    type: String
  }],
  
  // Visibility and Access
  isPrivate: {
    type: Boolean,
    default: false
  },
  viewedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Comments/Responses
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user'
    },
    userName: String,
    userPhoto: String,
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Metrics
  impressions: {
    type: Number,
    default: 0
  },
  
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted date
ReportSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
});

// Virtual for days until due
ReportSchema.virtual('daysUntilDue').get(function() {
  if (!this.dueDate) return null;
  const now = new Date();
  const due = new Date(this.dueDate);
  const diffTime = due - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Index for better query performance
ReportSchema.index({ user: 1, scope: 1, createdAt: -1 });
ReportSchema.index({ teamId: 1, scope: 1, createdAt: -1 });
ReportSchema.index({ globalId: 1, scope: 1, createdAt: -1 });
ReportSchema.index({ assignedTo: 1, status: 1 });
ReportSchema.index({ category: 1, status: 1 });

const Report = mongoose.model('Report', ReportSchema);
export default Report;