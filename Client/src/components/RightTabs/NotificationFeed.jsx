import React, { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

const NotificationFeed = () => {
  const [notifications, setNotifications] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [visibleNotifications, setVisibleNotifications] = useState([]);

  const fetchNotifications = useCallback(async () => {
    try {
      const query = filterType !== 'all' ? `?type=${filterType}` : '';
      const res = await fetch(`http://localhost:3001/notifications${query}`, {
        headers: {
          'auth-token': localStorage.getItem('token'),
        },
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data = await res.json();
      setNotifications((prev) => {
        const merged = [...data, ...prev.filter(p => !data.find(d => d._id === p._id))];
        return merged.sort((a, b) => new Date(b.time) - new Date(a.time));
      });
    } catch (err) {
      console.error('📛 Failed to load notifications:', err.message);
    }
  }, [filterType]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const filtered =
      filterType === 'all'
        ? notifications
        : notifications.filter((n) => n.type === filterType);
    setVisibleNotifications(filtered);
  }, [filterType, notifications]);

  useEffect(() => {
    const handleSocketNotification = (note) => {
      setNotifications((prev) => {
        const exists = prev.find((n) => n._id === note._id);
        if (exists) return prev;
        const updated = [note, ...prev].slice(0, 50);
        return updated.sort((a, b) => new Date(b.time) - new Date(a.time));
      });
    };

    socket.on('notification', handleSocketNotification);
    socket.on('note-added', (note) => {
      const message = `${note.user} created a ${note.type} note.`;
      handleSocketNotification({
        text: message,
        time: note.date || new Date(),
        type: 'comment',
      });
    });
    socket.on('note-updated', (note) => {
      const message = `${note.user} updated a ${note.type} note.`;
      handleSocketNotification({
        text: message,
        time: note.date || new Date(),
        type: 'comment',
      });
    });
    socket.on('note-deleted', (note) => {
      const message = `${note.user} deleted a note.`;
      handleSocketNotification({
        text: message,
        time: note.date || new Date(),
        type: 'comment',
      });
    });

    return () => {
      socket.off('notification', handleSocketNotification);
      socket.off('note-added');
      socket.off('note-updated');
      socket.off('note-deleted');
    };
  }, []);

  const markAsRead = async (id) => {
    try {
      await fetch(`http://localhost:3001/notifications/${id}/read`, {
        method: 'PATCH',
        headers: {
          'auth-token': localStorage.getItem('token'),
        },
      });

      setNotifications((prev) =>
        prev.map((n) =>
          n._id === id ? { ...n, readBy: [...(n.readBy || []), 'me'] } : n
        )
      );
    } catch (err) {
      console.error('❌ Failed to mark as read:', err.message);
    }
  };

  return (
    <div className="relative p-6 rounded-3xl shadow-2xl h-[85vh] flex flex-col transition-all duration-500 hover:scale-[1.02]">
      {/* 🔹 Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-purple-600 to-blue-500 opacity-90"></div>

      {/* 🔹 Floating Shapes */}
      <div className="absolute top-10 left-8 w-24 h-24 bg-gradient-to-r from-blue-300 to-teal-400 rounded-full opacity-25 animate-spin-slow"></div>
      <div className="absolute bottom-12 right-10 w-32 h-32 bg-gradient-to-r from-green-400 to-blue-500 rounded-xl opacity-25 animate-pulse"></div>

      {/* 🔹 Foreground Content */}
      <div className="relative z-10 flex-1 overflow-y-auto pr-2">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-xl text-white drop-shadow-lg">🔔 Notifications</h3>
          <select
            className="rounded-xl px-3 py-1 text-sm bg-white shadow-md text-black focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All</option>
            <option value="event">Event</option>
            <option value="comment">Notes</option>
            <option value="file">File</option>
          </select>
        </div>

        {/* Notifications List */}
        <ul className="space-y-3">
          {visibleNotifications.length === 0 ? (
            <li className="text-white/80 text-sm italic">No notifications found.</li>
          ) : (
            visibleNotifications.map((n) => (
              <li
                key={n._id?.toString() || `${n.text}-${n.time}`}
                className="bg-white/20 backdrop-blur-md rounded-xl p-4 shadow-md hover:shadow-lg transition flex flex-col"
              >
                <span className="text-white text-sm break-words">
                  {n.text}{' '}
                  {n.eventId && (
                    <a
                      href={`/events/${n.eventId}`}
                      className="text-yellow-300 underline ml-1 hover:text-yellow-200"
                    >
                      [View Event]
                    </a>
                  )}
                </span>
                <span className="text-gray-200 text-xs mt-1">
                  ({new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </span>
                {!n.readBy?.includes('me') && (
                  <button
                    onClick={() => markAsRead(n._id)}
                    className="text-xs text-yellow-200 underline mt-1 hover:text-yellow-100 self-end"
                  >
                    Mark as read
                  </button>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default NotificationFeed;
