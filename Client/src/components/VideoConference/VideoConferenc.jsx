// src/components/VideoConference/VideoConferenc.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Users,
  Copy,
  Check,
  Maximize,
  Minimize,
  Sparkles,
  Shield,
  Volume2,
  Settings,
  RefreshCw,
  Plus,
  Disc,
  Square,
  MessageSquare,
  UserPlus,
  Paperclip,
  Calendar,
  Clock,
  Trash2,
  Play,
  Pencil,
  BarChart3,
  Smile,
  Flame,
  Heart,
  ThumbsUp,
  Rocket,
  PartyPopper
} from 'lucide-react';
import { toast } from 'react-toastify';
import { WebRTCManager } from '../../services/webrtcService';
import MeetingInviteModal from './MeetingInviteModal';
import InCallChatAndFiles from './InCallChatAndFiles';
import ScheduleMeetingModal from './ScheduleMeetingModal';
import InCallWhiteboard from './InCallWhiteboard';
import InCallPolls from './InCallPolls';

const VideoConference = ({ user, autoJoinMeeting }) => {
  const [roomId, setRoomId] = useState('');
  const [inputRoomName, setInputRoomName] = useState('');
  const [isInCall, setIsInCall] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Media states
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Raise Hand states
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [raisedHandsMap, setRaisedHandsMap] = useState(new Map()); // socketId -> { socketId, userId, userName, isRaised, timestamp }

  // Scheduled Meetings states
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [scheduledMeetings, setScheduledMeetings] = useState([]);
  const [loadingScheduledMeetings, setLoadingScheduledMeetings] = useState(false);
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);

  // Interactive In-Call Tools (Whiteboard, Polls, Floating Reactions)
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [whiteboardOpenedBy, setWhiteboardOpenedBy] = useState(null);
  const [showPolls, setShowPolls] = useState(false);
  const [showReactionsBar, setShowReactionsBar] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState([]);

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
  const [remotePeers, setRemotePeers] = useState(new Map()); // socketId -> { user, stream, audioEnabled, videoEnabled }
  const [showParticipantsList, setShowParticipantsList] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Refs
  const localVideoRef = useRef(null);
  const conferenceContainerRef = useRef(null);
  const socketRef = useRef(null);
  const webrtcManagerRef = useRef(null);
  const lastJoinedMeetingTimestampRef = useRef(0);

  // Fetch upcoming scheduled meetings for lobby
  const fetchScheduledMeetings = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      setLoadingScheduledMeetings(true);
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/scheduled-meetings`, {
        headers: { 'auth-token': token }
      });
      if (res.data?.success) {
        setScheduledMeetings(res.data.meetings || []);
      }
    } catch (err) {
      console.error('Error fetching scheduled meetings in lobby:', err);
    } finally {
      setLoadingScheduledMeetings(false);
    }
  }, []);

  useEffect(() => {
    if (!isInCall) {
      fetchScheduledMeetings();
    }
  }, [isInCall, fetchScheduledMeetings]);

  // Generate random room identifier (e.g. meet-8x4f2a)
  const generateRandomRoomId = useCallback(() => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `meet-${code}`;
  }, []);

  // Auto-join meeting if passed via prop (e.g. from 1-click accept on incoming call modal)
  useEffect(() => {
    if (autoJoinMeeting && autoJoinMeeting.roomId && autoJoinMeeting.timestamp !== lastJoinedMeetingTimestampRef.current) {
      lastJoinedMeetingTimestampRef.current = autoJoinMeeting.timestamp;
      setInputRoomName(autoJoinMeeting.roomId);
      
      const tryAutoJoin = () => {
        if (!socketRef.current) {
          socketRef.current = io(`${import.meta.env.VITE_BACKEND_URL}`, {
            transports: ['websocket', 'polling'],
          });
        }
        handleJoinCall(autoJoinMeeting.roomId);
      };
      
      setTimeout(tryAutoJoin, 150);
    }
  }, [autoJoinMeeting]);

  // URL search params check for 1-click auto join from notifications
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const autoJoinParam = params.get('autoJoin');
    if (roomParam && autoJoinParam === 'true') {
      setInputRoomName(roomParam);
      window.history.replaceState({}, document.title, window.location.pathname);
      
      const tryAutoJoinUrl = () => {
        if (!socketRef.current) {
          socketRef.current = io(`${import.meta.env.VITE_BACKEND_URL}`, {
            transports: ['websocket', 'polling'],
          });
        }
        handleJoinCall(roomParam);
      };

      setTimeout(tryAutoJoinUrl, 200);
    }
  }, []);

  // Reset unread count when chat drawer is opened
  useEffect(() => {
    if (showChatDrawer) {
      setUnreadMessages(0);
    }
  }, [showChatDrawer]);

  // Default suggested room name based on role
  const getRoleBasedRoomName = useCallback((customSuffix = '') => {
    if (!user) return 'general-room';
    const suffix = (customSuffix || 'room').toLowerCase().replace(/\s+/g, '-');
    if (user.role === 'team') {
      const teamId = user.teamId ? user.teamId.toString().slice(-6) : 'team';
      return `team-${teamId}-${suffix}`;
    }
    if (user.role === 'global') {
      return `global-${suffix}`;
    }
    return `personal-${user.id ? user.id.toString().slice(-6) : 'user'}-${suffix}`;
  }, [user]);

  // Connect socket on mount
  useEffect(() => {
    const socket = io(`${import.meta.env.VITE_BACKEND_URL}`, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    // Register user socket on connect and reconnect
    const register = () => {
      const uid = user?._id || user?.id;
      if (uid) {
        socket.emit('register-user-socket', {
          userId: String(uid),
          teamId: user.teamId ? String(user.teamId) : null,
          role: user.role,
        });
      }
    };

    socket.on('connect', register);
    if (socket.connected) {
      register();
    }

    // In-call chat message receiver
    const handleInCallMsg = (msg) => {
      const myId = user?._id || user?.id;
      const senderId = msg?.sender?.id;
      if (senderId && myId && String(senderId) === String(myId)) {
        return;
      }
      setUnreadMessages((prev) => prev + 1);
    };

    // Remote Host Mute listener
    const handleHostMutedYou = () => {
      if (webrtcManagerRef.current) {
        webrtcManagerRef.current.toggleAudio(false);
        setIsAudioMuted(true);
      }
      toast.warn('You were muted by the meeting host', {
        icon: '🔇',
      });
    };

    // Real-time Raise Hand listener
    const handleRaiseHandChanged = (data) => {
      const { socketId, userId, userName, isRaised, loweredByHost } = data;
      setRaisedHandsMap((prev) => {
        const next = new Map(prev);
        if (isRaised) {
          next.set(socketId, { socketId, userId, userName, isRaised: true, timestamp: Date.now() });
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

    // Real-time scheduled meeting updates
    const handleScheduledMeetingEvent = () => {
      fetchScheduledMeetings();
    };

    const handleMeetingEndedByHost = (data) => {
      toast.warn(data.reason || "The meeting was ended by the host for all participants.", { icon: "🛑" });
      handleLeaveCall();
    };

    const handleMeetingJoinRejected = (data) => {
      toast.error(data.reason || "This meeting has ended and cannot be joined.", { icon: "❌" });
      handleLeaveCall();
    };

    // Live Floating Reaction Receiver (Broadcasted to all participants)
    const handleFloatingReaction = ({ emoji, senderName, id, senderId }) => {
      const isMe = user && senderId && String(senderId) === String(user._id || user.id);
      const displayName = isMe ? 'You' : (senderName || 'Teammate');
      const newReact = {
        id: id || `react_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        emoji,
        senderName: displayName,
        left: Math.floor(Math.random() * 60) + 20
      };
      setFloatingReactions((prev) => {
        if (prev.some((r) => r.id === newReact.id)) return prev;
        return [...prev, newReact];
      });
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== newReact.id));
      }, 3500);
    };

    // Collaborative Whiteboard broadcast receiver
    const handleWhiteboardStateChanged = (data) => {
      setShowWhiteboard(data.isOpen);
      if (data.isOpen) {
        setWhiteboardOpenedBy(data.user);
        toast.info(`🎨 ${data.user?.name || 'Teammate'} opened the Collaborative Whiteboard`, { icon: '✏️' });
      } else {
        setWhiteboardOpenedBy(null);
      }
    };

    socket.on('in-call-message', handleInCallMsg);
    socket.on('host-muted-you', handleHostMutedYou);
    socket.on('user-raised-hand-changed', handleRaiseHandChanged);
    socket.on('new-scheduled-meeting', handleScheduledMeetingEvent);
    socket.on('scheduled-meeting-cancelled', handleScheduledMeetingEvent);
    socket.on('scheduled-meeting-started', handleScheduledMeetingEvent);
    socket.on('scheduled-meeting-ended', handleScheduledMeetingEvent);
    socket.on('meeting-ended-by-host', handleMeetingEndedByHost);
    socket.on('meeting-join-rejected', handleMeetingJoinRejected);
    socket.on('floating-reaction', handleFloatingReaction);
    socket.on('whiteboard-state-changed', handleWhiteboardStateChanged);

    return () => {
      socket.off('in-call-message', handleInCallMsg);
      socket.off('host-muted-you', handleHostMutedYou);
      socket.off('user-raised-hand-changed', handleRaiseHandChanged);
      socket.off('new-scheduled-meeting', handleScheduledMeetingEvent);
      socket.off('scheduled-meeting-cancelled', handleScheduledMeetingEvent);
      socket.off('scheduled-meeting-started', handleScheduledMeetingEvent);
      socket.off('scheduled-meeting-ended', handleScheduledMeetingEvent);
      socket.off('meeting-ended-by-host', handleMeetingEndedByHost);
      socket.off('meeting-join-rejected', handleMeetingJoinRejected);
      socket.off('floating-reaction', handleFloatingReaction);
      socket.off('whiteboard-state-changed', handleWhiteboardStateChanged);
      if (webrtcManagerRef.current) {
        webrtcManagerRef.current.leaveCall();
      }
      socket.disconnect();
    };
  }, [user, fetchScheduledMeetings]);

  // Send Floating Reaction to All Participants
  const handleSendReaction = (emoji) => {
    if (!socketRef.current || !roomId) return;
    const reactId = `react_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    socketRef.current.emit('send-reaction', {
      roomId,
      emoji,
      senderName: user?.name || 'Teammate',
      senderId: user?._id || user?.id,
      id: reactId
    });
  };

  // Host Mutes a Participant
  const handleHostMuteParticipant = (targetSocketId, targetUser) => {
    if (!socketRef.current) return;
    socketRef.current.emit('host-mute-user', {
      roomId,
      targetSocketId,
      targetUserId: targetUser?._id || targetUser?.id,
    });
    toast.success(`Muted ${targetUser?.name || 'Participant'}`);
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
        name: user?.name || user?.email?.split('@')[0] || 'Teammate'
      }
    });
    if (nextState) {
      toast.success('You raised your hand 🖐️');
    } else {
      toast.info('You lowered your hand');
    }
  };

  // Host Lowers a Participant's Hand
  const handleHostLowerHand = (targetSocketId, targetUser) => {
    if (!socketRef.current) return;
    socketRef.current.emit('host-lower-hand', {
      roomId,
      targetSocketId,
      targetUserId: targetUser?._id || targetUser?.id,
      targetUserName: targetUser?.name
    });
    toast.success(`Lowered hand for ${targetUser?.name || 'Participant'}`);
  };

  // Handle Cancel Scheduled Meeting
  const handleCancelScheduledMeeting = async (meetingId) => {
    if (!window.confirm('Are you sure you want to cancel this scheduled meeting?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/scheduled-meetings/${meetingId}`, {
        headers: { 'auth-token': token }
      });
      toast.success('Scheduled meeting cancelled');
      fetchScheduledMeetings();
    } catch (err) {
      console.error('Error cancelling meeting:', err);
      toast.error(err.response?.data?.error || 'Failed to cancel meeting');
    }
  };

  // Handle local video playback
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isInCall]);

  // Start Call
  const handleJoinCall = async (targetRoomId) => {
    const activeRoom = (targetRoomId || inputRoomName.trim() || getRoleBasedRoomName('main')).toLowerCase().replace(/\s+/g, '-');
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
            const existing = next.get(socketId) || {};
            next.set(socketId, {
              ...existing,
              socketId,
              user: peerUser,
              stream,
              audioEnabled: existing.audioEnabled ?? true,
              videoEnabled: existing.videoEnabled ?? true,
            });
            return next;
          });
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
        },
        onPeerMediaState: ({ socketId, type, enabled }) => {
          setRemotePeers((prev) => {
            const next = new Map(prev);
            const peer = next.get(socketId);
            if (peer) {
              if (type === 'audio') peer.audioEnabled = enabled;
              if (type === 'video') peer.videoEnabled = enabled;
              if (type === 'screen') peer.isScreenSharing = enabled;
              next.set(socketId, { ...peer });
            }
            return next;
          });
        },
      });

      const stream = await manager.startLocalStream(false);
      setLocalStream(stream);

      manager.initSignaling();
      webrtcManagerRef.current = manager;

      const hasVideo = stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks().some(t => t.readyState === 'live');
      setIsVideoMuted(!hasVideo);
      if (!hasVideo) {
        toast.info("Camera unavailable or in use by another tab. Voice audio active 🎤", { icon: "🎤" });
      }

      setRoomId(activeRoom);
      setIsInCall(true);
      setIsAudioMuted(false);
      setIsScreenSharing(false);
      setIsHandRaised(false);
      setRaisedHandsMap(new Map());
      toast.success(`Joined conference: ${activeRoom}`);
    } catch (err) {
      console.error('Failed to start conference:', err);
      toast.error('Could not access camera/microphone. Please check browser permissions.');
    } finally {
      setIsJoining(false);
    }
  };

  // Leave Call
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
    setLocalStream(null);
    setRemotePeers(new Map());
    setRaisedHandsMap(new Map());
    setIsInCall(false);
    setIsScreenSharing(false);
    setIsFullscreen(false);
    setIsHandRaised(false);
    setShowChatDrawer(false);
    toast.info('Left video conference');
  };

  // End Meeting for All Participants
  const handleEndMeetingForAll = () => {
    if (socketRef.current) {
      socketRef.current.emit('host-end-meeting-for-all', {
        roomId,
        user: { id: user?._id || user?.id, name: user?.name }
      });
    }
    toast.info('You ended the meeting for all participants.');
    setShowLeaveConfirmModal(false);
    handleLeaveCall();
  };

  // Format recording time HH:MM:SS
  const formatRecordingTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Toggle Meeting Recording
  const handleToggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      clearInterval(recordingTimerRef.current);
      setIsRecording(false);
      setRecordingDuration(0);
      toast.success('Meeting recording saved and downloading!');
    } else {
      // Start recording
      try {
        let streamToRecord = null;
        try {
          streamToRecord = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        } catch (e) {
          streamToRecord = localStream;
        }

        if (!streamToRecord) {
          toast.error('No active stream found to record');
          return;
        }

        recordedChunksRef.current = [];
        const recorder = new MediaRecorder(streamToRecord, {
          mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
            ? 'video/webm;codecs=vp9'
            : 'video/webm'
        });

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `meeting_recording_${roomId || 'video'}_${new Date().toISOString().slice(0, 10)}.webm`;
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

        toast.success('Meeting recording started 🔴');
      } catch (recErr) {
        console.error('Recording error:', recErr);
        toast.error('Could not start recording');
      }
    }
  };

  // Toggle Mic
  const handleToggleAudio = () => {
    if (webrtcManagerRef.current) {
      const nextState = !isAudioMuted;
      webrtcManagerRef.current.toggleAudio(!nextState);
      setIsAudioMuted(nextState);
    }
  };

  // Toggle Camera
  const handleToggleVideo = async () => {
    if (webrtcManagerRef.current) {
      const targetState = isVideoMuted; // if currently muted, we want to enable (true)
      const result = await webrtcManagerRef.current.toggleVideo(targetState);
      if (result === false && targetState === true) {
        toast.error('Could not access camera hardware. It may be in use by another tab or app.');
        setIsVideoMuted(true);
      } else {
        setIsVideoMuted(!targetState);
        if (localVideoRef.current && localStream) {
          localVideoRef.current.srcObject = localStream;
        }
      }
    }
  };

  // Toggle Screen Share
  const handleToggleScreenShare = async () => {
    if (!webrtcManagerRef.current) return;
    if (isScreenSharing) {
      webrtcManagerRef.current.stopScreenShare();
      setIsScreenSharing(false);
      if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream;
      }
    } else {
      const screenStream = await webrtcManagerRef.current.startScreenShare();
      if (screenStream) {
        setIsScreenSharing(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
          }
        };
      }
    }
  };

  // Copy Room Link
  const handleCopyRoomLink = (customRoom) => {
    const targetRoom = customRoom || roomId;
    const url = `${window.location.origin}/dashboard/tools/video?room=${targetRoom}&autoJoin=true`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success('Meeting link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Toggle Fullscreen
  const handleToggleFullscreen = () => {
    if (!conferenceContainerRef.current) return;
    if (!document.fullscreenElement) {
      conferenceContainerRef.current.requestFullscreen().catch(console.warn);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.warn);
      setIsFullscreen(false);
    }
  };

  // Start Instant Random Meeting
  const handleStartInstantMeeting = () => {
    const newRoom = generateRandomRoomId();
    setInputRoomName(newRoom);
    handleJoinCall(newRoom);
  };

  // Start Meeting and immediately prompt Invite modal
  const handleStartAndInvite = () => {
    const newRoom = generateRandomRoomId();
    setInputRoomName(newRoom);
    handleJoinCall(newRoom);
    setTimeout(() => {
      setShowInviteModal(true);
    }, 600);
  };

  // Calculate dynamic grid classes based on participant count
  const totalCount = remotePeers.size + 1;
  const getGridClass = () => {
    if (totalCount === 1) return 'grid-cols-1 max-w-3xl mx-auto';
    if (totalCount === 2) return 'grid-cols-1 md:grid-cols-2';
    if (totalCount <= 4) return 'grid-cols-1 sm:grid-cols-2';
    if (totalCount <= 6) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
  };

  // Format scheduled time helper
  const formatMeetingDate = (dateStr) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Scheduled';
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeString = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today, ${timeString}`;
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeString}`;
  };

  return (
    <div className="w-full flex flex-col items-center">
      {!isInCall ? (
        /* LOBBY / PRE-JOIN SCREEN */
        <div className="w-full max-w-3xl space-y-6">
          {/* Main Action Hub Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">Video Conference</h2>
                <p className="text-xs sm:text-sm text-slate-400">Encrypted P2P HD Video & Audio • 1-Click Meetings & Scheduling</p>
              </div>
            </div>

            {/* 3 Action Buttons: Instant, Start & Invite, and Schedule */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
              {/* 1. Start Instant */}
              <button
                onClick={handleStartInstantMeeting}
                disabled={isJoining}
                className="p-4 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-blue-600/30 flex flex-col items-center justify-center gap-1.5 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 group text-center"
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                  <Video className="w-5 h-5" />
                </div>
                <div className="text-sm">Start Instant</div>
                <span className="text-[10px] text-blue-100 font-normal">Connects immediately</span>
              </button>

              {/* 2. Start & Invite */}
              <button
                onClick={handleStartAndInvite}
                disabled={isJoining}
                className="p-4 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold shadow-lg shadow-purple-600/30 flex flex-col items-center justify-center gap-1.5 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 group text-center"
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div className="text-sm">Start & Invite</div>
                <span className="text-[10px] text-indigo-100 font-normal">Auto-start + @all invite</span>
              </button>

              {/* 3. Schedule Meeting */}
              <button
                onClick={() => setShowScheduleModal(true)}
                disabled={isJoining}
                className="p-4 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold shadow-lg shadow-pink-600/30 flex flex-col items-center justify-center gap-1.5 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 group text-center"
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="text-sm">Schedule Meeting</div>
                <span className="text-[10px] text-purple-100 font-normal">Set time + auto-rings @all</span>
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
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs sm:text-sm"
                />
                <button
                  onClick={() => handleJoinCall(inputRoomName)}
                  disabled={isJoining || !inputRoomName.trim()}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs sm:text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Join Room
                </button>
              </div>
            </div>
          </div>

          {/* Upcoming Scheduled Meetings Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Upcoming Scheduled Meetings</h3>
                  <p className="text-[11px] text-slate-400">Teammates will be automatically notified & called when meeting starts</p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(true)}
                className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Schedule New</span>
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              {loadingScheduledMeetings ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading scheduled meetings...</div>
              ) : scheduledMeetings.length === 0 ? (
                <div className="py-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800/60 p-4">
                  <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-60" />
                  <p className="text-xs text-slate-400 font-medium">No upcoming scheduled meetings</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Click "Schedule Meeting" above to set up a future meeting with auto-ring.</p>
                </div>
              ) : (
                scheduledMeetings.map((meeting) => {
                  const isHost = String(meeting.hostUser?.id) === String(user?._id || user?.id);
                  const isAudio = meeting.callType === 'audio';
                  const meetingTime = new Date(meeting.scheduledTime).getTime();
                  const nowTime = Date.now();
                  const isCompleted = meeting.status === 'completed';
                  const isPast = meetingTime < (nowTime - 5 * 60 * 1000);
                  const isExpired = isCompleted || isPast;
                  const isLiveNow = !isExpired && (meetingTime <= nowTime && (nowTime - meetingTime < 60 * 60 * 1000));

                  return (
                    <div
                      key={meeting._id}
                      className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition ${
                        isLiveNow
                          ? 'bg-purple-950/40 border-purple-500/60 shadow-lg shadow-purple-950/50'
                          : isExpired
                          ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isLiveNow ? 'bg-purple-600 text-white animate-pulse' : 'bg-slate-800 text-purple-400 border border-slate-700'
                        }`}>
                          {isAudio ? <Volume2 className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs sm:text-sm font-bold truncate ${isExpired ? 'text-slate-400 line-through' : 'text-white'}`}>
                              {meeting.title}
                            </span>
                            {isCompleted && (
                              <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold">
                                Meeting Ended
                              </span>
                            )}
                            {!isCompleted && isPast && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-medium">
                                Expired
                              </span>
                            )}
                            {!isExpired && isLiveNow && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold animate-pulse">
                                Live Now
                              </span>
                            )}
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {meeting.roomId}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
                            <span className="text-purple-300 font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatMeetingDate(meeting.scheduledTime)}
                            </span>
                            <span>•</span>
                            <span>Host: {meeting.hostUser?.name || 'Teammate'}</span>
                            <span>•</span>
                            <span>Target: {meeting.targetType === 'all' ? '@all Team' : 'Specific Members'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons - Disabled if Expired / Ended */}
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                        {/* Copy Link */}
                        <button
                          disabled={isExpired}
                          onClick={() => {
                            if (isExpired) return;
                            handleCopyRoomLink(meeting.roomId);
                          }}
                          className={`p-2 rounded-xl border text-xs transition ${
                            isExpired
                              ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-40'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                          }`}
                          title={isExpired ? "Meeting expired - copy disabled" : "Copy Meeting Link"}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Meeting (Host Only) */}
                        {isHost && (
                          <button
                            disabled={isExpired}
                            onClick={() => {
                              if (isExpired) return;
                              setEditingMeeting(meeting);
                              setShowScheduleModal(true);
                            }}
                            className={`p-2 rounded-xl border text-xs transition ${
                              isExpired
                                ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-40'
                                : 'bg-blue-950/40 hover:bg-blue-900 border-blue-800/40 text-blue-400 hover:text-white'
                            }`}
                            title={isExpired ? "Meeting expired - edit disabled" : "Edit Meeting Details"}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Cancel / Delete Meeting (Host Only) */}
                        {isHost && (
                          <button
                            disabled={isExpired}
                            onClick={() => {
                              if (isExpired) return;
                              handleCancelScheduledMeeting(meeting._id);
                            }}
                            className={`p-2 rounded-xl border text-xs transition ${
                              isExpired
                                ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-40'
                                : 'bg-red-950/40 hover:bg-red-900 border-red-800/40 text-red-400 hover:text-white'
                            }`}
                            title={isExpired ? "Meeting expired - delete disabled" : "Cancel Meeting"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Join Now */}
                        <button
                          disabled={isExpired}
                          onClick={() => {
                            if (isExpired) return;
                            handleJoinCall(meeting.roomId);
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                            isExpired
                              ? 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-600/30'
                          }`}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{isCompleted ? 'Meeting Ended' : isPast ? 'Expired' : 'Join Now'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ACTIVE CONFERENCE ROOM */
        <div
          ref={conferenceContainerRef}
          className={`w-full flex flex-col bg-gray-950 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative ${
            isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen' : 'min-h-[600px] h-[calc(100vh-220px)]'
          }`}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-900/90 backdrop-blur-md border-b border-white/10 z-10">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
              <div>
                <span className="text-sm font-semibold text-white tracking-wide">{roomId}</span>
                <span className="hidden sm:inline-block ml-3 px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-mono">
                  {totalCount} {totalCount === 1 ? 'Participant' : 'Participants'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopyRoomLink()}
                className="px-3 py-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-xs font-medium text-gray-200 border border-white/10 flex items-center gap-1.5 transition-all"
                title="Copy Room Link"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden xs:inline">{copiedLink ? 'Copied' : 'Invite'}</span>
              </button>
              <button
                onClick={() => setShowParticipantsList(!showParticipantsList)}
                className={`p-2 rounded-lg border border-white/10 text-gray-300 hover:bg-gray-800 transition-all ${
                  showParticipantsList ? 'bg-indigo-600/30 border-indigo-500/40 text-indigo-300' : ''
                }`}
                title="Participants List"
              >
                <Users className="w-4 h-4" />
              </button>
              <button
                onClick={handleToggleFullscreen}
                className="p-2 rounded-lg border border-white/10 text-gray-300 hover:bg-gray-800 transition-all"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Video Grid Canvas */}
          <div className="flex-1 p-3 sm:p-4 overflow-y-auto custom-scrollbar flex items-center justify-center">
            <div className={`grid gap-3 sm:gap-4 w-full h-full auto-rows-fr ${getGridClass()}`}>
              {/* Local User Tile */}
              {(() => {
                const hasLocalVideoTrack = Boolean(
                  localStream &&
                  localStream.getVideoTracks().length > 0 &&
                  localStream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live')
                );
                const isLocalVideoOff = isVideoMuted || !hasLocalVideoTrack;

                return (
                  <div className="relative bg-gray-900 rounded-xl overflow-hidden border border-white/10 shadow-lg flex items-center justify-center group aspect-video sm:aspect-auto sm:min-h-[220px]">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover transform ${isScreenSharing ? '' : '-scale-x-100'} ${
                        isLocalVideoOff ? 'hidden' : 'block'
                      }`}
                    />

                    {/* Hand Raised Badge on Local Tile */}
                    {isHandRaised && (
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/40 animate-bounce z-20">
                        <span className="text-sm">🖐️</span>
                        <span>Hand Raised</span>
                      </div>
                    )}

                    {/* Avatar Fallback if Video is Disabled or Camera Unavailable */}
                    {isLocalVideoOff && (
                      <div className="flex flex-col items-center justify-center text-center p-4">
                        {user?.photo ? (
                          <img
                            src={user.photo}
                            alt={user?.name || 'You'}
                            className="w-20 h-20 rounded-full object-cover shadow-xl mb-2 border-2 border-indigo-500/50"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shadow-xl mb-2">
                            {user?.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                        <span className="text-sm font-semibold text-gray-200">{user?.name || 'You'} (You)</span>
                        <span className="text-xs text-indigo-400 mt-1 flex items-center gap-1 font-mono">
                          <span>{isAudioMuted ? '🔇 Microphone Muted' : '🎤 Voice Active'}</span>
                        </span>
                      </div>
                    )}

                    {/* Status Badges */}
                    <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 z-20">
                      <span className="text-xs font-semibold text-white">You {isScreenSharing && '(Sharing Screen)'}</span>
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
                      {isAudioMuted && (
                        <div className="p-1.5 bg-red-500/80 rounded-md text-white backdrop-blur-md shadow-md" title="Muted">
                          <MicOff className="w-3.5 h-3.5" />
                        </div>
                      )}
                      {isLocalVideoOff && (
                        <div className="p-1.5 bg-gray-800/80 rounded-md text-gray-300 backdrop-blur-md border border-white/10" title="Camera Off">
                          <VideoOff className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Remote Participants Tiles */}
              {Array.from(remotePeers.values()).map((peer) => (
                <RemoteVideoTile
                  key={peer.socketId}
                  peer={peer}
                  isHandRaised={raisedHandsMap.has(peer.socketId)}
                  onHostMute={handleHostMuteParticipant}
                  onHostLowerHand={() => handleHostLowerHand(peer.socketId, peer.user)}
                />
              ))}
            </div>
          </div>

          {/* Floating Dock Controls */}
          <div className="p-3 sm:p-4 bg-gray-900/95 backdrop-blur-xl border-t border-white/10 flex items-center justify-center gap-2 sm:gap-3 z-20 flex-wrap">
            {/* Mic Toggle */}
            <button
              onClick={handleToggleAudio}
              className={`p-3 sm:px-4 sm:py-3 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg ${
                isAudioMuted
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-white/10'
              }`}
              title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              <span className="hidden sm:inline text-xs">{isAudioMuted ? 'Muted' : 'Mute'}</span>
            </button>

            {/* Camera Toggle */}
            <button
              onClick={handleToggleVideo}
              className={`p-3 sm:px-4 sm:py-3 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg ${
                isVideoMuted
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-white/10'
              }`}
              title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              <span className="hidden sm:inline text-xs">{isVideoMuted ? 'Camera Off' : 'Stop Video'}</span>
            </button>

            {/* Screen Share */}
            <button
              onClick={handleToggleScreenShare}
              className={`p-3 sm:px-4 sm:py-3 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg ${
                isScreenSharing
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/30'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-white/10'
              }`}
              title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
            >
              <Monitor className="w-5 h-5" />
              <span className="hidden sm:inline text-xs">{isScreenSharing ? 'Sharing' : 'Share'}</span>
            </button>

            {/* Collaborative Whiteboard Toggle */}
            <button
              onClick={() => {
                const nextState = !showWhiteboard;
                setShowWhiteboard(nextState);
                if (nextState) {
                  setWhiteboardOpenedBy({
                    id: user?._id || user?.id,
                    name: 'You (' + (user?.name || 'You') + ')',
                    photo: user?.photo
                  });
                } else {
                  setWhiteboardOpenedBy(null);
                }
                if (socketRef.current && roomId) {
                  socketRef.current.emit('toggle-whiteboard', {
                    roomId,
                    isOpen: nextState,
                    user: { id: user?._id || user?.id, name: user?.name || 'Teammate', photo: user?.photo }
                  });
                }
              }}
              className={`p-3 sm:px-4 sm:py-3 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg ${
                showWhiteboard
                  ? 'bg-blue-600 text-white shadow-blue-500/30 ring-2 ring-blue-400'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-white/10'
              }`}
              title="Collaborative Whiteboard"
            >
              <Pencil className="w-5 h-5 text-cyan-400" />
              <span className="hidden sm:inline text-xs">Whiteboard</span>
            </button>

            {/* Live Polls Toggle */}
            <button
              onClick={() => setShowPolls(!showPolls)}
              className={`p-3 sm:px-4 sm:py-3 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg ${
                showPolls
                  ? 'bg-indigo-600 text-white shadow-indigo-500/30 ring-2 ring-indigo-400'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-white/10'
              }`}
              title="In-Meeting Live Polls"
            >
              <BarChart3 className="w-5 h-5 text-amber-400" />
              <span className="hidden sm:inline text-xs">Polls</span>
            </button>

            {/* Live Floating Reactions Button & Menu */}
            <div className="relative">
              <button
                onClick={() => setShowReactionsBar(!showReactionsBar)}
                className={`p-3 sm:px-4 sm:py-3 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg ${
                  showReactionsBar
                    ? 'bg-amber-600 text-white shadow-amber-500/30 ring-2 ring-amber-400'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-white/10'
                }`}
                title="Send Live Reaction"
              >
                <Smile className="w-5 h-5 text-yellow-400" />
                <span className="hidden sm:inline text-xs">React</span>
              </button>

              {/* Floating Quick Reaction Palette Popover */}
              {showReactionsBar && (
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl border border-slate-700 p-2 rounded-2xl shadow-2xl flex items-center gap-1.5 z-50 animate-fade-in">
                  {[
                    { emoji: '👏', name: 'Clap' },
                    { emoji: '❤️', name: 'Love' },
                    { emoji: '🔥', name: 'Fire' },
                    { emoji: '🚀', name: 'Rocket' },
                    { emoji: '👍', name: 'Thumbs Up' },
                    { emoji: '🎉', name: 'Party' }
                  ].map((item) => (
                    <button
                      key={item.emoji}
                      onClick={() => {
                        handleSendReaction(item.emoji);
                        setShowReactionsBar(false);
                      }}
                      className="p-2 hover:bg-slate-800 rounded-xl text-xl hover:scale-125 transition-transform"
                      title={item.name}
                    >
                      {item.emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Raise Hand Toggle */}
            <button
              onClick={handleToggleRaiseHand}
              className={`p-3 sm:px-4 sm:py-3 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg ${
                isHandRaised
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-amber-500/40 ring-2 ring-amber-300 animate-pulse'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-white/10'
              }`}
              title={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
            >
              <span className="text-lg leading-none">🖐️</span>
              <span className="hidden sm:inline text-xs">{isHandRaised ? 'Hand Raised' : 'Raise Hand'}</span>
            </button>

            {/* Meeting Recording */}
            <button
              onClick={handleToggleRecording}
              className={`p-3 sm:px-4 sm:py-3 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/40 animate-pulse'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-white/10'
              }`}
              title={isRecording ? 'Stop Recording' : 'Record Meeting'}
            >
              {isRecording ? <Square className="w-5 h-5 text-white" /> : <Disc className="w-5 h-5 text-red-400" />}
              <span className="text-xs font-semibold">
                {isRecording ? `REC ${formatRecordingTime(recordingDuration)}` : 'Record'}
              </span>
            </button>

            {/* Invite Teammates */}
            <button
              onClick={() => setShowInviteModal(true)}
              className="p-3 sm:px-4 sm:py-3 rounded-xl font-medium flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-white/10 transition-all shadow-lg"
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
              className={`p-3 sm:px-4 sm:py-3 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg relative ${
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
              <span className="hidden sm:inline text-xs font-semibold">Chat & Files</span>
              {unreadMessages > 0 && !showChatDrawer && (
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black shadow-md animate-pulse">
                  {unreadMessages}
                </span>
              )}
            </button>

            {/* Participants Toggle */}
            <button
              onClick={() => setShowParticipantsList(!showParticipantsList)}
              className={`p-3 sm:px-4 sm:py-3 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg relative ${
                showParticipantsList
                  ? 'bg-purple-600 text-white shadow-purple-500/30'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-white/10'
              }`}
              title="Participants"
            >
              <Users className="w-5 h-5 text-purple-400" />
              <span className="text-xs">{totalCount}</span>
              {raisedHandsMap.size > 0 && (
                <span className="absolute -top-2 -right-1 w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center animate-bounce shadow-md">
                  🖐️
                </span>
              )}
            </button>

            {/* End / Leave Call */}
            <button
              onClick={() => {
                if (remotePeers.size > 0) {
                  setShowLeaveConfirmModal(true);
                } else {
                  handleLeaveCall();
                }
              }}
              className="p-3 sm:px-6 sm:py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold flex items-center gap-2 shadow-lg shadow-red-600/40 transition-all transform hover:scale-105 active:scale-95"
              title="Leave / End Meeting"
            >
              <PhoneOff className="w-5 h-5" />
              <span className="hidden sm:inline text-xs font-bold">Leave / End</span>
            </button>
          </div>

          {/* Floating Emoji Reactions Overlay on Screen */}
          <div className="absolute inset-x-0 bottom-24 top-0 pointer-events-none z-50 overflow-hidden">
            {floatingReactions.map((r) => (
              <div
                key={r.id}
                className="absolute bottom-6 flex flex-col items-center animate-bounce transition-all duration-1000"
                style={{ left: `${r.left}%` }}
              >
                <span className="text-5xl filter drop-shadow-2xl">{r.emoji}</span>
                <span className="text-[11px] bg-slate-950/90 text-white font-bold px-2.5 py-0.5 rounded-full shadow-xl mt-1 border border-slate-700/80 backdrop-blur-md">
                  {r.senderName}
                </span>
              </div>
            ))}
          </div>

          {/* Collaborative Whiteboard Drawer / Modal */}
          <InCallWhiteboard
            isOpen={showWhiteboard}
            onClose={() => setShowWhiteboard(false)}
            socket={socketRef.current}
            roomId={roomId}
            currentUser={user}
            openedBy={whiteboardOpenedBy}
          />

          {/* In-Call Live Polls Drawer */}
          <InCallPolls
            isOpen={showPolls}
            onClose={() => setShowPolls(false)}
            socket={socketRef.current}
            roomId={roomId}
            currentUser={user}
          />

          {/* Sliding In-Call Chat & Files Drawer */}
          <InCallChatAndFiles
            isOpen={showChatDrawer}
            onClose={() => setShowChatDrawer(false)}
            socket={socketRef.current}
            roomId={roomId}
            currentUser={user}
            meetingHost={user}
          />

          {/* Sliding Participants Drawer */}
          {showParticipantsList && (
            <div className="absolute right-0 top-12 bottom-16 w-80 bg-gray-900/95 backdrop-blur-2xl border-l border-white/10 p-4 shadow-2xl z-30 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  In Call ({totalCount})
                </h3>
                <button
                  onClick={() => setShowParticipantsList(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                {/* Local user row */}
                <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {user?.name?.[0]?.toUpperCase() || 'Y'}
                      </div>
                      <span className="text-xs font-semibold text-white truncate">{user?.name || 'You'} (You)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {isAudioMuted ? <MicOff className="w-3.5 h-3.5 text-red-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                  </div>
                  {isHandRaised && (
                    <div className="flex items-center justify-between pt-1.5 border-t border-indigo-500/20 text-[11px]">
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <span>🖐️</span> Hand Raised
                      </span>
                      <button
                        onClick={handleToggleRaiseHand}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded transition"
                      >
                        Lower Hand
                      </button>
                    </div>
                  )}
                </div>

                {/* Remote users list */}
                {Array.from(remotePeers.values()).map((peer) => {
                  const hasHandRaised = raisedHandsMap.has(peer.socketId);
                  return (
                    <div key={peer.socketId} className="p-2.5 rounded-xl bg-gray-800/50 border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                            {peer.user?.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <span className="text-xs font-medium text-gray-200 truncate">{peer.user?.name || 'Participant'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {peer.audioEnabled === false ? (
                            <span className="p-1 rounded bg-red-500/20 text-red-400 text-xs flex items-center gap-1 font-mono" title="Muted">
                              <MicOff className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <button
                              onClick={() => handleHostMuteParticipant(peer.socketId, peer.user)}
                              className="px-2 py-1 bg-red-950/60 hover:bg-red-800 border border-red-700/50 text-red-300 text-[10px] font-semibold rounded flex items-center gap-1 transition-colors shadow-sm"
                              title="Mute this participant"
                            >
                              <MicOff className="w-3 h-3 text-red-400" />
                              <span>Mute</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Raised Hand status & Lower button */}
                      {hasHandRaised && (
                        <div className="flex items-center justify-between pt-1.5 border-t border-white/5 text-[11px]">
                          <span className="text-amber-400 font-bold flex items-center gap-1 animate-pulse">
                            <span>🖐️</span> Hand Raised
                          </span>
                          <button
                            onClick={() => handleHostLowerHand(peer.socketId, peer.user)}
                            className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] rounded transition"
                          >
                            Lower Hand
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Leave or End Meeting Confirmation Modal */}
      {showLeaveConfirmModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto mb-4">
              <PhoneOff className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Leave or End Meeting?</h3>
            <p className="text-xs text-slate-400 mb-6">
              If you end the meeting for all, no one will be able to rejoin this room.
            </p>
            <div className="space-y-2.5">
              <button
                onClick={handleEndMeetingForAll}
                className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition flex items-center justify-center gap-2"
              >
                <span>🛑 End Meeting for All</span>
              </button>
              <button
                onClick={() => {
                  setShowLeaveConfirmModal(false);
                  handleLeaveCall();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                Just Leave Meeting
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

      {/* Meeting Invite Modal (@all / specific instant) */}
      <MeetingInviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        socket={socketRef.current}
        currentUser={user}
        roomId={roomId || inputRoomName || getRoleBasedRoomName('main')}
        callType="video"
      />

      {/* Schedule Meeting Modal */}
      <ScheduleMeetingModal
        isOpen={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false);
          setEditingMeeting(null);
        }}
        currentUser={user}
        editingMeeting={editingMeeting}
        onMeetingScheduled={() => fetchScheduledMeetings()}
      />
    </div>
  );
};

// Remote Video Tile Sub-component with track validation, playback handling, and Hand Raise badge
const RemoteVideoTile = ({ peer, isHandRaised, onHostMute, onHostLowerHand }) => {
  const videoRef = useRef(null);
  const [hasActiveVideo, setHasActiveVideo] = useState(false);

  useEffect(() => {
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream;

      const checkVideoTracks = () => {
        const videoTracks = peer.stream.getVideoTracks();
        const hasTrack = videoTracks.length > 0 && videoTracks.some((t) => t.enabled && t.readyState === 'live');
        setHasActiveVideo(hasTrack && (peer.isScreenSharing || peer.videoEnabled !== false));
      };

      checkVideoTracks();
      peer.stream.onaddtrack = checkVideoTracks;
      peer.stream.onremovetrack = checkVideoTracks;

      videoRef.current.play().catch((err) => {
        console.log("Remote video autoplay handled:", err);
      });
    }
  }, [peer.stream, peer.videoEnabled, peer.isScreenSharing]);

  const isVideoOff = (peer.videoEnabled === false && !peer.isScreenSharing) || !hasActiveVideo;

  return (
    <div className="relative bg-gray-900 rounded-xl overflow-hidden border border-white/10 shadow-lg flex items-center justify-center aspect-video sm:aspect-auto sm:min-h-[220px]">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        onLoadedMetadata={(e) => {
          e.target.play().catch(() => {});
        }}
        className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`}
      />

      {/* Hand Raised Floating Badge on Remote Video Tile */}
      {isHandRaised && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/40 animate-bounce z-20">
          <span className="text-sm">🖐️</span>
          <span>{peer.user?.name || 'Participant'} Raised Hand</span>
        </div>
      )}

      {isVideoOff && (
        <div className="flex flex-col items-center justify-center text-center p-4">
          {peer.user?.photo ? (
            <img
              src={peer.user.photo}
              alt={peer.user.name}
              className="w-20 h-20 rounded-full object-cover shadow-xl mb-2 border-2 border-indigo-500/50"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-2xl shadow-xl mb-2">
              {peer.user?.name?.[0]?.toUpperCase() || 'P'}
            </div>
          )}
          <span className="text-sm font-semibold text-gray-200">{peer.user?.name || 'Participant'}</span>
          <span className="text-xs text-blue-400 mt-1 flex items-center gap-1 font-mono">
            <span>🎤 Voice Stream Active</span>
          </span>
        </div>
      )}

      {/* Badges */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 z-20">
        <span className="text-xs font-semibold text-white">{peer.user?.name || 'Participant'}</span>
        {peer.isScreenSharing && (
          <span className="px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 text-[10px] font-medium border border-indigo-500/40">
            Sharing Screen
          </span>
        )}
      </div>

      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
        {isHandRaised && onHostLowerHand && (
          <button
            onClick={onHostLowerHand}
            className="p-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-md shadow-md text-xs font-bold flex items-center gap-1 transition"
            title="Lower Participant's Hand"
          >
            <span>🖐️ Lower</span>
          </button>
        )}
        {peer.audioEnabled === false ? (
          <div className="p-1.5 bg-red-500/80 rounded-md text-white backdrop-blur-md shadow-md flex items-center gap-1" title="Muted">
            <MicOff className="w-3.5 h-3.5" />
          </div>
        ) : (
          <button
            onClick={() => onHostMute && onHostMute(peer.socketId, peer.user)}
            className="p-1.5 bg-gray-900/80 hover:bg-red-600 text-gray-300 hover:text-white rounded-md backdrop-blur-md border border-white/10 transition-colors shadow-md flex items-center gap-1 text-xs"
            title="Mute Participant"
          >
            <MicOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[10px] font-semibold">Mute</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default VideoConference;