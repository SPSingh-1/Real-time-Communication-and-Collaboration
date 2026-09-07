// src/components/VideoConference/AudioCall.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Users,
  Clock,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Radio,
  Disc,
  Square,
  MessageSquare,
  UserPlus,
  Calendar,
  Trash2,
  Play
} from 'lucide-react';
import { toast } from 'react-toastify';
import { WebRTCManager } from '../../services/webrtcService';
import MeetingInviteModal from './MeetingInviteModal';
import InCallChatAndFiles from './InCallChatAndFiles';
import ScheduleMeetingModal from './ScheduleMeetingModal';

const AudioCall = ({ user }) => {
  const [roomId, setRoomId] = useState('');
  const [inputRoomName, setInputRoomName] = useState('');
  const [isInCall, setIsInCall] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Audio Controls
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  // Raise Hand states
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [raisedHandsMap, setRaisedHandsMap] = useState(new Map());

  // Scheduled Meetings states
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // Modals & Drawers
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Participants & Streams
  const [localStream, setLocalStream] = useState(null);
  const [remotePeers, setRemotePeers] = useState(new Map()); // socketId -> { user, stream, audioEnabled }

  // Refs
  const socketRef = useRef(null);
  const webrtcManagerRef = useRef(null);
  const timerRef = useRef(null);
  const remoteAudioElementsRef = useRef(new Map()); // socketId -> HTMLAudioElement

  // Reset unread count when chat drawer is opened
  useEffect(() => {
    if (showChatDrawer) {
      setUnreadMessages(0);
    }
  }, [showChatDrawer]);

  // Format call duration HH:MM:SS
  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Timer counter
  useEffect(() => {
    if (isInCall) {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [isInCall]);

  // Connect socket & attach in-call event listeners
  useEffect(() => {
    const socket = io(`${import.meta.env.VITE_BACKEND_URL}`, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    const handleInCallMsg = (msg) => {
      const myId = user?._id || user?.id;
      const senderId = msg?.sender?.id;
      if (senderId && myId && String(senderId) === String(myId)) {
        return;
      }
      setUnreadMessages((prev) => prev + 1);
    };

    // Raise hand sync
    const handleRaiseHandChanged = (data) => {
      const { socketId, userId, userName, isRaised, loweredByHost } = data;
      setRaisedHandsMap((prev) => {
        const next = new Map(prev);
        if (isRaised) {
          next.set(socketId, { socketId, userId, userName, isRaised: true });
        } else {
          next.delete(socketId);
        }
        return next;
      });

      const myId = user?._id || user?.id;
      const isSelf = socket.id === socketId || (userId && myId && String(userId) === String(myId));

      if (loweredByHost && isSelf) {
        setIsHandRaised(false);
        toast.info('Your raised hand was lowered by the meeting host', { icon: '🖐️' });
      } else if (isRaised && !isSelf) {
        toast.info(`${userName || 'Teammate'} raised their hand 🖐️`, { icon: '✋' });
      }
    };

    const handleMeetingEndedByHost = (data) => {
      toast.warn(data.reason || "The voice lounge was ended by the host for all participants.", { icon: "🛑" });
      handleLeaveCall();
    };

    const handleMeetingJoinRejected = (data) => {
      toast.error(data.reason || "This voice lounge has ended and cannot be joined.", { icon: "❌" });
      handleLeaveCall();
    };

    socket.on('in-call-message', handleInCallMsg);
    socket.on('user-raised-hand-changed', handleRaiseHandChanged);
    socket.on('meeting-ended-by-host', handleMeetingEndedByHost);
    socket.on('meeting-join-rejected', handleMeetingJoinRejected);

    return () => {
      socket.off('in-call-message', handleInCallMsg);
      socket.off('user-raised-hand-changed', handleRaiseHandChanged);
      socket.off('meeting-ended-by-host', handleMeetingEndedByHost);
      socket.off('meeting-join-rejected', handleMeetingJoinRejected);
      if (webrtcManagerRef.current) {
        webrtcManagerRef.current.leaveCall();
      }
      socket.disconnect();
    };
  }, [user]);

  // Suggested audio room name
  const getRoleBasedRoomName = useCallback((customSuffix = '') => {
    if (!user) return 'voice-lounge';
    const suffix = (customSuffix || 'lounge').toLowerCase().replace(/\s+/g, '-');
    if (user.role === 'team') {
      const teamId = user.teamId ? user.teamId.toString().slice(-6) : 'team';
      return `team-${teamId}-${suffix}`;
    }
    if (user.role === 'global') {
      return `global-${suffix}`;
    }
    return `personal-${user.id ? user.id.toString().slice(-6) : 'user'}-${suffix}`;
  }, [user]);

  // Join Audio Call
  const handleJoinCall = async (targetRoomId) => {
    const activeRoom = (targetRoomId || inputRoomName.trim() || getRoleBasedRoomName('voice')).toLowerCase().replace(/\s+/g, '-');
    setIsJoining(true);

    try {
      const manager = new WebRTCManager({
        socket: socketRef.current,
        roomId: activeRoom,
        currentUser: {
          id: user?._id || user?.id,
          name: user?.name || user?.email?.split('@')[0] || 'User',
          email: user?.email,
          role: user?.role || 'single',
          photo: user?.photo,
        },
        onRemoteStream: ({ socketId, user: peerUser, stream }) => {
          setRemotePeers((prev) => {
            const next = new Map(prev);
            next.set(socketId, {
              socketId,
              user: peerUser,
              stream,
              audioEnabled: true,
            });
            return next;
          });

          // Play remote audio
          let audioEl = remoteAudioElementsRef.current.get(socketId);
          if (!audioEl) {
            audioEl = new Audio();
            audioEl.autoplay = true;
            remoteAudioElementsRef.current.set(socketId, audioEl);
          }
          audioEl.srcObject = stream;
        },
        onPeerLeft: (socketId) => {
          setRemotePeers((prev) => {
            const next = new Map(prev);
            next.delete(socketId);
            return next;
          });
          setRaisedHandsMap((prev) => {
            const next = new Map(prev);
            next.delete(socketId);
            return next;
          });
          const audioEl = remoteAudioElementsRef.current.get(socketId);
          if (audioEl) {
            audioEl.srcObject = null;
            remoteAudioElementsRef.current.delete(socketId);
          }
        },
        onPeerMediaState: ({ socketId, type, enabled }) => {
          if (type === 'audio') {
            setRemotePeers((prev) => {
              const next = new Map(prev);
              const peer = next.get(socketId);
              if (peer) {
                peer.audioEnabled = enabled;
                next.set(socketId, { ...peer });
              }
              return next;
            });
          }
        },
      });

      const stream = await manager.startLocalStream(true);
      setLocalStream(stream);

      manager.initSignaling();
      webrtcManagerRef.current = manager;

      setRoomId(activeRoom);
      setIsInCall(true);
      setIsMuted(false);
      setIsDeafened(false);
      setIsHandRaised(false);
      setRaisedHandsMap(new Map());
      toast.success(`Connected to Voice Lounge: ${activeRoom}`);
    } catch (err) {
      console.error('Audio call connection failed:', err);
      toast.error('Could not access microphone. Please check permissions.');
    } finally {
      setIsJoining(false);
    }
  };

  // Leave Audio Call
  const handleLeaveCall = () => {
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.leaveCall();
      webrtcManagerRef.current = null;
    }
    if (isRecording) {
      handleToggleRecording();
    }
    if (isHandRaised && socketRef.current) {
      socketRef.current.emit('toggle-raise-hand', {
        roomId,
        isRaised: false,
        user: { id: user?._id || user?.id, name: user?.name }
      });
    }
    remoteAudioElementsRef.current.forEach((audioEl) => {
      audioEl.srcObject = null;
    });
    remoteAudioElementsRef.current.clear();
    setLocalStream(null);
    setRemotePeers(new Map());
    setRaisedHandsMap(new Map());
    setIsInCall(false);
    setIsHandRaised(false);
    setShowChatDrawer(false);
    toast.info('Left Voice Lounge');
  };

  // End Voice Lounge for All
  const handleEndMeetingForAll = () => {
    if (socketRef.current) {
      socketRef.current.emit('host-end-meeting-for-all', {
        roomId,
        user: { id: user?._id || user?.id, name: user?.name }
      });
    }
    toast.info('You ended the voice lounge for all participants.');
    setShowLeaveConfirmModal(false);
    handleLeaveCall();
  };

  // Toggle Raise Hand
  const handleToggleRaiseHand = () => {
    if (!socketRef.current) return;
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);
    socketRef.current.emit('toggle-raise-hand', {
      roomId,
      isRaised: nextState,
      user: {
        id: user?._id || user?.id,
        name: user?.name || 'Teammate'
      }
    });
    if (nextState) {
      toast.success('You raised your hand 🖐️');
    } else {
      toast.info('You lowered your hand');
    }
  };

  // Toggle Microphone
  const handleToggleMute = () => {
    if (webrtcManagerRef.current) {
      const nextMute = !isMuted;
      webrtcManagerRef.current.toggleAudio(!nextMute);
      setIsMuted(nextMute);
    }
  };

  // Toggle Deafen
  const handleToggleDeafen = () => {
    const nextDeafen = !isDeafened;
    setIsDeafened(nextDeafen);
    remoteAudioElementsRef.current.forEach((audioEl) => {
      audioEl.muted = nextDeafen;
    });
    toast.info(nextDeafen ? 'Audio deafened' : 'Audio undeafened');
  };

  // Format recording time
  const formatRecordingTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Toggle Audio Recording
  const handleToggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      clearInterval(recordingTimerRef.current);
      setIsRecording(false);
      setRecordingDuration(0);
      toast.success('Audio recording saved and downloading!');
    } else {
      try {
        if (!localStream) {
          toast.error('No active microphone stream to record');
          return;
        }

        recordedChunksRef.current = [];
        const recorder = new MediaRecorder(localStream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
        });

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `voice_recording_${roomId || 'voice'}_${new Date().toISOString().slice(0, 10)}.webm`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          }, 100);
        };

        recorder.start(1000);
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
        setRecordingDuration(0);

        recordingTimerRef.current = setInterval(() => {
          setRecordingDuration((prev) => prev + 1);
        }, 1000);

        toast.success('Voice recording started 🔴');
      } catch (recErr) {
        console.error('Audio recording error:', recErr);
        toast.error('Could not start audio recording');
      }
    }
  };

  // Start Instant Voice
  const handleStartInstantVoice = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const newRoom = `voice-${code}`;
    setInputRoomName(newRoom);
    handleJoinCall(newRoom);
  };

  // Start Voice & Invite
  const handleStartAndInviteVoice = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const newRoom = `voice-${code}`;
    setInputRoomName(newRoom);
    handleJoinCall(newRoom);
    setTimeout(() => {
      setShowInviteModal(true);
    }, 600);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/dashboard/tools/video?audioRoom=${roomId}&autoJoin=true`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success('Voice room link copied!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const totalParticipants = remotePeers.size + 1;

  return (
    <div className="w-full flex flex-col items-center">
      {!isInCall ? (
        /* AUDIO LOBBY */
        <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Voice Lounge</h2>
              <p className="text-xs sm:text-sm text-slate-400">Low-latency HD Audio • Noise Cancellation • Instant 1-Click Join</p>
            </div>
          </div>

          {/* 3 Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
            <button
              onClick={handleStartInstantVoice}
              disabled={isJoining}
              className="p-4 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-600/30 flex flex-col items-center justify-center gap-1.5 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 group text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                <Phone className="w-5 h-5" />
              </div>
              <div className="text-sm">Start Instant</div>
              <span className="text-[10px] text-emerald-100 font-normal">Auto-generates room</span>
            </button>

            <button
              onClick={handleStartAndInviteVoice}
              disabled={isJoining}
              className="p-4 rounded-2xl bg-gradient-to-tr from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-teal-600/30 flex flex-col items-center justify-center gap-1.5 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 group text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                <UserPlus className="w-5 h-5" />
              </div>
              <div className="text-sm">Start & Invite</div>
              <span className="text-[10px] text-teal-100 font-normal">Auto-start + @all invite</span>
            </button>

            <button
              onClick={() => setShowScheduleModal(true)}
              disabled={isJoining}
              className="p-4 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold shadow-lg shadow-purple-600/30 flex flex-col items-center justify-center gap-1.5 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 group text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="text-sm">Schedule Call</div>
              <span className="text-[10px] text-indigo-100 font-normal">Set time + auto-rings @all</span>
            </button>
          </div>

          {/* Custom / Existing Room (Optional) */}
          <div className="pt-5 border-t border-slate-800/80">
            <label className="block text-xs font-semibold text-slate-400 mb-2">
              Or join with specific Room ID / Link (Optional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputRoomName}
                onChange={(e) => setInputRoomName(e.target.value)}
                placeholder="Enter custom room name..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs sm:text-sm"
              />
              <button
                onClick={() => handleJoinCall(inputRoomName)}
                disabled={isJoining || !inputRoomName.trim()}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs sm:text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Join Lounge
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ACTIVE VOICE ROOM */
        <div className="w-full max-w-4xl bg-gradient-to-b from-gray-900 to-gray-950 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>

          {/* Header Info */}
          <div className="w-full flex items-center justify-between pb-6 border-b border-white/10 mb-8 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-wide">{roomId}</h3>
                <p className="text-xs text-emerald-400 font-mono">Live Voice Stream ({totalParticipants} Connected)</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Call Timer */}
              <div className="px-3 py-1.5 rounded-xl bg-gray-800/80 border border-white/10 flex items-center gap-2 text-gray-300 text-xs font-mono">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{formatTime(callDuration)}</span>
              </div>

              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-xs text-gray-200 border border-white/10 flex items-center gap-1.5 transition-all"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Copy Link</span>
              </button>
            </div>
          </div>

          {/* Voice Participants Grid */}
          <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6 mb-10 z-10">
            {/* Local User Card */}
            <div className="flex flex-col items-center p-4 rounded-2xl bg-gray-800/50 backdrop-blur-md border border-emerald-500/30 relative group shadow-lg">
              <div className="relative mb-3">
                <div
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white text-2xl font-bold shadow-xl transition-all ${
                    !isMuted ? 'ring-4 ring-emerald-500/40 scale-105' : 'opacity-80'
                  }`}
                >
                  {user?.name?.[0]?.toUpperCase() || 'Y'}
                </div>

                {isHandRaised && (
                  <div className="absolute -top-2 -right-2 p-1.5 bg-amber-500 rounded-full text-slate-950 font-black text-xs shadow-lg animate-bounce">
                    🖐️
                  </div>
                )}

                {/* Mute badge */}
                {isMuted && (
                  <div className="absolute -bottom-1 -right-1 p-1.5 bg-red-500 rounded-full text-white shadow-md">
                    <MicOff className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              <span className="text-sm font-semibold text-white truncate max-w-full">{user?.name || 'You'} (You)</span>
              <span className="text-xs text-emerald-400 mt-0.5">{isHandRaised ? '🖐️ Hand Raised' : isMuted ? 'Muted' : 'Speaking'}</span>
            </div>

            {/* Remote Peers Cards */}
            {Array.from(remotePeers.values()).map((peer) => {
              const hasHandRaised = raisedHandsMap.has(peer.socketId);
              return (
                <div
                  key={peer.socketId}
                  className="flex flex-col items-center p-4 rounded-2xl bg-gray-800/40 backdrop-blur-md border border-white/10 relative group shadow-lg"
                >
                  <div className="relative mb-3">
                    <div
                      className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-xl transition-all ${
                        peer.audioEnabled !== false ? 'ring-4 ring-indigo-500/40' : 'opacity-70'
                      }`}
                    >
                      {peer.user?.name?.[0]?.toUpperCase() || 'P'}
                    </div>

                    {hasHandRaised && (
                      <div className="absolute -top-2 -right-2 p-1.5 bg-amber-500 rounded-full text-slate-950 font-black text-xs shadow-lg animate-bounce">
                        🖐️
                      </div>
                    )}

                    {peer.audioEnabled === false && (
                      <div className="absolute -bottom-1 -right-1 p-1.5 bg-red-500 rounded-full text-white shadow-md">
                        <MicOff className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  <span className="text-sm font-semibold text-gray-200 truncate max-w-full">{peer.user?.name || 'Participant'}</span>
                  <span className="text-xs text-gray-400 mt-0.5">{hasHandRaised ? '🖐️ Hand Raised' : peer.audioEnabled === false ? 'Muted' : 'Connected'}</span>
                </div>
              );
            })}
          </div>

          {/* Floating Action Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3 z-10 flex-wrap justify-center">
            {/* Mic Mute / Unmute */}
            <button
              onClick={handleToggleMute}
              className={`p-3.5 rounded-2xl font-semibold flex items-center gap-2 shadow-xl transition-all transform hover:scale-105 active:scale-95 ${
                isMuted
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30'
                  : 'bg-gray-800 hover:bg-gray-700 text-white border border-white/10'
              }`}
              title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-emerald-400" />}
              <span className="hidden sm:inline text-xs">{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>

            {/* Deafen Toggle */}
            <button
              onClick={handleToggleDeafen}
              className={`p-3.5 rounded-2xl font-semibold flex items-center gap-2 shadow-xl transition-all transform hover:scale-105 active:scale-95 ${
                isDeafened
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-white/10'
              }`}
              title={isDeafened ? 'Undeafen' : 'Deafen'}
            >
              {isDeafened ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              <span className="hidden sm:inline text-xs">{isDeafened ? 'Deafened' : 'Deafen'}</span>
            </button>

            {/* Raise Hand */}
            <button
              onClick={handleToggleRaiseHand}
              className={`p-3.5 rounded-2xl font-semibold flex items-center gap-2 shadow-xl transition-all transform hover:scale-105 active:scale-95 ${
                isHandRaised
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-amber-500/40 ring-2 ring-amber-300 animate-pulse'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-white/10'
              }`}
              title={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
            >
              <span className="text-lg leading-none">🖐️</span>
              <span className="hidden sm:inline text-xs">{isHandRaised ? 'Hand Raised' : 'Raise Hand'}</span>
            </button>

            {/* Voice Recording */}
            <button
              onClick={handleToggleRecording}
              className={`p-3.5 rounded-2xl font-semibold flex items-center gap-2 shadow-xl transition-all transform hover:scale-105 active:scale-95 ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/40 animate-pulse'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-white/10'
              }`}
              title={isRecording ? 'Stop Recording' : 'Record Audio'}
            >
              {isRecording ? <Square className="w-5 h-5 text-white" /> : <Disc className="w-5 h-5 text-red-400" />}
              <span className="text-xs font-semibold">
                {isRecording ? `REC ${formatRecordingTime(recordingDuration)}` : 'Record'}
              </span>
            </button>

            {/* Invite Teammates */}
            <button
              onClick={() => setShowInviteModal(true)}
              className="p-3.5 rounded-2xl font-semibold flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-white/10 shadow-xl transition-all"
              title="Invite Teammates (@all / Specific)"
            >
              <UserPlus className="w-5 h-5 text-blue-400" />
              <span className="hidden sm:inline text-xs">Invite</span>
            </button>

            {/* In-Call Chat & Files with Unread Badge */}
            <button
              onClick={() => {
                setShowChatDrawer(!showChatDrawer);
                if (!showChatDrawer) setUnreadMessages(0);
              }}
              className={`p-3.5 rounded-2xl font-semibold flex items-center gap-2 transition-all shadow-xl relative ${
                showChatDrawer
                  ? 'bg-blue-600 text-white shadow-blue-500/30 ring-2 ring-blue-400'
                  : unreadMessages > 0
                  ? 'bg-gray-800 text-white border-2 border-red-500 shadow-red-500/40 animate-pulse'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-white/10'
              }`}
              title="In-Call Chat & Files"
            >
              <div className="relative flex items-center justify-center">
                <MessageSquare className={`w-5 h-5 ${unreadMessages > 0 && !showChatDrawer ? 'text-red-400' : 'text-emerald-400'}`} />
                {unreadMessages > 0 && !showChatDrawer && (
                  <span className="absolute -top-3 -right-3 bg-red-600 text-white font-black text-[10px] min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center animate-bounce shadow-xl ring-2 ring-gray-900 z-30">
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline text-xs">Chat & Files</span>
              {unreadMessages > 0 && !showChatDrawer && (
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black shadow-md animate-pulse">
                  {unreadMessages}
                </span>
              )}
            </button>

            {/* Leave Audio Lounge */}
            <button
              onClick={() => {
                if (remotePeers.size > 0) {
                  setShowLeaveConfirmModal(true);
                } else {
                  handleLeaveCall();
                }
              }}
              className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold flex items-center gap-2 shadow-xl shadow-red-600/40 transition-all transform hover:scale-105 active:scale-95"
            >
              <PhoneOff className="w-5 h-5" />
              <span className="text-xs">Leave / End</span>
            </button>
          </div>

          {/* Sliding In-Call Chat & Files Drawer */}
          <InCallChatAndFiles
            isOpen={showChatDrawer}
            onClose={() => setShowChatDrawer(false)}
            socket={socketRef.current}
            roomId={roomId}
            currentUser={user}
            meetingHost={user}
          />
        </div>
      )}

      {/* Leave or End Meeting Confirmation Modal */}
      {showLeaveConfirmModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto mb-4">
              <PhoneOff className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Leave or End Voice Lounge?</h3>
            <p className="text-xs text-slate-400 mb-6">
              If you end the meeting for all, no one will be able to rejoin this room.
            </p>
            <div className="space-y-2.5">
              <button
                onClick={handleEndMeetingForAll}
                className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition flex items-center justify-center gap-2"
              >
                <span>🛑 End Voice Lounge for All</span>
              </button>
              <button
                onClick={() => {
                  setShowLeaveConfirmModal(false);
                  handleLeaveCall();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                Just Leave Lounge
              </button>
              <button
                onClick={() => setShowLeaveConfirmModal(false)}
                className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meeting Invite Modal */}
      <MeetingInviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        socket={socketRef.current}
        currentUser={user}
        roomId={roomId || inputRoomName || getRoleBasedRoomName('voice')}
        callType="audio"
      />

      {/* Schedule Meeting Modal */}
      <ScheduleMeetingModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        currentUser={user}
      />
    </div>
  );
};

export default AudioCall;