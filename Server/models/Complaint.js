import mongoose from 'mongoose';

const ComplaintSchema = new mongoose.Schema({
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
  
  // Complaint Content
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  complaintType: {
    type: String,
    enum: ['technical', 'service', 'harassment', 'discrimination', 'policy', 'other'],
    default: 'other'
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'investigating', 'resolved', 'rejected', 'escalated'],
    default: 'pending'
  },
  
  // Complaint Details
  incidentDate: {
    type: Date,
    default: Date.now
  },
  location: {
    type: String,
    default: ''
  },
  witnessDetails: {
    type: String,
    default: ''
  },
  expectedResolution: {
    type: String,
    default: ''
  },
  
  // Resolution Information
  resolution: {
    type: String,
    default: ''
  },
  resolutionDate: {
    type: Date,
    default: null
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
  department: {
    type: String,
    enum: ['hr', 'it', 'admin', 'management', 'legal'],
    default: 'admin'
  },
  dueDate: {
    type: Date,
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  
  // Attachments (evidence)
  attachments: [{
    filename: String,
    url: String,
    type: String
  }],
  
  // Confidentiality
  isConfidential: {
    type: Boolean,
    default: true
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  
  // Tracking
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
  
  // Comments/Updates
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user'
    },
    userName: String,
    userPhoto: String,
    content: String,
    isInternal: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Follow-up
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: {
    type: Date,
    default: null
  },
  
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted date
ComplaintSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
});

// Virtual for days until due
ComplaintSchema.virtual('daysUntilDue').get(function() {
  if (!this.dueDate) return null;
  const now = new Date();
  const due = new Date(this.dueDate);
  const diffTime = due - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for days since incident
ComplaintSchema.virtual('daysSinceIncident').get(function() {
  const now = new Date();
  const incident = new Date(this.incidentDate);
  const diffTime = now - incident;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Index for better query performance
ComplaintSchema.index({ user: 1, scope: 1, createdAt: -1 });
ComplaintSchema.index({ teamId: 1, scope: 1, createdAt: -1 });
ComplaintSchema.index({ globalId: 1, scope: 1, createdAt: -1 });
ComplaintSchema.index({ assignedTo: 1, status: 1 });
ComplaintSchema.index({ complaintType: 1, status: 1 });
ComplaintSchema.index({ severity: 1, status: 1 });

const Complaint = mongoose.model('Complaint', ComplaintSchema);
export default Complaint;