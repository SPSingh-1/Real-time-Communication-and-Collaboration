// NotificationEvent.js - Enhanced role-based notification system
class NotificationEventManager {
  constructor() {
    this.notificationQueue = new Map();
    this.activeNotifications = new Set();
    this.user = null;
    this.socketConnection = null;
    this.notificationSettings = {
      enabled: true,
      eventReminders: true,
      taskDeadlines: true,
      teamUpdates: true,
      soundEnabled: true,
      vibrationEnabled: true,
      reminderTimes: [5, 15, 30, 60] // minutes before event
    };
    
    this.init();
  }

  async init() {
    await this.requestPermission();
    this.loadSettings();
    this.setupServiceWorker();
  }

  // Request notification permission with enhanced UX
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('Notifications are blocked by user');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  // Load user-specific notification settings
  loadSettings() {
    try {
      const saved = localStorage.getItem('notificationSettings');
      if (saved) {
        this.notificationSettings = { ...this.notificationSettings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  }

  // Save notification settings
  saveSettings() {
    try {
      localStorage.setItem('notificationSettings', JSON.stringify(this.notificationSettings));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  }

  // Set user context for role-based notifications
  setUser(user) {
    this.user = user;
  }

  // Connect to socket for real-time notifications
  connectSocket(socket) {
    this.socketConnection = socket;
    
    // Listen for real-time notifications
    socket.on('notification', (notification) => {
      this.handleRealtimeNotification(notification);
    });

    socket.on('newEvent', (event) => {
      this.scheduleEventNotifications(event);
    });

    socket.on('updatedEvent', (event) => {
      this.updateEventNotifications(event);
    });

    socket.on('deletedEvent', (eventData) => {
      this.cancelEventNotifications(eventData.id);
    });
  }

  // Setup service worker for persistent notifications
  setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered:', registration);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }

  // Enhanced event notification scheduling with role awareness
  scheduleEventNotifications(groupedEvents, userEmail, userRole = 'single') {
    if (!this.notificationSettings.enabled || !this.notificationSettings.eventReminders) {
      return;
    }

    const now = new Date();
    const todayKey = now.toDateString();

    // Clear existing notifications for today
    this.clearNotificationsForDate(todayKey);

    if (!groupedEvents[todayKey]) return;

    groupedEvents[todayKey].forEach(event => {
      // Role-based filtering
      if (!this.canUserSeeEvent(event, userRole)) {
        return;
      }

      this.scheduleEventReminders(event, userEmail, userRole);
    });
  }

  // Check if user can see event based on role and scope
  canUserSeeEvent(event, userRole) {
    if (!this.user) return true; // Fallback for backward compatibility

    switch (userRole) {
      case 'single':
        return event.scope === 'single' && event.user === this.user.id;
      case 'team':
        return (event.scope === 'team' && event.teamId === this.user.teamId) ||
               (event.scope === 'single' && event.user === this.user.id);
      case 'global':
        return event.scope === 'global' ||
               (event.scope === 'single' && event.user === this.user.id);
      default:
        return true;
    }
  }

  // Schedule multiple reminders for a single event
  scheduleEventReminders(event, userEmail, userRole) {
    const [hour, minute] = event.time.split(':');
    const eventTime = new Date(event.date);
    eventTime.setHours(hour, minute, 0, 0);

    this.notificationSettings.reminderTimes.forEach(reminderMinutes => {
      const reminderTime = new Date(eventTime.getTime() - (reminderMinutes * 60 * 1000));
      const now = new Date();

      if (reminderTime > now) {
        const timeoutId = setTimeout(() => {
          this.showEventNotification(event, userEmail, userRole, reminderMinutes);
        }, reminderTime.getTime() - now.getTime());

        // Store timeout for later cancellation if needed
        const notificationKey = `${event._id}-${reminderMinutes}`;
        this.notificationQueue.set(notificationKey, timeoutId);
      }
    });
  }

  // Show enhanced event notification
  showEventNotification(event, userEmail, userRole, minutesBefore) {
    if (Notification.permission !== 'granted') return;

    const rolePrefix = this.getRolePrefix(userRole);
    const timeText = minutesBefore === 0 ? 'now' : `in ${minutesBefore} minutes`;
    
    const title = `${rolePrefix} Upcoming Event ${timeText}`;
    const body = `"${event.title}" at ${event.time}${event.description ? ` - ${event.description}` : ''}`;

    const notificationOptions = {
      body,
      icon: this.getEventIcon(event.type || 'event'),
      badge: '/icons/event-badge.png',
      tag: `event-${event._id}-${minutesBefore}`,
      requireInteraction: minutesBefore <= 5, // Require interaction for immediate reminders
      actions: [
        {
          action: 'view',
          title: 'View Event',
          icon: '/icons/view.png'
        },
        {
          action: 'snooze',
          title: 'Snooze 5min',
          icon: '/icons/snooze.png'
        }
      ],
      data: {
        eventId: event._id,
        type: 'event',
        userRole,
        reminderMinutes: minutesBefore
      }
    };

    // Add sound and vibration if enabled
    if (this.notificationSettings.soundEnabled) {
      notificationOptions.sound = '/sounds/notification.mp3';
    }

    if (this.notificationSettings.vibrationEnabled && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    const notification = new Notification(title, notificationOptions);
    this.activeNotifications.add(notification);

    // Handle notification clicks
    notification.onclick = () => {
      this.handleNotificationClick('view', event);
      notification.close();
    };

    // Auto-close after 10 seconds unless it requires interaction
    if (!notificationOptions.requireInteraction) {
      setTimeout(() => {
        notification.close();
        this.activeNotifications.delete(notification);
      }, 10000);
    }

    notification.onclose = () => {
      this.activeNotifications.delete(notification);
    };
  }

  // Handle real-time notifications from socket
  handleRealtimeNotification(notification) {
    if (!this.notificationSettings.enabled) return;

    // Filter based on user role and notification scope
    if (!this.shouldShowNotification(notification)) return;

    const title = this.getNotificationTitle(notification);
    const body = notification.text;

    const notificationOptions = {
      body,
      icon: this.getNotificationIcon(notification.type),
      badge: '/icons/notification-badge.png',
      tag: `notification-${notification._id}`,
      data: {
        notificationId: notification._id,
        type: notification.type,
        eventId: notification.eventId,
        taskId: notification.taskId
      }
    };

    const browserNotification = new Notification(title, notificationOptions);
    this.activeNotifications.add(browserNotification);

    browserNotification.onclick = () => {
      this.handleNotificationClick('view', notification);
      browserNotification.close();
    };

    setTimeout(() => {
      browserNotification.close();
      this.activeNotifications.delete(browserNotification);
    }, 8000);
  }

  // Determine if notification should be shown based on user role
  shouldShowNotification(notification) {
    if (!this.user) return true;

    const userRole = this.user.role || 'single';
    const notificationScope = notification.scope || 'single';

    switch (userRole) {
      case 'single':
        return notificationScope === 'single' && 
               (notification.user === this.user.id || 
                notification.sharedWith?.includes(this.user.id));
      case 'team':
        return (notificationScope === 'team' && notification.teamId === this.user.teamId) ||
               (notificationScope === 'single' && notification.user === this.user.id);
      case 'global':
        return notificationScope === 'global' || notification.user === this.user.id;
      default:
        return true;
    }
  }

  // Get appropriate title based on notification type and user role
  getNotificationTitle(notification) {
    const rolePrefix = this.getRolePrefix(this.user?.role);
    const typeMap = {
      event: `${rolePrefix} Event Update`,
      comment: `${rolePrefix} New Note`,
      file: `${rolePrefix} File Update`,
      task: `${rolePrefix} Task Update`,
      attendee: `${rolePrefix} Attendance Update`
    };

    return typeMap[notification.type] || `${rolePrefix} Notification`;
  }

  // Get role-specific prefix
  getRolePrefix(role) {
    switch (role) {
      case 'team': return '👥';
      case 'global': return '🌐';
      default: return '📱';
    }
  }

  // Get appropriate icon based on event/notification type
  getEventIcon(type) {
    const iconMap = {
      meeting: '/icons/meeting.png',
      deadline: '/icons/deadline.png',
      reminder: '/icons/reminder.png',
      event: '/icons/event.png'
    };
    return iconMap[type] || '/icons/default.png';
  }

  getNotificationIcon(type) {
    const iconMap = {
      event: '/icons/calendar.png',
      comment: '/icons/comment.png',
      file: '/icons/file.png',
      task: '/icons/task.png',
      attendee: '/icons/people.png'
    };
    return iconMap[type] || '/icons/notification.png';
  }

  // Handle notification actions
  handleNotificationClick(action, data) {
    switch (action) {
      case 'view':
        if (data.eventId) {
          window.focus();
          window.location.href = `/events/${data.eventId}`;
        } else if (data.taskId) {
          window.focus();
          window.location.href = `/tasks/${data.taskId}`;
        } else {
          window.focus();
        }
        break;
      case 'snooze':
        this.snoozeNotification(data, 5);
        break;
    }
  }

  // Snooze notification for specified minutes
  snoozeNotification(eventData, minutes) {
    setTimeout(() => {
      this.showEventNotification(eventData, this.user?.email, this.user?.role, 0);
    }, minutes * 60 * 1000);
  }

  // Update event notifications when event is modified
  updateEventNotifications(event) {
    this.cancelEventNotifications(event._id);
    if (this.user) {
      this.scheduleEventReminders(event, this.user.email, this.user.role);
    }
  }

  // Cancel all notifications for a specific event
  cancelEventNotifications(eventId) {
    this.notificationQueue.forEach((timeoutId, key) => {
      if (key.startsWith(eventId)) {
        clearTimeout(timeoutId);
        this.notificationQueue.delete(key);
      }
    });
  }

  // Clear notifications for a specific date
  clearNotificationsForDate(dateKey) {
    this.notificationQueue.forEach((timeoutId, key) => {
      if (key.includes(dateKey)) {
        clearTimeout(timeoutId);
        this.notificationQueue.delete(key);
      }
    });
  }

  // Update notification settings
  updateSettings(newSettings) {
    this.notificationSettings = { ...this.notificationSettings, ...newSettings };
    this.saveSettings();
  }

  // Get current settings
  getSettings() {
    return { ...this.notificationSettings };
  }

  // Clear all active notifications
  clearAllNotifications() {
    this.activeNotifications.forEach(notification => {
      notification.close();
    });
    this.activeNotifications.clear();

    this.notificationQueue.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.notificationQueue.clear();
  }

  // Cleanup method
  destroy() {
    this.clearAllNotifications();
    if (this.socketConnection) {
      this.socketConnection.off('notification');
      this.socketConnection.off('newEvent');
      this.socketConnection.off('updatedEvent');
      this.socketConnection.off('deletedEvent');
    }
  }
}

// Create singleton instance
const notificationManager = new NotificationEventManager();

// Backward compatibility - keep original function signature
const NotificationEvent = (groupedEvents, userEmail, userRole = 'single') => {
  notificationManager.scheduleEventNotifications(groupedEvents, userEmail, userRole);
};

// Export both the manager and the original function
export { NotificationEventManager, notificationManager };
export default NotificationEvent;