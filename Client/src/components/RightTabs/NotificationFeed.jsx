import React, { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import { 
  Bell, 
  Calendar, 
  FileText, 
  Upload, 
  Users, 
  CheckCircle,
  Filter,
  X,
  MoreVertical,
  Trash2,
  BellOff,
  Eye,
  EyeOff,
  Settings
} from 'lucide-react';

const socket = io('http://localhost:3001');

const NotificationFeed = () => {
  const [notifications, setNotifications] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [visibleNotifications, setVisibleNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, unread: 0 });
  const [showFilters, setShowFilters] = useState(false);
  const [userInfo, setUserInfo] = useState({ role: 'single' });

  const token = localStorage.getItem('token');

  // Load user info
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/auth/getuser', {
          method: 'POST',
          headers: { 'auth-token': token }
        });
        if (response.ok) {
          const userData = await response.json();
          setUserInfo({
            ...userData,
            role: userData.role || 'single'
          });
        }
      } catch (err) {
        console.error('Failed to fetch user info:', err);
      }
    };

    if (token) fetchUserInfo();
  }, [token]);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.append('type', filterType);
      if (filterPriority !== 'all') params.append('priority', filterPriority);
      if (showUnreadOnly) params.append('unread', 'true');

      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`http://localhost:3001/notifications${query}`, {
        headers: {
          'auth-token': token,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err.message);
      toast.error('Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterPriority, showUnreadOnly, token]);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch('http://localhost:3001/notifications/stats', {
        headers: { 'auth-token': token }
      });
      
      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error('Failed to fetch notification stats:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
    fetchStats();
  }, [fetchNotifications, fetchStats]);

  useEffect(() => {
    const filtered = notifications.filter((n) => {
      if (filterType !== 'all' && n.type !== filterType) return false;
      if (filterPriority !== 'all' && n.priority !== filterPriority) return false;
      if (showUnreadOnly && n.isRead) return false;
      return true;
    });
    setVisibleNotifications(filtered);
  }, [filterType, filterPriority, showUnreadOnly, notifications]);

  useEffect(() => {
    const handleSocketNotification = (notification) => {
      setNotifications((prev) => {
        const exists = prev.find((n) => n._id === notification._id);
        if (exists) return prev;
        
        const updated = [notification, ...prev].slice(0, 100);
        return updated.sort((a, b) => new Date(b.time) - new Date(a.time));
      });
      
      // Show toast for new notifications
      if (notification.priority === 'high') {
        toast.error(notification.text);
      } else {
        toast.info(notification.text);
      }
      
      // Update stats
      fetchStats();
    };

    socket.on('notification', handleSocketNotification);

    return () => {
      socket.off('notification', handleSocketNotification);
    };
  }, [fetchStats]);

  const markAsRead = async (id) => {
    try {
      const response = await fetch(`http://localhost:3001/notifications/${id}/read`, {
        method: 'PATCH',
        headers: {
          'auth-token': token,
        },
      });

      if (!response.ok) throw new Error('Failed to mark as read');

      const updated = await response.json();
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      console.log('Marked as read:', updated);  
      
      fetchStats();
      toast.success('Marked as read');
    } catch (err) {
      console.error('Failed to mark as read:', err.message);
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('http://localhost:3001/notifications/mark-all-read', {
        method: 'PATCH',
        headers: { 'auth-token': token }
      });

      if (!response.ok) throw new Error('Failed to mark all as read');

      const result = await response.json();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      fetchStats();
      toast.success(`Marked ${result.modifiedCount} notifications as read`);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) return;
    
    try {
      const response = await fetch(`http://localhost:3001/notifications/${id}`, {
        method: 'DELETE',
        headers: { 'auth-token': token }
      });

      if (!response.ok) throw new Error('Failed to delete notification');

      setNotifications(prev => prev.filter(n => n._id !== id));
      fetchStats();
      toast.success('Notification deleted');
    } catch (err) {
      console.error('Failed to delete notification:', err);
      toast.error('Failed to delete notification');
    }
  };

  const getNotificationIcon = (type, priority) => {
    const iconProps = {
      size: 16,
      className: priority === 'high' ? 'text-red-500' : priority === 'medium' ? 'text-yellow-500' : 'text-blue-500'
    };

    switch (type) {
      case 'event':
        return <Calendar {...iconProps} />;
      case 'comment':
        return <FileText {...iconProps} />;
      case 'file':
        return <Upload {...iconProps} />;
      case 'attendee':
        return <Users {...iconProps} />;
      default:
        return <Bell {...iconProps} />;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Bell className="text-blue-500" />
            Notifications
          </h3>
          
          {stats.unread > 0 && (
            <span className="px-2 py-1 bg-red-500 text-white rounded-full text-xs font-medium">
              {stats.unread}
            </span>
          )}
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400'}`}
          >
            <Filter size={16} />
          </button>
          
          {stats.unread > 0 && (
            <button
              onClick={markAllAsRead}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
              title="Mark all as read"
            >
              <CheckCircle size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-4 mb-4 p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-gray-600">
        <div className="text-center">
          <div className="text-lg font-bold text-gray-800 dark:text-gray-200">{stats.total}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-red-600">{stats.unread}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Unread</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-green-600">{stats.read || (stats.total - stats.unread)}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Read</div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-4 mb-4 space-y-3 border border-gray-200 dark:border-gray-600">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="event">Events</option>
                <option value="comment">Notes</option>
                <option value="file">Files</option>
                <option value="attendee">Attendance</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                showUnreadOnly
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-500'
              }`}
            >
              {showUnreadOnly ? <Eye size={14} /> : <EyeOff size={14} />}
              Unread Only
            </button>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Loading notifications...</p>
          </div>
        ) : visibleNotifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="mx-auto text-gray-400 dark:text-gray-600 mb-2" size={48} />
            <p className="text-gray-500 dark:text-gray-400">
              {showUnreadOnly ? 'No unread notifications' : 'No notifications found'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleNotifications.map((n) => (
              <div
                key={n._id?.toString() || `${n.text}-${n.time}`}
                className={`group bg-white/80 dark:bg-slate-700/80 rounded-2xl p-4 border shadow-sm hover:shadow-md transition-all ${
                  n.isRead 
                    ? 'border-gray-200 dark:border-gray-600' 
                    : 'border-blue-300 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/10'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {getNotificationIcon(n.type, n.priority)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityBadge(n.priority)}`}>
                          {n.priority}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {n.type}
                        </span>
                      </div>
                      <p className="text-gray-800 dark:text-gray-200 text-sm break-words">
                        {n.text}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!n.isRead && (
                      <button
                        onClick={() => markAsRead(n._id)}
                        className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900 rounded text-blue-600 dark:text-blue-400 transition-colors"
                        title="Mark as read"
                      >
                        <Eye size={14} />
                      </button>
                    )}
                    
                    {(userInfo.role === 'global' || n.user?._id === userInfo.id) && (
                      <button
                        onClick={() => deleteNotification(n._id)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600 dark:text-red-400 transition-colors"
                        title="Delete notification"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {new Date(n.time).toLocaleString()}
                  </span>
                  
                  {n.eventId && (
                    <button className="text-blue-600 dark:text-blue-400 hover:underline">
                      View Event
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationFeed;