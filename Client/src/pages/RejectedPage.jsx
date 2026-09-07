// src/pages/RejectedPage.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, Key, LogOut, CheckCircle, AlertCircle, RotateCcw, ArrowRight } from 'lucide-react';
import axios from 'axios';
import useAppContext from '../context/useAppContext';

const RejectedPage = () => {
  const { user, logout, setUser } = useAppContext();
  const [inviteKey, setInviteKey]   = useState('');
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [keyStatus, setKeyStatus]   = useState(null);

  const attemptsUsed = user?.teamApplyCount || 0;
  const attemptsLeft = Math.max(0, 5 - attemptsUsed);
  const maxed        = attemptsLeft === 0;

  const validateKey = async (key) => {
    if (!key || key.trim().length < 8) { setKeyStatus(null); return; }
    setKeyStatus('checking');
    try {
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/team/validate-invite/${key.trim()}`);
      setKeyStatus({ valid: res.data.valid, teamName: res.data.teamName, error: res.data.error });
    } catch { setKeyStatus({ valid: false, error: 'Could not validate' }); }
  };

  const handleKeyChange = (e) => {
    const val = e.target.value.toUpperCase();
    setInviteKey(val);
    setError('');
    clearTimeout(window._keyTimer);
    window._keyTimer = setTimeout(() => validateKey(val), 600);
  };

  const handleReapply = async () => {
    if (!inviteKey || !keyStatus?.valid) { setError('Enter a valid invite key first'); return; }
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res   = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/team/reapply`,
        { inviteKey: inviteKey.trim() },
        { headers: { 'auth-token': token } }
      );
      if (res.data.success) {
        setSuccess(res.data.message);
        if (setUser) setUser({ ...user, teamStatus: 'pending', teamApplyCount: res.data.attemptsUsed });
      } else {
        setError(res.data.error);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient Glow */}
      <div className="fixed top-1/4 left-1/3 w-96 h-96 bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 max-w-md w-full bg-slate-900/80 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/30 mb-4 shadow-xl">
            <XCircle className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1.5 tracking-tight">Request Rejected</h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Your request to join the workspace team was not approved.
          </p>
        </div>

        {/* Attempts bar */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-slate-400">Re-apply attempts</span>
            <span className={`text-xs font-bold ${maxed ? 'text-red-400' : 'text-slate-200'}`}>
              {attemptsUsed} / 5 used
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${maxed ? 'bg-red-500' : 'bg-blue-500'}`}
              style={{ width: `${(attemptsUsed / 5) * 100}%` }}
            />
          </div>
          {maxed && (
            <p className="text-[11px] text-red-400 mt-2">Maximum attempts reached. Please contact your administrator.</p>
          )}
        </div>

        {/* Re-apply section */}
        {!maxed && !success && (
          <div className="space-y-4 mb-6">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center gap-2 text-red-300 text-xs font-medium"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">New Team Invite Key</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={inviteKey}
                  onChange={handleKeyChange}
                  disabled={isLoading}
                  placeholder="e.g. 8-char Key"
                  maxLength={8}
                  className="w-full pl-10 pr-10 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm font-mono uppercase tracking-widest focus:outline-none focus:border-blue-500 transition-all shadow-inner"
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  {keyStatus === 'checking' && (
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  )}
                  {keyStatus && keyStatus !== 'checking' && keyStatus.valid && (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  )}
                  {keyStatus && keyStatus !== 'checking' && !keyStatus.valid && (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                </div>
              </div>
              {keyStatus && keyStatus !== 'checking' && (
                <p className={`text-[11px] font-semibold mt-1.5 ${keyStatus.valid ? 'text-emerald-400' : 'text-red-400'}`}>
                  {keyStatus.valid ? `✅ Valid key for "${keyStatus.teamName}"` : `❌ ${keyStatus.error}`}
                </p>
              )}
            </div>

            <button
              onClick={handleReapply}
              disabled={isLoading || !keyStatus?.valid}
              className="w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting…</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>Re-apply to Team</span>
                </>
              )}
            </button>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm mb-6 text-center space-y-2">
            <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto" />
            <p className="font-semibold">{success}</p>
            <p className="text-[11px] text-slate-400">Your application has been reset to pending status.</p>
          </div>
        )}

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

export default RejectedPage;
