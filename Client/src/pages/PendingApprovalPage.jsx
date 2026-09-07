// src/pages/PendingApprovalPage.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, LogOut, Bell, Shield, Sparkles } from 'lucide-react';
import useAppContext from '../context/useAppContext';
import axios from 'axios';

const PendingApprovalPage = () => {
  const { user, logout } = useAppContext();
  const [teamName, setTeamName] = useState('your team');
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    // Fetch team name
    const fetchStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/team/my-status`,
          { headers: { 'auth-token': token } }
        );
        if (res.data.teamInfo?.teamName) setTeamName(res.data.teamInfo.teamName);
      } catch { /* silent */ }
    };
    fetchStatus();
  }, []);

  // Socket.IO listener for approval
  useEffect(() => {
    if (!window._socket) return;
    const handler = (data) => {
      if (data.status === 'approved') setApproved(true);
    };
    window._socket.on('team:approval-update', handler);
    return () => window._socket.off('team:approval-update', handler);
  }, []);

  if (approved) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-white mb-2">You're Approved!</h2>
          <p className="text-slate-400 mb-6">Redirecting to your workspace dashboard…</p>
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient Glow */}
      <div className="fixed top-1/4 left-1/3 w-96 h-96 bg-amber-600/10 rounded-full blur-[140px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 max-w-md w-full bg-slate-900/80 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl"
      >
        {/* Animated clock icon */}
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-6 shadow-xl"
        >
          <Clock className="w-10 h-10 text-amber-400" />
        </motion.div>

        <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Waiting for Admin Approval</h1>
        <p className="text-slate-400 text-xs sm:text-sm mb-6 leading-relaxed">
          Your request to join <span className="text-white font-semibold">"{teamName}"</span> has been submitted. The team administrator will review your access shortly.
        </p>

        {/* Status steps */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 mb-6 text-left space-y-3">
          {[
            { icon: '✅', text: 'Account created', done: true },
            { icon: '✅', text: 'Invite key verified', done: true },
            { icon: '⏳', text: 'Waiting for admin approval', done: false },
            { icon: '🔒', text: 'Dashboard tools unlocked', done: false },
          ].map((step, i) => (
            <div key={i} className={`flex items-center gap-3 text-xs font-medium ${step.done ? 'text-slate-200' : 'text-slate-500'}`}>
              <span>{step.icon}</span>
              <span>{step.text}</span>
            </div>
          ))}
        </div>

        {/* Notification note */}
        <div className="flex items-start gap-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3.5 mb-6 text-left">
          <Bell className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-300 leading-relaxed">
            You'll be notified automatically as soon as the administrator approves your request.
          </p>
        </div>

        <div className="text-xs text-slate-500 mb-6">
          Signed in as: <span className="text-slate-300 font-semibold">{user?.email}</span>
        </div>

        <button
          onClick={logout}
          className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition border border-slate-700 flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </motion.div>
    </div>
  );
};

export default PendingApprovalPage;
