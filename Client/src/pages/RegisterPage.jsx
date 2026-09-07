// src/pages/RegisterPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Phone, Key, CheckCircle, AlertCircle, UserPlus, ArrowRight } from 'lucide-react';
import axios from 'axios';
import './Reg.css';
import useAppContext from '../context/useAppContext';

const RegisterPage = () => {
  const navigate      = useNavigate();
  const { inviteKey: urlKey } = useParams(); // support /join/:key route
  // eslint-disable-next-line no-unused-vars
  const { login, user, loading } = useAppContext();

  const [form, setForm] = useState({
    name:            '',
    email:           '',
    phoneno:         '',
    password:        '',
    confirmPassword: '',
    inviteKey:       urlKey || ''  // pre-fill if coming from magic link
  });

  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [showKeyField, setShowKeyField] = useState(!!urlKey);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [keyStatus, setKeyStatus] = useState(null); // null | 'checking' | { valid, teamName, error }

  useEffect(() => {
    if (user && !loading) navigate('/dashboard');
  }, [user, loading, navigate]);

  // Validate invite key on change (debounced)
  const validateKey = useCallback(async (key) => {
    if (!key || key.trim().length < 8) {
      setKeyStatus(null);
      return;
    }
    setKeyStatus('checking');
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/team/validate-invite/${key.trim()}`
      );
      setKeyStatus({ valid: res.data.valid, teamName: res.data.teamName, error: res.data.error });
    } catch {
      setKeyStatus({ valid: false, error: 'Could not validate key' });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => validateKey(form.inviteKey), 600);
    return () => clearTimeout(timer);
  }, [form.inviteKey, validateKey]);

  // Auto-show key field if url has invite key
  useEffect(() => {
    if (urlKey) {
      setForm(f => ({ ...f, inviteKey: urlKey }));
      setShowKeyField(true);
    }
  }, [urlKey]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    if (e.target.name === 'password') {
      const p = e.target.value;
      let s   = 0;
      if (p.length >= 8) s += 25;
      if (/[A-Z]/.test(p)) s += 25;
      if (/[0-9]/.test(p)) s += 25;
      if (/[^A-Za-z0-9]/.test(p)) s += 25;
      setPasswordStrength(s);
    }
  };

  const validateForm = () => {
    if (form.password !== form.confirmPassword) { setError("Passwords don't match"); return false; }
    if (form.password.length < 5) { setError('Password must be at least 5 characters'); return false; }
    if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(form.email)) { setError('Invalid email address'); return false; }
    if (!/^\+?[\d\s\-()]{10,}$/.test(form.phoneno)) { setError('Invalid phone number'); return false; }
    if (form.inviteKey && keyStatus && !keyStatus.valid) { setError('Please enter a valid invite key or leave it empty'); return false; }
    return true;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    if (!validateForm()) { setIsLoading(false); return; }

    try {
      const payload = {
        name:    form.name.trim(),
        email:   form.email.trim().toLowerCase(),
        phoneno: form.phoneno.trim(),
        password: form.password,
        ...(form.inviteKey && form.inviteKey.trim() ? { inviteKey: form.inviteKey.trim().toUpperCase() } : {})
      };

      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/auth/createuser`, payload);

      if (!res.data.success) throw new Error(res.data.error || 'Signup failed');

      if (res.data.pending) {
        setSuccess(`✅ Account created! ${res.data.message}`);
        setTimeout(() => navigate('/login'), 2500);
      } else {
        setSuccess('Account created successfully! Redirecting to login…');
        setTimeout(() => navigate('/login'), 1200);
      }

    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const strengthColor  = passwordStrength >= 75 ? '#22c55e' : passwordStrength >= 50 ? '#eab308' : passwordStrength >= 25 ? '#f97316' : '#ef4444';
  const strengthLabel  = passwordStrength >= 75 ? 'Strong' : passwordStrength >= 50 ? 'Good' : passwordStrength >= 25 ? 'Fair' : 'Weak';

  if (loading) {
    return (
      <div className="register-bg flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="register-bg">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="card-container w-full max-w-lg my-6"
      >
        {/* Brand Logo & Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-600/30 group-hover:scale-105 transition-transform">
              M
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white">Milapp</span>
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create Workspace Account</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">Start collaborating with your team in seconds</p>
        </div>

        {/* Alerts */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 flex items-start gap-2.5 text-red-300 text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-start gap-2.5 text-emerald-300 text-xs font-medium"
            >
              <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
              <span>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSignup} className="space-y-3.5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                disabled={isLoading}
                placeholder="e.g., Shashi Pratap Singh"
                required
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Email Address & Phone Number (Side by side on larger screens) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  disabled={isLoading}
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="tel"
                  name="phoneno"
                  value={form.phoneno}
                  onChange={handleChange}
                  disabled={isLoading}
                  placeholder="+91 98765 43210"
                  required
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner"
                />
              </div>
            </div>
          </div>

          {/* Password & Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  placeholder="Min 5 characters"
                  required
                  className="w-full pl-10 pr-10 py-2.5 sm:py-3 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.password && (
                <div className="mt-1.5 space-y-1">
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${passwordStrength}%`, backgroundColor: strengthColor }} />
                  </div>
                  <div className="text-[10px] font-bold" style={{ color: strengthColor }}>{strengthLabel} Strength</div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  disabled={isLoading}
                  placeholder="Re-enter password"
                  required
                  className={`w-full pl-10 pr-10 py-2.5 sm:py-3 bg-slate-900/90 border rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none transition-all shadow-inner ${
                    form.confirmPassword && form.password !== form.confirmPassword
                      ? 'border-red-500/60 focus:border-red-500'
                      : 'border-slate-700/80 focus:border-blue-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <p className="text-[10px] text-red-400 mt-1">Passwords do not match</p>
              )}
            </div>
          </div>

          {/* ── Invite Key (Optional, Collapsible) ────────────────── */}
          {!urlKey && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowKeyField(!showKeyField);
                  if (showKeyField) {
                    setForm((f) => ({ ...f, inviteKey: '' }));
                    setKeyStatus(null);
                  }
                }}
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{showKeyField ? 'Remove team invite key' : 'Have a team invite key? (Click here)'}</span>
              </button>
            </div>
          )}

          <AnimatePresence>
            {showKeyField && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-1"
              >
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Team Invite Key
                  {urlKey && <span className="ml-2 text-blue-400 font-normal">(Auto-filled from magic link)</span>}
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    name="inviteKey"
                    value={form.inviteKey}
                    onChange={handleChange}
                    disabled={isLoading || !!urlKey}
                    placeholder="e.g., 8-character Key"
                    maxLength={8}
                    className={`w-full pl-10 pr-10 py-2.5 sm:py-3 bg-slate-900/90 border rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm font-mono tracking-widest uppercase focus:outline-none transition-all shadow-inner ${
                      keyStatus === null || keyStatus === 'checking'
                        ? 'border-slate-700/80 focus:border-blue-500'
                        : keyStatus.valid
                        ? 'border-emerald-500/60 bg-emerald-500/5'
                        : 'border-red-500/60 bg-red-500/5'
                    }`}
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
                    {keyStatus.valid ? `✅ Valid Invite! Joining team "${keyStatus.teamName}"` : `❌ ${keyStatus.error}`}
                  </p>
                )}
                <p className="text-[10px] text-slate-500 mt-1">
                  Leave blank if you want to create a standard personal workspace.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || Boolean(form.confirmPassword && form.password !== form.confirmPassword)}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transform active:scale-[0.98] mt-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creating Workspace Account…</span>
              </>
            ) : (
              <>
                <span>Create Free Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* Google OAuth Register */}
        <button
          type="button"
          onClick={() => { 
            const keyParam = form.inviteKey && form.inviteKey.trim() ? `?inviteKey=${encodeURIComponent(form.inviteKey.trim().toUpperCase())}` : '';
            window.location.href = `${import.meta.env.VITE_BACKEND_URL}/api/auth/google${keyParam}`; 
          }}
          className="w-full py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm text-slate-200 bg-slate-900/90 border border-slate-700/80 hover:bg-slate-800 hover:text-white hover:border-slate-600 transition-all flex items-center justify-center gap-2.5 shadow-sm"
        >
          <FcGoogle className="w-5 h-5" />
          <span>Sign up with Google</span>
        </button>

        <p className="text-center text-slate-400 text-xs mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 font-bold transition-colors">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default RegisterPage;