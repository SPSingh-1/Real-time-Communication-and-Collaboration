// src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, LogIn, AlertCircle, CheckCircle, Sparkles, ArrowRight } from 'lucide-react';
import axios from 'axios';
import './Reg.css';
import useAppContext from '../context/useAppContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, user, loading } = useAppContext();

  const [form, setForm]           = useState({ email: '', password: '' });
  const [showPass, setShowPass]   = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [blocked, setBlocked]     = useState(null); // { reason, attemptsLeft }

  useEffect(() => {
    if (user && !loading) navigate('/dashboard');
  }, [user, loading, navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setBlocked(null);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    setError('');
    setBlocked(null);
    setSuccess('');

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/auth/login`,
        { email: form.email, password: form.password }
      );

      // Team member pending / rejected
      if (!res.data.success && res.data.blocked) {
        setBlocked({ reason: res.data.reason, attemptsLeft: res.data.attemptsLeft });
        setIsLoading(false);
        return;
      }

      if (!res.data.success) throw new Error(res.data.error || 'Login failed');

      setSuccess('Login successful! Redirecting to workspace…');
      await login({ ...res.data.user, token: res.data.token });
      setTimeout(() => navigate('/dashboard'), 600);

    } catch (err) {
      // Handle blocked responses that come as 403
      if (err.response?.data?.blocked) {
        setBlocked({
          reason:       err.response.data.reason,
          attemptsLeft: err.response.data.attemptsLeft
        });
      } else {
        setError(err.response?.data?.error || err.message || 'Login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_BACKEND_URL}/api/auth/google`;
  };

  if (loading) {
    return (
      <div className="login-bg flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-sm text-slate-400">Verifying session…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-bg">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="card-container w-full max-w-md"
      >
        {/* Brand Logo & Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-600/30 group-hover:scale-105 transition-transform">
              M
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white">Milapp</span>
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome Back</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">Sign in to access your team workspace</p>
        </div>

        {/* Blocked / Review Status */}
        <AnimatePresence>
          {blocked && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`mb-4 p-4 rounded-2xl border text-xs sm:text-sm ${
                blocked.reason === 'pending_approval'
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-red-500/10 border-red-500/40 text-red-300'
              }`}
            >
              {blocked.reason === 'pending_approval' ? (
                <div className="flex items-start gap-2.5">
                  <span className="text-lg">⏳</span>
                  <div>
                    <div className="font-bold mb-0.5">Pending Admin Approval</div>
                    <div className="text-xs opacity-85 leading-relaxed">
                      Your team join request is currently under review by the team administrator.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold mb-0.5">Join Request Rejected</div>
                    <div className="text-xs opacity-85 leading-relaxed">
                      {blocked.attemptsLeft > 0
                        ? `You have ${blocked.attemptsLeft} re-apply attempt(s) remaining.`
                        : 'Maximum attempts reached. Please contact your team admin.'}
                    </div>
                    {blocked.attemptsLeft > 0 && (
                      <Link to="/register" className="text-xs font-bold underline mt-1.5 inline-block text-white hover:text-blue-300">
                        Re-apply with a valid invite key →
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error / Success Toast Alerts */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center gap-2.5 text-red-300 text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2.5 text-emerald-300 text-xs font-medium"
            >
              <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                disabled={isLoading}
                placeholder="you@company.com"
                autoComplete="email"
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showPass ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                disabled={isLoading}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                className="w-full pl-10 pr-11 py-3 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transform active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Signing in…</span>
              </>
            ) : (
              <>
                <span>Sign In to Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">or continue with</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* Google OAuth Login */}
        <button
          onClick={handleGoogleLogin}
          type="button"
          className="w-full py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm text-slate-200 bg-slate-900/90 border border-slate-700/80 hover:bg-slate-800 hover:text-white hover:border-slate-600 transition-all flex items-center justify-center gap-2.5 shadow-sm"
        >
          <FcGoogle className="w-5 h-5" />
          <span>Sign in with Google</span>
        </button>

        {/* Switch to Register */}
        <p className="text-center text-slate-400 text-xs mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-400 hover:text-blue-300 font-bold transition-colors">
            Create Free Account
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;