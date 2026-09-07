import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layers,
  Users,
  HardDrive,
  MessageSquare,
  Video,
  CheckSquare,
  RefreshCw,
  Sparkles,
  Edit3,
  Plus,
  Trash2,
  Check,
  X,
  RotateCcw,
  ShieldCheck,
  Zap,
  Globe
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AdminPlansMatrix = () => {
  const [plans, setPlans] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    tagline: '',
    priceMonthly: 0,
    priceAnnual: 0,
    currency: '₹',
    period: 'per team / month',
    popular: false,
    badge: '',
    limits: {
      maxMembers: 15,
      maxStorageMB: 5120,
      maxMessages: 15000,
      maxVideoMinutes: 1000,
      maxAudioMinutes: 2000,
      maxTasks: 200,
      maxFiles: 200
    },
    features: [''],
    ctaText: 'Get Started',
    ctaLink: '/register',
    isActive: true,
    order: 1
  });

  const token = localStorage.getItem('token');
  const headers = useMemo(() => ({ 'auth-token': token }), [token]);

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      // Fetch dynamic plans from plan API
      const [plansRes, teamsRes] = await Promise.allSettled([
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/plans/admin/all`, { headers }),
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/admin/teams-usage`, { headers })
      ]);

      if (teamsRes.status === 'fulfilled' && teamsRes.value.data.success) {
        setTeams(teamsRes.value.data.teams || []);
      }

      if (plansRes.status === 'fulfilled' && plansRes.value.data.success) {
        setPlans(plansRes.value.data.plans || []);
      } else if (teamsRes.status === 'fulfilled' && teamsRes.value.data.planPresets) {
        // Fallback to legacy presets if needed
        const presets = teamsRes.value.data.planPresets;
        const generated = Object.entries(presets).map(([k, v], idx) => ({
          _id: k,
          key: k,
          name: v.name,
          priceMonthly: v.price || 0,
          priceAnnual: Math.round((v.price || 0) * 0.8),
          currency: '₹',
          period: 'per team / month',
          limits: v.limits || {},
          features: [
            `Up to ${v.limits?.maxMembers || 10} members`,
            `${((v.limits?.maxStorageMB || 1024) / 1024).toFixed(0)} GB cloud storage`,
            `${v.limits?.maxVideoMinutes || 500} mins video quota`
          ],
          order: idx + 1,
          isActive: true
        }));
        setPlans(generated);
      }
    } catch (err) {
      console.error('Failed to load dynamic plans matrix:', err);
      toast.error(err.response?.data?.error || 'Failed to load plans matrix');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingPlan(null);
    setFormData({
      key: '',
      name: '',
      tagline: '',
      priceMonthly: 0,
      priceAnnual: 0,
      currency: '₹',
      period: 'per team / month',
      popular: false,
      badge: '',
      limits: {
        maxMembers: 10,
        maxStorageMB: 5120,
        maxMessages: 10000,
        maxVideoMinutes: 500,
        maxAudioMinutes: 1000,
        maxTasks: 100,
        maxFiles: 100
      },
      features: ['Unlimited Video Meetings', 'Team Whiteboard & Chat'],
      ctaText: 'Get Started',
      ctaLink: '/register',
      isActive: true,
      order: plans.length + 1
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (plan) => {
    setEditingPlan(plan);
    setFormData({
      key: plan.key || '',
      name: plan.name || '',
      tagline: plan.tagline || '',
      priceMonthly: plan.priceMonthly ?? 0,
      priceAnnual: plan.priceAnnual ?? 0,
      currency: plan.currency || '₹',
      period: plan.period || 'per team / month',
      popular: Boolean(plan.popular),
      badge: plan.badge || '',
      limits: {
        maxMembers: plan.limits?.maxMembers ?? 10,
        maxStorageMB: plan.limits?.maxStorageMB ?? 1024,
        maxMessages: plan.limits?.maxMessages ?? 2000,
        maxVideoMinutes: plan.limits?.maxVideoMinutes ?? 200,
        maxAudioMinutes: plan.limits?.maxAudioMinutes ?? 400,
        maxTasks: plan.limits?.maxTasks ?? 50,
        maxFiles: plan.limits?.maxFiles ?? 50
      },
      features: plan.features && plan.features.length > 0 ? [...plan.features] : [''],
      ctaText: plan.ctaText || 'Get Started',
      ctaLink: plan.ctaLink || '/register',
      isActive: plan.isActive !== undefined ? plan.isActive : true,
      order: plan.order ?? 1
    });
    setIsModalOpen(true);
  };

  // Feature line handlers
  const handleFeatureChange = (index, value) => {
    const updated = [...formData.features];
    updated[index] = value;
    setFormData({ ...formData, features: updated });
  };

  const handleAddFeature = () => {
    setFormData({ ...formData, features: [...formData.features, ''] });
  };

  const handleRemoveFeature = (index) => {
    const updated = formData.features.filter((_, i) => i !== index);
    setFormData({ ...formData, features: updated });
  };

  // Save Plan
  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      return toast.warning('Plan name is required');
    }
    if (!editingPlan && !formData.key.trim()) {
      return toast.warning('Plan key identifier is required');
    }

    try {
      setSubmitting(true);
      const cleanedFeatures = formData.features.map((f) => f.trim()).filter(Boolean);
      const payload = {
        ...formData,
        features: cleanedFeatures
      };

      if (editingPlan && editingPlan._id && !editingPlan._id.startsWith('starter') && !editingPlan._id.startsWith('free')) {
        const res = await axios.put(
          `${import.meta.env.VITE_BACKEND_URL}/api/plans/admin/${editingPlan._id}`,
          payload,
          { headers }
        );
        if (res.data.success) {
          toast.success(res.data.message || 'Plan updated successfully');
        }
      } else {
        const res = await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/plans/admin`,
          payload,
          { headers }
        );
        if (res.data.success) {
          toast.success(res.data.message || 'Plan saved successfully');
        }
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save plan:', err);
      toast.error(err.response?.data?.error || 'Failed to save plan');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset to default presets
  const handleResetDefaults = async () => {
    if (!window.confirm('Are you sure you want to reset all subscription plans to system default presets?')) {
      return;
    }
    try {
      setRefreshing(true);
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/plans/admin/reset`,
        {},
        { headers }
      );
      if (res.data.success) {
        toast.success('Subscription plans reset to defaults successfully');
        fetchData();
      }
    } catch (err) {
      console.error('Failed to reset plans:', err);
      toast.error(err.response?.data?.error || 'Failed to reset plans');
    } finally {
      setRefreshing(false);
    }
  };

  const getPlanBadgeClass = (planKey, popular) => {
    if (popular) return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    switch (planKey?.toLowerCase()) {
      case 'enterprise':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'pro':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      case 'starter':
      case 'free':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      default:
        return 'bg-slate-700/40 text-slate-300 border-slate-600/50';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] text-white">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading Dynamic Plans Matrix...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 p-5 sm:p-6 rounded-2xl border border-slate-800 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-inner">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Dynamic Pricing & Quota Management
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <Globe className="w-3 h-3" /> Live Landing Sync
              </span>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Changes made here reflect instantly on the public Landing Page and across team subscription assignments.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Plan</span>
          </button>

          <button
            onClick={handleResetDefaults}
            disabled={refreshing}
            className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Reset to default plans"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={fetchData}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center justify-center"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── TIERS CARDS GRID ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const planKey = plan.key || plan._id;
          const assignedTeamsCount =
            plan.activeTeamsCount !== undefined
              ? plan.activeTeamsCount
              : teams.filter((t) => (t.subscription?.plan || '').toLowerCase() === planKey.toLowerCase()).length;

          return (
            <div
              key={plan._id || planKey}
              className={`relative bg-slate-900/90 border rounded-2xl p-6 flex flex-col justify-between transition-all shadow-xl group ${
                plan.popular
                  ? 'border-blue-500/60 shadow-blue-900/20 bg-gradient-to-b from-blue-950/20 to-slate-900/90'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Popular / Custom Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" /> {plan.badge || 'Most Popular'}
                </div>
              )}

              <div>
                {/* Title & Price */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border uppercase tracking-wider ${getPlanBadgeClass(
                          planKey,
                          plan.popular
                        )}`}
                      >
                        {plan.name}
                      </span>
                      {!plan.isActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          Hidden
                        </span>
                      )}
                    </div>
                    {plan.tagline && (
                      <p className="text-slate-400 text-xs mt-2 line-clamp-1">{plan.tagline}</p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-2xl font-black text-white">
                      {plan.currency || '₹'}
                      {plan.priceMonthly}
                      <span className="text-xs text-slate-400 font-normal">/mo</span>
                    </div>
                    <div className="text-[11px] text-emerald-400 font-medium">
                      {plan.currency || '₹'}
                      {plan.priceAnnual}/mo (Annual)
                    </div>
                  </div>
                </div>

                {/* Quotas & Limits */}
                <div className="space-y-2.5 pt-4 border-t border-slate-800 text-xs text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-400" /> Max Members
                    </span>
                    <span className="font-semibold text-white">
                      {plan.limits?.maxMembers ? `${plan.limits.maxMembers} Members` : 'Unlimited'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-cyan-400" /> Cloud Storage
                    </span>
                    <span className="font-semibold text-white">
                      {plan.limits?.maxStorageMB
                        ? `${(plan.limits.maxStorageMB / 1024).toFixed(0)} GB`
                        : 'Unlimited'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-purple-400" /> Video Quota
                    </span>
                    <span className="font-semibold text-white">
                      {plan.limits?.maxVideoMinutes ? `${plan.limits.maxVideoMinutes} mins` : 'Unlimited'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-400" /> Max Messages
                    </span>
                    <span className="font-semibold text-white">
                      {plan.limits?.maxMessages ? plan.limits.maxMessages.toLocaleString() : 'Unlimited'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-amber-400" /> Max Tasks
                    </span>
                    <span className="font-semibold text-white">
                      {plan.limits?.maxTasks ?? 'Unlimited'}
                    </span>
                  </div>
                </div>

                {/* Features Highlights */}
                {plan.features && plan.features.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                      Included Features
                    </span>
                    <ul className="space-y-1.5">
                      {plan.features.slice(0, 4).map((f, i) => (
                        <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{f}</span>
                        </li>
                      ))}
                      {plan.features.length > 4 && (
                        <li className="text-[11px] text-blue-400 font-medium pt-0.5">
                          +{plan.features.length - 4} more features
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {/* Bottom Actions & Active teams indicator */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
                <span className="text-[11px] text-slate-400">
                  Active on <strong className="text-white">{assignedTeamsCount}</strong> teams
                </span>

                <button
                  onClick={() => handleOpenEditModal(plan)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-all flex items-center gap-1 text-xs font-semibold"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Edit Plan</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── EDIT / ADD PLAN MODAL ───────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full my-8 shadow-2xl relative text-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingPlan ? `Edit Tier: ${editingPlan.name}` : 'Create New Subscription Tier'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configure pricing, quotas, features, and public visibility.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSavePlan} className="space-y-4 pt-4 text-xs">
              {/* Row 1: Key & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Plan Slug / Key <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingPlan)}
                    value={formData.key}
                    onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                    placeholder="e.g. starter, pro, enterprise"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Display Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Pro Team"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Tagline */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Marketing Tagline</label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  placeholder="For growing teams that need full real-time collaboration"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Row 2: Pricing */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Currency Symbol</label>
                  <input
                    type="text"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    placeholder="₹ or $"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Monthly Price</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.priceMonthly}
                    onChange={(e) => setFormData({ ...formData, priceMonthly: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Annual Price (/mo)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.priceAnnual}
                    onChange={(e) => setFormData({ ...formData, priceAnnual: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 font-semibold text-emerald-400"
                  />
                </div>
              </div>

              {/* Row 3: Quotas & Limits */}
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                <span className="font-bold text-slate-200 block text-xs uppercase tracking-wider">
                  Resource Limits & Quotas
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Max Members</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.limits.maxMembers}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          limits: { ...formData.limits, maxMembers: Number(e.target.value) }
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Storage (MB)</label>
                    <input
                      type="number"
                      min="100"
                      value={formData.limits.maxStorageMB}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          limits: { ...formData.limits, maxStorageMB: Number(e.target.value) }
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Video Call Mins</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.limits.maxVideoMinutes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          limits: { ...formData.limits, maxVideoMinutes: Number(e.target.value) }
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Max Messages</label>
                    <input
                      type="number"
                      min="100"
                      value={formData.limits.maxMessages}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          limits: { ...formData.limits, maxMessages: Number(e.target.value) }
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Max Tasks</label>
                    <input
                      type="number"
                      min="10"
                      value={formData.limits.maxTasks}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          limits: { ...formData.limits, maxTasks: Number(e.target.value) }
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Display Order</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-300 font-medium">Included Feature Bullets</label>
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold text-[11px]"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Bullet
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {formData.features.map((feat, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={feat}
                        onChange={(e) => handleFeatureChange(index, e.target.value)}
                        placeholder={`Feature line #${index + 1}`}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                      />
                      {formData.features.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(index)}
                          className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <label className="flex items-center gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.popular}
                    onChange={(e) => setFormData({ ...formData, popular: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700 focus:ring-0"
                  />
                  <div>
                    <span className="font-semibold text-white block">Mark as Most Popular</span>
                    <span className="text-[11px] text-slate-400">Highlighted on public landing page</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 bg-slate-900 border-slate-700 focus:ring-0"
                  />
                  <div>
                    <span className="font-semibold text-white block">Active & Visible</span>
                    <span className="text-[11px] text-slate-400">Show on public landing page</span>
                  </div>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2"
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{editingPlan ? 'Save Changes' : 'Create Plan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPlansMatrix;
