import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Calendar from 'react-calendar';
import axios from 'axios';
import { io } from 'socket.io-client';
import NotificationEvent from '../Notifications/NotificationEvent';
import { MdDeleteForever, MdEditCalendar, MdGroup, MdPublic, MdPerson } from 'react-icons/md';
import { IoMdClose } from 'react-icons/io';
import { FiCalendar, FiClock, FiUser, FiUsers } from 'react-icons/fi';
import 'react-toastify/dist/ReactToastify.css';
import 'react-calendar/dist/Calendar.css';
import RightPanel from '../RightPanel/RightPanal';

const CalendarView = () => {
  const [value, setValue] = useState(new Date());
  const [events, setEvents] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [inputEvent, setInputEvent] = useState('');
  const [inputDescription, setInputDescription] = useState('');
  const [inputTime, setInputTime] = useState('');
  const [editId, setEditId] = useState(null);
  const [userInfo, setUserInfo] = useState({ email: '', name: '', role: 'single' });
  const [eventScope, setEventScope] = useState('single');
  const [loading, setLoading] = useState(false);

  const isPastDate = (date) => {
    const today = new Date();
    return new Date(date.toDateString()) < new Date(today.toDateString());
  };

  const getScopeIcon = (scope) => {
    switch (scope) {
      case 'global': return <MdPublic className="text-purple-400" />;
      case 'team': return <MdGroup className="text-blue-400" />;
      default: return <MdPerson className="text-green-400" />;
    }
  };

  const getScopeLabel = (scope) => {
    switch (scope) {
      case 'global': return 'Global';
      case 'team': return 'Team';
      default: return 'Personal';
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    axios.post('http://localhost:3001/api/auth/getuser', {}, {
      headers: { 'auth-token': token },
    })
      .then((res) => {
        setUserInfo({
          email: res.data.email,
          name: res.data.name || res.data.email,
          role: res.data.role || 'single',
          teamId: res.data.teamId,
          globalId: res.data.globalId
        });
        setEventScope(res.data.role || 'single');
      })
      .catch((err) => {
        console.error('Failed to fetch user:', err);
        toast.error('Failed to load user information');
      });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !userInfo.email) return;
    
    setLoading(true);
    axios.get('http://localhost:3001/events', {
      headers: { 'auth-token': token },
    })
      .then((res) => {
        const grouped = {};
        res.data.forEach((ev) => {
          const key = new Date(ev.date).toDateString();
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(ev);
        });
        setEvents(grouped);
        NotificationEvent(grouped, userInfo.email);
      })
      .catch((err) => {
        console.error('Error fetching events:', err.message);
        toast.error('Failed to load events');
      })
      .finally(() => setLoading(false));
  }, [userInfo.email]);

  useEffect(() => {
    const socket = io('http://localhost:3001');
    
    socket.on('newEvent', (event) => {
      const key = new Date(event.date).toDateString();
      setEvents((prev) => ({
        ...prev,
        [key]: prev[key] ? [...prev[key], event] : [event],
      }));
      toast.success(`New event: ${event.title}`);
    });

    socket.on('updatedEvent', (event) => {
      const key = new Date(event.date).toDateString();
      setEvents((prev) => ({
        ...prev,
        [key]: prev[key] ? prev[key].map(ev => ev._id === event._id ? event : ev) : [event],
      }));
      toast.info(`Event updated: ${event.title}`);
    });

    socket.on('deletedEvent', ({ id, date }) => {
      setEvents((prev) => ({
        ...prev,
        [date]: prev[date] ? prev[date].filter(ev => ev._id !== id) : []
      }));
      toast.info('Event deleted');
    });

    return () => socket.disconnect();
  }, []);

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setInputEvent('');
    setInputTime('');
    setInputDescription('');
    setEditId(null);
    setEventScope(userInfo.role || 'single');
    setShowPrompt(true); 
  };

  const isPastTime = (date, time) => {
    const [hours, minutes] = time.split(':').map(Number);
    const selected = new Date(date);
    selected.setHours(hours);
    selected.setMinutes(minutes);
    return selected < new Date();
  };

  const addOrUpdateEvent = async () => {
    if (!inputEvent.trim() || !selectedDate || !inputTime) {
      toast.warn('Please fill in all required fields');
      return;
    }
    
    if (isPastTime(selectedDate, inputTime)) {
      toast.warn('Cannot select past time for event');
      return;
    }
    
    const token = localStorage.getItem('token');
    const eventData = {
      title: inputEvent,
      date: selectedDate.toISOString(),
      time: inputTime,
      description: inputDescription.trim(),
      scope: eventScope
    };

    setLoading(true);
    try {
      if (editId) {
        const updated = await axios.put(
          `http://localhost:3001/events/${editId}`,
          eventData,
          { headers: { 'auth-token': token } }
        );
        const key = selectedDate.toDateString();
        setEvents((prev) => ({
          ...prev,
          [key]: prev[key].map((ev) => (ev._id === editId ? updated.data : ev)),
        }));
        setEditId(null);
        toast.success('Event Updated Successfully');
      } else {
        await axios.post('http://localhost:3001/events', eventData, {
          headers: { 'auth-token': token },
        });
        toast.success('Event Created Successfully');
      }

      setInputEvent('');
      setInputTime('');
      setInputDescription('');
      setShowPrompt(false);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Something went wrong';
      toast.error(errorMessage);
      console.error('Error saving event:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3001/events/${id}`, {
        headers: { 'auth-token': token },
      });
      if (selectedDate) {
        const key = selectedDate.toDateString();
        setEvents((prev) => ({
          ...prev,
          [key]: prev[key].filter((ev) => ev._id !== id),
        }));
        toast.success('Event Deleted Successfully');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to delete event';
      console.error('Error deleting event:', err.message);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (event) => {
    setEditId(event._id);
    setInputEvent(event.title);
    setInputTime(event.time);
    setInputDescription(event.description || '');
    setEventScope(event.scope || 'single');
    setShowPrompt(true);
  };

  const tileContent = ({ date }) => {
    const key = date.toDateString();
    const dayEvents = events[key];
    if (!dayEvents || dayEvents.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {dayEvents.slice(0, 3).map((event, idx) => (
          <div 
            key={idx} 
            className={`w-2 h-2 rounded-full ${
              event.scope === 'global' ? 'bg-purple-400' :
              event.scope === 'team' ? 'bg-blue-400' : 'bg-green-400'
            }`}
            title={event.title}
          />
        ))}
        {dayEvents.length > 3 && (
          <span className="text-xs text-gray-600 font-bold">+{dayEvents.length - 3}</span>
        )}
      </div>
    );
  };

  const canManageEvent = (event) => {
    if (!event || !userInfo) return false;
    
    // Event creator can always manage
    if (event.user?._id === userInfo.id || event.user === userInfo.id) return true;
    
    // Global users can manage global events
    if (userInfo.role === 'global' && event.scope === 'global') return true;
    
    // Team users can manage team events in their team
    if (userInfo.role === 'team' && event.scope === 'team' && event.teamId === userInfo.teamId) return true;
    
    return false;
  };

  return (
    <div className="relative min-h-screen p-6 rounded-3xl overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-cyan-600/10"></div>
      <div className="absolute top-20 left-10 w-40 h-40 bg-gradient-to-r from-pink-500/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-44 h-44 bg-gradient-to-r from-blue-400/20 to-cyan-500/20 rounded-xl blur-3xl animate-pulse delay-1000"></div>

      {/* Header */}
      <div className="relative z-10 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Calendar Hub
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Welcome back, {userInfo.name} | {getScopeLabel(userInfo.role)} Access
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl px-4 py-2 border border-gray-200 dark:border-gray-700">
            {getScopeIcon(userInfo.role)}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {getScopeLabel(userInfo.role)} Mode
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col xl:flex-row gap-6">
        
        {/* Event List */}
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl shadow-2xl rounded-3xl p-6 w-full xl:w-80 h-[75vh] overflow-y-auto border border-gray-200/50 dark:border-gray-700/50">
          {selectedDate ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <FiCalendar className="text-blue-500" />
                  {isPastDate(selectedDate) ? 'Past Events' : 'Upcoming Events'}
                </h4>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedDate.toLocaleDateString()}
                </span>
              </div>
              
              <div className="space-y-3">
                {(events[selectedDate.toDateString()] || [])
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((ev) => (
                    <div 
                      key={ev._id} 
                      className="group bg-white/80 dark:bg-slate-700/80 rounded-2xl p-4 shadow-lg border border-gray-100 dark:border-gray-600 hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getScopeIcon(ev.scope)}
                          <h5 className="font-semibold text-gray-800 dark:text-gray-200 line-clamp-1">
                            {ev.title}
                          </h5>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                          {getScopeLabel(ev.scope)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <span className="flex items-center gap-1">
                          <FiClock size={14} />
                          {ev.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <FiUser size={14} />
                          {ev.user?.name || ev.user?.email || 'Unknown'}
                        </span>
                      </div>
                      
                      {ev.description && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-2">
                          {ev.description}
                        </p>
                      )}
                      
                      {!isPastDate(selectedDate) && canManageEvent(ev) && (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEdit(ev)} 
                            className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            disabled={loading}
                          >
                            <MdEditCalendar size={14} />
                            Edit
                          </button>
                          <button 
                            onClick={() => deleteEvent(ev._id)} 
                            className="flex items-center gap-1 px-3 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                            disabled={loading}
                          >
                            <MdDeleteForever size={14} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                
                {(!events[selectedDate?.toDateString()] || events[selectedDate.toDateString()].length === 0) && (
                  <div className="text-center py-8">
                    <FiCalendar className="mx-auto text-gray-400 dark:text-gray-600 mb-2" size={48} />
                    <p className="text-gray-500 dark:text-gray-400">No events for this date</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <FiCalendar className="mx-auto text-gray-400 dark:text-gray-600 mb-4" size={64} />
              <h4 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">Select a Date</h4>
              <p className="text-sm text-gray-500 dark:text-gray-500">Click on a date to view events</p>
            </div>
          )}
        </div>

        {/* Calendar */}
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl shadow-2xl rounded-3xl p-6 flex-1 border border-gray-200/50 dark:border-gray-700/50">
          <div className="calendar-container">
            <Calendar
              onClickDay={handleDateClick}
              value={value}
              onChange={setValue}
              tileContent={tileContent}
              className="modern-calendar w-full border-0 bg-transparent rounded-2xl"
              tileClassName={({ date }) => {
                const hasEvents = events[date.toDateString()]?.length > 0;
                return `calendar-tile ${hasEvents ? 'has-events' : ''}`;
              }}
            />
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-full xl:w-96 h-[75vh]">
          <RightPanel />
        </div>
      </div>

      {/* Event Modal */}
      {showPrompt && selectedDate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                {editId ? 'Edit Event' : 'Create Event'}
              </h2>
              <button
                onClick={() => setShowPrompt(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <IoMdClose size={24} className="text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={inputEvent}
                  onChange={(e) => setInputEvent(e.target.value)}
                  placeholder="Enter event title..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={inputDescription}
                  onChange={(e) => setInputDescription(e.target.value)}
                  placeholder="Event description (optional)..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Time *
                  </label>
                  <input
                    type="time"
                    value={inputTime}
                    onChange={(e) => setInputTime(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Scope
                  </label>
                  <select
                    value={eventScope}
                    onChange={(e) => setEventScope(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    disabled={userInfo.role === 'single'}
                  >
                    <option value="single">Personal</option>
                    {userInfo.role !== 'single' && <option value="team">Team</option>}
                    {userInfo.role === 'global' && <option value="global">Global</option>}
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={addOrUpdateEvent}
                  disabled={loading || !inputEvent.trim() || !inputTime}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.02]"
                >
                  {loading ? 'Saving...' : editId ? 'Update Event' : 'Create Event'}
                </button>
                <button
                  onClick={() => setShowPrompt(false)}
                  className="px-6 py-3 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .modern-calendar {
          font-family: inherit;
        }
        
        .modern-calendar .react-calendar__navigation {
          @apply mb-4;
        }
        
        .modern-calendar .react-calendar__navigation button {
          @apply text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg px-3 py-2 font-medium transition-colors;
        }
        
        .modern-calendar .react-calendar__navigation button:enabled:hover,
        .modern-calendar .react-calendar__navigation button:enabled:focus {
          @apply bg-blue-50 dark:bg-slate-700;
        }
        
        .modern-calendar .react-calendar__month-view__weekdays {
          @apply text-sm font-semibold text-gray-600 dark:text-gray-400;
        }
        
        .modern-calendar .react-calendar__month-view__weekdays__weekday {
          @apply p-2;
        }
        
        .modern-calendar .calendar-tile {
          @apply relative p-3 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition-all duration-200 border-0;
        }
        
        .modern-calendar .calendar-tile:enabled:hover {
          @apply bg-blue-50 dark:bg-slate-700 scale-105;
        }
        
        .modern-calendar .react-calendar__tile--now {
          @apply bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold;
        }
        
        .modern-calendar .react-calendar__tile--active {
          @apply bg-blue-500 text-white shadow-lg scale-105;
        }
        
        .modern-calendar .calendar-tile.has-events {
          @apply font-medium;
        }
      `}</style>
    </div>
  );
};

export default CalendarView;