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
  Clock,
  Zap,
  PauseCircle,
  PlayCircle,
  X,
  Plus
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AdminTeamsManager = () => {
  const [overview, setOverview] = useState(null);
  const [teams, setTeams] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [planPresets, setPlanPresets] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('members');

  // Edit Subscription Modal
  const [selectedTeamForEdit, setSelectedTeamForEdit] = useState(null);
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

  const token = localStorage.getItem('token') || localStorage.getItem('auth-token');
  const headers = useMemo(() => ({ 'auth-token': token }), [token]);

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [overviewRes, teamsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/admin/platform-overview`, { headers }),
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/admin/teams-usage`, { headers })
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
    } catch (err) {
      console.error('Failed to load teams data:', err);
      toast.error(err.response?.data?.error || 'Failed to load teams management data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePlanChange = (newPlan) => {
    const preset = planPresets[newPlan];
    setEditFormData((prev) => ({
      ...prev,
      plan: newPlan,
      price: preset ? preset.price : prev.price,
      limits: preset ? { ...preset.limits } : prev.limits
    }));
  };

  const openEditModal = (team) => {
    setSelectedTeamForEdit(team);
    const sub = team.subscription || {};
    const expiry = sub.expiryDate ? new Date(sub.expiryDate).toISOString().split('T')[0] : '';

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

  const getUsageBarColor = (pct) => {
    if (pct >= 90) return 'bg-rose-500';
    if (pct >= 75) return 'bg-amber-500';
    return 'bg-blue-500';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] text-white">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading Teams & Usage Quotas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Teams & Resource Quotas
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
              Live tracking of members, messages, calls, storage (5MB max per file), and subscription tiers.
            </p>
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={refreshing}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── 🚨 QUOTA ALERTS BANNER ───────────────────────────────────────── */}
      {systemAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-amber-950/80 border border-amber-500/50 shadow-xl shadow-amber-500/10 space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>Quota Warnings & Overuse Alerts ({systemAlerts.length})</span>
            </div>
            <span className="text-[11px] text-amber-400/80">Thresholds &gt; 90%</span>
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
                <div className="font-bold text-white truncate max-w-[90px]">{alert.teamName}:</div>
                <div className="truncate flex-1 text-[11px]">{alert.message}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── KPI METRICS CARDS ───────────────────────────────────────────── */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-slate-400">Total Teams</span>
            <div className="text-2xl font-bold text-white mt-1">{overview.totalTeams || 0}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{overview.totalUsers || 0} total users</div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-slate-400">Total Messages</span>
            <div className="text-2xl font-bold text-indigo-400 mt-1">
              {(overview.totalMessages || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Team & personal chat</div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-slate-400">Total Storage Consumed</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">{overview.totalStorageMB || 0} MB</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{overview.totalFiles || 0} files uploaded</div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-slate-400">Video & Audio Meetings</span>
            <div className="text-2xl font-bold text-purple-400 mt-1">
              {(overview.totalVideoCalls || 0) + (overview.totalAudioCalls || 0)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {overview.totalVideoCalls || 0} video · {overview.totalAudioCalls || 0} audio
            </div>
          </div>
        </div>
      )}

      {/* ── SEARCH & FILTERS BAR ────────────────────────────────────────── */}
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

      {/* ── TEAMS LIST ──────────────────────────────────────────────────── */}
      {filteredTeams.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No teams found</h3>
          <p className="text-xs text-slate-400 mt-1">Try adjusting search query or filters.</p>
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
                  {/* Left Info */}
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
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                        {sub.status || 'Active'}
                      </span>
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

                  {/* Resource Usage Meters */}
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
                        <span className="text-[10px] text-slate-500">Vid / Aud Calls</span>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-1 text-slate-300 font-semibold justify-end">
                          <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                          <span>{usage.tasks || 0}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{usage.tasksCompleted || 0} done</span>
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
                      onClick={() => handleToggleSuspend(team)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 border ${
                        sub.status === 'suspended'
                          ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {sub.status === 'suspended' ? (
                        <>
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span>Activate</span>
                        </>
                      ) : (
                        <>
                          <PauseCircle className="w-3.5 h-3.5" />
                          <span>Suspend</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── EDIT SUBSCRIPTION MODAL ─────────────────────────────────────── */}
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
                    min={new Date().toISOString().split('T')[0]}
                    value={editFormData.expiryDate}
                    onChange={(e) =>
                      setEditFormData((prev) => ({ ...prev, expiryDate: e.target.value }))
                    }
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 [color-scheme:dark] cursor-pointer"
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

export default AdminTeamsManager;
