import express from 'express';
import Plan from '../models/Plan.js';
import User from '../models/User.js';
import Team from '../models/Team.js';
import fetchUser from '../middleware/fetchUser.js';

const router = express.Router();

// Middleware for Admin Access
const verifyAdminAccess = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const superEmail = process.env.SUPER_ADMIN_EMAIL?.toLowerCase()?.trim();
    const isSuperAdmin = Boolean(
      user.isSuperAdmin === true ||
      user.role === 'superadmin' ||
      (superEmail && user.email?.toLowerCase()?.trim() === superEmail)
    );

    if (!isSuperAdmin) {
      return res.status(403).json({ success: false, error: 'Access denied. Super Admin privileges required.' });
    }

    req.adminUser = user;
    next();
  } catch (err) {
    console.error('Error verifying admin access:', err);
    res.status(500).json({ success: false, error: 'Server error authorizing admin' });
  }
};

// Default seed plans
export const DEFAULT_PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    tagline: 'For individuals and freelancers getting started',
    priceMonthly: 0,
    priceAnnual: 0,
    currency: '₹',
    period: 'forever free',
    popular: false,
    badge: 'Free Tier',
    limits: {
      maxMembers: 5,
      maxStorageMB: 1024,
      maxMessages: 2000,
      maxVideoMinutes: 200,
      maxAudioMinutes: 400,
      maxTasks: 50,
      maxFiles: 50
    },
    features: [
      'Up to 5 Team Members',
      'HD Video Conferencing (45 mins/call)',
      'Collaborative Whiteboard & Polls',
      'Personal & Team Chat',
      '1 GB Cloud File Storage',
      'Basic Task Manager'
    ],
    ctaText: 'Start Free',
    ctaLink: '/register',
    buttonStyle: 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700',
    isActive: true,
    order: 1
  },
  {
    key: 'pro',
    name: 'Pro Team',
    tagline: 'For growing teams that need full real-time collaboration',
    priceMonthly: 999,
    priceAnnual: 799,
    currency: '₹',
    period: 'per team / month',
    popular: true,
    badge: 'Most Popular',
    limits: {
      maxMembers: 50,
      maxStorageMB: 20480,
      maxMessages: 100000,
      maxVideoMinutes: 5000,
      maxAudioMinutes: 10000,
      maxTasks: 1000,
      maxFiles: 1000
    },
    features: [
      'Unlimited Team Members',
      'Unlimited HD Video & Audio Calls',
      'Real-Time Collaborative Whiteboard',
      'Full Team CRM with Invoicing',
      'Smart Calendar with Auto-Ringing',
      'Live Multilingual AI Chat Translation',
      'Figma Integration & 50 GB Cloud Files',
      'Meeting Recordings & Attendance Logs'
    ],
    ctaText: 'Get Pro Team',
    ctaLink: '/register',
    buttonStyle: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30',
    isActive: true,
    order: 2
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    tagline: 'For high-scale organizations requiring custom controls',
    priceMonthly: 2499,
    priceAnnual: 1999,
    currency: '₹',
    period: 'per team / month',
    popular: false,
    badge: 'Custom Scale',
    limits: {
      maxMembers: 500,
      maxStorageMB: 102400,
      maxMessages: 1000000,
      maxVideoMinutes: 50000,
      maxAudioMinutes: 100000,
      maxTasks: 10000,
      maxFiles: 10000
    },
    features: [
      'Everything in Pro Team',
      'Dedicated Multi-Tenant Database',
      'Custom Roles & SuperAdmin Dashboard',
      'Advanced Audit Logs & Reporting',
      'Client Portal Magic Links',
      'Unlimited Cloud Storage',
      '24/7 Priority SLA Support'
    ],
    ctaText: 'Contact Enterprise',
    ctaLink: '/register',
    buttonStyle: 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700',
    isActive: true,
    order: 3
  }
];

// Helper to seed plans if empty
export const ensureDefaultPlans = async () => {
  try {
    const count = await Plan.countDocuments();
    if (count === 0) {
      await Plan.insertMany(DEFAULT_PLANS);
      console.log('✅ Default subscription plans seeded successfully.');
    }
  } catch (err) {
    console.warn('⚠️ Could not seed default plans:', err.message);
  }
};

// ════════════════════════════════════════════════════════════════
// 1. GET /api/plans (PUBLIC)
// Returns active plans for Landing Page & Registration
// ════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    await ensureDefaultPlans();
    const plans = await Plan.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
    res.json({
      success: true,
      plans
    });
  } catch (err) {
    console.error('Error fetching public plans:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch plans',
      fallbackPlans: DEFAULT_PLANS
    });
  }
});

