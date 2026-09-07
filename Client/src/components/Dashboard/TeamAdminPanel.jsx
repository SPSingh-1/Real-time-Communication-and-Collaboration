import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key, Copy, RefreshCw, Mail, Users, Clock, CheckCircle,
  XCircle, AlertTriangle, Send, Power, Trash2, ChevronDown, ChevronUp, Link2
} from 'lucide-react';
import axios from 'axios';
import useAppContext from '../../context/useAppContext';

const TeamAdminPanel = () => {
  const { user, setUser }             = useAppContext();
  const [teamInfo, setTeamInfo]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [copied, setCopied]           = useState(false);
  const [emailInput, setEmailInput]   = useState('');
  const [emailList, setEmailList]     = useState([]);
  const [sending, setSending]         = useState(false);
  const [sendResult, setSendResult]   = useState('');
  const [expandMembers, setExpandMembers] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  const token = localStorage.getItem('token');
  const headers = { 'auth-token': token };

  const fetchTeamInfo = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/team/info`, { headers });
      setTeamInfo(res.data.team);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('no_team'); // admin has no team yet
      } else {
        setError('fetch_failed');
      }
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchTeamInfo(); }, [fetchTeamInfo]);

  // Socket.IO — live pending update
  useEffect(() => {
    if (!window._socket) return;
    const handler = () => fetchTeamInfo();
    window._socket.on('team:new-pending', handler);
    return () => window._socket.off('team:new-pending', handler);
  }, [fetchTeamInfo]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerateKey = async () => {
    try {
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/team/generate-invite`, {}, { headers });
      setTeamInfo(prev => ({
        ...prev,
        inviteKey:       res.data.inviteKey,
        inviteKeyExpiry: res.data.inviteKeyExpiry,
        inviteKeyActive: true,
        inviteLink:      res.data.inviteLink,
        inviteKeyValid:  true
      }));
    } catch { /* silent */ }
  };

  const toggleKey = async () => {
    try {
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/team/toggle-key`, {}, { headers });
      setTeamInfo(prev => ({ ...prev, inviteKeyActive: res.data.inviteKeyActive }));
    } catch { /* silent */ }
  };

  const handleApprove = async (userId) => {
    setActionLoading(p => ({ ...p, [userId]: 'approving' }));
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/team/approve/${userId}`, {}, { headers });
      await fetchTeamInfo();
    } catch { /* silent */ }
    setActionLoading(p => ({ ...p, [userId]: null }));
  };

  const handleReject = async (userId) => {
    setActionLoading(p => ({ ...p, [userId]: 'rejecting' }));
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/team/reject/${userId}`, {}, { headers });
      await fetchTeamInfo();
    } catch { /* silent */ }
    setActionLoading(p => ({ ...p, [userId]: null }));
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member from the team?')) return;
    setActionLoading(p => ({ ...p, [userId]: 'removing' }));
    try {
      await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/team/remove-member/${userId}`, { headers });
      await fetchTeamInfo();
    } catch { /* silent */ }
    setActionLoading(p => ({ ...p, [userId]: null }));
  };

  const addEmail = () => {
    const trimmed = emailInput.trim();
    if (trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) && !emailList.includes(trimmed)) {
      setEmailList(p => [...p, trimmed]);
      setEmailInput('');
    }
  };

  const sendEmailInvites = async () => {
    if (emailList.length === 0) return;
    setSending(true);
    setSendResult('');
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/team/send-email-invite`,
        { emails: emailList },
        { headers }
      );
      setSendResult(res.data.message);
      setEmailList([]);
    } catch (err) {
      setSendResult(err.response?.data?.error || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const expiryLabel = (dateStr) => {
    if (!dateStr) return 'No expiry set';
    const diff = new Date(dateStr) - new Date();
    if (diff <= 0) return 'Expired';
    const days  = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return days > 0 ? `${days}d ${hours}h remaining` : `${hours}h remaining`;
  };

  // ── Loading ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── No team yet ─────────────────────────────────────────────────
  if (error === 'no_team') {
    return <CreateTeamForm onCreated={fetchTeamInfo} token={token} user={user} setUser={setUser} />;
  }

  if (!teamInfo) return null;

  const isKeyValid = teamInfo.inviteKeyValid && teamInfo.inviteKeyActive;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">

      {/* ── Invite Key Card ──────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-blue-400" />
            <span className="text-white font-semibold text-sm">Invite Key</span>
          </div>
          <div className={`text-xs px-2 py-0.5 rounded-full ${isKeyValid ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
            {isKeyValid ? 'Active' : 'Inactive'}
          </div>
        </div>

        {/* Key display */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 font-mono text-lg tracking-[0.3em] text-white font-bold text-center">
            {teamInfo.inviteKey || '—'}
          </div>
          <button onClick={() => copyToClipboard(teamInfo.inviteKey)}
            className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-gray-400 hover:text-white">
            {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Invite link */}
        {teamInfo.inviteLink && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 bg-black/20 border border-white/8 rounded-lg px-3 py-2 text-xs text-gray-400 truncate">
              {teamInfo.inviteLink}
            </div>
            <button onClick={() => copyToClipboard(teamInfo.inviteLink)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-gray-400 hover:text-white flex-shrink-0">
              <Link2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Expiry */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
          <Clock className="w-3.5 h-3.5" />
          {expiryLabel(teamInfo.inviteKeyExpiry)}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={regenerateKey}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 text-xs font-medium transition-all">
            <RefreshCw className="w-3.5 h-3.5" />Regenerate (7 days)
          </button>
          <button onClick={toggleKey}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
              teamInfo.inviteKeyActive
                ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                : 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
            }`}>
            <Power className="w-3.5 h-3.5" />
            {teamInfo.inviteKeyActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </motion.div>

      {/* ── Email Invite ─────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-4 h-4 text-purple-400" />
          <span className="text-white font-semibold text-sm">Email Invitations</span>
        </div>

        <div className="flex gap-2 mb-3">
          <input
            type="email" value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addEmail())}
            placeholder="colleague@example.com"
            className="flex-1 px-3 py-2.5 bg-white/5 border border-white/15 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500/60 transition-all"
          />
          <button onClick={addEmail}
            className="px-3 py-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 text-sm transition-all">
            Add
          </button>
        </div>

        {emailList.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {emailList.map(em => (
              <span key={em} className="flex items-center gap-1 text-xs bg-white/8 border border-white/10 px-2 py-1 rounded-lg text-gray-300">
                {em}
                <button onClick={() => setEmailList(p => p.filter(e => e !== em))} className="text-gray-500 hover:text-red-400">×</button>
              </span>
            ))}
          </div>
        )}

        <button onClick={sendEmailInvites} disabled={sending || emailList.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/80 hover:bg-purple-500/80 disabled:opacity-40 text-white text-sm font-medium transition-all">
          {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? 'Sending…' : `Send Invite${emailList.length > 1 ? `s (${emailList.length})` : ''}`}
        </button>

        {sendResult && (
          <p className="text-xs text-green-400 mt-2">{sendResult}</p>
        )}
      </motion.div>

      {/* ── Pending Approvals ────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-yellow-400" />
          <span className="text-white font-semibold text-sm">Pending Approvals</span>
          {teamInfo.pendingCount > 0 && (
            <span className="ml-auto px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
              {teamInfo.pendingCount}
            </span>
          )}
        </div>

        {teamInfo.pendingMembers.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No pending requests</p>
        ) : (
          <div className="space-y-2">
            {teamInfo.pendingMembers.map(pm => {
              const u = pm.userId;
              if (!u) return null;
              const isActing = actionLoading[u._id];
              return (
                <AnimatePresence key={u._id}>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-3 p-3 bg-white/5 border border-white/8 rounded-xl">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      {u.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{u.name}</div>
                      <div className="text-gray-500 text-xs truncate">{u.email}</div>
                      <div className="text-gray-600 text-xs">{new Date(pm.requestedAt).toLocaleDateString()}</div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => handleApprove(u._id)} disabled={!!isActing}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 text-xs font-medium transition-all disabled:opacity-40">
                        {isActing === 'approving' ? <div className="w-3 h-3 border border-green-400 border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        Approve
                      </button>
                      <button onClick={() => handleReject(u._id)} disabled={!!isActing}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-all disabled:opacity-40">
                        {isActing === 'rejecting' ? <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                        Reject
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ── Current Members ──────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
        <button className="flex items-center gap-2 w-full" onClick={() => setExpandMembers(!expandMembers)}>
          <Users className="w-4 h-4 text-green-400" />
          <span className="text-white font-semibold text-sm">Members ({teamInfo.membersCount})</span>
          <div className="ml-auto text-gray-500">
            {expandMembers ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        <AnimatePresence>
          {expandMembers && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-2 overflow-hidden">
              {teamInfo.members.map(m => {
                const isAdmin = m._id?.toString() === user?._id?.toString();
                return (
                  <div key={m._id} className="flex items-center gap-3 p-2.5 bg-white/4 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                      {m.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-medium truncate">
                        {m.name} {isAdmin && <span className="text-yellow-400">(Admin)</span>}
                      </div>
                      <div className="text-gray-500 text-xs truncate">{m.email}</div>
                    </div>
                    {!isAdmin && (
                      <button onClick={() => handleRemoveMember(m._id)}
                        disabled={!!actionLoading[m._id]}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// ── Sub-component: Create Team (when admin has no team yet) ────────
const CreateTeamForm = ({ onCreated, token, user, setUser }) => {
  const [name, setName]       = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setErr('Team name is required'); return; }
    setLoading(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/team/create`,
        { teamName: name.trim() },
        { headers: { 'auth-token': token } }
      );
      if (setUser && user && res.data.team) {
        setUser({
          ...user,
          role: 'team',
          teamId: res.data.team._id,
          teamStatus: 'approved'
        });
      }
      onCreated();
    } catch (err) {
      setErr(err.response?.data?.error || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center max-w-sm mx-auto shadow-2xl backdrop-blur-md">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/40 mb-4">
        <Users className="w-7 h-7 text-blue-400" />
      </div>
      <h3 className="text-xl font-bold text-white mb-1">Create Team Workspace</h3>
      <p className="text-gray-400 text-sm mb-5">
        Set up your team workspace to generate 8-character invite keys and add members.
      </p>
      <form onSubmit={handleCreate} className="space-y-4">
        <input 
          value={name} 
          onChange={e => { setName(e.target.value); setErr(''); }}
          placeholder="e.g. Acme Engineering" 
          required
          className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500/70 transition-all" 
        />
        {err && <p className="text-xs text-red-400">{err}</p>}
        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-semibold disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
          {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Users className="w-4 h-4" />}
          Create Team Workspace
        </button>
      </form>
    </div>
  );
};

export default TeamAdminPanel;
