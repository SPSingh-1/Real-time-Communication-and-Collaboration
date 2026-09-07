// src/components/VideoConference/IncomingCallModal.jsx
import React, { useEffect, useState, useRef } from 'react';
import { Phone, PhoneOff, Video, Users, Sparkles, Volume2 } from 'lucide-react';
import { playIncomingCallRingtone, stopIncomingCallRingtone } from '../../Utils/ringtone';

const IncomingCallModal = ({ socket, onAcceptCall, currentUser }) => {
  const [incomingCall, setIncomingCall] = useState(null);
  const autoDismissTimerRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = (callData) => {
      console.log("📞 Incoming meeting call received in client:", callData);
      if (!callData) return;

      const myId = String(currentUser?._id || currentUser?.id || '');
      const hostId = String(callData?.hostUser?.id || callData?.hostUser?._id || callData?.callerUserId || '');

      // 1. Strict check: Never show incoming popup to the host/caller for instant calls
      if (!callData?.isScheduled) {
        if (hostId && myId && hostId === myId) {
          console.log("📞 Self-caller incoming meeting call ignored.");
          return;
        }
      }

      // 2. Filter by Team if targetType is 'all' and teamId is specified
      if (callData?.targetType === 'all' && callData?.teamId && currentUser?.teamId) {
        if (String(callData.teamId) !== String(currentUser.teamId)) {
          console.log("📞 Ignored call for different team:", callData.teamId);
          return;
        }
      }

      // 3. Filter by specific user targeting if targetType is 'specific'
      if (callData?.targetType === 'specific') {
        const targetIds = Array.isArray(callData?.targetUserIds)
          ? callData.targetUserIds.map((id) => String(id?._id || id?.id || id))
          : [];

        const isTargeted = targetIds.includes(myId);
        const isHost = Boolean(hostId && myId && hostId === myId);

        if (!isTargeted && !isHost) {
          console.log("📞 Incoming call ignored - current user is not in targeted list:", { myId, targetIds });
          return;
        }
      }

      setIncomingCall(callData);

      // Play audio ringtone and voice announcement
      const hostName = callData.hostUser?.name || 'Teammate';
      try {
        playIncomingCallRingtone(hostName);
      } catch (e) {
        console.warn("Ringtone playback error:", e);
      }

      // Auto-dismiss call if not answered in 35 seconds
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
      }
      autoDismissTimerRef.current = setTimeout(() => {
        handleDecline();
      }, 35000);
    };

    socket.on('incoming-meeting-call', handleIncomingCall);

    return () => {
      socket.off('incoming-meeting-call', handleIncomingCall);
      stopIncomingCallRingtone();
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
      }
    };
  }, [socket, currentUser]);

  const handleDecline = () => {
    stopIncomingCallRingtone();
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
    }
    setIncomingCall(null);
  };

  const handleAccept = () => {
    stopIncomingCallRingtone();
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
    }
    if (incomingCall && onAcceptCall) {
      onAcceptCall(incomingCall);
    }
    setIncomingCall(null);
  };

  if (!incomingCall) return null;

  const host = incomingCall.hostUser || {};
  const isVideo = incomingCall.callType === 'video';
  const isScheduled = incomingCall.isScheduled === true;
  const isHostSelf = currentUser && host?.id && String(host.id) === String(currentUser._id || currentUser.id);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      {/* Mobile-Style Phone Call Card */}
      <div className="relative w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl text-center overflow-hidden">
        
        {/* Subtle glowing ambient background */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Status & Call Type Badge */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wider ${
            isScheduled
              ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
              : 'bg-blue-500/20 border-blue-500/30 text-blue-400'
          }`}>
            {isScheduled ? <Sparkles className="w-3.5 h-3.5" /> : isVideo ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
            <span>{isScheduled ? '⏰ Scheduled Meeting Starting' : `Incoming ${isVideo ? 'Video' : 'Voice'} Call`}</span>
          </div>
        </div>

        {/* Caller Avatar with Pulsing Radar Rings */}
        <div className="relative my-4 flex items-center justify-center">
          {/* Animated radar rings */}
          <div className="absolute w-28 h-28 rounded-full bg-blue-500/20 animate-ping"></div>
          <div className="absolute w-24 h-24 rounded-full bg-indigo-500/30 animate-pulse"></div>

          {/* Avatar Container */}
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-xl flex items-center justify-center">
            {host.photo ? (
              <img
                src={host.photo}
                alt={host.name}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <div className="w-full h-full bg-slate-800 rounded-full flex items-center justify-center text-2xl font-bold text-white uppercase">
                {host.name?.[0] || 'T'}
              </div>
            )}
          </div>
        </div>

        {/* Caller Name & Meeting Title */}
        <div className="mt-4 mb-2">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
            {isScheduled && isHostSelf ? 'Your Scheduled Meeting' : (host.name || 'Team Member')}
          </h2>
          <p className="text-xs sm:text-sm text-blue-400 font-medium mt-1">
            {incomingCall.meetingTitle || (isScheduled ? 'Scheduled meeting is starting now!' : 'Invited you to a meeting')}
          </p>
          <div className="mt-2 inline-block text-[11px] text-slate-400 font-mono bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800">
            Room: <span className="text-slate-200">{incomingCall.roomId}</span>
          </div>
        </div>

        {/* Sound indicator */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 my-4">
          <Volume2 className="w-3.5 h-3.5 text-blue-400 animate-bounce" />
          <span>Ringing & speaking announcement...</span>
        </div>

        {/* Action Buttons (Green Accept & Red Decline) */}
        <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-800/80">
          {/* Decline Button */}
          <button
            onClick={handleDecline}
            className="flex flex-col items-center justify-center gap-1 py-3 px-4 rounded-2xl bg-red-600/20 hover:bg-red-600 border border-red-500/30 hover:border-red-500 text-red-300 hover:text-white transition-all transform active:scale-95 group shadow-lg"
          >
            <div className="w-11 h-11 rounded-full bg-red-600 flex items-center justify-center text-white shadow-md group-hover:rotate-90 transition-transform">
              <PhoneOff className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold mt-1">Dismiss</span>
          </button>

          {/* Accept Button */}
          <button
            onClick={handleAccept}
            className="flex flex-col items-center justify-center gap-1 py-3 px-4 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 hover:border-emerald-500 text-emerald-300 hover:text-white transition-all transform active:scale-95 group shadow-lg"
          >
            <div className="w-11 h-11 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform animate-pulse">
              {isVideo ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
            </div>
            <span className="text-xs font-bold mt-1">
              {isScheduled ? 'Join Meeting Now' : 'Accept & Join'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
