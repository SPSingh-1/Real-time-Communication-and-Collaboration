import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true },
  title: { type: String, default: 'Project Milestone' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['Draft', 'Pending', 'Paid', 'Overdue'], default: 'Pending' },
  dueDate: { type: Date },
  paymentLink: { type: String, default: '' },
  paidAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const teamClientSchema = new mongoose.Schema({
  teamId: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    default: '',
    trim: true
  },
  email: {
    type: String,
    default: '',
    trim: true
  },
  phone: {
    type: String,
    default: '',
    trim: true
  },
  dealValue: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  stageId: {
    type: String,
    default: 'lead',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  assignedTo: {
    id: { type: String },
    name: { type: String },
    email: { type: String }
  },
  notes: {
    type: String,
    default: ''
  },
  tags: [String],
  linkedFigmaUrl: {
    type: String,
    default: ''
  },
  customFields: {
    type: Map,
    of: String,
    default: {}
  },
  invoices: [invoiceSchema],
  portalToken: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

const teamPipelineStageSchema = new mongoose.Schema({
  teamId: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    index: true
  },
  stageId: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: '#8b5cf6'
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

export const TeamClient = mongoose.models.TeamClient || mongoose.model('TeamClient', teamClientSchema);
export const TeamPipelineStage = mongoose.models.TeamPipelineStage || mongoose.model('TeamPipelineStage', teamPipelineStageSchema);
