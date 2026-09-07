// src/services/webrtcService.js

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
};

export class WebRTCManager {
  constructor({ socket, roomId, currentUser, onRemoteStream, onPeerLeft, onPeerMediaState }) {
    this.socket = socket;
    this.roomId = roomId;
    this.currentUser = currentUser;
    this.onRemoteStream = onRemoteStream;
    this.onPeerLeft = onPeerLeft;
    this.onPeerMediaState = onPeerMediaState;

    this.localStream = null;
    this.screenStream = null;
    this.peers = new Map(); // socketId -> { connection: RTCPeerConnection, user: Object, stream: MediaStream }
    this.isAudioOnly = false;
  }

  // Get local user media (camera + mic, or mic only)
  async startLocalStream(isAudioOnly = false) {
    this.isAudioOnly = isAudioOnly;
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: isAudioOnly ? false : {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (err) {
      console.error('Error accessing media devices:', err);
      // Fallback to audio-only if video fails
      if (!isAudioOnly) {
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          this.isAudioOnly = true;
          return this.localStream;
        } catch (audioErr) {
          console.error('Audio fallback also failed:', audioErr);
        }
      }
      throw err;
    }
  }

  // Join Room & Initialize Socket Listeners
  initSignaling() {
    // 1. Existing users in room
    this.socket.on('all-call-users', async (existingParticipants) => {
      for (const participant of existingParticipants) {
        if (participant.socketId !== this.socket.id) {
          await this.createPeerConnection(participant.socketId, participant.user, true);
        }
      }
    });

    // 2. New user joined room
    this.socket.on('user-joined-call', async (participant) => {
      if (participant.socketId !== this.socket.id) {
        // Target peer will wait for offer from new user or vice versa
        await this.createPeerConnection(participant.socketId, participant.user, false);
      }
    });

    // 3. Receive Offer
    this.socket.on('call-user-offer', async ({ signalData, fromSocketId, fromUser, isAudioOnly }) => {
      let peer = this.peers.get(fromSocketId);
      if (!peer) {
        peer = await this.createPeerConnection(fromSocketId, fromUser, false);
      }

      await peer.connection.setRemoteDescription(new RTCSessionDescription(signalData));

      // Process any queued ICE candidates
      if (peer.queuedCandidates && peer.queuedCandidates.length > 0) {
        for (const candidate of peer.queuedCandidates) {
          await peer.connection.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.warn);
        }
        peer.queuedCandidates = [];
      }

      const answer = await peer.connection.createAnswer();
      await peer.connection.setLocalDescription(answer);

      this.socket.emit('call-user-answer', {
        to: fromSocketId,
        signalData: answer,
      });
    });

