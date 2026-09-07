// src/components/Calendar/CalendarView.jsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit3,
  Download,
  Users,
  Globe,
  User,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  X,
  Sparkles,
  Layers,
  CalendarDays,
  Video,
  Play,
  Copy,
  Check,
  PhoneCall,
  Link as LinkIcon
} from 'lucide-react';
import NotificationEvent from '../Notifications/NotificationEvent';
import './Calendar.css';

// Date normalization helper to avoid timezone offset shifts (e.g. UTC vs IST)
const getNormalizedDateKey = (dateInput) => {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    // If "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss.sssZ"
    const datePart = dateInput.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day).toDateString();
    }
  }
  return new Date(dateInput).toDateString();
};

// Helper: Check if event has ended / passed
const isEventPassed = (ev) => {
  if (!ev?.date) return false;
  const datePart = ev.date.split('T')[0];
  const timePart = ev.time || '23:59';
  const [h, m] = timePart.split(':');
  const evEnd = new Date(datePart);
  evEnd.setHours(parseInt(h, 10) || 0, (parseInt(m, 10) || 0) + 30, 0, 0); // Event time + 30 min duration
  return evEnd.getTime() < Date.now();
};

// Helper: Calculate default minimum time for a date
const getMinTimeForDate = (dateStr) => {
  const todayStr = new Date().toISOString().split('T')[0];
  if (dateStr === todayStr) {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return '10:00';
};

const CalendarView = () => {
  const navigate = useNavigate();

  // Current view date state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'agenda'
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'mine'
  const [searchQuery, setSearchQuery] = useState('');

  // Events state
  const [rawEvents, setRawEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState({
    email: '',
    name: '',
    role: 'single',
    id: '',
    teamId: null
  });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalTime, setModalTime] = useState('10:00');
  const [modalDate, setModalDate] = useState(new Date().toISOString().split('T')[0]);
  const [modalDescription, setModalDescription] = useState('');
  const [modalIsMeeting, setModalIsMeeting] = useState(false);
  const [modalRoomId, setModalRoomId] = useState('');
  const [modalCallType, setModalCallType] = useState('video');
  const [modalTargetType, setModalTargetType] = useState('all'); // 'all' | 'specific'
  const [modalSelectedUserIds, setModalSelectedUserIds] = useState([]);
  const [teammates, setTeammates] = useState([]);
  const [loadingTeammates, setLoadingTeammates] = useState(false);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [copiedEventId, setCopiedEventId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch Current User
  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('auth-token');
    if (!token) return;

    axios
      .post(
        `${import.meta.env.VITE_BACKEND_URL}/api/auth/getuser`,
        {},
        { headers: { 'auth-token': token } }
      )
      .then((res) => {
        const userData = res.data.user || res.data;
        setUserInfo({
          email: userData.email,
          name: userData.name || userData.email,
          role: userData.role || 'single',
          teamId: userData.teamId,
          globalId: userData.globalId,
          id: userData._id || userData.id,
        });
      })
      .catch((err) => {
        console.error('Failed to fetch user in calendar:', err);
      });
  }, []);

  // Fetch Events from Backend
  const fetchEvents = useCallback(async () => {
    const token = localStorage.getItem('token') || localStorage.getItem('auth-token');
    if (!token || !userInfo.id) return;

    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/events`, {
        headers: { 'auth-token': token },
      });

      const eventsList = Array.isArray(res.data) ? res.data : [];
      setRawEvents(eventsList);

      // Trigger reminder check
      const grouped = {};
      eventsList.forEach((ev) => {
        const key = getNormalizedDateKey(ev.date);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(ev);
      });
      if (userInfo.email) {
        NotificationEvent(grouped, userInfo.email);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [userInfo.id, userInfo.email]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Fetch Teammates for specific member invitations
  useEffect(() => {
    if (!isModalOpen || !userInfo.id) return;
    const fetchTeammates = async () => {
      setLoadingTeammates(true);
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('auth-token');
        if (!token) return;
        let endpoint = '';
        if (userInfo.role === 'team' && userInfo.teamId) {
          endpoint = `${import.meta.env.VITE_BACKEND_URL}/api/personal-chat/teammates`;
        } else {
          endpoint = `${import.meta.env.VITE_BACKEND_URL}/api/personal-chat/global-users`;
        }
        const res = await axios.get(endpoint, { headers: { 'auth-token': token } });
        const list = Array.isArray(res.data) ? res.data : [];
        const otherMembers = list.filter(m => (m._id || m.id) !== userInfo.id);
        setTeammates(otherMembers);
      } catch (err) {
        console.error('Error fetching teammates in calendar:', err);
      } finally {
        setLoadingTeammates(false);
      }
    };
    fetchTeammates();
  }, [isModalOpen, userInfo.role, userInfo.teamId, userInfo.id]);

  // Socket.io Real-time Event Listeners with Deduplication and Scoping
  useEffect(() => {
    const socket = io(`${import.meta.env.VITE_BACKEND_URL}`);

    socket.on('newEvent', (newEvent) => {
      // Check relevance based on user role & teamId to avoid cross-workspace leakage
      if (userInfo.role === 'team') {
        const eventTeamId = newEvent.teamId?._id || newEvent.teamId;
        if (newEvent.scope !== 'team' || String(eventTeamId) !== String(userInfo.teamId)) {
          return; // Ignore events from other teams
        }
        // Specific invite filtering
        if (newEvent.targetType === 'specific') {
          const creatorId = String(newEvent.user?._id || newEvent.user);
          const isTargeted = (newEvent.targetUserIds || []).some(id => String(id?._id || id) === String(userInfo.id));
          if (creatorId !== String(userInfo.id) && !isTargeted) {
            return;
          }
        }
      } else if (userInfo.role === 'single') {
        const eventUserId = newEvent.user?._id || newEvent.user;
        if (newEvent.scope !== 'single' || String(eventUserId) !== String(userInfo.id)) {
          return;
        }
      } else if (userInfo.role === 'global') {
        if (newEvent.scope !== 'global') {
          return;
        }
      }

      // Add to state with strict deduplication
      setRawEvents((prev) => {
        if (prev.some((e) => String(e._id) === String(newEvent._id))) return prev;
        return [...prev, newEvent];
      });

      // 📢 Real-time Toaster Notification for newly scheduled event!
      const creatorName = newEvent.user?.name || 'A team member';
      const eventDateStr = new Date(newEvent.date).toLocaleDateString('default', {
        month: 'short',
        day: 'numeric',
      });
      toast.success(
        `📅 New Event Scheduled: "${newEvent.title}" on ${eventDateStr} at ${newEvent.time || '10:00'} (by ${creatorName})`,
        {
          position: "bottom-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true
        }
      );
    });

    socket.on('updatedEvent', (updated) => {
      setRawEvents((prev) =>
        prev.map((e) => (String(e._id) === String(updated._id) ? updated : e))
      );
      toast.info(`📅 Event Updated: "${updated.title}"`, { position: "bottom-right" });
    });

    socket.on('deletedEvent', ({ id }) => {
      setRawEvents((prev) => prev.filter((e) => String(e._id) !== String(id)));
    });

    return () => socket.disconnect();
  }, [userInfo.role, userInfo.teamId, userInfo.id]);

  // Filtered Events based on search query & activeFilter
  const filteredEvents = useMemo(() => {
    return rawEvents.filter((ev) => {
      // If user is in team role and filter is 'mine', show only events created by user
      let matchesScope = true;
      if (activeFilter === 'mine') {
        const evUserId = ev.user?._id || ev.user;
        matchesScope = String(evUserId) === String(userInfo.id);
      }

      const matchesSearch =
        !searchQuery ||
        ev.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.description?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesScope && matchesSearch;
    });
  }, [rawEvents, activeFilter, searchQuery, userInfo.id]);

  // Events grouped by normalized date key
  const eventsByDate = useMemo(() => {
    const map = new Map();
    filteredEvents.forEach((ev) => {
      const dateKey = getNormalizedDateKey(ev.date);
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey).push(ev);
    });
    return map;
  }, [filteredEvents]);

  // Selected date events
  const selectedDateEvents = useMemo(() => {
    const selectedKey = selectedDate.toDateString();
    return eventsByDate.get(selectedKey) || [];
  }, [eventsByDate, selectedDate]);

  // Month navigation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const jumpToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Open Create Modal
  const handleOpenCreateModal = (presetDate = selectedDate) => {
    setEditingEventId(null);
    setModalTitle('');
    
    // Ensure presetDate is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = (presetDate && presetDate >= today) ? presetDate : new Date();
    
    // Format YYYY-MM-DD locally without UTC day shift
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const d = String(targetDate.getDate()).padStart(2, '0');
    const targetDateStr = `${y}-${m}-${d}`;
    setModalDate(targetDateStr);
    setModalTime(getMinTimeForDate(targetDateStr));
    
    setModalDescription('');
    setModalIsMeeting(false);
    setModalRoomId(`meet-${Math.random().toString(36).substr(2, 6)}`);
    setModalCallType('video');
    setModalTargetType('all');
    setModalSelectedUserIds([]);
    setMemberSearchTerm('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (event) => {
    if (isEventPassed(event) && userInfo.role !== 'superadmin') {
      toast.warning('This event has already ended and cannot be edited.');
      return;
    }

    setEditingEventId(event._id);
    setModalTitle(event.title);
    setModalTime(event.time || '10:00');
    
    if (event.date) {
      const datePart = event.date.split('T')[0];
      setModalDate(datePart);
    }
    
    setModalDescription(event.description || '');
    setModalIsMeeting(Boolean(event.isMeeting));
    setModalRoomId(event.meetingRoomId || `meet-${Math.random().toString(36).substr(2, 6)}`);
    setModalCallType(event.callType || 'video');
    setModalTargetType(event.targetType || 'all');
    const targetIds = Array.isArray(event.targetUserIds)
      ? event.targetUserIds.map(u => (typeof u === 'object' ? (u._id || u.id) : u))
      : [];
    setModalSelectedUserIds(targetIds);
    setMemberSearchTerm('');
    setIsModalOpen(true);
  };

  // 1-Click Join Video Call
  const handleJoinMeetingCall = (ev) => {
    if (isEventPassed(ev)) {
      toast.info('This scheduled meeting has already ended.');
      return;
    }
    const room = ev.meetingRoomId || ev.roomId;
    if (!room) {
      toast.error('No meeting room ID attached to this event');
      return;
    }
    navigate(`/dashboard/tools/video?room=${encodeURIComponent(room)}&type=${ev.callType || 'video'}&autoJoin=true`);
  };

  // 1-Click Copy Meeting Link
  const handleCopyMeetingLink = (ev) => {
    const room = ev.meetingRoomId || ev.roomId;
    if (!room) return;
    const link = `${window.location.origin}/dashboard/tools/video?room=${encodeURIComponent(room)}&autoJoin=true`;
    navigator.clipboard.writeText(link);
    setCopiedEventId(ev._id);
    toast.success('Meeting link copied to clipboard!');
    setTimeout(() => setCopiedEventId(''), 2500);
  };

  // Save Event (Create or Update)
  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!modalTitle.trim()) {
      toast.warning('Event title is required');
      return;
    }

    if (!modalDate) {
      toast.warning('Event date is required');
      return;
    }

    // Past date check
    const todayStr = new Date().toISOString().split('T')[0];
    if (modalDate < todayStr) {
      toast.error('Past dates are not allowed. Please choose today or a future date.');
      return;
    }

    // Past time check for current date
    if (modalDate === todayStr) {
      const now = new Date();
      const [h, m] = modalTime.split(':');
      const chosen = new Date();
      chosen.setHours(parseInt(h, 10) || 0, parseInt(m, 10) || 0, 0, 0);
      if (chosen.getTime() < now.getTime() - 60 * 1000) {
        toast.error('Past time cannot be selected for today. Please choose a current or upcoming time.');
        return;
      }
    }

    if (userInfo.role !== 'single' && modalTargetType === 'specific' && modalSelectedUserIds.length === 0) {
      toast.error('Please select at least one specific member to invite');
      return;
    }

    const token = localStorage.getItem('token') || localStorage.getItem('auth-token');
    if (!token) {
      toast.error('You must be logged in');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: modalTitle,
        date: modalDate,
        time: modalTime,
        description: modalDescription,
        isMeeting: modalIsMeeting,
        meetingRoomId: modalRoomId,
        callType: modalCallType,
        targetType: modalTargetType,
        targetUserIds: modalTargetType === 'specific' ? modalSelectedUserIds : []
      };

      if (editingEventId) {
        // Update Event
        const res = await axios.put(
          `${import.meta.env.VITE_BACKEND_URL}/events/${editingEventId}`,
          payload,
          { headers: { 'auth-token': token } }
        );

        setRawEvents((prev) =>
          prev.map((item) => (item._id === editingEventId ? res.data : item))
        );
        toast.success('Event updated successfully');
      } else {
        // Create Event
        const res = await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/events`,
          payload,
          { headers: { 'auth-token': token } }
        );

        // Deduplicated state update
        setRawEvents((prev) => {
          if (prev.some((e) => String(e._id) === String(res.data._id))) return prev;
          return [...prev, res.data];
        });

        toast.success(
          modalIsMeeting
            ? `📅 Meeting Event "${modalTitle}" scheduled with Video Room (${modalRoomId})!`
            : `Event "${modalTitle}" created successfully`
        );
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving event:', err);
      toast.error(err.response?.data?.error || 'Failed to save event');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Event
  const handleDeleteEvent = async (eventId) => {
    const targetEv = rawEvents.find(e => String(e._id) === String(eventId));
    if (targetEv && isEventPassed(targetEv) && userInfo.role !== 'superadmin') {
      toast.warning('Past / completed events cannot be deleted.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this event?')) return;
    const token = localStorage.getItem('token') || localStorage.getItem('auth-token');
    if (!token) return;

    try {
      await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/events/${eventId}`, {
        headers: { 'auth-token': token },
      });
      setRawEvents((prev) => prev.filter((e) => e._id !== eventId));
      toast.success('Event deleted');
      if (editingEventId === eventId) setIsModalOpen(false);
    } catch (err) {
      console.error('Error deleting event:', err);
      toast.error(err.response?.data?.error || 'Failed to delete event');
    }
  };

  // Export Events to iCalendar (.ics) format
  const handleExportICS = () => {
    if (filteredEvents.length === 0) {
      toast.info('No events to export');
      return;
    }

    let icsData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Collaborative Suite//Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    filteredEvents.forEach((ev) => {
      const evDate = new Date(ev.date);
      const timeParts = (ev.time || '10:00').split(':');
      evDate.setHours(parseInt(timeParts[0], 10) || 10, parseInt(timeParts[1], 10) || 0);

      const yearStr = evDate.getUTCFullYear();
      const monthStr = (evDate.getUTCMonth() + 1).toString().padStart(2, '0');
      const dayStr = evDate.getUTCDate().toString().padStart(2, '0');
      const hourStr = evDate.getUTCHours().toString().padStart(2, '0');
      const minStr = evDate.getUTCMinutes().toString().padStart(2, '0');

      const dtStart = `${yearStr}${monthStr}${dayStr}T${hourStr}${minStr}00Z`;

      icsData.push('BEGIN:VEVENT');
      icsData.push(`UID:${ev._id || Date.now()}@collaborative.suite`);
      icsData.push(`DTSTAMP:${dtStart}`);
      icsData.push(`DTSTART:${dtStart}`);
      icsData.push(`SUMMARY:${ev.title}`);
      icsData.push(`DESCRIPTION:${ev.description || ''}`);
      icsData.push(`CATEGORIES:${ev.scope?.toUpperCase() || 'TEAM'}`);
      icsData.push('STATUS:CONFIRMED');
      icsData.push('END:VEVENT');
    });

    icsData.push('END:VCALENDAR');

    const blob = new Blob([icsData.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `team-calendar-${year}-${month + 1}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Calendar exported (.ics file)');
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 lg:p-8 text-slate-100 flex flex-col gap-6 shadow-sm">
      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        {/* Left: View Switcher & Month Navigation */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
            <button
              onClick={prevMonth}
              className="p-2 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm sm:text-base font-bold text-white min-w-[130px] text-center">
              {monthName} {year}
            </span>
            <button
              onClick={nextMonth}
              className="p-2 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={jumpToToday}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-blue-400 border border-slate-700 transition-colors"
          >
            Today
          </button>

          {/* View Mode Switcher */}
          <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === 'agenda'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Agenda
            </button>
          </div>
        </div>

        {/* Right: Search, Export & Add Event */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events..."
              className="w-full sm:w-44 lg:w-56 pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Export iCal */}
          <button
            onClick={handleExportICS}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
            title="Download .ics for Google Calendar or Outlook"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Export iCal</span>
          </button>

          {/* Create Event Button */}
          <button
            onClick={() => handleOpenCreateModal()}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Event</span>
          </button>
        </div>
      </div>

      {/* ── ROLE-SPECIFIC CLEAN FILTER BAR (No Personal/Global Clutter for Teams) ── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1">
          <Filter className="w-3 h-3" /> View:
        </span>

        {userInfo.role === 'team' ? (
          <>
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors ${
                activeFilter === 'all'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>All Team Events ({rawEvents.length})</span>
            </button>

            <button
              onClick={() => setActiveFilter('mine')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors ${
                activeFilter === 'mine'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Created By Me</span>
            </button>
          </>
        ) : userInfo.role === 'single' ? (
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-blue-400" />
            <span>Personal Workspace Calendar ({rawEvents.length})</span>
          </span>
        ) : (
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>Global Community Calendar ({rawEvents.length})</span>
          </span>
        )}
      </div>

      {/* Main Calendar View Body */}
      {viewMode === 'month' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Month Calendar Grid (2 cols) */}
          <div className="lg:col-span-2 bg-slate-950 rounded-xl p-4 sm:p-5 border border-slate-800 shadow-sm">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Calendar Days Cells */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {/* Empty leading days */}
              {Array.from({ length: firstDayIndex }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="h-16 sm:h-20 md:h-24 rounded-lg bg-slate-900/30 border border-transparent"
                ></div>
              ))}

              {/* Month Days */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const cellDate = new Date(year, month, dayNum);
                const cellDateString = cellDate.toDateString();
                const isSelected = selectedDate.toDateString() === cellDateString;
                const isToday = new Date().toDateString() === cellDateString;
                const dayEvents = eventsByDate.get(cellDateString) || [];

                return (
                  <div
                    key={`day-${dayNum}`}
                    onClick={() => setSelectedDate(cellDate)}
                    className={`h-16 sm:h-20 md:h-24 p-1.5 sm:p-2 rounded-lg border flex flex-col justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-slate-800 border-blue-500 shadow-sm ring-1 ring-blue-500'
                        : isToday
                        ? 'bg-slate-900 border-blue-500/50'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${
                          isToday
                            ? 'bg-blue-600 text-white font-black'
                            : isSelected
                            ? 'text-blue-400 font-extrabold'
                            : 'text-slate-300'
                        }`}
                      >
                        {dayNum}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] font-mono px-1 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/50">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Event indicators */}
                    <div className="flex flex-col gap-1 overflow-hidden">
                      {dayEvents.slice(0, 2).map((ev) => (
                        <div
                          key={ev._id}
                          className="truncate text-[10px] px-1 py-0.5 rounded font-medium bg-slate-800 border border-slate-700 text-slate-200"
                        >
                          {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="text-[9px] text-slate-400 pl-0.5">
                          +{dayEvents.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Date Events Sidebar Panel (1 col) */}
          <div className="bg-slate-950 rounded-xl p-4 sm:p-5 border border-slate-800 shadow-sm flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {selectedDate.toLocaleDateString('default', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedDateEvents.length} scheduled event(s)
                </p>
              </div>
              <button
                onClick={() => handleOpenCreateModal(selectedDate)}
                className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition-colors"
                title="Add event on this date"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Event List for selected day */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 max-h-[420px]">
              {selectedDateEvents.length === 0 ? (
                <div className="text-center py-12 text-slate-500 flex flex-col items-center justify-center">
                  <CalendarIcon className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-xs font-medium">No events for this date</p>
                  <button
                    onClick={() => handleOpenCreateModal(selectedDate)}
                    className="mt-3 text-xs text-blue-400 hover:text-blue-300 font-semibold"
                  >
                    + Schedule an event
                  </button>
                </div>
              ) : (
                selectedDateEvents.map((ev) => {
                  const passed = isEventPassed(ev);
                  return (
                  <div
                    key={ev._id}
                    className={`p-3 rounded-lg bg-slate-900 border transition-colors shadow-sm flex flex-col gap-2 ${
                      passed ? 'border-slate-800/60 opacity-80' : 'border-slate-800 hover:border-blue-500/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-blue-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" /> {ev.time || '10:00'}
                        </span>
                        {passed && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-bold">
                            ⌛ Ended
                          </span>
                        )}
                        {ev.user?.name && (
                          <span className="text-[11px] text-slate-400">by {ev.user.name}</span>
                        )}
                        {ev.targetType === 'specific' ? (
                          <span className="px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-800 text-purple-300 text-[10px] font-bold flex items-center gap-1">
                            <Users className="w-3 h-3 text-purple-400" /> Specific ({ev.targetUserIds?.length || 0})
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-medium flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-400" /> All Team
                          </span>
                        )}
                        {(ev.isMeeting || ev.meetingRoomId) && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-800 text-blue-400 text-[10px] font-bold flex items-center gap-1">
                            <Video className="w-3 h-3 text-blue-400" /> Video Room
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            if (passed && userInfo.role !== 'superadmin') {
                              toast.info('This event has already ended and cannot be edited.');
                              return;
                            }
                            handleOpenEditModal(ev);
                          }}
                          disabled={passed && userInfo.role !== 'superadmin'}
                          className={`p-1 rounded transition-colors ${
                            passed && userInfo.role !== 'superadmin'
                              ? 'text-slate-600 cursor-not-allowed opacity-40'
                              : 'text-slate-400 hover:text-blue-400 hover:bg-slate-800'
                          }`}
                          title={passed ? 'Event ended (Cannot edit)' : 'Edit'}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (passed && userInfo.role !== 'superadmin') {
                              toast.info('Past / completed events cannot be deleted.');
                              return;
                            }
                            handleDeleteEvent(ev._id);
                          }}
                          disabled={passed && userInfo.role !== 'superadmin'}
                          className={`p-1 rounded transition-colors ${
                            passed && userInfo.role !== 'superadmin'
                              ? 'text-slate-600 cursor-not-allowed opacity-40'
                              : 'text-slate-400 hover:text-red-400 hover:bg-slate-800'
                          }`}
                          title={passed ? 'Event ended (Cannot delete)' : 'Delete'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-white">{ev.title}</h4>
                    {ev.description && (
                      <p className="text-xs text-slate-400 line-clamp-2">{ev.description}</p>
                    )}

                    {/* 1-Click Video Call Buttons on Event Card */}
                    {(ev.isMeeting || ev.meetingRoomId) && (
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 mt-1">
                        {passed ? (
                          <span className="px-2.5 py-1 rounded-md bg-slate-800/90 text-slate-500 text-xs font-semibold border border-slate-700/60">
                            Meeting Ended
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleJoinMeetingCall(ev)}
                              className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                            >
                              <Play className="w-3 h-3 fill-current" /> Join Video Call
                            </button>
                            <button
                              onClick={() => handleCopyMeetingLink(ev)}
                              className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1 transition-colors"
                              title="Copy Video Room Link"
                            >
                              {copiedEventId === ev._id ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span className="text-[10px]">Copy Link</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Agenda View */
        <div className="bg-slate-950 rounded-xl p-4 sm:p-6 border border-slate-800 shadow-sm">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-400" />
            Upcoming Events Agenda
          </h3>

          {filteredEvents.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No upcoming events match your filter</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents
                .slice()
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .map((ev) => {
                  const evDate = new Date(ev.date);
                  const passed = isEventPassed(ev);
                  return (
                    <div
                      key={ev._id}
                      className={`p-4 rounded-lg bg-slate-900 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
                        passed ? 'border-slate-800/60 opacity-80' : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 flex flex-col items-center justify-center font-bold ${
                          passed ? 'text-slate-500' : 'text-blue-400'
                        }`}>
                          <span className="text-xs uppercase">
                            {evDate.toLocaleString('default', { month: 'short' })}
                          </span>
                          <span className="text-base">{evDate.getDate()}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3 text-blue-400" /> {ev.time || '10:00'}
                            </span>
                            {passed && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-bold">
                                ⌛ Ended
                              </span>
                            )}
                            {ev.user?.name && (
                              <span className="text-xs text-slate-400">· {ev.user.name}</span>
                            )}
                            {ev.targetType === 'specific' ? (
                              <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800 text-purple-300 text-[10px] font-bold flex items-center gap-1">
                                <Users className="w-3 h-3 text-purple-400" /> Specific ({ev.targetUserIds?.length || 0})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-medium flex items-center gap-1">
                                <Users className="w-3 h-3 text-slate-400" /> All Team
                              </span>
                            )}
                            {(ev.isMeeting || ev.meetingRoomId) && (
                              <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-800 text-blue-400 text-[10px] font-bold flex items-center gap-1">
                                <Video className="w-3 h-3 text-blue-400" /> Video Room: {ev.meetingRoomId}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-white">{ev.title}</h4>
                          {ev.description && (
                            <p className="text-xs text-slate-400 mt-0.5">{ev.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                        {(ev.isMeeting || ev.meetingRoomId) && (
                          passed ? (
                            <span className="px-3 py-1.5 rounded-md bg-slate-800/80 text-xs font-semibold text-slate-500 border border-slate-700/60">
                              Ended
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleJoinMeetingCall(ev)}
                                className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white flex items-center gap-1.5 shadow-sm transition-colors"
                              >
                                <Play className="w-3 h-3 fill-current" /> Join Video
                              </button>
                              <button
                                onClick={() => handleCopyMeetingLink(ev)}
                                className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700 flex items-center gap-1 transition-colors"
                                title="Copy Link"
                              >
                                {copiedEventId === ev._id ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </>
                          )
                        )}
                        <button
                          onClick={() => {
                            if (passed && userInfo.role !== 'superadmin') {
                              toast.info('This event has already passed and cannot be edited.');
                              return;
                            }
                            handleOpenEditModal(ev);
                          }}
                          disabled={passed && userInfo.role !== 'superadmin'}
                          className={`px-3 py-1.5 rounded-md border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                            passed && userInfo.role !== 'superadmin'
                              ? 'bg-slate-900 text-slate-600 border-slate-800/50 cursor-not-allowed opacity-40'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                          }`}
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => {
                            if (passed && userInfo.role !== 'superadmin') {
                              toast.info('Past / completed events cannot be deleted.');
                              return;
                            }
                            handleDeleteEvent(ev._id);
                          }}
                          disabled={passed && userInfo.role !== 'superadmin'}
                          className={`px-3 py-1.5 rounded-md border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                            passed && userInfo.role !== 'superadmin'
                              ? 'bg-slate-900 text-slate-600 border-slate-800/50 cursor-not-allowed opacity-40'
                              : 'bg-slate-800 hover:bg-red-950/40 text-red-400 border-slate-700'
                          }`}
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT EVENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {editingEventId ? 'Edit Event' : 'Schedule New Event'}
                </h3>
                <p className="text-xs text-slate-400">
                  {userInfo.role === 'team' ? (
                    <span className="text-blue-400 font-semibold">
                      Team Workspace Event (Shared with all team members)
                    </span>
                  ) : (
                    <span>Personal Event</span>
                  )}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  placeholder="e.g. Sprint Planning / Team Sync"
                  required
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={modalDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      const todayStr = new Date().toISOString().split('T')[0];
                      if (val && val < todayStr) {
                        toast.warning('Past dates cannot be selected. Resetting to today.');
                        setModalDate(todayStr);
                        setModalTime(getMinTimeForDate(todayStr));
                        return;
                      }
                      setModalDate(val);
                      if (val === todayStr) {
                        const now = new Date();
                        const [h, m] = modalTime.split(':');
                        const chosen = new Date();
                        chosen.setHours(parseInt(h, 10) || 0, parseInt(m, 10) || 0, 0, 0);
                        if (chosen.getTime() < now.getTime() - 60 * 1000) {
                          setModalTime(getMinTimeForDate(todayStr));
                        }
                      }
                    }}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500 text-sm cursor-pointer [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={modalTime}
                    onChange={(e) => {
                      const val = e.target.value;
                      const todayStr = new Date().toISOString().split('T')[0];
                      if (modalDate === todayStr && val) {
                        const now = new Date();
                        const [h, m] = val.split(':');
                        const chosen = new Date();
                        chosen.setHours(parseInt(h, 10) || 0, parseInt(m, 10) || 0, 0, 0);
                        if (chosen.getTime() < now.getTime() - 60 * 1000) {
                          toast.warning('Cannot select a past time for today. Resetting to upcoming time.');
                          setModalTime(getMinTimeForDate(todayStr));
                          return;
                        }
                      }
                      setModalTime(val);
                    }}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500 text-sm [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* ── AUTO VIDEO MEETING TOGGLE & OPTIONS ── */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-blue-400" />
                    <div>
                      <span className="text-xs font-bold text-white block leading-tight">
                        Add Video Meeting Link
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Auto-generate room ID & 1-click video call button
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={modalIsMeeting}
                    onChange={(e) => setModalIsMeeting(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded bg-slate-900 border-slate-700 cursor-pointer accent-blue-600"
                  />
                </div>

                {modalIsMeeting && (
                  <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Call Type
                      </label>
                      <select
                        value={modalCallType}
                        onChange={(e) => setModalCallType(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                      >
                        <option value="video">📹 Video Call</option>
                        <option value="audio">📞 Audio Conference</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Room ID (Unique)
                      </label>
                      <input
                        type="text"
                        value={modalRoomId}
                        onChange={(e) => setModalRoomId(e.target.value)}
                        placeholder="e.g. meet-x8k2p9"
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ── TARGET AUDIENCE / INVITATION SCOPE ── */}
              {userInfo.role !== 'single' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                    <span>Audience / Invitees</span>
                    <span className="text-[11px] text-blue-400 font-normal">Who can see & join this event</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setModalTargetType('all')}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                        modalTargetType === 'all'
                          ? 'bg-blue-600/20 border-blue-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${modalTargetType === 'all' ? 'border-blue-400 bg-blue-600' : 'border-slate-600'}`}>
                        {modalTargetType === 'all' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">@all (Entire Team)</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Shared with all team members</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalTargetType('specific')}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                        modalTargetType === 'specific'
                          ? 'bg-blue-600/20 border-blue-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${modalTargetType === 'specific' ? 'border-blue-400 bg-blue-600' : 'border-slate-600'}`}>
                        {modalTargetType === 'specific' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Specific Members</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Select 1 or more specific members</div>
                      </div>
                    </button>
                  </div>

                  {modalTargetType === 'specific' && (
                    <div className="space-y-2 pt-2 border-t border-slate-800/80 animate-fade-in">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input
                          type="text"
                          value={memberSearchTerm}
                          onChange={(e) => setMemberSearchTerm(e.target.value)}
                          placeholder="Search teammates by name or email..."
                          className="w-full bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs pl-8 pr-3 py-2 rounded-xl focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="max-h-36 overflow-y-auto custom-scrollbar space-y-1 pr-1 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                        {loadingTeammates ? (
                          <div className="text-center py-3 text-xs text-slate-400">Loading teammates...</div>
                        ) : teammates.filter(m => (m.name || '').toLowerCase().includes(memberSearchTerm.toLowerCase()) || (m.email || '').toLowerCase().includes(memberSearchTerm.toLowerCase())).length === 0 ? (
                          <div className="text-center py-3 text-xs text-slate-500">No teammates found</div>
                        ) : (
                          teammates
                            .filter(m => (m.name || '').toLowerCase().includes(memberSearchTerm.toLowerCase()) || (m.email || '').toLowerCase().includes(memberSearchTerm.toLowerCase()))
                            .map((member) => {
                              const memberId = member._id || member.id;
                              const isSelected = modalSelectedUserIds.includes(memberId);
                              return (
                                <div
                                  key={memberId}
                                  onClick={() => {
                                    setModalSelectedUserIds(prev =>
                                      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
                                    );
                                  }}
                                  className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                                    isSelected
                                      ? 'bg-blue-950/50 border-blue-500/70 text-white'
                                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 text-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                      isSelected ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-700 bg-slate-800'
                                    }`}>
                                      {isSelected && <Check className="w-3 h-3" />}
                                    </div>
                                    <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                                      {member.name?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <span className="text-xs font-medium truncate">{member.name}</span>
                                    <span className="text-[10px] text-slate-500 truncate">({member.email})</span>
                                  </div>
                                </div>
                              );
                            })
                        )}
                      </div>
                      <div className="text-[11px] text-blue-400 font-medium pl-1">
                        {modalSelectedUserIds.length} member(s) selected
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Description / Agenda Notes
                </label>
                <textarea
                  rows="3"
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  placeholder="Add meeting agenda, discussion topics, links..."
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm custom-scrollbar"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingEventId ? 'Update Event' : 'Schedule Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;