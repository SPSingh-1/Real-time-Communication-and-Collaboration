import mongoose from 'mongoose';

const PendingMemberSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  requestedAt:  { type: Date, default: Date.now },
  attemptCount: { type: Number, default: 1 }
}, { _id: false });

const TeamSchema = new mongoose.Schema({
  // ── Basic Info ──────────────────────────────────────────────
  teamName: {
    type: String,
    required: true,
    default: 'My Team'
  },

  // ── Admin & Members ─────────────────────────────────────────
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: false
  },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],

  // ── Invite Key System ────────────────────────────────────────
  inviteKey: {
    type: String,
    unique: true,
    sparse: true,   // allow null without unique conflict
    default: null
  },
  inviteKeyExpiry: {
    type: Date,
    default: null
  },
  inviteKeyActive: {
    type: Boolean,
    default: true
  },

  // ── Pending Approval Queue ───────────────────────────────────
  pendingMembers: [PendingMemberSchema],

  // ── Legacy (kept for backward compat with existing DB docs) ──
  teamId: {
    type: String,
    sparse: true,
    default: null
  },

  // ── Subscription & Quota Limits ──────────────────────────────
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'starter', 'pro', 'enterprise', 'custom'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'trial', 'expired', 'suspended', 'cancelled'],
      default: 'active'
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly', 'lifetime'],
      default: 'monthly'
    },
    price: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    expiryDate: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    limits: {
      maxMembers:      { type: Number, default: 10 },
      maxStorageMB:    { type: Number, default: 2048 }, // 2GB
      maxMessages:     { type: Number, default: 5000 },
      maxVideoMinutes: { type: Number, default: 500 },
      maxAudioMinutes: { type: Number, default: 1000 },
      maxTasks:        { type: Number, default: 200 },
      maxFiles:        { type: Number, default: 100 }
    },
    notes: {
      type: String,
      default: ''
    },

    // ── CRM & Billing Installment Tracking ───────────────────────
    billing: {
      totalAmount:   { type: Number, default: 0 },
      paidAmount:    { type: Number, default: 0 },
      dueAmount:     { type: Number, default: 0 },
      paymentStatus: {
        type: String,
        enum: ['paid', 'partial', 'pending', 'overdue', 'free_tier'],
        default: 'free_tier'
      },
      paymentMethod: {
        type: String,
        enum: ['bank_transfer', 'stripe', 'upi', 'cash', 'card', 'other'],
        default: 'other'
      },
      invoiceNumber:   { type: String, default: null },
      lastPaymentDate: { type: Date, default: null },
      nextDueDate:     { type: Date, default: null },
      paymentHistory: [{
        date:          { type: Date, default: Date.now },
        amount:        { type: Number, required: true },
        method:        { type: String, default: 'other' },
        transactionId: { type: String, default: '' },
        note:          { type: String, default: '' },
        recordedBy:    { type: String, default: 'Super Admin' }
      }]
    }
  }

}, { timestamps: true });

// Helper: is invite key currently valid?
TeamSchema.methods.isInviteKeyValid = function () {
  if (!this.inviteKey) return false;
  if (!this.inviteKeyActive) return false;
  if (this.inviteKeyExpiry && new Date() > this.inviteKeyExpiry) return false;
  return true;
};

const Team = mongoose.model('Team', TeamSchema);
export default Team;
