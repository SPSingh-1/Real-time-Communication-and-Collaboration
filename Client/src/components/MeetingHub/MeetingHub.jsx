// src/components/MeetingHub/MeetingHub.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  Video,
  Users,
  MessageSquare,
  Disc,
  Clock,
  Calendar,
  Search,
  Filter,
  Play,
  Download,
  Copy,
  Check,
  Plus,
  Trash2,
  Sparkles,
  Send,
  User,
  CheckCircle2,
  X,
  ExternalLink,
  PhoneCall,
  Volume2,
  Layers
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const MeetingHub = ({ user }) => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'live' | 'upcoming' | 'completed'

  // Selected meeting for detailed 3-tab drawer
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'chat' | 'recording'

  // Chat message input for selected meeting
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [copiedRoomId, setCopiedRoomId] = useState('');

  // Fetch all meetings for the user / team
  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('auth-token');
      if (!token) return;

      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/scheduled-meetings`, {
        headers: { 'auth-token': token }
      });

      if (res.data?.success) {
        setMeetings(res.data.meetings || []);
        // If a meeting is currently selected, refresh its details
        if (selectedMeeting) {
          const updated = (res.data.meetings || []).find((m) => String(m._id) === String(selectedMeeting._id));
          if (updated) setSelectedMeeting(updated);
        }
      }
    } catch (err) {
      console.error('Error fetching meetings in MeetingHub:', err);
      toast.error('Failed to load meeting archives');
    } finally {
      setLoading(false);
    }
  }, [selectedMeeting]);

  useEffect(() => {
    fetchMeetings();
  }, []);

  // Listen for real-time meeting updates & chats
  useEffect(() => {
    const socket = io(`${import.meta.env.VITE_BACKEND_URL}`);

    socket.on('new-scheduled-meeting', (newMeeting) => {
      setMeetings((prev) => [newMeeting, ...prev.filter((m) => m._id !== newMeeting._id)]);
    });

    socket.on('scheduled-meeting-started', ({ meetingId, roomId }) => {
      setMeetings((prev) =>
        prev.map((m) =>
          m._id === meetingId || m.roomId === roomId ? { ...m, status: 'active' } : m
        )
      );
    });

    socket.on('scheduled-meeting-ended', ({ meetingId, roomId }) => {
      setMeetings((prev) =>
        prev.map((m) =>
          m._id === meetingId || m.roomId === roomId ? { ...m, status: 'completed' } : m
        )
      );
    });

    socket.on('meeting-hub-new-chat', ({ meetingId, message }) => {
      if (selectedMeeting && String(selectedMeeting._id) === String(meetingId)) {
        setSelectedMeeting((prev) => ({
          ...prev,
          chatMessages: [...(prev.chatMessages || []), message]
        }));
      }
    });

    return () => socket.disconnect();
  }, [selectedMeeting]);

  // Filtered Meetings List
  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      const matchesSearch =
        !searchQuery ||
        m.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.roomId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.hostUser?.name?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'live') return m.status === 'active';
      if (statusFilter === 'upcoming') return m.status === 'scheduled';
      if (statusFilter === 'completed') return m.status === 'completed';
      return true;
    });
  }, [meetings, searchQuery, statusFilter]);

  const handleCopyLink = (roomId) => {
    const link = `${window.location.origin}/dashboard/tools/video?room=${encodeURIComponent(roomId)}&autoJoin=true`;
    navigator.clipboard.writeText(link);
    setCopiedRoomId(roomId);
    toast.success('Meeting link copied to clipboard!');
    setTimeout(() => setCopiedRoomId(''), 2500);
  };

  const handleJoinMeeting = (m) => {
    navigate(`/dashboard/tools/video?room=${encodeURIComponent(m.roomId)}&type=${m.callType || 'video'}&autoJoin=true`);
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedMeeting) return;

    try {
      setSendingChat(true);
      const token = localStorage.getItem('token') || localStorage.getItem('auth-token');
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/scheduled-meetings/${selectedMeeting._id}/chat`,
        { text: chatInput.trim() },
        { headers: { 'auth-token': token } }
      );

      if (res.data?.success) {
        setSelectedMeeting((prev) => ({
          ...prev,
          chatMessages: [...(prev.chatMessages || []), res.data.message]
        }));
        setChatInput('');
      }
    } catch (err) {
      console.error('Error sending meeting chat:', err);
      toast.error('Failed to post message');
    } finally {
      setSendingChat(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return 'Just joined (<1 min)';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} sec`;
    return `${mins} min ${secs > 0 ? `${secs}s` : ''}`;
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 p-5 sm:p-6 rounded-2xl shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Video className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Meeting Hub & Archive</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Track meeting attendance roster, review in-call chat histories, and access recorded clips in one place.
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard/tools/video')}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> Start / Join Instant Meeting
        </button>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { key: 'all', label: 'All Meetings' },
            { key: 'live', label: '🔴 Live Now' },
            { key: 'upcoming', label: '⏳ Upcoming' },
            { key: 'completed', label: '🏁 Past / Completed' }
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === f.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, host, room..."
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* MAIN LAYOUT: MEETINGS LIST & 3-TAB DETAIL DRAWER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* MEETINGS CARDS LIST (Left column) */}
        <div className={`space-y-3 ${selectedMeeting ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
          {loading ? (
            <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-400">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs">Loading meetings...</p>
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 p-6">
              <Video className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-40" />
              <h3 className="text-sm font-bold text-white mb-1">No Meetings Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No meetings match your current filters. Schedule a new event from Calendar or launch an instant video call.
              </p>
            </div>
          ) : (
            filteredMeetings.map((m) => {
              const isSelected = selectedMeeting && String(selectedMeeting._id) === String(m._id);
              const attendeesCount = m.attendees?.length || 0;
              const chatsCount = m.chatMessages?.length || 0;
              const recordingsCount = m.recordings?.length || 0;
              const isLive = m.status === 'active';

              return (
                <div
                  key={m._id}
                  onClick={() => setSelectedMeeting(m)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'bg-slate-850 border-blue-500 shadow-md ring-1 ring-blue-500'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  {isLive && (
                    <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 animate-pulse" />
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {isLive ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-950/80 border border-red-800 text-red-400 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> LIVE NOW
                          </span>
                        ) : m.status === 'scheduled' ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-950/80 border border-blue-800 text-blue-400 text-[10px] font-bold">
                            ⏳ UPCOMING
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-bold">
                            🏁 COMPLETED
                          </span>
                        )}

                        <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {new Date(m.scheduledTime).toLocaleDateString('default', {
                            month: 'short',
                            day: 'numeric'
                          })}{' '}
                          at{' '}
                          {new Date(m.scheduledTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-white truncate">{m.title}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Host: <span className="text-slate-300 font-medium">{m.hostUser?.name || 'Teammate'}</span> · Room: <span className="font-mono text-blue-400">{m.roomId}</span>
                      </p>

                      {/* BADGES: Attendance / Chat / Recording */}
                      <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 text-slate-300 font-medium">
                          <Users className="w-3.5 h-3.5 text-blue-400" /> {attendeesCount} Attendee{attendeesCount === 1 ? '' : 's'}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-400" /> {chatsCount} Chat{chatsCount === 1 ? '' : 's'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Disc className="w-3.5 h-3.5 text-amber-400" /> {recordingsCount} Clip{recordingsCount === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {(isLive || m.status === 'scheduled') && (
                        <button
                          onClick={() => handleJoinMeeting(m)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" /> Join
                        </button>
                      )}
                      <button
                        onClick={() => handleCopyLink(m.roomId)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs border border-slate-700 transition-colors"
                        title="Copy Meeting Link"
                      >
                        {copiedRoomId === m.roomId ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 3-TAB DETAIL DRAWER (Right Column) */}
        {selectedMeeting && (
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col overflow-hidden h-[650px] sticky top-4">
            {/* DRAWER HEADER */}
            <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono px-2 py-0.5 bg-blue-950/80 border border-blue-800 text-blue-400 rounded-full font-bold">
                    Room: {selectedMeeting.roomId}
                  </span>
                  <span className="text-xs text-slate-400">
                    Host: {selectedMeeting.hostUser?.name}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white">{selectedMeeting.title}</h2>
                {selectedMeeting.description && (
                  <p className="text-xs text-slate-400 mt-1">{selectedMeeting.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleJoinMeeting(selectedMeeting)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Video className="w-3.5 h-3.5" /> Join Room
                </button>
                <button
                  onClick={() => setSelectedMeeting(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 3 TAB SELECTOR BUTTONS */}
            <div className="flex items-center border-b border-slate-800 bg-slate-950/60 px-4">
              <button
                onClick={() => setActiveTab('attendance')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors ${
                  activeTab === 'attendance'
                    ? 'border-blue-500 text-blue-400 bg-slate-900/50'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>👥 Attendance ({selectedMeeting.attendees?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('chat')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors ${
                  activeTab === 'chat'
                    ? 'border-blue-500 text-blue-400 bg-slate-900/50'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>💬 Meeting Chat ({selectedMeeting.chatMessages?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('recording')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors ${
                  activeTab === 'recording'
                    ? 'border-blue-500 text-blue-400 bg-slate-900/50'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Disc className="w-4 h-4" />
                <span>📼 Recordings ({selectedMeeting.recordings?.length || 0})</span>
              </button>
            </div>

            {/* TAB 1: ATTENDANCE ROSTER */}
            {activeTab === 'attendance' && (
              <div className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-4">
                <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-xs font-bold text-slate-300">
                    Total Tracked Participants:
                  </span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                    {selectedMeeting.attendees?.length || 0} Members
                  </span>
                </div>

                {!selectedMeeting.attendees || selectedMeeting.attendees.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
                    <p className="text-xs font-semibold text-slate-300">No attendance records logged yet</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Participants who join this call room will automatically appear here with their join times and active durations.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedMeeting.attendees.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {att.photo ? (
                            <img
                              src={att.photo}
                              alt={att.name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-700"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                              {att.name ? att.name[0].toUpperCase() : 'U'}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-white">{att.name}</h4>
                              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[9px] font-mono text-slate-400 uppercase">
                                {att.role || 'Member'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400">{att.email || 'Email not shared'}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] font-mono text-emerald-400 block font-bold">
                            ⏱️ {formatDuration(att.durationSeconds)}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Joined: {new Date(att.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: MEETING CHAT HISTORY & MESSAGING */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Message Log */}
                <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-3 bg-slate-950/40">
                  {!selectedMeeting.chatMessages || selectedMeeting.chatMessages.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <MessageSquare className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
                      <p className="text-xs font-semibold text-slate-300">No meeting messages yet</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        In-call chat and post-meeting follow-up notes are synced and stored here.
                      </p>
                    </div>
                  ) : (
                    selectedMeeting.chatMessages.map((msg, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        {msg.senderPhoto ? (
                          <img src={msg.senderPhoto} alt="" className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-bold">
                            {msg.senderName ? msg.senderName[0].toUpperCase() : 'U'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-200">{msg.senderName}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-0.5 break-words">{msg.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Send Chat Bar */}
                <form onSubmit={handleSendChat} className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Post meeting notes / follow-up chat..."
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={sendingChat || !chatInput.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" /> Send
                  </button>
                </form>
              </div>
            )}

            {/* TAB 3: MEETING RECORDINGS & PLAYBACK */}
            {activeTab === 'recording' && (
              <div className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-4">
                {!selectedMeeting.recordings || selectedMeeting.recordings.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Disc className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
                    <p className="text-xs font-semibold text-slate-300">No recordings saved for this meeting</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Start recording during a live call to generate and store session playbacks.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedMeeting.recordings.map((rec, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-white">{rec.title}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Recorded by {rec.recordedBy} · {new Date(rec.recordedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-400 text-[10px] font-mono font-bold">
                            {formatDuration(rec.durationSeconds)}
                          </span>
                        </div>

                        {/* Video / Media Player */}
                        <div className="rounded-lg overflow-hidden bg-black border border-slate-800">
                          <video
                            src={rec.url}
                            controls
                            className="w-full max-h-48 object-contain"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={rec.url}
                            download={`recording-${selectedMeeting.roomId}.webm`}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700 inline-flex items-center gap-1.5 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" /> Download Video
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingHub;
