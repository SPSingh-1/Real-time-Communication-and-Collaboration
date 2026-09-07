import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone,
  AlertTriangle,
  Wrench,
  Sparkles,
  Info,
  X,
  CheckCircle2
} from 'lucide-react';
import axios from 'axios';

const GlobalAnnouncementBanner = ({ socket }) => {
  const [broadcasts, setBroadcasts] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const stored = localStorage.getItem('dismissed_broadcast_ids');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Fetch active announcements on mount
  useEffect(() => {
    const fetchActive = async () => {
      const token = localStorage.getItem('token') || localStorage.getItem('auth-token');
      if (!token) return;

      try {
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/admin/active-broadcasts`,
          { headers: { 'auth-token': token } }
        );
        if (res.data.success && res.data.broadcasts) {
          setBroadcasts(res.data.broadcasts);
        }
      } catch {
        // Silent
      }
    };

    fetchActive();
  }, []);

  // Listen to live Socket.IO announcements
  useEffect(() => {
    const targetSocket = socket || window._socket;
    if (!targetSocket) return;

    const handleBroadcast = (newBroadcast) => {
      const newId = String(newBroadcast._id || newBroadcast.id);
      setBroadcasts((prev) => [
        newBroadcast,
        ...prev.filter((b) => String(b._id || b.id) !== newId)
      ]);
    };

    const handleRemoved = ({ id }) => {
      const targetId = String(id);
      setBroadcasts((prev) => prev.filter((b) => String(b._id || b.id) !== targetId));
    };

    targetSocket.on('system:broadcast', handleBroadcast);
    targetSocket.on('system:broadcast-removed', handleRemoved);

    return () => {
      targetSocket.off('system:broadcast', handleBroadcast);
      targetSocket.off('system:broadcast-removed', handleRemoved);
    };
  }, [socket]);

  const handleDismiss = (id) => {
    const stringId = String(id);
    setDismissedIds((prev) => {
      const updated = Array.from(new Set([...prev, stringId]));
      try {
        localStorage.setItem('dismissed_broadcast_ids', JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save dismissed broadcast ID:', err);
      }
      return updated;
    });
  };

  const activeVisibleBroadcasts = broadcasts.filter((b) => {
    const id = String(b._id || b.id);
    return !dismissedIds.includes(id) && b.isActive !== false;
  });

  if (activeVisibleBroadcasts.length === 0) return null;

  return (
    <div className="fixed top-3 right-3 sm:right-6 z-[9999] max-w-md w-full space-y-2 pointer-events-none">
      <AnimatePresence>
        {activeVisibleBroadcasts.slice(0, 3).map((b) => {
          const id = b._id || b.id;
          const type = b.type || 'info';
          const priority = b.priority || 'medium';

          let bgClass = 'bg-blue-900/90 border-blue-500/50 text-blue-100';
          let icon = <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />;

          if (type === 'warning' || priority === 'urgent') {
            bgClass = 'bg-amber-950/95 border-amber-500/60 text-amber-100 shadow-amber-500/20';
            icon = <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />;
          } else if (type === 'maintenance') {
            bgClass = 'bg-rose-950/95 border-rose-500/60 text-rose-100 shadow-rose-500/20';
            icon = <Wrench className="w-5 h-5 text-rose-400 flex-shrink-0" />;
          } else if (type === 'feature' || type === 'success') {
            bgClass = 'bg-emerald-950/95 border-emerald-500/60 text-emerald-100 shadow-emerald-500/20';
            icon = <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0" />;
          }

          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`pointer-events-auto p-4 rounded-2xl border backdrop-blur-xl shadow-2xl ${bgClass} relative overflow-hidden`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-black/20">{icon}</div>

                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {b.title}
                    </span>
                    {priority === 'urgent' && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                        URGENT
                      </span>
                    )}
                    {b.targetTeamName && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/30 text-slate-300">
                        {b.targetTeamName}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed break-words whitespace-pre-line">
                    {b.message}
                  </p>

                  <div className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
                    <span>Broadcast by {b.createdBy || 'Super Admin'}</span>
                    <span>{new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleDismiss(id)}
                  className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  title="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default GlobalAnnouncementBanner;
