import mongoose from 'mongoose';

const PlanSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  tagline: {
    type: String,
    default: ''
  },
  priceMonthly: {
    type: Number,
    required: true,
    default: 0
  },
  priceAnnual: {
    type: Number,
    required: true,
    default: 0
  },
  currency: {
    type: String,
    default: '₹'
  },
  period: {
    type: String,
    default: 'per team / month'
  },
  popular: {
    type: Boolean,
    default: false
  },
  badge: {
    type: String,
    default: ''
  },
  limits: {
    maxMembers: { type: Number, default: 5 },
    maxStorageMB: { type: Number, default: 1024 },
    maxMessages: { type: Number, default: 2000 },
    maxVideoMinutes: { type: Number, default: 200 },
    maxAudioMinutes: { type: Number, default: 400 },
    maxTasks: { type: Number, default: 50 },
    maxFiles: { type: Number, default: 50 }
  },
  features: {
    type: [String],
    default: []
  },
  ctaText: {
    type: String,
    default: 'Get Started'
  },
  ctaLink: {
    type: String,
    default: '/register'
  },
  buttonStyle: {
    type: String,
    default: 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const Plan = mongoose.models.Plan || mongoose.model('Plan', PlanSchema);

export default Plan;
