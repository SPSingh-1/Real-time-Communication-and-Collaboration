import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  Plus, 
  Calendar, 
  User,
  Users,
  Globe,
  Send,
  AlertCircle,
  Filter,
  Search,
  Sparkles,
  TrendingUp,
  Activity
} from 'lucide-react';

const AttendeeList = () => {
  const [pendingEvents, setPendingEvents] = useState([]);
  const [myDecisions, setMyDecisions] = useState([]);
  const [status, setStatus] = useState('going');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState('add');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [setUserInfo] = useState({ role: 'single', name: 'Loading...', id: '' });

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // Fetch user info
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!token) return;
      
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

    fetchUserInfo();
  }, [token, setUserInfo]);

  // Fetch pending events
  useEffect(() => {
    const fetchPendingEvents = async () => {
      if (!token) return;
      
      try {
        const response = await fetch('http://localhost:3001/attendee/pending-events', {
          headers: { 'auth-token': token }
        });
        
        if (response.ok) {
          const events = await response.json();
          setPendingEvents(events);
        }
      } catch (err) {
        console.error('Failed to fetch pending events:', err);
      }
    };

    fetchPendingEvents();
  }, [token]);

  // Fetch my decisions
  useEffect(() => {
    const fetchMyDecisions = async () => {
      if (!token) return;
      
      try {
        const response = await fetch('http://localhost:3001/attendee/all-decisions', {
          headers: { 'auth-token': token }
        });
        
        if (response.ok) {
          const decisions = await response.json();
          setMyDecisions(decisions);
        }
      } catch (err) {
        console.error('Failed to fetch decisions:', err);
      }
    };

    if (mode === 'view') {
      fetchMyDecisions();
    }
  }, [token, mode]);

  const addDecision = async () => {
    if (!selectedEvent) {
      setError('Please select an event.');
      return;
    }
    
    if ((status === 'busy' || status === 'declined') && !reason.trim()) {
      setError('Please provide a reason for not attending.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:3001/attendee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': token
        },
        body: JSON.stringify({
          event: selectedEvent,
          status,
          reason: (status === 'busy' || status === 'declined') ? reason.trim() : ''
        })
      });

      if (response.ok) {
        const newDecision = await response.json();
        
        // Remove the event from pending and add to decisions
        setPendingEvents(prev => prev.filter(e => e._id !== selectedEvent));
        setMyDecisions(prev => [newDecision, ...prev]);
        
        // Reset form
        setSelectedEvent('');
        setReason('');
        setStatus('going');
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to submit response');
      }
    } catch (err) {
      console.error('Failed to add decision:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'going':
        return <CheckCircle className="text-emerald-500" size={16} />;
      case 'declined':
        return <XCircle className="text-red-500" size={16} />;
      case 'busy':
        return <Clock className="text-amber-500" size={16} />;
      case 'maybe':
        return <Clock className="text-blue-500" size={16} />;
      default:
        return <Clock className="text-gray-500" size={16} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'going':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'declined':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'busy':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'maybe':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800';
    }
  };

  const getScopeIcon = (scope) => {
    switch (scope) {
      case 'global':
        return <Globe className="text-purple-500" size={14} />;
      case 'team':
        return <Users className="text-blue-500" size={14} />;
      default:
        return <User className="text-emerald-500" size={14} />;
    }
  };

  const getScopeColor = (scope) => {
    switch (scope) {
      case 'global':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      case 'team':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      default:
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
    }
  };

  const filteredDecisions = myDecisions.filter(decision => {
    if (filterStatus !== 'all' && decision.status !== filterStatus) return false;
    if (searchTerm && !decision.event?.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: myDecisions.length,
    going: myDecisions.filter(d => d.status === 'going').length,
    busy: myDecisions.filter(d => d.status === 'busy').length,
    declined: myDecisions.filter(d => d.status === 'declined').length,
    maybe: myDecisions.filter(d => d.status === 'maybe').length
  };

  return (
    <div className="p-6 h-full flex flex-col bg-gradient-to-br from-slate-50/50 to-white dark:from-slate-900/50 dark:to-slate-800">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl text-white shadow-lg">
            <Users size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Event Responses</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Manage your event attendance</p>
          </div>
          <Sparkles className="text-yellow-500 animate-pulse" size={18} />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setMode('add')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
              mode === 'add'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transform scale-105'
                : 'bg-white/80 dark:bg-slate-700/80 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-600 border border-gray-200 dark:border-gray-600'
            }`}
          >
            <Plus size={16} />
            Respond
          </button>
          
          <button
            onClick={() => setMode('view')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
              mode === 'view'
                ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg transform scale-105'
                : 'bg-white/80 dark:bg-slate-700/80 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-600 border border-gray-200 dark:border-gray-600'
            }`}
          >
            <Eye size={16} />
            My Responses
          </button>
        </div>
      </div>

      {/* Stats Dashboard */}
      {mode === 'view' && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.total}</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">Total Events</p>
              </div>
              <Activity className="text-blue-500" size={24} />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.going}</p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">Going</p>
              </div>
              <CheckCircle className="text-emerald-500" size={24} />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-2xl p-4 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.busy}</p>
                <p className="text-sm text-amber-600 dark:text-amber-400">Busy</p>
              </div>
              <Clock className="text-amber-500" size={24} />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-2xl p-4 border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.declined}</p>
                <p className="text-sm text-red-600 dark:text-red-400">Declined</p>
              </div>
              <XCircle className="text-red-500" size={24} />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.maybe}</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">Maybe</p>
              </div>
              <Clock className="text-blue-500" size={24} />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-6">
        {loading && (
          <div className="text-center py-12">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
              <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-500 animate-pulse" size={16} />
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-4 font-medium">Processing your response...</p>
          </div>
        )}

        {/* Add Decision Mode */}
        {mode === 'add' && !loading && (
          <div className="space-y-6">
            {pendingEvents.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-full w-24 h-24 mx-auto flex items-center justify-center mb-4">
                  <Calendar className="text-gray-400 dark:text-gray-600" size={32} />
                </div>
                <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">All caught up!</h4>
                <p className="text-gray-500 dark:text-gray-400">No pending events to respond to</p>
              </div>
            ) : (
              <div className="bg-white/80 dark:bg-slate-800/80 rounded-3xl p-6 border border-gray-200 dark:border-gray-700 shadow-xl backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl text-white">
                    <Send size={20} />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Submit Response</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Choose an event and your attendance status</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Select Event *
                    </label>
                    <div className="space-y-3">
                      {pendingEvents.map((event) => (
                        <div
                          key={event._id}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                            selectedEvent === event._id
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg transform scale-[1.02]'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white/50 dark:bg-slate-700/50'
                          }`}
                          onClick={() => setSelectedEvent(event._id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getScopeIcon(event.scope)}
                              <div>
                                <h5 className="font-semibold text-gray-800 dark:text-gray-200">{event.title}</h5>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  <Calendar size={14} />
                                  <span>{new Date(event.date).toLocaleDateString()} at {event.time}</span>
                                </div>
                                {event.description && (
                                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                    {event.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${getScopeColor(event.scope)}`}>
                              {event.scope.charAt(0).toUpperCase() + event.scope.slice(1)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Your Response *
                      </label>
                      <div className="space-y-2">
                        {[
                          { value: 'going', label: 'Going', icon: CheckCircle, color: 'emerald' },
                          { value: 'maybe', label: 'Maybe', icon: Clock, color: 'blue' },
                          { value: 'busy', label: 'Busy', icon: Clock, color: 'amber' },
                          { value: 'declined', label: 'Declined', icon: XCircle, color: 'red' }
                        ].map(option => {
                          const Icon = option.icon;
                          return (
                            <button
                              key={option.value}
                              onClick={() => setStatus(option.value)}
                              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-300 ${
                                status === option.value
                                  ? `border-${option.color}-500 bg-${option.color}-50 dark:bg-${option.color}-900/20 shadow-lg transform scale-[1.02]`
                                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white/50 dark:bg-slate-700/50'
                              }`}
                            >
                              <Icon size={18} className={`text-${option.color}-500`} />
                              <span className="font-medium text-gray-800 dark:text-gray-200">{option.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    
                    {(status === 'busy' || status === 'declined') && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                          Reason *
                        </label>
                        <textarea
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                          placeholder="Please explain why you can't attend..."
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          rows={4}
                        />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={addDecision}
                    disabled={loading || !selectedEvent}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.02] flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Submit Response
                      </>
                    )}
                  </button>

                  {error && (
                    <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                      <AlertCircle className="text-red-500" size={20} />
                      <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* View Decisions Mode */}
        {mode === 'view' && !loading && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-slate-700/80 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all backdrop-blur-sm"
                />
              </div>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-slate-700/80 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all backdrop-blur-sm min-w-[150px]"
              >
                <option value="all">All Status</option>
                <option value="going">Going</option>
                <option value="maybe">Maybe</option>
                <option value="busy">Busy</option>
                <option value="declined">Declined</option>
              </select>
            </div>

            {filteredDecisions.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full w-24 h-24 mx-auto flex items-center justify-center mb-4">
                  <Eye className="text-purple-500" size={32} />
                </div>
                <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No responses found</h4>
                <p className="text-gray-500 dark:text-gray-400">
                  {searchTerm ? 'Try adjusting your search terms' : 'You haven\'t responded to any events yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDecisions.map((decision) => (
                  <div
                    key={decision._id}
                    className="bg-white/80 dark:bg-slate-800/80 rounded-3xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {getScopeIcon(decision.event?.scope)}
                        <div>
                          <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-lg">
                            {decision.event?.title || 'Event Deleted'}
                          </h4>
                          {decision.event && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                              <Calendar size={14} />
                              <span>
                                {new Date(decision.event.date).toLocaleDateString()} at {decision.event.time}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-full border font-medium ${getStatusColor(decision.status)}`}>
                        {getStatusIcon(decision.status)}
                        {decision.status.charAt(0).toUpperCase() + decision.status.slice(1)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                      <div className="flex items-center gap-2">
                        <User size={14} />
                        <span>{decision.user?.name || decision.user?.email || 'Unknown User'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} />
                        <span>Responded {new Date(decision.createdAt || decision.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {decision.reason && (
                      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-2xl p-4 border border-amber-200 dark:border-amber-800">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="text-amber-500 mt-0.5" size={16} />
                          <div>
                            <p className="font-medium text-amber-800 dark:text-amber-200 text-sm">Reason:</p>
                            <p className="text-amber-700 dark:text-amber-300 text-sm mt-1">
                              {decision.reason}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendeeList;