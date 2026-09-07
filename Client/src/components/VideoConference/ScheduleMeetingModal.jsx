// src/components/VideoConference/ScheduleMeetingModal.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Calendar,
  Clock,
  Video,
  Phone,
  Users,
  Search,
  Check,
  X,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-toastify';

const ScheduleMeetingModal = ({
  isOpen,
  onClose,
  currentUser,
  editingMeeting = null,
  onMeetingScheduled
}) => {
  const [meetingTitle, setMeetingTitle] = useState('');
  const [description, setDescription] = useState('');
  const [callType, setCallType] = useState('video'); // 'video' | 'audio'
  const [targetType, setTargetType] = useState('all'); // 'all' | 'specific'
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  
  // Date and Time calculation default (15 minutes from now)
  const getDefaultDateTime = (offsetMinutes = 15) => {
    const d = new Date(Date.now() + offsetMinutes * 60 * 1000);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [scheduledDateTime, setScheduledDateTime] = useState(getDefaultDateTime(15));
  const [durationMinutes, setDurationMinutes] = useState(30);
  
  const [teammates, setTeammates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingTeammates, setLoadingTeammates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prepopulate form if editing existing meeting
  useEffect(() => {
    if (editingMeeting) {
      setMeetingTitle(editingMeeting.title || '');
      setDescription(editingMeeting.description || '');
      setCallType(editingMeeting.callType || 'video');
      setTargetType(editingMeeting.targetType || 'all');
      const targetIds = Array.isArray(editingMeeting.targetUserIds)
        ? editingMeeting.targetUserIds.map(u => (typeof u === 'object' ? (u._id || u.id) : u))
        : [];
      setSelectedUserIds(targetIds);
      if (editingMeeting.scheduledTime) {
        const d = new Date(editingMeeting.scheduledTime);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          setScheduledDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
        }
      }
      setDurationMinutes(editingMeeting.durationMinutes || 30);
    } else {
      setMeetingTitle('');
      setDescription('');
      setCallType('video');
      setTargetType('all');
      setSelectedUserIds([]);
      setScheduledDateTime(getDefaultDateTime(15));
      setDurationMinutes(30);
    }
  }, [editingMeeting, isOpen]);

  // Fetch teammates when modal opens
  useEffect(() => {
    if (!isOpen || !currentUser) return;

    const fetchTeammates = async () => {
      setLoadingTeammates(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        let endpoint = '';
        if (currentUser.role === 'team' && currentUser.teamId) {
          endpoint = `${import.meta.env.VITE_BACKEND_URL}/api/personal-chat/teammates`;
        } else {
          endpoint = `${import.meta.env.VITE_BACKEND_URL}/api/personal-chat/global-users`;
        }

        const res = await axios.get(endpoint, {
          headers: { 'auth-token': token }
        });

        const list = Array.isArray(res.data) ? res.data : [];
        const otherMembers = list.filter(m => (m._id || m.id) !== (currentUser._id || currentUser.id));
        setTeammates(otherMembers);
      } catch (err) {
        console.error("Error fetching teammates for schedule:", err);
      } finally {
        setLoadingTeammates(false);
      }
    };

    fetchTeammates();
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleToggleUser = (userId) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleQuickPreset = (minutes) => {
    setScheduledDateTime(getDefaultDateTime(minutes));
  };

  const handleSetTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setScheduledDateTime(`${year}-${month}-${day}T10:00`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!meetingTitle.trim()) {
      toast.error('Please enter a meeting topic/title');
      return;
    }

    const scheduledDate = new Date(scheduledDateTime);
    if (isNaN(scheduledDate.getTime())) {
      toast.error('Please choose a valid meeting date and time');
      return;
    }

    if (scheduledDate.getTime() < Date.now() - 60000) {
      toast.error('Past date/time cannot be scheduled. Please choose a future date/time.');
      return;
    }

    if (targetType === 'specific' && selectedUserIds.length === 0) {
      toast.error('Please select at least one teammate to invite');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token') || '';
      const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
      let roomSuffix = '';
      for (let i = 0; i < 6; i++) {
        roomSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const generatedRoomId = editingMeeting?.roomId || `meet-${roomSuffix}`;

      const payload = {
        title: meetingTitle.trim(),
        description: description.trim(),
        roomId: generatedRoomId,
        callType,
        scheduledTime: scheduledDate.toISOString(),
        durationMinutes: Number(durationMinutes) || 30,
        targetType,
        targetUserIds: targetType === 'specific' ? selectedUserIds : []
      };

      let res;
      if (editingMeeting?._id) {
        res = await axios.put(
          `${import.meta.env.VITE_BACKEND_URL}/api/scheduled-meetings/${editingMeeting._id}`,
          payload,
          {
            headers: {
              'auth-token': token,
              'Authorization': `Bearer ${token}`
            }
          }
        );
        if (res.data?.success) {
          toast.success('Scheduled meeting updated successfully! ✏️');
        }
      } else {
        res = await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/scheduled-meetings`,
          payload,
          {
            headers: {
              'auth-token': token,
              'Authorization': `Bearer ${token}`
            }
          }
        );
        if (res.data?.success) {
          toast.success(`Meeting scheduled for ${scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}!`);
        }
      }

      if (res.data?.success) {
        if (onMeetingScheduled) {
          onMeetingScheduled(res.data.meeting);
        }
        onClose();
      }
    } catch (err) {
      console.error('Error saving scheduled meeting:', err);
      toast.error(err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to schedule meeting');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTeammates = teammates.filter(m =>
    m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-bold text-white">Schedule Meeting</h2>
              <p className="text-xs text-slate-400">
                Auto-rings & dispatches notifications to teammates at meeting time
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Meeting Title / Topic <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              placeholder="e.g., Weekly Product Sprint & Sync"
              className="w-full bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Description / Agenda (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief agenda or points to discuss..."
              className="w-full bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs px-3.5 py-2 rounded-xl focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Call Type (Video / Audio) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Meeting Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCallType('video')}
                className={`p-3 rounded-xl border flex items-center gap-2.5 transition text-left ${
                  callType === 'video'
                    ? 'bg-blue-600/20 border-blue-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`p-2 rounded-lg ${callType === 'video' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Video Conference</div>
                  <div className="text-[10px] text-slate-400">HD Video, Screen share & Chat</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCallType('audio')}
                className={`p-3 rounded-xl border flex items-center gap-2.5 transition text-left ${
                  callType === 'audio'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`p-2 rounded-lg ${callType === 'audio' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Voice Lounge</div>
                  <div className="text-[10px] text-slate-400">Low-latency Audio Call</div>
                </div>
              </button>
            </div>
          </div>

          {/* Date & Time Picker + Quick Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Date & Start Time <span className="text-red-400">*</span></span>
              <span className="text-[11px] text-indigo-400 font-normal">Auto-rings at exact time</span>
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                required
                value={scheduledDateTime}
                min={getDefaultDateTime(0)}
                onChange={(e) => {
                  const val = e.target.value;
                  const selected = new Date(val);
                  if (val && !isNaN(selected.getTime()) && selected.getTime() < Date.now() - 60000) {
                    toast.warning('Past date/time cannot be selected');
                    setScheduledDateTime(getDefaultDateTime(5));
                    return;
                  }
                  setScheduledDateTime(val);
                }}
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500 [color-scheme:dark] cursor-pointer"
              />
            </div>

            {/* Quick Presets Buttons */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => handleQuickPreset(15)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 font-medium transition"
              >
                In 15 mins
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset(30)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 font-medium transition"
              >
                In 30 mins
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset(60)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 font-medium transition"
              >
                In 1 hour
              </button>
              <button
                type="button"
                onClick={handleSetTomorrow}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 font-medium transition"
              >
                Tomorrow 10:00 AM
              </button>
            </div>
          </div>

          {/* Target Audience Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Who should be invited?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTargetType('all')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                  targetType === 'all'
                    ? 'bg-blue-600/20 border-blue-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${targetType === 'all' ? 'border-blue-400 bg-blue-600' : 'border-slate-600'}`}>
                  {targetType === 'all' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">@all (Entire Team)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Notify & ring all members</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('specific')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                  targetType === 'specific'
                    ? 'bg-blue-600/20 border-blue-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${targetType === 'specific' ? 'border-blue-400 bg-blue-600' : 'border-slate-600'}`}>
                  {targetType === 'specific' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Specific Members</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Select 1 or more teammates</div>
                </div>
              </button>
            </div>
          </div>

          {/* Specific Members List */}
          {targetType === 'specific' && (
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search teammates..."
                  className="w-full bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs pl-8 pr-3 py-1.5 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                {loadingTeammates ? (
                  <div className="text-center py-4 text-xs text-slate-400">Loading team members...</div>
                ) : filteredTeammates.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-500">No teammates found</div>
                ) : (
                  filteredTeammates.map((member) => {
                    const memberId = member._id || member.id;
                    const isSelected = selectedUserIds.includes(memberId);
                    return (
                      <div
                        key={memberId}
                        onClick={() => handleToggleUser(memberId)}
                        className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          isSelected
                            ? 'bg-indigo-950/40 border-indigo-500/60'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 bg-slate-900'
                          }`}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                          <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                            {member.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <span className="text-xs text-white truncate">{member.name}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? 'Scheduling...' : 'Confirm & Schedule'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleMeetingModal;
