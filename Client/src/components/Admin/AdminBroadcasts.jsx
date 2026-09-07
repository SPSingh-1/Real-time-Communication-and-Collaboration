import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Megaphone,
  Send,
  Trash2,
  AlertTriangle,
  Info,
  Wrench,
  Sparkles,
  RefreshCw,
  Clock,
  Users
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AdminBroadcasts = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Broadcast Form
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

  const token = localStorage.getItem('token') || localStorage.getItem('auth-token');
  const headers = useMemo(() => ({ 'auth-token': token }), [token]);

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [announcementsRes, teamsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/admin/announcements`, { headers }),
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/admin/teams-usage`, { headers })
      ]);

      if (announcementsRes.data.success) {
        setAnnouncements(announcementsRes.data.announcements || []);
      }
      if (teamsRes.data.success) {
        setTeams(teamsRes.data.teams || []);
      }
    } catch (err) {
      console.error('Failed to load broadcasts:', err);
      toast.error(err.response?.data?.error || 'Failed to load announcements');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        toast.success('📢 Announcement broadcasted in real-time to all users!');
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] text-white">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading System Broadcasts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Global Announcements & Broadcasts
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
              Send live popup notices to all online users across the platform (e.g. maintenance, new features, alerts).
            </p>
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={refreshing}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-purple-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── MAIN CONTENT: FORM + LIST ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Compose Broadcast */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Send className="w-4 h-4 text-purple-400" />
            <span>Compose New Broadcast</span>
          </div>

          <form onSubmit={handleSendBroadcast} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Title</label>
              <input
                type="text"
                placeholder="e.g. Scheduled Maintenance Notice"
                value={broadcastForm.title}
                onChange={(e) => setBroadcastForm((p) => ({ ...p, title: e.target.value }))}
                required
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Message</label>
              <textarea
                rows="4"
                placeholder="e.g. Server maintenance is scheduled tonight at 11 PM for 15 minutes."
                value={broadcastForm.message}
                onChange={(e) => setBroadcastForm((p) => ({ ...p, message: e.target.value }))}
                required
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Notice Type</label>
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
                  onChange={(e) =>
                    setBroadcastForm((p) => ({ ...p, targetTeamId: e.target.value }))
                  }
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
                min={new Date().toISOString().slice(0, 16)}
                value={broadcastForm.expiresAt}
                onChange={(e) => setBroadcastForm((p) => ({ ...p, expiresAt: e.target.value }))}
                className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-white [color-scheme:dark] cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={sendingBroadcast}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2 text-xs"
            >
              {sendingBroadcast ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Broadcasting...</span>
                </>
              ) : (
                <>
                  <Megaphone className="w-4 h-4" />
                  <span>Send Broadcast Alert</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Broadcast History */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Active & Past Announcements</h3>
            <span className="text-xs text-slate-400">{announcements.length} Total</span>
          </div>

          {announcements.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              <Megaphone className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="text-xs">No announcements broadcasted yet.</p>
            </div>
          ) : (
            announcements.map((item) => (
              <div
                key={item._id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-start justify-between gap-4 shadow-lg hover:border-slate-700/80 transition-all"
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
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                        Team: {item.targetTeamName}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                    {item.message}
                  </p>
                  <div className="text-[11px] text-slate-500 flex items-center gap-4 pt-1">
                    <span>Created: {new Date(item.createdAt).toLocaleString()}</span>
                    {item.expiresAt && (
                      <span>Expires: {new Date(item.expiresAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteAnnouncement(item._id)}
                  className="p-2 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 transition-colors flex-shrink-0"
                  title="Delete Announcement"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminBroadcasts;
