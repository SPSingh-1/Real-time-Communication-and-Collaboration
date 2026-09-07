// src/components/VideoConference/MeetingInviteModal.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, User, Phone, Video, Search, Check, AlertCircle, Sparkles, X, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

const MeetingInviteModal = ({
  isOpen,
  onClose,
  socket,
  currentUser,
  roomId,
  callType = 'video'
}) => {
  const [inviteType, setInviteType] = useState('all'); // 'all' or 'specific'
  const [teammates, setTeammates] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [loadingTeammates, setLoadingTeammates] = useState(false);
  const [usersCallStatus, setUsersCallStatus] = useState({}); // userId -> { inCall: boolean, roomId, callType }
  const [sendingInvite, setSendingInvite] = useState(false);

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
        // Filter out self
        const otherMembers = list.filter(m => (m._id || m.id) !== (currentUser._id || currentUser.id));
        setTeammates(otherMembers);

        // Check call status for all teammates
        if (socket && otherMembers.length > 0) {
          const userIds = otherMembers.map(m => m._id || m.id);
          socket.emit('check-users-call-status', { userIds }, (statusMap) => {
            if (statusMap) {
              setUsersCallStatus(statusMap);
            }
          });
        }
      } catch (err) {
        console.error("Error fetching teammates for invite:", err);
      } finally {
        setLoadingTeammates(false);
      }
    };

    fetchTeammates();
  }, [isOpen, currentUser, socket]);

  // Listen to live call status updates
  useEffect(() => {
    if (!socket) return;

    const handleStatusChanged = ({ userId, inCall, roomId, callType }) => {
      setUsersCallStatus(prev => ({
        ...prev,
        [userId]: { inCall, roomId, callType }
      }));
    };

    socket.on('user-call-status-changed', handleStatusChanged);
    return () => {
      socket.off('user-call-status-changed', handleStatusChanged);
    };
  }, [socket]);

  if (!isOpen) return null;

  const handleToggleUser = (userId, userObj) => {
    const isBusy = usersCallStatus[userId]?.inCall;
    if (isBusy) {
      toast.error(`${userObj?.name || 'Member'} is already in another meeting!`, {
        icon: '⚠️',
        duration: 3500
      });
    }

    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSendInvite = () => {
    if (!socket) {
      toast.error("Network connection not ready");
      return;
    }

    if (inviteType === 'specific' && selectedUserIds.length === 0) {
      toast.error("Please select at least one teammate to invite!");
      return;
    }

    setSendingInvite(true);

    const payload = {
      targetType: inviteType,
      targetUserIds: inviteType === 'specific' ? selectedUserIds.map((id) => String(id?._id || id?.id || id)) : [],
      roomId: roomId || 'general-meeting',
      callType: callType || 'video',
      hostUser: {
        id: String(currentUser?._id || currentUser?.id || ''),
        name: currentUser?.name || 'Host',
        photo: currentUser?.photo,
        email: currentUser?.email,
        role: currentUser?.role
      },
      meetingTitle: meetingTitle.trim() || `${currentUser?.name || 'Team'}'s Meeting`,
      teamId: currentUser?.teamId ? String(currentUser.teamId) : null
    };

    socket.emit('send-meeting-invite', payload);

    toast.success(
      inviteType === 'all'
        ? "Meeting invite broadcasted to all team members!"
        : `Meeting invite sent to ${selectedUserIds.length} teammate(s)!`
    );

    setSendingInvite(false);
    onClose();
  };

  const filteredTeammates = teammates.filter(m =>
    m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Invite to Meeting</h2>
              <p className="text-xs text-slate-400">
                Room: <span className="text-blue-400 font-mono font-medium">{roomId}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {/* Meeting Title Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Meeting Topic / Title (Optional)
            </label>
            <input
              type="text"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              placeholder="e.g., Quick Project Standup & Review"
              className="w-full bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Target Audience Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Who would you like to invite?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setInviteType('all')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                  inviteType === 'all'
                    ? 'bg-blue-600/20 border-blue-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${inviteType === 'all' ? 'border-blue-400 bg-blue-600' : 'border-slate-600'}`}>
                  {inviteType === 'all' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    <span>@all (Entire Team)</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Notify all team members at once</div>
                </div>
              </button>

              <button
                onClick={() => setInviteType('specific')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                  inviteType === 'specific'
                    ? 'bg-blue-600/20 border-blue-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${inviteType === 'specific' ? 'border-blue-400 bg-blue-600' : 'border-slate-600'}`}>
                  {inviteType === 'specific' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Specific Members</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Select 1 or more teammates</div>
                </div>
              </button>
            </div>
          </div>

          {/* Specific Members Selection List */}
          {inviteType === 'specific' && (
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search teammates by name or email..."
                  className="w-full bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Members List */}
              <div className="max-h-52 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                {loadingTeammates ? (
                  <div className="text-center py-6 text-xs text-slate-400">Loading team members...</div>
                ) : filteredTeammates.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500">No teammates found</div>
                ) : (
                  filteredTeammates.map((member) => {
                    const memberId = member._id || member.id;
                    const isSelected = selectedUserIds.includes(memberId);
                    const callStatus = usersCallStatus[memberId];
                    const isBusy = callStatus?.inCall;

                    return (
                      <div
                        key={memberId}
                        onClick={() => handleToggleUser(memberId, member)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          isSelected
                            ? 'bg-blue-950/40 border-blue-500/60'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Checkbox */}
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center transition flex-shrink-0 ${
                              isSelected ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-700 bg-slate-900'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>

                          {/* Member Avatar */}
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 overflow-hidden">
                            {member.photo ? (
                              <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                              member.name?.[0]?.toUpperCase() || 'U'
                            )}
                          </div>

                          {/* Member Info */}
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">{member.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{member.email}</div>
                          </div>
                        </div>

                        {/* Live Call Status Badge */}
                        <div className="flex-shrink-0 ml-2">
                          {isBusy ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-950/80 text-red-400 border border-red-800/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                              Already in meeting
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/50 text-emerald-400 border border-emerald-800/40">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              Available
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Cancel
          </button>

          <button
            onClick={handleSendInvite}
            disabled={sendingInvite || (inviteType === 'specific' && selectedUserIds.length === 0)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {inviteType === 'all'
                ? 'Send Invite to @all'
                : `Send Invite (${selectedUserIds.length})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MeetingInviteModal;
