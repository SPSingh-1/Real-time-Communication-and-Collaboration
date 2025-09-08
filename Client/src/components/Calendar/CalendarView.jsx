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
  const [pageLoaded, setPageLoaded] = useState(false);
  const [scrollY, setScrollY] = useState(0);


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

  // Add useEffect for page load animation
  useEffect(() => {
    const timer = setTimeout(() => setPageLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Add scroll effect
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
  const token = localStorage.getItem('token');
  if (!token) return;
  
  axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/auth/getuser`, {}, {
    headers: { 'auth-token': token },
  })
    .then((res) => {
      // Extract user data properly from nested structure
      const userData = res.data.user || res.data;
      setUserInfo({
        email: userData.email,
        name: userData.name || userData.email,
        role: userData.role || 'single',
        teamId: userData.teamId,
        globalId: userData.globalId,
        id: userData._id || userData.id  // Handle both _id and id
      });
      setEventScope(userData.role || 'single');
    })
    .catch((err) => {
      console.error('Failed to fetch user:', err);
      toast.error('Failed to load user information');
    });
}, []);

useEffect(() => {
  const token = localStorage.getItem('token');
  if (!token || !userInfo.id) return;  // Added userInfo.id check
  
  console.log('Fetching events for user:', userInfo); // Debug log
  
  setLoading(true);
  axios.get(`${import.meta.env.VITE_BACKEND_URL}/events`, {
    headers: { 'auth-token': token },
  })
    .then((res) => {
      console.log('Received events:', res.data); // Debug log
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
}, [userInfo.id,userInfo, userInfo.role, userInfo.teamId]); // Updated dependencies
  useEffect(() => {
    const socket = io(`${import.meta.env.VITE_BACKEND_URL}`);
    
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
          `${import.meta.env.VITE_BACKEND_URL}/events/${editId}`,
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
        await axios.post(`${import.meta.env.VITE_BACKEND_URL}/events`, eventData, {
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
      await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/events/${id}`, {
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
    <div className={`relative min-h-screen p-6 rounded-3xl overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 transition-all duration-1000 ${
    pageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
    }`}>
      {/* Background Elements */}
      <div className={`absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-cyan-600/10 transition-all duration-1200 delay-200 ${
        pageLoaded ? 'opacity-100' : 'opacity-0'
      }`}></div>
      <div 
        className={`absolute top-20 left-10 w-40 h-40 bg-gradient-to-r from-pink-500/20 to-purple-600/20 rounded-full blur-3xl animate-pulse transition-all duration-1200 delay-400 ${
          pageLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
        }`}
        style={{ transform: `translateY(${scrollY * 0.1}px)` }}
      ></div>
      <div 
        className={`absolute bottom-20 right-10 w-44 h-44 bg-gradient-to-r from-blue-400/20 to-cyan-500/20 rounded-xl blur-3xl animate-pulse delay-1000 transition-all duration-1200 ${
          pageLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
        }`}
        style={{ transform: `translateY(${scrollY * -0.15}px)` }}
      ></div>
      {/* Header */}
      <div className={`relative z-10 mb-8 transition-all duration-800 delay-300 ${
          pageLoaded ? 'translate-y-0 opacity-100' : '-translate-y-6 opacity-0'
        }`}>
          <div className="flex items-center justify-between">
            <div className={`transition-all duration-800 delay-500 ${
              pageLoaded ? 'translate-x-0 opacity-100' : '-translate-x-6 opacity-0'
            }`}>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:scale-105 transition-transform duration-300">
                Calendar Hub
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Welcome back, {userInfo.name} | {getScopeLabel(userInfo.role)} Access
              </p>
            </div>
            <div className={`flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl px-4 py-2 border border-gray-200 dark:border-gray-700 hover:scale-105 hover:shadow-xl transition-all duration-300 ${
              pageLoaded ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'
            }`} style={{ transitionDelay: '700ms' }}>
            {getScopeIcon(userInfo.role)}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {getScopeLabel(userInfo.role)} Mode
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Layout - Calendar with Event View on Right */}
      <div className={`relative z-10 mb-8 transition-all duration-800 delay-600 ${
              pageLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}>
              <div className="flex flex-col lg:flex-row gap-6">
                
                {/* Calendar Section */}
                <div className={`bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl shadow-2xl rounded-3xl p-6 flex-1 border border-gray-200/50 dark:border-gray-700/50 relative overflow-hidden hover:shadow-3xl hover:scale-[1.02] transition-all duration-500 group ${
                  pageLoaded ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0'
                }`} style={{ transitionDelay: '800ms' }}>
                        {/* Calendar Header */}
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Calendar View</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Select a date to manage events</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Today</span>
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          </div>
                        </div>

                        {/* Calendar Container with Enhanced Styling */}
                        <div className="calendar-container relative">
              <Calendar
                onClickDay={handleDateClick}
                value={value}
                onChange={setValue}
                tileContent={tileContent}
                className="enhanced-modern-calendar w-full border-0 bg-transparent rounded-3xl"
                tileClassName={({ date }) => {
                  const hasEvents = events[date.toDateString()]?.length > 0;
                  const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                  const isToday = date.toDateString() === new Date().toDateString();
                  return `enhanced-calendar-tile ${hasEvents ? 'has-events' : ''} ${isSelected ? 'selected-date' : ''} ${isToday ? 'is-today' : ''}`;
                }}
                navigationLabel={({ date }) => (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="font-bold text-lg bg-gray-800 bg-clip-text text-transparent">
                      {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  </div>
                )}
                prevLabel={
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 hover:from-blue-500 hover:to-purple-500 transition-all duration-300 group">
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </div>
                }
                nextLabel={
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 hover:from-blue-500 hover:to-purple-500 transition-all duration-300 group">
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                }
                prev2Label={null}
                next2Label={null}
                showNeighboringMonth={false}
                selectRange={false}
                returnValue="start"
              />
            </div>

            {/* Quick Actions Overlay */}
            {selectedDate && (
              <div className="absolute bottom-6 right-6">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-1 shadow-lg">
                  <button
                    onClick={() => setShowPrompt(true)}
                    className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl font-medium hover:bg-white dark:hover:bg-slate-700 transition-all duration-200 flex items-center gap-2 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Event
                  </button>
                </div>
              </div>
            )}

            {/* Calendar Legend */}
            <div className="mt-6 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-gray-600 dark:text-gray-400">Personal</span>
                  </div>
                  {userInfo.role !== 'single' && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span className="text-gray-600 dark:text-gray-400">Team</span>
                    </div>
                  )}
                  {userInfo.role === 'global' && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <span className="text-gray-600 dark:text-gray-400">Global</span>
                    </div>
                  )}
                </div>
                <div className="text-gray-500 dark:text-gray-500">
                  Click date to view/add events
                </div>
              </div>
            </div>
          </div>

          {/* Event View Section - Now on the Right */}
          <div className={`bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl shadow-2xl rounded-3xl p-6 w-full lg:w-96 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-3xl hover:scale-[1.02] transition-all duration-500 group ${
            pageLoaded ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
          }`} style={{ transitionDelay: '1000ms' }}>
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
                
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
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
                      {!isPastDate(selectedDate) && (
                        <button
                          onClick={() => setShowPrompt(true)}
                          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                        >
                          Create Event
                        </button>
                      )}
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
        </div>
      </div>

      {/* Right Panel - Now Below Calendar with Full Width */}
      <div className={`relative z-10 transition-all duration-800 delay-1200 ${
          pageLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl shadow-2xl rounded-3xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-3xl hover:scale-[1.01] transition-all duration-500">
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
      
      <style>{`
        .modern-calendar {
          font-family: inherit;
        }

        .react-calendar {
          background: linear-gradient(90deg, #7c3aed, #2563eb);
          width: 100%;
          border-radius: 24px;
          box-shadow: 0 8px 24px rgba(0, 50, 50, 50);
        }
        
        .modern-calendar .react-calendar__navigation {
          @apply mb-6;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(147, 51, 234, 0.05));
          border-radius: 16px;
          padding: 12px;
          border: 1px solid rgba(59, 130, 246, 0.1);
        }
        
        .modern-calendar .react-calendar__navigation button {
          @apply text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:text-white rounded-xl px-4 py-2 font-semibold transition-all duration-300 transform hover:scale-105;
          border: none;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(10px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .modern-calendar .react-calendar__navigation button:enabled:hover,
        .modern-calendar .react-calendar__navigation button:enabled:focus {
          @apply shadow-lg;
        }
        
        .modern-calendar .react-calendar__month-view__weekdays {
          @apply text-sm font-bold text-gray-600 dark:text-gray-300 mb-2;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(147, 51, 234, 0.08));
          border-radius: 12px;
          padding: 8px;
        }
        
        .modern-calendar .react-calendar__month-view__weekdays__weekday {
          @apply p-3 text-center;
        }
        
        .modern-calendar .calendar-tile {
          @apply relative p-4 text-gray-700 dark:text-gray-300 hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 dark:hover:from-slate-700 dark:hover:to-slate-600 rounded-xl transition-all duration-300 border-0 m-1;
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        .modern-calendar .calendar-tile:enabled:hover {
          @apply transform scale-110 shadow-xl;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
        
        .modern-calendar .react-calendar__tile--now {
          @apply bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold shadow-lg;
          border: 2px solid rgba(255, 255, 255, 0.3);
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        .modern-calendar .react-calendar__tile--active,
        .modern-calendar .calendar-tile.selected-date {
          @apply bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-2xl transform scale-110;
          border: 2px solid rgba(255, 255, 255, 0.4);
        }
        
        .modern-calendar .calendar-tile.has-events {
          @apply font-bold;
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(59, 130, 246, 0.1));
          border: 2px solid rgba(34, 197, 94, 0.3);
        }
        
        .modern-calendar .calendar-tile.has-events:hover {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(59, 130, 246, 0.2));
        }
        
        /* Enhanced event dots styling */
        .modern-calendar .calendar-tile .event-dots {
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 2px;
          z-index: 10;
        }
        
        .modern-calendar .calendar-tile .event-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }
        
        /* Animation for event interaction */
        .calendar-tile {
          position: relative;
          overflow: hidden;
        }
        
        .calendar-tile::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          transform: rotate(45deg);
          transition: all 0.5s;
          opacity: 0;
        }
        
        .calendar-tile:hover::before {
          animation: shimmer 0.6s ease-in-out;
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(100%) translateY(100%) rotate(45deg); opacity: 0; }
        }
        
        /* Modern scrollbar for calendar container */
        .calendar-container {
          scrollbar-width: thin;
          scrollbar-color: rgba(59, 130, 246, 0.3) rgba(0, 0, 0, 0.1);
        }
        
        .calendar-container::-webkit-scrollbar {
          width: 6px;
        }
        
        .calendar-container::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 3px;
        }
        
        .calendar-container::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #8b5cf6);
          border-radius: 3px;
        }
        
        .calendar-container::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #2563eb, #7c3aed);
        }

        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }

          @keyframes slideInUp {
            0% { transform: translateY(30px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }

          @keyframes slideInLeft {
            0% { transform: translateX(-30px); opacity: 0; }
            100% { transform: translateX(0); opacity: 1; }
          }

          @keyframes slideInRight {
            0% { transform: translateX(30px); opacity: 0; }
            100% { transform: translateX(0); opacity: 1; }
          }

          @keyframes fadeInScale {
            0% { transform: scale(0.9); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }

          @keyframes glow {
            0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.1); }
            50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.3); }
          }

          .animate-float { animation: float 3s ease-in-out infinite; }
          .animate-glow { animation: glow 2s ease-in-out infinite; }

          /* Enhanced hover effects */
          .hover-lift {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .hover-lift:hover {
            transform: translateY(-4px) scale(1.02);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          }

          .hover-glow:hover {
            box-shadow: 0 0 30px rgba(59, 130, 246, 0.3);
          }
      `}</style>
    </div>
  );
};

export default CalendarView;