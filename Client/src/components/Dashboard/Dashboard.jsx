// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
//eslint-disable-next-line
import { motion } from "framer-motion";
import { Users, Database, FileText, Shield, TrendingUp, Activity } from "lucide-react";

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
  const [error, setError] = useState(null);


    useEffect(() => {
    if (userInfo) {
      console.log('Current user info:', userInfo);
      console.log('User teamId:', userInfo.teamId);
      console.log('User role:', userInfo.role);
    }
  }, [userInfo]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('auth-token') || 
              localStorage.getItem('token') || 
              localStorage.getItem('authToken');

          if (!token) {
            console.log('No authentication token found in localStorage');
            setError('Authentication required - please log in again');
            return;
          }

          console.log('Using token:', token.substring(0, 20) + '...');
        
        if (!token) {
          setError('Authentication required');
          return;
        }

        // Fetch general stats
        const statsRes = await axios.get("http://localhost:3001/api/dashboard/stats", {
          headers: { 'auth-token': token }
        });
        
        // Fetch role-specific stats
        const roleStatsRes = await axios.get("http://localhost:3001/api/dashboard/role-stats", {
          headers: { 'auth-token': token }
        });

        // Fetch user info
        const userRes = await axios.get("http://localhost:3001/api/dashboard/user-info", {
          headers: { 'auth-token': token }
        });

        setStats(statsRes.data);
        setRoleStats(roleStatsRes.data);
        setUserInfo(userRes.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        console.error("Response data:", err.response?.data);
        console.error("Response status:", err.response?.status);
        
        if (err.response?.status === 401) {
          setError('Session expired - please log in again');
          // Optionally redirect to login
          // window.location.href = '/login';
        } else {
          setError(err.response?.data?.message || 'Failed to load dashboard');
        }
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  // Pie chart data for storage usage
  const storageData = stats.map((s) => ({
    name: s.name,
    value: s.storageSize || 0,
  }));

  // Pie chart data for document count
  const countData = stats.map((s) => ({
    name: s.name,
    value: s.count || 0,
  }));

  // Summary values
  const totalDocuments = stats.reduce((acc, s) => acc + (s.count || 0), 0);
  const totalStorageMB = (stats.reduce((acc, s) => acc + (s.storageSize || 0), 0) / (1024 * 1024)).toFixed(2);
  const totalIndexes = stats.reduce((acc, s) => acc + (s.nindexes || 0), 0);

  // Role-based greeting and permissions
  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'global': return 'Global Administrator';
      case 'team': return 'Team Leader';
      case 'single': return 'Individual User';
      default: return 'User';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'global': return <Shield className="w-5 h-5" />;
      case 'team': return <Users className="w-5 h-5" />;
      case 'single': return <Activity className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  // Animation settings
  const cardAnimation = {
    initial: { opacity: 0, y: 30, scale: 0.95 },
    whileInView: { opacity: 1, y: 0, scale: 1 },
    viewport: { once: true, amount: 0.1 },
    transition: { duration: 0.5, type: "spring", bounce: 0.2 },
  };

  const staggerContainer = {
    initial: {},
    whileInView: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-purple-900 flex items-center justify-center">
        <motion.div 
          className="text-center bg-red-500/20 backdrop-blur-sm rounded-2xl p-8 border border-red-500/30"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <p className="text-red-300 text-lg mb-4">⚠️ {error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <motion.div 
          className="text-center space-y-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-center space-x-3">
            <div className="p-3 bg-blue-500/20 backdrop-blur-sm rounded-2xl border border-blue-500/30">
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
          </div>
          
          {userInfo && (
            <motion.div 
              className="flex items-center justify-center space-x-3 bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-3 border border-white/20 mx-auto w-fit"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                {getRoleIcon(userInfo.role)}
              </div>
              <div className="text-left">
                <p className="text-white font-semibold">Welcome, {userInfo.name}</p>
                <p className="text-blue-300 text-sm">{getRoleDisplayName(userInfo.role)}</p>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Role-Specific Quick Stats */}
        {roleStats && (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
          >
            <motion.div variants={cardAnimation} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-500/20 rounded-2xl">
                  <FileText className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-blue-200 font-medium">Your Documents</h3>
                  <p className="text-2xl font-bold text-white">{roleStats.userDocuments || 0}</p>
                </div>
              </div>
            </motion.div>

            {userInfo?.role !== 'single' && (
              <motion.div variants={cardAnimation} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-green-500/20 rounded-2xl">
                    <Users className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-green-200 font-medium">
                      {userInfo.role === 'global' ? 'All Users' : 'Team Members'}
                    </h3>
                    <p className="text-2xl font-bold text-white">{roleStats.managedUsers || 0}</p>
                  </div>
                </div>
              </motion.div>
            )}

            <motion.div variants={cardAnimation} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-purple-500/20 rounded-2xl">
                  <Database className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-purple-200 font-medium">Accessible Storage</h3>
                  <p className="text-2xl font-bold text-white">{roleStats.accessibleStorageMB || 0} MB</p>
                </div>
              </div>
            </motion.div>

            <motion.div variants={cardAnimation} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-yellow-500/20 rounded-2xl">
                  <Activity className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-yellow-200 font-medium">Active Collections</h3>
                  <p className="text-2xl font-bold text-white">{roleStats.activeCollections || 0}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Main Summary Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
        >
          <motion.div variants={cardAnimation} className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-sm text-blue-100 p-6 rounded-2xl shadow-xl border border-blue-500/30 hover:from-blue-500/30 hover:to-blue-600/30 transition-all duration-300">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-500/30 rounded-2xl">
                <FileText className="w-8 h-8 text-blue-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Total Documents</h2>
                <p className="text-3xl font-bold mt-1">{totalDocuments.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>

          <motion.div variants={cardAnimation} className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-sm text-green-100 p-6 rounded-2xl shadow-xl border border-green-500/30 hover:from-green-500/30 hover:to-green-600/30 transition-all duration-300">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-500/30 rounded-2xl">
                <Database className="w-8 h-8 text-green-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Total Storage</h2>
                <p className="text-3xl font-bold mt-1">{totalStorageMB} MB</p>
              </div>
            </div>
          </motion.div>

          <motion.div variants={cardAnimation} className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-sm text-purple-100 p-6 rounded-2xl shadow-xl border border-purple-500/30 hover:from-purple-500/30 hover:to-purple-600/30 transition-all duration-300">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-500/30 rounded-2xl">
                <TrendingUp className="w-8 h-8 text-purple-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Total Indexes</h2>
                <p className="text-3xl font-bold mt-1">{totalIndexes.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Charts Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
        >
          {/* Storage Usage Pie Chart */}
          <motion.div variants={cardAnimation} className="bg-white/10 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden hover:bg-white/15 transition-all duration-300">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Database className="w-5 h-5 text-blue-400" />
                </div>
                <span>Storage Distribution</span>
              </h2>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <defs>
                    {storageData.map((_, index) => (
                      <linearGradient id={`grad-storage-${index}`} key={index} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.8} />
                        <stop offset="100%" stopColor={COLORS[index % COLORS.length]} stopOpacity={1} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={storageData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ value }) => `${(value / (1024 * 1024)).toFixed(1)}MB`}
                    isAnimationActive={true}
                    animationDuration={1500}
                  >
                    {storageData.map((_, index) => (
                      <Cell 
                        key={index} 
                        fill={`url(#grad-storage-${index})`} 
                        stroke="#1F2937" 
                        strokeWidth={2} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(31, 41, 55, 0.9)', 
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      color: 'white'
                    }} 
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={40}
                    wrapperStyle={{ color: 'white', fontSize: '14px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Storage Bar Chart */}
          <motion.div variants={cardAnimation}>
            <StorageBarChart data={stats} />
          </motion.div>

          {/* Efficiency Scatter Chart */}
          <motion.div variants={cardAnimation}>
            <EfficiencyScatter data={stats} />
          </motion.div>

          {/* Documents vs Indexes Chart */}
          <motion.div variants={cardAnimation}>
            <DocumentsVsIndexesChart data={stats} />
          </motion.div>

          {/* Document Count Pie Chart */}
          <motion.div variants={cardAnimation} className="bg-white/10 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden hover:bg-white/15 transition-all duration-300">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <FileText className="w-5 h-5 text-green-400" />
                </div>
                <span>Document Distribution</span>
              </h2>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <defs>
                    {countData.map((_, index) => (
                      <linearGradient id={`grad-count-${index}`} key={index} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.8} />
                        <stop offset="100%" stopColor={COLORS[index % COLORS.length]} stopOpacity={1} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={countData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ value }) => value.toLocaleString()}
                    isAnimationActive={true}
                    animationDuration={1500}
                  >
                    {countData.map((_, index) => (
                      <Cell 
                        key={index} 
                        fill={`url(#grad-count-${index})`} 
                        stroke="#1F2937" 
                        strokeWidth={2} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(31, 41, 55, 0.9)', 
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      color: 'white'
                    }} 
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={40}
                    wrapperStyle={{ color: 'white', fontSize: '14px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Role-based additional chart */}
          {userInfo?.role !== 'single' && roleStats.teamActivity && (
            <motion.div variants={cardAnimation} className="bg-white/10 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden hover:bg-white/15 transition-all duration-300">
              <div className="p-6 border-b border-white/10">
                <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Activity className="w-5 h-5 text-purple-400" />
                  </div>
                  <span>Team Activity Trend</span>
                </h2>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={roleStats.teamActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis dataKey="date" stroke="rgba(255, 255, 255, 0.7)" />
                    <YAxis stroke="rgba(255, 255, 255, 0.7)" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(31, 41, 55, 0.9)', 
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                        color: 'white'
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="activity" 
                      stroke="#8B5CF6" 
                      strokeWidth={3}
                      dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;