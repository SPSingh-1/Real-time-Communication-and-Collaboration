// src/pages/Dashboard.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
//eslint-disable-next-line
import { motion } from "framer-motion";
import { Users, Database, FileText, Shield, TrendingUp, Activity, AlertTriangle, RefreshCw, Radio } from "lucide-react";

// Chart components
import StorageBarChart from "./StorageBarChart";
import EfficiencyScatter from "./EfficiencyScatter";
import DocumentsVsIndexesChart from "./DocumentsVsIndexesChart";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#84CC16"];

const Dashboard = () => {
  const [stats, setStats] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [roleStats, setRoleStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const isFetchingRef = useRef(false);

  const fetchDashboardData = useCallback(async (isManual = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      if (isManual) setIsRefreshing(true);
      const token = localStorage.getItem('auth-token') || 
            localStorage.getItem('token') || 
            localStorage.getItem('authToken');

      if (!token) {
        setError('Authentication required - please log in again');
        setLoading(false);
        setIsRefreshing(false);
        isFetchingRef.current = false;
        return;
      }

      const headers = { 'auth-token': token };

      // Fetch all live data in parallel
      const [statsRes, roleStatsRes, userRes] = await Promise.allSettled([
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/dashboard/stats`, { headers }),
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/dashboard/role-stats`, { headers }),
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/dashboard/user-info`, { headers })
      ]);

      // Handle stats response
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data);
      } else {
        console.error("Failed to fetch general stats:", statsRes.reason);
      }

      // Handle user info response
      if (userRes.status === 'fulfilled') {
        setUserInfo(userRes.value.data);
      } else {
        console.error("Failed to fetch user info:", userRes.reason);
      }

      // Handle role stats response
      if (roleStatsRes.status === 'fulfilled') {
        const roleData = roleStatsRes.value.data;
        setRoleStats(roleData);
      } else {
        console.error("Failed to fetch role stats:", roleStatsRes.reason);
      }

      setLastUpdated(new Date());
      setError(null);
      setLoading(false);
      setIsRefreshing(false);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      if (err.response?.status === 401) {
        setError('Session expired - please log in again');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load dashboard');
      }
      setLoading(false);
      setIsRefreshing(false);
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Real-time live polling every 12 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 12000);

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Real-time Socket.IO trigger for instant data sync
  useEffect(() => {
    const socket = window._socket;
    if (!socket) return;

    const handleSync = () => {
      fetchDashboardData();
    };

    socket.on('receive_message', handleSync);
    socket.on('chat:message', handleSync);
    socket.on('chat:new-message', handleSync);
    socket.on('task_created', handleSync);
    socket.on('task_updated', handleSync);
    socket.on('file_uploaded', handleSync);
    socket.on('system:dashboard-update', handleSync);

    return () => {
      socket.off('receive_message', handleSync);
      socket.off('chat:message', handleSync);
      socket.off('chat:new-message', handleSync);
      socket.off('task_created', handleSync);
      socket.off('task_updated', handleSync);
      socket.off('file_uploaded', handleSync);
      socket.off('system:dashboard-update', handleSync);
    };
  }, [fetchDashboardData]);

  // Group active storage items so all team modules with data are visibly represented
  const getCleanStorageData = () => {
    if (!Array.isArray(stats) || stats.length === 0) return [];
    const active = stats.filter(s => (s && ((s.count > 0) || (s.storageSize > 0))));
    const target = active.length > 0 ? active : stats.slice(0, 5);

    return target.map(s => ({
      name: s?.name || 'Unknown',
      value: Math.max(s?.storageSize || 0, (s?.count || 1) * 2048), // proportional visual weight
      realSize: s?.storageSize || 0,
      count: s?.count || 0,
      formatted: `${(((s?.storageSize || 0)) / 1024).toFixed(1)} KB`
    }));
  };

  const storageData = getCleanStorageData();

  // Activity & Record Distribution for Area Chart
  const areaDistributionData = (Array.isArray(stats) ? stats : []).slice(0, 8).map(s => ({
    name: s?.name ? (s.name.charAt(0).toUpperCase() + s.name.slice(1)) : 'Item',
    records: s?.count || 0,
    indexes: s?.nindexes || 0,
    storageKB: parseFloat((((s?.storageSize || 0)) / 1024).toFixed(1))
  }));

  // Summary values
  const totalDocuments = Array.isArray(stats) ? stats.reduce((acc, s) => acc + (s?.count || 0), 0) : 0;
  const totalStorageMB = Array.isArray(stats) ? (stats.reduce((acc, s) => acc + (s?.storageSize || 0), 0) / (1024 * 1024)).toFixed(2) : '0.00';
  const totalIndexes = Array.isArray(stats) ? stats.reduce((acc, s) => acc + (s?.nindexes || 0), 0) : 0;

  // Role-based greeting and permissions
  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'global': return 'Global Administrator';
      case 'team': return 'Team Leader';
      case 'single': return 'Individual User';
      default: return 'User';
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-slate-950 flex items-center justify-center p-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-400 text-sm">Loading workspace dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md">
          <p className="text-red-400 text-sm mb-4">⚠️ {error}</p>
          <button 
            onClick={() => fetchDashboardData(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

// Custom high-contrast tooltips for bright text on dark background
const CustomDonutTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const item = data.payload || {};
    return (
      <div className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 shadow-2xl text-xs">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.fill || '#3b82f6' }}></span>
          <p className="text-white font-bold">{data.name}</p>
        </div>
        <p className="text-blue-400 font-semibold text-xs">
          {item.count ? `${item.count} records` : '0 records'}
        </p>
        <p className="text-emerald-400 text-[11px]">
          {item.realSize ? `${(item.realSize / 1024).toFixed(1)} KB` : `${item.formatted || '0 KB'}`}
        </p>
      </div>
    );
  }
  return null;
};

const CustomAreaTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 shadow-2xl text-xs">
        <p className="text-slate-300 font-medium mb-1">{label}</p>
        <p className="text-white font-bold text-xs">
          <span className="text-blue-400 mr-1 font-semibold">Count:</span>
          {payload[0].value?.toLocaleString()} records
        </p>
      </div>
    );
  }
  return null;
};

const CustomActivityTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 shadow-2xl text-xs">
        <p className="text-slate-300 font-medium mb-1">Date: {label}</p>
        <p className="text-white font-bold text-xs">
          <span className="text-indigo-400 mr-1 font-semibold">Activity:</span>
          {payload[0].value?.toLocaleString()} events
        </p>
      </div>
    );
  }
  return null;
};

  return (
    <div className="min-h-full bg-slate-950 text-slate-100 p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Analytics & System Overview
            </h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Live Sync</span>
            </div>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm">Real-time collaboration metrics, document volume, and storage</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {lastUpdated && (
            <span className="text-[11px] text-slate-500 hidden md:inline">
              Updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}

          <button
            onClick={() => fetchDashboardData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          {userInfo && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="text-left sm:text-right hidden sm:block">
                <div className="text-[10px] text-slate-400">Welcome,</div>
                <div className="text-xs font-semibold text-white truncate max-w-[120px]">{userInfo.name}</div>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-semibold">
                {getRoleDisplayName(userInfo.role)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Role-Specific Quick Stats */}
      {roleStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-xs font-medium">Messages Tracked</span>
              <FileText className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {roleStats.userDocuments || 0}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-xs font-medium">
                {userInfo?.role === 'single' ? 'Active Collections' : 'Team Documents'}
              </span>
              <Database className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {userInfo?.role === 'single' ? (roleStats.activeCollections || 0) : (roleStats.teamDocuments || 0)}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-xs font-medium">
                {userInfo?.role === 'single' ? 'Accessible Storage' : 'Team Storage'}
              </span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {userInfo?.role === 'single' 
                ? `${roleStats.accessibleStorageMB || 0} MB`
                : (() => {
                    const bytes = roleStats.teamStorage || 0;
                    const mb = bytes / (1024 * 1024);
                    const kb = bytes / 1024;
                    if (mb >= 1) return `${mb.toFixed(2)} MB`;
                    if (kb >= 1) return `${kb.toFixed(2)} KB`;
                    return `${bytes} Bytes`;
                  })()
              }
            </p>
          </div>

          {userInfo?.role !== 'single' ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-xs font-medium">Managed Users</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                {roleStats.managedUsers || 0}
              </p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-xs font-medium">Workspace Status</span>
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-sm font-semibold text-emerald-400 mt-2">Active & Secure</p>
            </div>
          )}
        </div>
      )}

      {/* Global Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-xs">Total Records</span>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{totalDocuments.toLocaleString()}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-xs">Total System Storage</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{totalStorageMB} MB</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-xs">Total Indexes</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">{totalIndexes.toLocaleString()}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Clean Donut Chart (Storage Distribution - No overlapping labels) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="pb-3 mb-4 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" />
              <span>Storage Allocation ({userInfo?.role === 'single' ? 'My Workspace' : 'Active Team'})</span>
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">Distribution across primary workspace services</p>
          </div>
          <div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={storageData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  minAngle={18}
                  label={false}
                >
                  {storageData.map((_, index) => (
                    <Cell 
                      key={index} 
                      fill={COLORS[index % COLORS.length]} 
                      stroke="#0f172a" 
                      strokeWidth={2} 
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomDonutTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  wrapperStyle={{ color: '#94a3b8', fontSize: '11px', paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Storage Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl">
          <StorageBarChart data={stats} />
        </div>

        {/* Volume & Records Area Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="pb-3 mb-4 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span>Record Volume ({userInfo?.role === 'single' ? 'My Data' : 'Active Team'})</span>
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">Live document density across active team modules</p>
          </div>
          <div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={areaDistributionData} margin={{ top: 10, right: 15, left: -15, bottom: 25 }}>
                <defs>
                  <linearGradient id="areaGradientBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  fontSize={11} 
                  angle={-25} 
                  textAnchor="end"
                  interval={0}
                />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip content={<CustomAreaTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="records" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#areaGradientBlue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Documents vs Indexes Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl">
          <DocumentsVsIndexesChart data={stats} />
        </div>

        {/* Storage Efficiency Scatter Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl">
          <EfficiencyScatter data={stats} />
        </div>

        {/* Role-based Team Activity Trend */}
        {userInfo?.role !== 'single' && roleStats.teamActivity && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="pb-3 mb-4 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                <span>Team Activity Trend (Area)</span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">Daily collaboration engagement volume</p>
            </div>
            <div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={roleStats.teamActivity} margin={{ top: 10, right: 15, left: -15, bottom: 10 }}>
                  <defs>
                    <linearGradient id="areaGradientIndigo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip content={<CustomActivityTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="activity" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#areaGradientIndigo)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;