    // 4. Receive Answer
    this.socket.on('call-user-answer', async ({ signalData, fromSocketId }) => {
      const peer = this.peers.get(fromSocketId);
      if (peer && peer.connection) {
        await peer.connection.setRemoteDescription(new RTCSessionDescription(signalData));

        if (peer.queuedCandidates && peer.queuedCandidates.length > 0) {
          for (const candidate of peer.queuedCandidates) {
            await peer.connection.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.warn);
          }
          peer.queuedCandidates = [];
        }
      }
    });

    // 5. Receive ICE Candidate
    this.socket.on('ice-candidate', async ({ candidate, fromSocketId }) => {
      const peer = this.peers.get(fromSocketId);
      if (peer && peer.connection) {
        if (peer.connection.remoteDescription && peer.connection.remoteDescription.type) {
          await peer.connection.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.warn);
        } else {
          if (!peer.queuedCandidates) peer.queuedCandidates = [];
          peer.queuedCandidates.push(candidate);
        }
      }
    });

    // 6. Media state change (audio muted, video turned off, etc.)
    this.socket.on('user-media-state-changed', ({ socketId, type, enabled }) => {
      if (this.onPeerMediaState) {
        this.onPeerMediaState({ socketId, type, enabled });
      }
    });

    // 7. Peer left
    this.socket.on('user-left-call', ({ socketId }) => {
      this.closePeer(socketId);
      if (this.onPeerLeft) {
        this.onPeerLeft(socketId);
      }
    });

    // Emit room join to backend
    this.socket.emit('join-call-room', {
      roomId: this.roomId,
      user: this.currentUser,
      isAudioOnly: this.isAudioOnly,
    });
  }

  // Create Peer Connection
  async createPeerConnection(socketId, user, isInitiator) {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    const peerEntry = {
      connection: pc,
      user: user,
      stream: new MediaStream(),
      queuedCandidates: [],
    };
    this.peers.set(socketId, peerEntry);

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream);
      });
      // If no video track exists initially, ensure a video transceiver is still available
      const hasVideoSender = pc.getSenders().some(s => s.track && s.track.kind === 'video');
      if (!hasVideoSender) {
        try {
          pc.addTransceiver('video', { direction: 'sendrecv' });
        } catch (e) {
          console.warn("Could not add video transceiver:", e);
        }
      }
    }

    // Handle ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', {
          target: socketId,
          candidate: event.candidate,
        });
      }
    };

    // Handle remote track received
    pc.ontrack = (event) => {
      let stream = event.streams && event.streams[0];
      if (!stream) {
        if (!peerEntry.stream.getTracks().some((t) => t.id === event.track.id)) {
          peerEntry.stream.addTrack(event.track);
        }
        stream = peerEntry.stream;
      } else {
        peerEntry.stream = stream;
      }

      console.log(`[WebRTC] Remote track received from ${user?.name || socketId}:`, event.track.kind);

      if (this.onRemoteStream) {
        this.onRemoteStream({
          socketId,
          user,
          stream,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.closePeer(socketId);
        if (this.onPeerLeft) this.onPeerLeft(socketId);
      }
    };

    // If initiator, create and send offer
    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      this.socket.emit('call-user-offer', {
        userToCall: socketId,
        signalData: offer,
        fromUser: this.currentUser,
        isAudioOnly: this.isAudioOnly,
      });
    }

    return peerEntry;
  }

  // Toggle Microphone
  toggleAudio(enabled) {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = enabled;
      });

      this.socket.emit('toggle-media-state', {
        roomId: this.roomId,
        type: 'audio',
        enabled,
      });
      return enabled;
    }
    return false;
  }

  // Toggle Camera
  async toggleVideo(enabled) {
    if (this.localStream) {
      let videoTracks = this.localStream.getVideoTracks();
      if (enabled && (videoTracks.length === 0 || !videoTracks.some(t => t.readyState === 'live'))) {
        // Try to obtain video track if it didn't exist initially (e.g. fallback to audio)
        try {
          const vStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
          });
          const newTrack = vStream.getVideoTracks()[0];
          this.localStream.addTrack(newTrack);
          for (const [, peer] of this.peers) {
            const sender = peer.connection.getSenders().find((s) => s.track && s.track.kind === 'video');
            if (sender) {
              await sender.replaceTrack(newTrack);
            } else {
              peer.connection.addTrack(newTrack, this.localStream);
            }
          }
          this.isAudioOnly = false;
        } catch (e) {
          console.warn("Could not start camera on toggle:", e.message);
          return false;
        }
      } else {
        videoTracks.forEach((track) => {
          track.enabled = enabled;
        });
      }

      this.socket.emit('toggle-media-state', {
        roomId: this.roomId,
        type: 'video',
        enabled,
      });
      return enabled;
    }
    return false;
  }

  // Start Screen Sharing
  async startScreenShare() {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: true,
      });

      const screenTrack = this.screenStream.getVideoTracks()[0];

      // Replace video track in all active peer connections
      for (const [, peer] of this.peers) {
        const sender = peer.connection.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      }

      screenTrack.onended = () => {
        this.stopScreenShare();
      };

      this.socket.emit('toggle-media-state', {
        roomId: this.roomId,
        type: 'screen',
        enabled: true,
      });

      return this.screenStream;
    } catch (err) {
      console.error('Screen sharing error:', err);
      return null;
    }
  }

  // Stop Screen Sharing
  stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;

      // Revert back to local camera track or clear track if video is off
      const cameraTrack = this.localStream ? this.localStream.getVideoTracks()[0] : null;
      for (const [, peer] of this.peers) {
        const sender = peer.connection.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(cameraTrack || null).catch(console.warn);
        }
      }

      this.socket.emit('toggle-media-state', {
        roomId: this.roomId,
        type: 'screen',
        enabled: false,
      });
    }
  }

  // Close specific peer
  closePeer(socketId) {
    const peer = this.peers.get(socketId);
    if (peer) {
      if (peer.connection) {
        peer.connection.close();
      }
      this.peers.delete(socketId);
    }
  }

  // Leave call and clean up everything
  leaveCall() {
    // Notify room
    if (this.socket) {
      this.socket.emit('leave-call-room', { roomId: this.roomId });
      this.socket.off('all-call-users');
      this.socket.off('user-joined-call');
      this.socket.off('call-user-offer');
      this.socket.off('call-user-answer');
      this.socket.off('ice-candidate');
      this.socket.off('user-media-state-changed');
      this.socket.off('user-left-call');
    }

    // Stop all local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Stop screen sharing tracks
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }

    // Close all peer connections
    for (const [socketId] of this.peers) {
      this.closePeer(socketId);
    }
    this.peers.clear();
  }
}
