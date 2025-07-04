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
    <div className="bg-white shadow-lg rounded-xl p-4 max-h-96 transition-all duration-300 ease-in-out hover:shadow-2xl">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg text-gray-800">🔔 Notifications</h3>
        <select
          className="text-sm border px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">All</option>
          <option value="event">Event</option>
          <option value="comment">Notes</option>
          <option value="file">File</option>
        </select>
      </div>

      <ul className="space-y-2">
        {visibleNotifications.length === 0 ? (
          <li className="text-gray-500 text-sm italic">No notifications found.</li>
        ) : (
          visibleNotifications.map((n) => (
            <li
              key={n._id?.toString() || `${n.text}-${n.time}`}
              className="text-sm bg-gray-50 rounded p-3 shadow-sm flex justify-between items-start hover:bg-gray-100 transition-all"
            >
              <div className="w-full">
                <span className="block text-gray-800 break-words">
                  {n.text}{' '}
                  {n.eventId && (
                    <a
                      href={`/events/${n.eventId}`}
                      className="text-blue-500 underline ml-1 hover:text-blue-700"
                    >
                      [View Event]
                    </a>
                  )}
                  <span className="text-gray-500 text-xs ml-1">
                    ({new Date(n.time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })})
                  </span>
                </span>
                {!n.readBy?.includes('me') && (
                  <button
                    onClick={() => markAsRead(n._id)}
                    className="text-xs text-blue-600 underline mt-1 hover:text-blue-800"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default NotificationFeed;
