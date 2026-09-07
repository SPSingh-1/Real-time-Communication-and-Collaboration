import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  HardDrive,
  MessageSquare,
  Video,
  PhoneCall,
  CheckSquare,
  Shield,
  Search,
  RefreshCw,
  Edit3,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Sparkles,
  DollarSign,
  Layers,
  X,
  Clock,
  Zap,
  Megaphone,
  CreditCard,
  Receipt,
  FileText,
  PlusCircle,
  Trash2,
  Send,
  Wrench,
  Info,
  ChevronDown,
  History,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import useAppContext from '../../context/useAppContext';

const AdminSubscriptionDashboard = () => {
  const { user } = useAppContext();
  const [overview, setOverview] = useState(null);
  const [teams, setTeams] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [planPresets, setPlanPresets] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active top tab: 'teams' | 'billing' | 'broadcasts' | 'plans'
  const [activeTab, setActiveTab] = useState('teams');

  // Search & Filter state for Teams
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('members');

  // Search & Filter for Billing
  const [billingSearch, setBillingSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');

  // Modals state
  const [selectedTeamForEdit, setSelectedTeamForEdit] = useState(null);
  const [selectedTeamForPayment, setSelectedTeamForPayment] = useState(null);
  const [selectedTeamForHistory, setSelectedTeamForHistory] = useState(null);

  // Subscription Edit Form
  const [editFormData, setEditFormData] = useState({
    plan: 'free',
    status: 'active',
    billingCycle: 'monthly',
    price: 0,
    expiryDate: '',
    limits: {
      maxMembers: 10,
      maxStorageMB: 2048,
      maxMessages: 5000,
      maxVideoMinutes: 500,
      maxAudioMinutes: 1000,
      maxTasks: 200,
      maxFiles: 100
    },
    notes: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Payment Recording Form
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'upi',
    transactionId: '',
    invoiceNumber: '',
    nextDueDate: '',
    note: ''
  });
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Announcement Compose Form
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    type: 'info',
    priority: 'medium',
    target: 'all',
    targetTeamId: '',
    expiresAt: ''
  });
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const token = localStorage.getItem('token');
  const headers = useMemo(() => ({ 'auth-token': token }), [token]);

  // Fetch all dashboard data
  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [overviewRes, teamsRes, announcementsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/admin/platform-overview`, { headers }),
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/admin/teams-usage`, { headers }),
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/admin/announcements`, { headers })
      ]);

      if (overviewRes.data.success) {
        setOverview(overviewRes.data.data);
      }
      if (teamsRes.data.success) {
        setTeams(teamsRes.data.teams || []);
        setSystemAlerts(teamsRes.data.systemAlerts || []);
        if (teamsRes.data.planPresets) {
          setPlanPresets(teamsRes.data.planPresets);
        }
      }
      if (announcementsRes.data.success) {
        setAnnouncements(announcementsRes.data.announcements || []);
      }
    } catch (err) {
      console.error('Failed to load admin subscription data:', err);
      toast.error(err.response?.data?.error || 'Failed to load subscription dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle plan change in edit modal
  const handlePlanChange = (newPlan) => {
    const preset = planPresets[newPlan];
    setEditFormData((prev) => ({
      ...prev,
      plan: newPlan,
      price: preset ? preset.price : prev.price,
      limits: preset ? { ...preset.limits } : prev.limits
    }));
  };

  // Open Edit Subscription Modal
  const openEditModal = (team) => {
    setSelectedTeamForEdit(team);
    const sub = team.subscription || {};
    const expiry = sub.expiryDate
      ? new Date(sub.expiryDate).toISOString().split('T')[0]
      : '';

    setEditFormData({
      plan: sub.plan || 'free',
      status: sub.status || 'active',
      billingCycle: sub.billingCycle || 'monthly',
      price: sub.price !== undefined ? sub.price : 0,
      expiryDate: expiry,
      limits: {
        maxMembers: sub.limits?.maxMembers || 10,
        maxStorageMB: sub.limits?.maxStorageMB || 2048,
        maxMessages: sub.limits?.maxMessages || 5000,
        maxVideoMinutes: sub.limits?.maxVideoMinutes || 500,
        maxAudioMinutes: sub.limits?.maxAudioMinutes || 1000,
        maxTasks: sub.limits?.maxTasks || 200,
        maxFiles: sub.limits?.maxFiles || 100
      },
      notes: sub.notes || ''
    });
  };

  // Save Subscription Edits
  const handleSaveSubscription = async (e) => {
    e.preventDefault();
    if (!selectedTeamForEdit) return;

    setSavingEdit(true);
    try {
      const res = await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin/team-subscription/${selectedTeamForEdit._id}`,
        editFormData,
        { headers }
      );

      if (res.data.success) {
        toast.success(res.data.message || 'Subscription updated successfully');
        setSelectedTeamForEdit(null);
        await fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update subscription');
    } finally {
      setSavingEdit(false);
    }
  };

  // Open Record Payment Modal
  const openPaymentModal = (team) => {
    setSelectedTeamForPayment(team);
    const billing = team.subscription?.billing || {};
    setPaymentForm({
      amount: billing.dueAmount > 0 ? billing.dueAmount : '',
      method: billing.paymentMethod || 'upi',
      transactionId: '',
      invoiceNumber: billing.invoiceNumber || `INV-${team._id.toString().slice(-6).toUpperCase()}`,
      nextDueDate: billing.nextDueDate
        ? new Date(billing.nextDueDate).toISOString().split('T')[0]
        : '',
      note: ''
    });
  };

  // Submit Payment Record
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedTeamForPayment) return;

    const amountNum = parseFloat(paymentForm.amount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    setRecordingPayment(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin/team-billing/record-payment/${selectedTeamForPayment._id}`,
        paymentForm,
        { headers }
      );

      if (res.data.success) {
        toast.success(res.data.message || 'Payment recorded successfully!');
        setSelectedTeamForPayment(null);
        await fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  // Submit System Broadcast / Announcement
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) {
      toast.error('Title and message are required.');
      return;
    }

    setSendingBroadcast(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin/announcements`,
        broadcastForm,
        { headers }
      );

      if (res.data.success) {
        toast.success('📢 Announcement broadcasted to all users successfully!');
        setBroadcastForm({
          title: '',
          message: '',
          type: 'info',
          priority: 'medium',
          target: 'all',
          targetTeamId: '',
          expiresAt: ''
        });
        await fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send broadcast');
    } finally {
      setSendingBroadcast(false);
    }
  };

  // Delete Announcement
  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Delete this broadcast? It will be removed from all users.')) return;
    try {
      const res = await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin/announcements/${id}`,
        { headers }
      );
      if (res.data.success) {
        toast.success('Broadcast removed');
        await fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove announcement');
    }
  };

  // Toggle Suspend Status
  const handleToggleSuspend = async (team) => {
    const isSuspended = team.subscription?.status === 'suspended';
    const action = isSuspended ? 'Reactivate' : 'Suspend';

    if (!window.confirm(`Are you sure you want to ${action.toLowerCase()} team "${team.teamName}"?`)) {
      return;
    }

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin/team/${team._id}/suspend-toggle`,
        {},
        { headers }
      );
      if (res.data.success) {
        toast.success(`Team "${team.teamName}" is now ${res.data.status}`);
        await fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    }
  };

  // Filtered Teams for Subscriptions tab
  const filteredTeams = useMemo(() => {
    return teams
      .filter((t) => {
        const search = searchTerm.toLowerCase().trim();
        const matchesSearch =
          !search ||
          t.teamName?.toLowerCase().includes(search) ||
          t.admin?.name?.toLowerCase().includes(search) ||
          t.admin?.email?.toLowerCase().includes(search) ||
          t.inviteKey?.toLowerCase().includes(search);

        const matchesPlan = planFilter === 'all' || t.subscription?.plan === planFilter;
        const matchesStatus = statusFilter === 'all' || t.subscription?.status === statusFilter;

        return matchesSearch && matchesPlan && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'members') return (b.membersCount || 0) - (a.membersCount || 0);
        if (sortBy === 'storage') return (b.usage?.storageBytes || 0) - (a.usage?.storageBytes || 0);
        if (sortBy === 'messages') return (b.usage?.messages || 0) - (a.usage?.messages || 0);
        if (sortBy === 'calls')
          return (
            (b.usage?.videoCalls || 0) +
            (b.usage?.audioCalls || 0) -
            ((a.usage?.videoCalls || 0) + (a.usage?.audioCalls || 0))
          );
        if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        return 0;
      });
  }, [teams, searchTerm, planFilter, statusFilter, sortBy]);

  // Filtered Teams for Billing CRM tab
  const filteredBillingTeams = useMemo(() => {
    return teams.filter((t) => {
      const search = billingSearch.toLowerCase().trim();
      const matchesSearch =
        !search ||
        t.teamName?.toLowerCase().includes(search) ||
        t.admin?.name?.toLowerCase().includes(search) ||
        t.admin?.email?.toLowerCase().includes(search) ||
        t.subscription?.billing?.invoiceNumber?.toLowerCase().includes(search);

      const pStatus = t.subscription?.billing?.paymentStatus || 'free_tier';
      const matchesStatus = paymentStatusFilter === 'all' || pStatus === paymentStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [teams, billingSearch, paymentStatusFilter]);

  // Color helper for plan badge
  const getPlanBadgeClass = (plan) => {
    switch (plan) {
      case 'enterprise':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'pro':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'starter':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      default:
        return 'bg-slate-700/40 text-slate-300 border-slate-600/50';
    }
  };

  // Color helper for payment status
  const getPaymentStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">Fully Paid</span>;
      case 'partial':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">Partial</span>;
      case 'overdue':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">Overdue</span>;
      case 'pending':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">Pending</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-700/40 text-slate-400 border border-slate-600/40">Free Tier</span>;
    }
  };

  const getUsageBarColor = (pct) => {
    if (pct >= 90) return 'bg-rose-500';
    if (pct >= 75) return 'bg-amber-500';
    return 'bg-blue-500';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-white">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading Super Admin Control Panel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ── HEADER & NAVIGATION TABS ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Super Admin Console
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                Live Controls
              </span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
              5MB upload limit active · Quota monitors · Global broadcasts · CRM & Payment tracker
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex bg-slate-800/90 rounded-xl p-1 border border-slate-700/60 overflow-x-auto">
            <button
              onClick={() => setActiveTab('teams')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'teams'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Teams & Quotas ({teams.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('billing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'billing'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Billing & CRM</span>
            </button>

            <button
              onClick={() => setActiveTab('broadcasts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'broadcasts'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Broadcasts ({announcements.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('plans')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'plans'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Plans Matrix</span>
            </button>
          </div>

          <button
            onClick={fetchData}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1.5 text-xs"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── 🚨 1. SYSTEM QUOTA OVERUSE & SECURITY ALERTS BANNER ─────────── */}
      {systemAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-amber-950/80 border border-amber-500/50 shadow-xl shadow-amber-500/10 space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>System Alerts ({systemAlerts.length} Attention Required)</span>
            </div>
            <span className="text-[11px] text-amber-400/80">Active Quota & Payment Warnings</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
            {systemAlerts.slice(0, 6).map((alert, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                  alert.level === 'critical'
                    ? 'bg-rose-950/70 border-rose-500/50 text-rose-200'
                    : 'bg-amber-900/60 border-amber-500/40 text-amber-200'
                }`}
              >
                <div className="font-bold text-white truncate max-w-[90px]">
                  {alert.teamName}:
                </div>
                <div className="truncate flex-1 text-[11px]">{alert.message}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── 2. KPI METRICS OVERVIEW CARDS ─────────────────────────────────── */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Teams</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{overview.totalTeams || 0}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{overview.totalUsers || 0} users</div>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Collected</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">
                ${overview.billingSummary?.totalCollected || 0}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Paid installments</div>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Due Balance</span>
              <Receipt className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-400">
                ${overview.billingSummary?.totalDue || 0}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Pending collection</div>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Chat Messages</span>
              <MessageSquare className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {(overview.totalMessages || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Platform total</div>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Files (Max 5MB)</span>
              <HardDrive className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{overview.totalStorageMB || 0} MB</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{overview.totalFiles || 0} files</div>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Broadcasts</span>
              <Megaphone className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {overview.activeBroadcastsCount || 0}
              </div>
              <div className="text-[11px] text-purple-300 mt-0.5">Active announcements</div>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. TAB 1: TEAMS & QUOTAS MANAGEMENT ─────────────────────────── */}
      {activeTab === 'teams' && (
        <div className="space-y-4">
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex flex-col lg:flex-row items-center justify-between gap-3">
            <div className="relative w-full lg:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search team name, admin email, invite key..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-400 text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700 text-xs">
                <span className="text-slate-400">Plan:</span>
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="bg-transparent text-white font-medium focus:outline-none cursor-pointer text-xs"
                >
                  <option value="all" className="bg-slate-800">All Plans</option>
                  <option value="free" className="bg-slate-800">Free</option>
                  <option value="starter" className="bg-slate-800">Starter</option>
                  <option value="pro" className="bg-slate-800">Pro</option>
                  <option value="enterprise" className="bg-slate-800">Enterprise</option>
                  <option value="custom" className="bg-slate-800">Custom</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700 text-xs">
                <span className="text-slate-400">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-white font-medium focus:outline-none cursor-pointer text-xs"
                >
                  <option value="all" className="bg-slate-800">All Statuses</option>
                  <option value="active" className="bg-slate-800">Active</option>
                  <option value="trial" className="bg-slate-800">Trial</option>
                  <option value="expired" className="bg-slate-800">Expired</option>
                  <option value="suspended" className="bg-slate-800">Suspended</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700 text-xs">
                <span className="text-slate-400">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-white font-medium focus:outline-none cursor-pointer text-xs"
                >
                  <option value="members" className="bg-slate-800">Most Members</option>
                  <option value="storage" className="bg-slate-800">Highest Storage</option>
                  <option value="messages" className="bg-slate-800">Most Messages</option>
                  <option value="calls" className="bg-slate-800">Most Video/Audio</option>
                  <option value="newest" className="bg-slate-800">Newest Created</option>
                </select>
              </div>
            </div>
          </div>

          {filteredTeams.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">No teams found</h3>
              <p className="text-xs text-slate-400 mt-1">Try adjusting search or filter options.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTeams.map((team) => {
                const sub = team.subscription || {};
                const limits = sub.limits || {};
                const usage = team.usage || {};
                const usagePct = team.usagePercentages || {};

                return (
                  <motion.div
                    key={team._id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 transition-all rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden"
                  >
                    <div
                      className={`absolute top-0 left-0 right-0 h-1 ${
                        sub.status === 'suspended'
                          ? 'bg-rose-500'
                          : sub.isExpired
                          ? 'bg-amber-500'
                          : sub.plan === 'enterprise'
                          ? 'bg-purple-500'
                          : sub.plan === 'pro'
                          ? 'bg-blue-500'
                          : 'bg-emerald-500'
                      }`}
                    />

                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mt-1">
                      {/* Left info */}
                      <div className="space-y-2 min-w-[240px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                            {team.teamName}
                          </h2>
                          <span
                            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${getPlanBadgeClass(
                              sub.plan
                            )}`}
                          >
                            {sub.plan || 'Free'}
                          </span>
                          {getPaymentStatusBadge(sub.billing?.paymentStatus)}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          {team.admin?.photo ? (
                            <img
                              src={team.admin.photo}
                              alt={team.admin.name}
                              className="w-5 h-5 rounded-full object-cover border border-slate-700"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white font-bold">
                              {team.admin?.name ? team.admin.name[0].toUpperCase() : 'A'}
                            </div>
                          )}
                          <span className="text-slate-300 font-medium truncate max-w-[140px]">
                            {team.admin?.name || 'No Admin Assigned'}
                          </span>
                          <span className="text-slate-500">·</span>
                          <span className="text-slate-400 truncate max-w-[160px]">
                            {team.admin?.email || 'N/A'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>
                              Expiry:{' '}
                              {sub.expiryDate
                                ? new Date(sub.expiryDate).toLocaleDateString()
                                : 'Ongoing'}
                            </span>
                          </div>
                          {team.inviteKey && (
                            <div className="flex items-center gap-1 font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-300">
                              <span>Key:</span>
                              <span className="font-bold text-white">{team.inviteKey}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Usage Meters */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex-1 min-w-[280px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-blue-400" /> Members
                            </span>
                            <span className="text-slate-300 font-semibold">
                              {team.membersCount} / {limits.maxMembers || '∞'}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${getUsageBarColor(
                                usagePct.members || 0
                              )}`}
                              style={{ width: `${usagePct.members || 0}%` }}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <HardDrive className="w-3.5 h-3.5 text-cyan-400" /> Storage (5MB limit)
                            </span>
                            <span className="text-slate-300 font-semibold">
                              {usage.storageMB || 0} / {limits.maxStorageMB || '∞'} MB
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${getUsageBarColor(
                                usagePct.storage || 0
                              )}`}
                              style={{ width: `${usagePct.storage || 0}%` }}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" /> Messages
                            </span>
                            <span className="text-slate-300 font-semibold">
                              {(usage.messages || 0).toLocaleString()} /{' '}
                              {(limits.maxMessages || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${getUsageBarColor(
                                usagePct.messages || 0
                              )}`}
                              style={{ width: `${usagePct.messages || 0}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pl-1">
                          <div>
                            <div className="flex items-center gap-1 text-slate-300 font-semibold">
                              <Video className="w-3.5 h-3.5 text-purple-400" />
                              <span>{usage.videoCalls || 0}</span>
                              <span className="text-slate-500 font-normal">/</span>
                              <PhoneCall className="w-3 h-3 text-emerald-400" />
                              <span>{usage.audioCalls || 0}</span>
                            </div>
                            <span className="text-[10px] text-slate-500">Video / Audio</span>
                          </div>

                          <div className="text-right">
                            <div className="flex items-center gap-1 text-slate-300 font-semibold justify-end">
                              <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                              <span>{usage.tasks || 0}</span>
                            </div>
                            <span className="text-[10px] text-slate-500">{usage.tasksCompleted || 0} completed</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 lg:flex-col justify-end">
                        <button
                          onClick={() => openEditModal(team)}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Manage</span>
                        </button>

                        <button
                          onClick={() => openPaymentModal(team)}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm shadow-emerald-500/20"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Payment</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 4. TAB 2: BILLING CRM & INSTALLMENT TRACKER ──────────────────── */}
      {activeTab === 'billing' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400">Total Billed Across Platform</span>
              <div className="text-2xl font-bold text-white mt-1">
                ${overview?.billingSummary?.totalInvoiced || 0}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400">Total Collected Cash/Online</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                ${overview?.billingSummary?.totalCollected || 0}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400">Total Unpaid Balance Due</span>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                ${overview?.billingSummary?.totalDue || 0}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search team or invoice number..."
                value={billingSearch}
                onChange={(e) => setBillingSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Filter Status:</span>
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="bg-slate-800 text-white text-xs px-3 py-2 rounded-xl border border-slate-700"
              >
                <option value="all">All Statuses</option>
                <option value="paid">Fully Paid</option>
                <option value="partial">Partial Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="free_tier">Free Tier</option>
              </select>
            </div>
          </div>

          {/* CRM Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-4">Team & Admin</th>
                    <th className="p-4">Invoice #</th>
                    <th className="p-4">Total Bill</th>
                    <th className="p-4">Paid Amount</th>
                    <th className="p-4">Due Balance</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Next Due Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredBillingTeams.map((team) => {
                    const sub = team.subscription || {};
                    const billing = sub.billing || {};
                    const total = billing.totalAmount || sub.price || 0;
                    const paid = billing.paidAmount || 0;
                    const due = billing.dueAmount !== undefined ? billing.dueAmount : Math.max(0, total - paid);

                    return (
                      <tr key={team._id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-white">{team.teamName}</div>
                          <div className="text-[11px] text-slate-400">{team.admin?.email || 'No admin'}</div>
                        </td>
                        <td className="p-4 font-mono text-slate-300">
                          {billing.invoiceNumber || 'INV-N/A'}
                        </td>
                        <td className="p-4 font-semibold text-white">${total}</td>
                        <td className="p-4 font-semibold text-emerald-400">${paid}</td>
                        <td className="p-4 font-semibold text-amber-400">${due}</td>
                        <td className="p-4">{getPaymentStatusBadge(billing.paymentStatus)}</td>
                        <td className="p-4 text-slate-400">
                          {billing.nextDueDate
                            ? new Date(billing.nextDueDate).toLocaleDateString()
                            : 'N/A'}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => openPaymentModal(team)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold"
                          >
                            + Add Payment
                          </button>
                          {billing.paymentHistory?.length > 0 && (
                            <button
                              onClick={() => setSelectedTeamForHistory(team)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs"
                              title="View Payment Ledger"
                            >
                              <History className="w-3.5 h-3.5 inline" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. TAB 3: 📢 SYSTEM BROADCASTS & ANNOUNCEMENTS ───────────────── */}
      {activeTab === 'broadcasts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Create Announcement */}
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <Megaphone className="w-5 h-5 text-blue-400" />
              <span>Compose Broadcast</span>
            </div>
            <p className="text-xs text-slate-400">
              Send instant popups and banners to all active users on the platform in real-time.
            </p>

            <form onSubmit={handleSendBroadcast} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Scheduled Maintenance Notice"
                  value={broadcastForm.title}
                  onChange={(e) => setBroadcastForm((p) => ({ ...p, title: e.target.value }))}
                  required
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Message</label>
                <textarea
                  rows="3"
                  placeholder="e.g. Server maintenance is scheduled tonight at 11 PM for 15 minutes."
                  value={broadcastForm.message}
                  onChange={(e) => setBroadcastForm((p) => ({ ...p, message: e.target.value }))}
                  required
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Type</label>
                  <select
                    value={broadcastForm.type}
                    onChange={(e) => setBroadcastForm((p) => ({ ...p, type: e.target.value }))}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="feature">New Feature</option>
                    <option value="success">Success</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Priority</label>
                  <select
                    value={broadcastForm.priority}
                    onChange={(e) => setBroadcastForm((p) => ({ ...p, priority: e.target.value }))}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent Popup</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target Audience</label>
                <select
                  value={broadcastForm.target}
                  onChange={(e) => setBroadcastForm((p) => ({ ...p, target: e.target.value }))}
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                >
                  <option value="all">All Platform Users</option>
                  <option value="teams">Team Members Only</option>
                  <option value="specific_team">Specific Team Only</option>
                </select>
              </div>

              {broadcastForm.target === 'specific_team' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Select Team</label>
                  <select
                    value={broadcastForm.targetTeamId}
                    onChange={(e) => setBroadcastForm((p) => ({ ...p, targetTeamId: e.target.value }))}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="">-- Choose Team --</option>
                    {teams.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.teamName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Expires At (Optional)</label>
                <input
                  type="datetime-local"
                  value={broadcastForm.expiresAt}
                  onChange={(e) => setBroadcastForm((p) => ({ ...p, expiresAt: e.target.value }))}
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <button
                type="submit"
                disabled={sendingBroadcast}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
              >
                {sendingBroadcast ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Broadcasting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Broadcast Now</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Active Broadcasts List */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Active & Past Announcements</h3>
              <span className="text-xs text-slate-400">{announcements.length} Total</span>
            </div>

            {announcements.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-400">
                <Megaphone className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p>No broadcasts sent yet. Use the form on the left to send an announcement.</p>
              </div>
            ) : (
              announcements.map((item) => (
                <div
                  key={item._id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm">{item.title}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {item.type}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {item.priority}
                      </span>
                      {item.targetTeamName && (
                        <span className="text-[10px] text-slate-400">Team: {item.targetTeamName}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 whitespace-pre-line">{item.message}</p>
                    <div className="text-[11px] text-slate-500 flex items-center gap-4">
                      <span>Created: {new Date(item.createdAt).toLocaleString()}</span>
                      {item.expiresAt && (
                        <span>Expires: {new Date(item.expiresAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteAnnouncement(item._id)}
                    className="p-2 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 transition-colors"
                    title="Delete Announcement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── 6. TAB 4: PLANS & TIERS MATRIX ───────────────────────────────── */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-2xl font-bold text-white">Subscription Tiers & Quota Configurations</h2>
            <p className="text-slate-400 text-sm mt-1">
              Standard plans assigned to teams. Custom limits can also be manually configured per team.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {Object.entries(planPresets).map(([planKey, planDef]) => (
              <div
                key={planKey}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-blue-500/50 transition-all shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full border uppercase tracking-wider ${getPlanBadgeClass(
                        planKey
                      )}`}
                    >
                      {planDef.name}
                    </span>
                    <div className="text-xl font-bold text-white">
                      ${planDef.price}
                      <span className="text-xs text-slate-400 font-normal">/mo</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-800 text-xs text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-400" /> Max Members
                      </span>
                      <span className="font-semibold text-white">{planDef.limits.maxMembers}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-cyan-400" /> Storage
                      </span>
                      <span className="font-semibold text-white">
                        {(planDef.limits.maxStorageMB / 1024).toFixed(0)} GB
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-400" /> Max Messages
                      </span>
                      <span className="font-semibold text-white">
                        {planDef.limits.maxMessages.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5 text-purple-400" /> Video Quota
                      </span>
                      <span className="font-semibold text-white">
                        {planDef.limits.maxVideoMinutes} mins
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-amber-400" /> Max Tasks
                      </span>
                      <span className="font-semibold text-white">{planDef.limits.maxTasks}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80">
                  <div className="text-[11px] text-slate-500 text-center">
                    Active on {teams.filter((t) => t.subscription?.plan === planKey).length} teams
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODAL 1: RECORD PAYMENT INSTALLMENT ─────────────────────────── */}
      <AnimatePresence>
        {selectedTeamForPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-400" />
                    <span>Record Payment: {selectedTeamForPayment.teamName}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Record full or partial payment installment for this team.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTeamForPayment(null)}
                  className="p-1.5 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Payment Amount ($ USD)
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="e.g. 50"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                      required
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Payment Method</label>
                    <select
                      value={paymentForm.method}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, method: e.target.value }))}
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                    >
                      <option value="upi">UPI / GPay / PhonePe</option>
                      <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                      <option value="stripe">Stripe / Card</option>
                      <option value="cash">Cash / Direct</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Transaction / Ref ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. UPI-987654321"
                      value={paymentForm.transactionId}
                      onChange={(e) =>
                        setPaymentForm((p) => ({ ...p, transactionId: e.target.value }))
                      }
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Invoice Number</label>
                    <input
                      type="text"
                      value={paymentForm.invoiceNumber}
                      onChange={(e) =>
                        setPaymentForm((p) => ({ ...p, invoiceNumber: e.target.value }))
                      }
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Next Due Date (If partial)
                  </label>
                  <input
                    type="date"
                    value={paymentForm.nextDueDate}
                    onChange={(e) =>
                      setPaymentForm((p) => ({ ...p, nextDueDate: e.target.value }))
                    }
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Installment Note</label>
                  <textarea
                    rows="2"
                    placeholder="e.g. 1st installment received via UPI, remaining due on 15th."
                    value={paymentForm.note}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, note: e.target.value }))}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedTeamForPayment(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={recordingPayment}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-1.5"
                  >
                    {recordingPayment ? 'Recording...' : 'Confirm & Save Payment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 2: PAYMENT HISTORY / TRANSACTION LEDGER ──────────────── */}
      <AnimatePresence>
        {selectedTeamForHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-400" />
                    <span>Payment Ledger: {selectedTeamForHistory.teamName}</span>
                  </h3>
                  <p className="text-xs text-slate-400">Complete installment history and receipts.</p>
                </div>
                <button
                  onClick={() => setSelectedTeamForHistory(null)}
                  className="p-1.5 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2.5">
                {(selectedTeamForHistory.subscription?.billing?.paymentHistory || []).map(
                  (pay, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-emerald-400 text-sm">
                          +${pay.amount}{' '}
                          <span className="text-[11px] font-normal text-slate-400 uppercase">
                            via {pay.method}
                          </span>
                        </div>
                        {pay.transactionId && (
                          <div className="font-mono text-[11px] text-slate-400">
                            TxID: {pay.transactionId}
                          </div>
                        )}
                        {pay.note && <div className="text-slate-300 mt-1 italic">"{pay.note}"</div>}
                      </div>

                      <div className="text-right text-slate-500 text-[11px]">
                        <div>{new Date(pay.date).toLocaleDateString()}</div>
                        <div>By: {pay.recordedBy || 'Admin'}</div>
                      </div>
                    </div>
                  )
                )}
              </div>

              <div className="pt-2 text-right">
                <button
                  onClick={() => setSelectedTeamForHistory(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium text-xs"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 3: EDIT SUBSCRIPTION MODAL ────────────────────────────── */}
      <AnimatePresence>
        {selectedTeamForEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Manage Subscription: <span className="text-blue-400">{selectedTeamForEdit.teamName}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Update tier, set custom resource limits, change expiration, or suspend access.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTeamForEdit(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSubscription} className="space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Select Subscription Plan
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['free', 'starter', 'pro', 'enterprise'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handlePlanChange(p)}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          editFormData.plan === p
                            ? 'bg-blue-600/20 border-blue-500 text-white font-bold ring-1 ring-blue-500'
                            : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="capitalize text-xs font-bold">{p}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          ${planPresets[p]?.price || 0}/mo
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Status</label>
                    <select
                      value={editFormData.status}
                      onChange={(e) =>
                        setEditFormData((prev) => ({ ...prev, status: e.target.value }))
                      }
                      className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="trial">Trial</option>
                      <option value="expired">Expired</option>
                      <option value="suspended">Suspended</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Billing Cycle</label>
                    <select
                      value={editFormData.billingCycle}
                      onChange={(e) =>
                        setEditFormData((prev) => ({ ...prev, billingCycle: e.target.value }))
                      }
                      className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                      <option value="lifetime">Lifetime</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Price ($ USD)</label>
                    <input
                      type="number"
                      min="0"
                      value={editFormData.price}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          price: parseFloat(e.target.value) || 0
                        }))
                      }
                      className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Expiration / Renewal Date
                  </label>
                  <input
                    type="date"
                    value={editFormData.expiryDate}
                    onChange={(e) =>
                      setEditFormData((prev) => ({ ...prev, expiryDate: e.target.value }))
                    }
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">Custom Quota Limits</span>
                    <span className="text-[10px] text-slate-400">Override default limits for this team</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Max Members</label>
                      <input
                        type="number"
                        min="1"
                        value={editFormData.limits.maxMembers}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            limits: { ...prev.limits, maxMembers: parseInt(e.target.value) || 0 }
                          }))
                        }
                        className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Max Storage (MB)</label>
                      <input
                        type="number"
                        min="100"
                        value={editFormData.limits.maxStorageMB}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            limits: { ...prev.limits, maxStorageMB: parseInt(e.target.value) || 0 }
                          }))
                        }
                        className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Max Messages</label>
                      <input
                        type="number"
                        min="100"
                        value={editFormData.limits.maxMessages}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            limits: { ...prev.limits, maxMessages: parseInt(e.target.value) || 0 }
                          }))
                        }
                        className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Max Video (mins)</label>
                      <input
                        type="number"
                        min="0"
                        value={editFormData.limits.maxVideoMinutes}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            limits: { ...prev.limits, maxVideoMinutes: parseInt(e.target.value) || 0 }
                          }))
                        }
                        className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Max Tasks</label>
                      <input
                        type="number"
                        min="1"
                        value={editFormData.limits.maxTasks}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            limits: { ...prev.limits, maxTasks: parseInt(e.target.value) || 0 }
                          }))
                        }
                        className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Max Files</label>
                      <input
                        type="number"
                        min="1"
                        value={editFormData.limits.maxFiles}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            limits: { ...prev.limits, maxFiles: parseInt(e.target.value) || 0 }
                          }))
                        }
                        className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedTeamForEdit(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2"
                  >
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminSubscriptionDashboard;