// ════════════════════════════════════════════════════════════════
// 2. GET /api/plans/admin/all (SUPER ADMIN)
// Returns all plans (active & inactive) with team counts
// ════════════════════════════════════════════════════════════════
router.get('/admin/all', fetchUser, verifyAdminAccess, async (req, res) => {
  try {
    await ensureDefaultPlans();
    const plans = await Plan.find().sort({ order: 1, createdAt: 1 });
    const teams = await Team.find({}, 'subscription.plan');

    const teamCounts = {};
    teams.forEach(t => {
      const pKey = (t.subscription?.plan || 'free').toLowerCase();
      teamCounts[pKey] = (teamCounts[pKey] || 0) + 1;
    });

    const plansWithCounts = plans.map(p => {
      const pObj = p.toObject();
      pObj.activeTeamsCount = teamCounts[p.key.toLowerCase()] || 0;
      return pObj;
    });

    res.json({
      success: true,
      plans: plansWithCounts
    });
  } catch (err) {
    console.error('Error fetching admin plans:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// 3. POST /api/plans/admin (SUPER ADMIN)
// Create a new subscription plan
// ════════════════════════════════════════════════════════════════
router.post('/admin', fetchUser, verifyAdminAccess, async (req, res) => {
  try {
    const {
      key,
      name,
      tagline,
      priceMonthly,
      priceAnnual,
      currency,
      period,
      popular,
      badge,
      limits,
      features,
      ctaText,
      ctaLink,
      buttonStyle,
      isActive,
      order
    } = req.body;

    if (!key || !name) {
      return res.status(400).json({ success: false, error: 'Plan key and name are required' });
    }

    const cleanKey = key.trim().toLowerCase();
    const existing = await Plan.findOne({ key: cleanKey });
    if (existing) {
      return res.status(400).json({ success: false, error: `Plan with key "${cleanKey}" already exists` });
    }

    const newPlan = new Plan({
      key: cleanKey,
      name,
      tagline: tagline || '',
      priceMonthly: Number(priceMonthly) || 0,
      priceAnnual: Number(priceAnnual) || 0,
      currency: currency || '₹',
      period: period || 'per team / month',
      popular: Boolean(popular),
      badge: badge || '',
      limits: limits || {},
      features: Array.isArray(features) ? features : (typeof features === 'string' ? features.split('\n').map(f => f.trim()).filter(Boolean) : []),
      ctaText: ctaText || 'Get Started',
      ctaLink: ctaLink || '/register',
      buttonStyle: buttonStyle || 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700',
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      order: Number(order) || 0
    });

    await newPlan.save();

    res.json({
      success: true,
      message: `Plan "${name}" created successfully`,
      plan: newPlan
    });
  } catch (err) {
    console.error('Error creating plan:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// 4. PUT /api/plans/admin/:id (SUPER ADMIN)
// Update existing plan
// ════════════════════════════════════════════════════════════════
router.put('/admin/:id', fetchUser, verifyAdminAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      tagline,
      priceMonthly,
      priceAnnual,
      currency,
      period,
      popular,
      badge,
      limits,
      features,
      ctaText,
      ctaLink,
      buttonStyle,
      isActive,
      order
    } = req.body;

    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }

    if (name !== undefined) plan.name = name;
    if (tagline !== undefined) plan.tagline = tagline;
    if (priceMonthly !== undefined) plan.priceMonthly = Number(priceMonthly);
    if (priceAnnual !== undefined) plan.priceAnnual = Number(priceAnnual);
    if (currency !== undefined) plan.currency = currency;
    if (period !== undefined) plan.period = period;
    if (popular !== undefined) plan.popular = Boolean(popular);
    if (badge !== undefined) plan.badge = badge;
    if (limits !== undefined) plan.limits = { ...plan.limits, ...limits };
    if (features !== undefined) {
      plan.features = Array.isArray(features)
        ? features
        : (typeof features === 'string' ? features.split('\n').map(f => f.trim()).filter(Boolean) : plan.features);
    }
    if (ctaText !== undefined) plan.ctaText = ctaText;
    if (ctaLink !== undefined) plan.ctaLink = ctaLink;
    if (buttonStyle !== undefined) plan.buttonStyle = buttonStyle;
    if (isActive !== undefined) plan.isActive = Boolean(isActive);
    if (order !== undefined) plan.order = Number(order);

    await plan.save();

    res.json({
      success: true,
      message: `Plan "${plan.name}" updated successfully`,
      plan
    });
  } catch (err) {
    console.error('Error updating plan:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// 5. DELETE /api/plans/admin/:id (SUPER ADMIN)
// Delete a plan
// ════════════════════════════════════════════════════════════════
router.delete('/admin/:id', fetchUser, verifyAdminAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await Plan.findByIdAndDelete(id);
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }

    res.json({
      success: true,
      message: `Plan "${plan.name}" deleted successfully`
    });
  } catch (err) {
    console.error('Error deleting plan:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// 6. POST /api/plans/admin/reset (SUPER ADMIN)
// Reset to default plans
// ════════════════════════════════════════════════════════════════
router.post('/admin/reset', fetchUser, verifyAdminAccess, async (req, res) => {
  try {
    await Plan.deleteMany({});
    const created = await Plan.insertMany(DEFAULT_PLANS);
    res.json({
      success: true,
      message: 'Plans reset to default presets successfully',
      plans: created
    });
  } catch (err) {
    console.error('Error resetting plans:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
