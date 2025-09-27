import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Phone, PhoneCall, PhoneOff, Mic, MicOff, Volume2, Users, Settings } from 'lucide-react';

const JITSI_DOMAIN = '8x8.vc';
const JITSI_APP_ID = 'vpaas-magic-cookie-c83f4958a05a42488b4b573a55a25cb0';
const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

// GLOBAL VIDEO BLOCKING - Execute immediately when module loads
const GLOBAL_VIDEO_BLOCK = (() => {
    if (typeof window !== 'undefined' && window.navigator?.mediaDevices) {
        console.log('INITIALIZING GLOBAL VIDEO BLOCK');
        
        // Store original functions
        const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        const originalEnumerateDevices = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
        
        // Override getUserMedia globally
        navigator.mediaDevices.getUserMedia = function(constraints) {
            console.log('GLOBAL BLOCK: getUserMedia intercepted', constraints);
            // Always force video to false
            const audioOnlyConstraints = {
                audio: constraints?.audio !== false ? true : false,
                video: false
            };
            console.log('GLOBAL BLOCK: Forcing audio-only constraints', audioOnlyConstraints);
            return originalGetUserMedia(audioOnlyConstraints);
        };
        
        // Override enumerateDevices to hide video devices
        navigator.mediaDevices.enumerateDevices = async function() {
            const devices = await originalEnumerateDevices();
            const audioDevices = devices.filter(device => device.kind !== 'videoinput');
            console.log('GLOBAL BLOCK: Hiding video devices, returning', audioDevices.length, 'audio devices');
            return audioDevices;
        };
        
        // Block getDisplayMedia
        if (navigator.mediaDevices.getDisplayMedia) {
            navigator.mediaDevices.getDisplayMedia = () => {
                console.log('GLOBAL BLOCK: Screen sharing blocked');
                return Promise.reject(new Error('Screen sharing disabled for audio-only calls'));
            };
        }
        
        // Store originals for cleanup
        window.__originalMediaFunctions = {
            getUserMedia: originalGetUserMedia,
            enumerateDevices: originalEnumerateDevices
        };
    }
    return true;
})();

const AudioCall = ({ user }) => {
    // State management
    const [currentCallRoomName, setCurrentCallRoomName] = useState('');
    const [inputCallName, setInputCallName] = useState('');
    const [isCallActive, setIsCallActive] = useState(false);
    const [isOutgoingCall, setIsOutgoingCall] = useState(false);
    const [isIncomingCall, setIsIncomingCall] = useState(false);
    const [loadingCall, setLoadingCall] = useState(false);
    const [error, setError] = useState('');
    const [callJwt, setCallJwt] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [activeCalls, setActiveCalls] = useState([]);
    const [showActiveCalls, setShowActiveCalls] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [callStartTime, setCallStartTime] = useState(null);
    const [inviteEmails, setInviteEmails] = useState('');

    const jitsiApiRef = useRef(null);
    const jitsiContainerRef = useRef(null);
    const videoBlockTimerRef = useRef(null);
    const videoDestroyerRef = useRef(null);
    const [isJitsiScriptLoaded, setIsJitsiScriptLoaded] = useState(false);

    // Timer for call duration
    useEffect(() => {
        let interval;
        if (isCallActive && callStartTime) {
            interval = setInterval(() => {
                setCallDuration(Math.floor((Date.now() - callStartTime) / 1000));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isCallActive, callStartTime]);

    // Format call duration
    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // NUCLEAR VIDEO BLOCKING FUNCTION
    const executeNuclearVideoBlock = useCallback(() => {
        console.log('EXECUTING NUCLEAR VIDEO BLOCK');
        
        // 1. Inject aggressive CSS
        const injectNuclearCSS = () => {
            const existingStyle = document.getElementById('nuclear-video-block');
            if (existingStyle) {
                existingStyle.remove();
            }
            
            const style = document.createElement('style');
            style.id = 'nuclear-video-block';
            style.textContent = `
                /* NUCLEAR VIDEO BLOCKING - HIGHEST PRIORITY */
                html body * video,
                html body * canvas,
                html body [class*="video"] video,
                html body [class*="Video"] video,
                html body [class*="local"] video,
                html body [class*="Local"] video,
                html body [class*="remote"] video,
                html body [class*="Remote"] video,
                html body .filmstrip *,
                html body .filmstrip,
                html body .thumbnail *,
                html body .thumbnail,
                html body .participant * video,
                html body [id*="video"] video,
                html body [id*="Video"] video,
                video[autoplay],
                video[muted] {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                    width: 0 !important;
                    height: 0 !important;
                    position: absolute !important;
                    left: -10000px !important;
                    top: -10000px !important;
                    z-index: -9999 !important;
                    pointer-events: none !important;
                }
                
                /* Hide containers that might hold video */
                .videocontainer,
                .videoContainer,
                .video-container,
                .largeVideoContainer,
                .large-video-container,
                .videoBackground,
                .video-background,
                .filmstrip,
                .filmstrip__videos,
                .thumbnail,
                .thumbnails,
                .participant-tile,
                .tile-view,
                .localvideo,
                .local-video,
                .remotevideo,
                .remote-video,
                .small-video,
                .video-thumbnail,
                .avatar-container img,
                [class*="video"],
                [class*="Video"],
                [class*="tile"],
                [class*="Tile"],
                [class*="thumbnail"],
                [class*="Thumbnail"],
                [class*="filmstrip"],
                [class*="Filmstrip"] {
                    display: none !important;
                    visibility: hidden !important;
                }
                
                /* Hide video control buttons */
                [aria-label*="camera" i],
                [aria-label*="video" i],
                [data-testid*="camera" i],
                [data-testid*="video" i],
                .video-button,
                .camera-button,
                .toggle-camera,
                .toggle-video {
                    display: none !important;
                }
                
                /* Force audio-only appearance */
                .large-video-container,
                .largeVideoContainer {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                }
                
                /* Additional safety net */
                * {
                    -webkit-user-media: none !important;
                }
            `;
            document.head.appendChild(style);
            console.log('Nuclear CSS injected');
        };
        
        // 2. DOM Video Element Destroyer
        const destroyVideoElements = () => {
            const videoSelectors = [
                'video', 'canvas',
                '[class*="video"]', '[class*="Video"]',
                '[class*="local"]', '[class*="Local"]',
                '[class*="remote"]', '[class*="Remote"]',
                '.filmstrip', '.thumbnail', '.participant-tile',
                '[id*="video"]', '[id*="Video"]'
            ];
            
            videoSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    element.style.display = 'none';
                    element.style.visibility = 'hidden';
                    element.style.opacity = '0';
                    element.style.width = '0px';
                    element.style.height = '0px';
                    element.style.position = 'absolute';
                    element.style.left = '-10000px';
                    element.style.top = '-10000px';
                    // Actually remove from DOM
                    try {
                        element.remove();
                    } catch (e) {
                        console.log('Could not remove element:', e);
                    }
                });
            });
        };
        
        // 3. Set up MutationObserver
        if (videoDestroyerRef.current) {
            videoDestroyerRef.current.disconnect();
        }
        
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        // Check if node itself is video-related
                        if (node.tagName === 'VIDEO' || node.tagName === 'CANVAS') {
                            console.log('MutationObserver: Destroying video element', node.tagName);
                            node.remove();
                            return;
                        }
                        
                        // Check for video elements in added node
                        if (node.querySelectorAll) {
                            const videos = node.querySelectorAll('video, canvas, [class*="video"], [class*="local"], [class*="remote"]');
                            videos.forEach(video => {
                                console.log('MutationObserver: Destroying nested video element');
                                video.remove();
                            });
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'id', 'style']
        });
        
        videoDestroyerRef.current = observer;
        
        // Execute functions
        injectNuclearCSS();
        destroyVideoElements();
        
        // Set up continuous monitoring
        if (videoBlockTimerRef.current) {
            clearInterval(videoBlockTimerRef.current);
        }
        
        videoBlockTimerRef.current = setInterval(() => {
            destroyVideoElements();
        }, 500); // Check every 500ms
        
        console.log('Nuclear video block setup complete');
    }, []);

    // Generate role-based room name
    const generateCallRoomName = useCallback((customName) => {
        if (!user || !user.role) {
            console.error('User information is required for role-based calls');
            return null;
        }
        
        const roomSuffix = customName.toLowerCase().replace(/\s+/g, '-');
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        
        switch (user.role) {
            case 'single': {
                return `audio-single-${user._id || user.id}-${roomSuffix}-${timestamp}-${randomId}`;
            }
            case 'team': {
                const teamId = user.teamId ? user.teamId.toString() : 'noteam';
                return `audio-team-${teamId}-${roomSuffix}-${timestamp}-${randomId}`;
            }
            case 'global': {
                return `audio-global-${user.globalId || 'Global123'}-${roomSuffix}-${timestamp}-${randomId}`;
            }
            default: {
                return `audio-default-${user._id || user.id}-${roomSuffix}-${timestamp}-${randomId}`;
            }
        }
    }, [user]);

    // Get role display info
    const getCallRoleDisplayInfo = useCallback(() => {
        if (!user) return { title: 'Audio Calling', description: 'Please log in to access calling' };
        
        switch (user.role) {
            case 'single':
                return { 
                    title: 'Personal Audio Call', 
                    description: 'Your private audio calling space' 
                };
            case 'team':
                return { 
                    title: 'Team Audio Call', 
                    description: 'Connect with your team members via audio' 
                };
            case 'global':
                return { 
                    title: 'Global Audio Call', 
                    description: 'Connect with all global users via audio' 
                };
            default:
                return { 
                    title: 'Audio Calling', 
                    description: 'Connect with others via audio' 
                };
        }
    }, [user]);

    // Fetch active calls
    const fetchActiveCalls = useCallback(async () => {
        if (!user?.token) return;

        try {
            const response = await axios.get(`${API_BASE_URL}/role-calls/${user.role}`, {
                headers: { 'auth-token': user.token },
                params: { 
                    userId: user._id || user.id,
                    teamId: user.teamId,
                    globalId: user.globalId,
                    userEmail: user.email
                }
            });
            setActiveCalls(response.data.calls || []);
        } catch (err) {
            console.error('Error fetching active calls:', err);
        }
    }, [user]);

    // Enhanced endCall function with complete cleanup
    const endCall = useCallback(async () => {
        console.log('Ending call and cleaning up all resources...');
        
        // Clean up video blocking
        if (videoBlockTimerRef.current) {
            clearInterval(videoBlockTimerRef.current);
            videoBlockTimerRef.current = null;
        }
        
        if (videoDestroyerRef.current) {
            videoDestroyerRef.current.disconnect();
            videoDestroyerRef.current = null;
        }
        
        // Restore original media functions
        if (window.__originalMediaFunctions) {
            try {
                navigator.mediaDevices.getUserMedia = window.__originalMediaFunctions.getUserMedia;
                navigator.mediaDevices.enumerateDevices = window.__originalMediaFunctions.enumerateDevices;
                console.log('Original media functions restored');
            } catch (error) {
                console.error('Error restoring media functions:', error);
            }
        }
        
        // Notify backend
        if (currentCallRoomName && user?.token) {
            try {
                await axios.delete(`${API_BASE_URL}/role-calls/${currentCallRoomName}`, {
                    headers: { 'auth-token': user.token },
                });
            } catch (err) {
                console.error('Error notifying backend about call end:', err);
            }
        }

        // Dispose Jitsi API
        if (jitsiApiRef.current) {
            try {
                jitsiApiRef.current.executeCommand('hangup');
                setTimeout(() => {
                    if (jitsiApiRef.current) {
                        try {
                            jitsiApiRef.current.dispose();
                            jitsiApiRef.current = null;
                        } catch (disposeError) {
                            console.error('Error disposing Jitsi API:', disposeError);
                            jitsiApiRef.current = null;
                        }
                    }
                }, 1000);
            } catch (error) {
                console.error('Error ending call:', error);
                if (jitsiApiRef.current) {
                    try {
                        jitsiApiRef.current.dispose();
                        jitsiApiRef.current = null;
                    } catch (disposeError) {
                        console.error('Error in fallback dispose:', disposeError);
                        jitsiApiRef.current = null;
                    }
                }
            }
        }

        // Reset all states
        setIsCallActive(false);
        setIsOutgoingCall(false);
        setIsIncomingCall(false);
        setLoadingCall(false);
        setCurrentCallRoomName('');
        setInputCallName('');
        setCallStartTime(null);
        setCallDuration(0);
        setStatusMessage('Call ended');
        setError('');
        setIsMuted(false);
        setCallJwt('');
        
        // Remove nuclear CSS
        const nuclearStyle = document.getElementById('nuclear-video-block');
        if (nuclearStyle) {
            nuclearStyle.remove();
        }
        
        // Refresh active calls
        setTimeout(() => {
            fetchActiveCalls();
        }, 1500);
    }, [currentCallRoomName, user?.token, fetchActiveCalls]);

    // Toggle microphone
    const toggleMicrophone = useCallback(() => {
        if (jitsiApiRef.current) {
            try {
                jitsiApiRef.current.executeCommand('toggleAudio');
                setIsMuted(prev => !prev);
            } catch (error) {
                console.error('Error toggling microphone:', error);
                setError('Failed to toggle microphone');
            }
        }
    }, []);

    // Load Jitsi script
    useEffect(() => {
        const scriptId = 'jitsi-meet-api-script';
        if (document.getElementById(scriptId)) {
            setIsJitsiScriptLoaded(true);
            return;
        }

        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://${JITSI_DOMAIN}/external_api.js`;
        script.async = true;

        script.onload = () => {
            console.log('Jitsi script loaded');
            setIsJitsiScriptLoaded(true);
            setStatusMessage('Jitsi API script loaded.');
            setError('');
        };

        script.onerror = (e) => {
            console.error('Failed to load Jitsi script:', e);
            setError('Failed to load Jitsi Meet API script.');
            setIsJitsiScriptLoaded(false);
        };

        document.body.appendChild(script);

        return () => {
            const existingScript = document.getElementById(scriptId);
            if (existingScript) {
                existingScript.remove();
            }
        };
    }, []);

    // Effect to fetch active calls
    useEffect(() => {
        if (user) {
            fetchActiveCalls();
            const interval = setInterval(fetchActiveCalls, 15000);
            return () => clearInterval(interval);
        }
    }, [fetchActiveCalls, user]);

    // Generate JWT
    const generateCallJwt = useCallback(async (room) => {
        try {
            setLoadingCall(true);
            setError('');
            setStatusMessage('Generating call token...');

            const userDetails = {
                room: room,
                userId: user?._id || user?.id || "guest-" + Math.random().toString(36).substring(7),
                userName: user?.name || "Guest-" + Math.floor(Math.random() * 1000),
                userEmail: user?.email || "guest." + Math.floor(Math.random() * 1000) + "@example.com",
                userAvatar: user?.photo || "https://gravatar.com/avatar/" + Math.floor(Math.random() * 100000) + "?d=mp",
                moderator: false,
                userRole: user?.role,
                teamId: user?.teamId,
                globalId: user?.globalId,
                callMode: true
            };

            const response = await axios.post(`${API_BASE_URL}/jitsi/generate-call-jwt`, userDetails, {
                headers: user?.token ? { 'auth-token': user.token } : {},
                timeout: 10000
            });
            
            if (response.data && response.data.jwt) {
                setCallJwt(response.data.jwt);
                setStatusMessage('Call token generated.');
                return response.data.jwt;
            } else {
                throw new Error('No JWT received from server');
            }
        } catch (err) {
            console.error('Error generating JWT:', err);
            const errorMessage = err.response?.data?.error || err.message || 'Unknown error occurred';
            setError(`Failed to setup call: ${errorMessage}`);
            setStatusMessage('');
            return null;
        } finally {
            setLoadingCall(false);
        }
    }, [user]);

    // Notify backend about call start
    const notifyCallStart = useCallback(async (roomName) => {
        if (!user?.token) return;

        const emailList = inviteEmails 
            ? inviteEmails.split(',').map(email => email.trim()).filter(email => email)
            : [];

        const callData = {
            roomName: roomName,
            callTitle: inputCallName || 'Audio Call',
            userRole: user.role,
            userId: user._id || user.id,
            userName: user.name,
            userEmail: user.email,
            teamId: user.teamId,
            globalId: user.globalId,
            allowedEmails: emailList
        };

        try {
            await axios.post(`${API_BASE_URL}/role-calls`, callData, {
                headers: { 'auth-token': user.token },
                timeout: 5000
            });
            
            fetchActiveCalls();
        } catch (err) {
            console.error('Error notifying backend about call start:', err);
            
            if (err.response?.data?.error) {
                setError(`Backend error: ${err.response.data.error}`);
            } else {
                setError('Failed to create call. Please check your connection and try again.');
            }
            
            setIsOutgoingCall(false);
            setCurrentCallRoomName('');
            setCallJwt('');
        }
    }, [user, inputCallName, inviteEmails, fetchActiveCalls]);

    // Initialize Jitsi API with COMPLETE video blocking
    const initializeCallApi = useCallback(async (roomApi, jwtToken) => {
        console.log('INITIALIZING AUDIO-ONLY CALL WITH COMPLETE VIDEO BLOCKING');
        
        // Execute nuclear video block BEFORE Jitsi initialization
        executeNuclearVideoBlock();
        
        if (!roomApi || !jwtToken || !jitsiContainerRef.current) {
            setError("Cannot initialize call: missing parameters.");
            return;
        }

        if (jitsiApiRef.current) {
            setStatusMessage('Call active.');
            return;
        }

        if (!window.JitsiMeetExternalAPI) {
            setError("Jitsi API not loaded. Please refresh the page.");
            return;
        }

        setLoadingCall(true);
        setError('');
        setStatusMessage('Initializing audio-only call...');

        // Override Jitsi before creating instance
        const originalJitsiAPI = window.JitsiMeetExternalAPI;
        window.JitsiMeetExternalAPI = function(domain, options) {
            console.log('JITSI API OVERRIDE: Forcing audio-only configuration');
            
            // Force audio-only options
            options.configOverwrite = options.configOverwrite || {};
            Object.assign(options.configOverwrite, {
                startWithVideoMuted: true,
                startAudioOnly: true,
                audioOnly: true,
                disableLocalVideo: true,
                disableRemoteVideo: true,
                videoConstraints: { video: false },
                constraints: {
                video: false,
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    googEchoCancellation: true,
                    googAutoGainControl: true,
                    googNoiseSuppression: true,
                    googHighpassFilter: true,
                    googTypingNoiseDetection: true,
                    sampleRate: 48000,
                    channelCount: 1
                }
            }
            });
            
            const api = new originalJitsiAPI(domain, options);
            
            // Override executeCommand to block video commands
            const originalExecuteCommand = api.executeCommand;
            api.executeCommand = function(command, ...args) {
                if (command.includes('Video') && !command.includes('Muted') && !command.includes('mute')) {
                    console.log('BLOCKED VIDEO COMMAND:', command);
                    return Promise.resolve();
                }
                return originalExecuteCommand.call(this, command, ...args);
            };
            
            return api;
        };

        const options = {
            roomName: `${JITSI_APP_ID}/${roomApi}`,
            width: '100%',
            height: '300px',
            parentNode: jitsiContainerRef.current,
            jwt: jwtToken,
            userInfo: {
                displayName: user?.name || "Guest User"
            },
            configOverwrite: {
                // COMPLETE VIDEO BLOCKING
                startWithAudioMuted: false,
                startWithVideoMuted: true,
                startAudioOnly: true,
                audioOnly: true,
                
                // Disable ALL video features
                disableLocalVideo: true,
                disableRemoteVideo: true,
                disableVideoMenu: true,
                disableVideoBackground: true,
                disableCameraChangeDetection: true,
                disableInitialGUM: false, // Keep for audio
                
                // Video codecs - disable all
                disableH264: true,
                disableVP8: true,
                disableVP9: true,
                disableAV1: true,
                
                // Channel settings - no video channels
                channelLastN: 0,
                startLastN: 0,
                disableSimulcast: true,
                
                // Constraints - audio only
                constraints: {
                    video: false,
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                },
                
                // Connection settings
                enableP2P: true,
                p2p: {
                    enabled: true,
                    preferredCodec: 'opus',
                    disableH264: true,
                    disableVP8: true,
                    disableVP9: true
                },
                
                // Additional blocking
                videoConstraints: false,
                disableLocalVideoFlip: true,
                enableLayerSuspension: false,
                disableAudioLevels: false,
                enableNoAudioDetection: true,
                
                // Filmstrip and UI
                filmstrip: {
                    disableFilmstrip: true
                }
            },
            interfaceConfigOverwrite: {
                // Audio-only toolbar
                TOOLBAR_BUTTONS: [
                    'microphone', 
                    'hangup', 
                    'chat', 
                    'participants-pane',
                    'settings'
                ],
                
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
                DISABLE_VIDEO_BACKGROUND: true,
                HIDE_INVITE_MORE_HEADER: true,
                AUDIO_ONLY_MODE: true,
                
                // Hide video UI elements
                DISABLE_FOCUS_INDICATOR: true,
                DISABLE_DOMINANT_SPEAKER_INDICATOR: true,
                FILM_STRIP_MAX_HEIGHT: 0,
                TILE_VIEW_MAX_COLUMNS: 0
            }
        };

        try {
            console.log('Creating Jitsi API instance with audio-only config');
            const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, options);
            jitsiApiRef.current = api;

            setLoadingCall(false);
            setStatusMessage('Audio call connecting...');

            // Event listeners with aggressive video blocking
            api.addEventListener('videoConferenceJoined', () => {
                console.log('CALL JOINED - EXECUTING FINAL VIDEO BLOCK');
                
                // Final aggressive video blocking
                const finalVideoBlock = () => {
                    try {
                        // Multiple video disable commands
                        api.executeCommand('toggleVideo'); // Turn off if on
                        api.executeCommand('muteVideo');
                        api.executeCommand('setVideoMuted', true);
                        
                        // DOM cleanup
                        const allVideos = document.querySelectorAll('video, canvas');
                        allVideos.forEach(video => {
                            video.remove();
                        });
                        
                        // Hide all video containers
                        const videoContainers = document.querySelectorAll(
                            '.videocontainer, .localvideo, .remotevideo, .filmstrip, .thumbnail, .tile'
                        );
                        videoContainers.forEach(container => {
                            container.style.display = 'none';
                        });
                        
                    } catch (e) {
                        console.log('Final video block attempt:', e);
                    }
                };
                
                // Execute multiple times
                finalVideoBlock();
                setTimeout(finalVideoBlock, 100);
                setTimeout(finalVideoBlock, 500);
                setTimeout(finalVideoBlock, 1000);
                setTimeout(finalVideoBlock, 2000);
                
                setIsCallActive(true);
                setIsOutgoingCall(false);
                setIsIncomingCall(false);
                setLoadingCall(false);
                setStatusMessage('Call active - Audio Only');
                setCallStartTime(Date.now());
                setError('');
            });

            api.addEventListener('videoConferenceLeft', () => {
                console.log('Call left');
                endCall();
            });
            
            api.addEventListener('readyToClose', () => {
                console.log('Ready to close');
                endCall();
            });

            api.addEventListener('connectionFailed', (error) => {
                console.error('Connection failed:', error);
                setError('Connection failed. Please check your internet connection.');
                setLoadingCall(false);
                endCall();
            });

            api.addEventListener('participantJoined', (participant) => {
                console.log('Participant joined:', participant.displayName);
                setStatusMessage(`${participant.displayName} joined the call`);
                setTimeout(() => {
                    if (isCallActive) {
                        setStatusMessage('Call active - Audio Only');
                    }
                }, 3000);
            });

            api.addEventListener('participantLeft', (participant) => {
                console.log('Participant left:', participant.displayName);
                setStatusMessage(`${participant.displayName} left the call`);
                setTimeout(() => {
                    if (isCallActive) {
                        setStatusMessage('Call active - Audio Only');
                    }
                }, 3000);
            });

            api.addEventListener('audioMuteStatusChanged', (event) => {
                console.log('Audio mute status changed:', event.muted);
                setIsMuted(event.muted);
                setStatusMessage(event.muted ? 'Microphone muted' : 'Microphone unmuted');
                setTimeout(() => {
                    if (isCallActive) {
                        setStatusMessage('Call active - Audio Only');
                    }
                }, 2000);
            });

            api.addEventListener('errorOccurred', (error) => {
                console.error('Jitsi error:', error);
                setError(`Call error: ${error.error?.message || 'Connection problem'}`);
            });

        } catch (apiError) {
            console.error('Failed to start audio call:', apiError);
            setError(`Failed to start audio call: ${apiError.message || 'Unknown API error'}`);
            setStatusMessage('');
            setIsCallActive(false);
            setLoadingCall(false);
            
            if (jitsiApiRef.current) {
                try {
                    jitsiApiRef.current.dispose();
                } catch (disposeError) {
                    console.error('Error disposing API:', disposeError);
                }
                jitsiApiRef.current = null;
            }
        } finally {
            // Restore original Jitsi API
            window.JitsiMeetExternalAPI = originalJitsiAPI;
        }
    }, [endCall, executeNuclearVideoBlock, user, isCallActive]);

    // Effect to initialize call when conditions are met
    useEffect(() => {
        console.log('Call initialization effect triggered');
        console.log(`Conditions: OutgoingCall=${isOutgoingCall}, IncomingCall=${isIncomingCall}, ScriptLoaded=${isJitsiScriptLoaded}`);

        if ((isOutgoingCall || isIncomingCall) && 
            isJitsiScriptLoaded && 
            jitsiContainerRef.current && 
            callJwt && 
            currentCallRoomName && 
            !jitsiApiRef.current &&
            window.JitsiMeetExternalAPI) {
            
            console.log('All conditions met, initializing call API...');
            initializeCallApi(currentCallRoomName, callJwt);
        }
    }, [isOutgoingCall, isIncomingCall, isJitsiScriptLoaded, callJwt, currentCallRoomName, initializeCallApi]);

    // Cleanup effect on unmount
    useEffect(() => {
        return () => {
            // Clean up video blocking
            if (videoBlockTimerRef.current) {
                clearInterval(videoBlockTimerRef.current);
            }
            if (videoDestroyerRef.current) {
                videoDestroyerRef.current.disconnect();
            }
            
            // Clean up Jitsi API
            if (jitsiApiRef.current) {
                try {
                    jitsiApiRef.current.dispose();
                    jitsiApiRef.current = null;
                } catch (error) {
                    console.error('Error during cleanup:', error);
                }
            }
            
            // Remove nuclear CSS
            const nuclearStyle = document.getElementById('nuclear-video-block');
            if (nuclearStyle) {
                nuclearStyle.remove();
            }
        };
    }, []);

    // Start outgoing call
    const handleStartCallClick = async () => {
        if (!user) {
            setError('Please log in to make audio calls.');
            return;
        }

        if (!user._id && !user.id) {
            setError('User information incomplete. Please refresh the page and log in again.');
            return;
        }

        if (!inputCallName.trim()) {
            setError('Please enter a call name to start or join.');
            return;
        }

        if (!isJitsiScriptLoaded || !window.JitsiMeetExternalAPI) {
            setError('Call system not ready. Please wait and try again.');
            return;
        }

        // Validate email invitations for team calls
        if (user.role === 'team' && inviteEmails.trim()) {
            const emailList = inviteEmails.split(',').map(email => email.trim());
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const invalidEmails = emailList.filter(email => !emailRegex.test(email));
            
            if (invalidEmails.length > 0) {
                setError(`Invalid email addresses: ${invalidEmails.join(', ')}`);
                return;
            }
        }

        console.log('Starting role-based audio call...');
        setError('');
        setStatusMessage('Starting audio call setup...');

        const roleBasedCallRoomName = generateCallRoomName(inputCallName.trim());
        
        if (!roleBasedCallRoomName) {
            setError('Failed to generate call room name. Please check your login status.');
            return;
        }

        // Generate JWT first
        const generatedJwt = await generateCallJwt(roleBasedCallRoomName);

        if (generatedJwt) {
            // Notify backend about call start
            await notifyCallStart(roleBasedCallRoomName);
            
            // Update state to start call
            setCurrentCallRoomName(roleBasedCallRoomName);
            setIsOutgoingCall(true);
        } else {
            console.error('JWT generation failed, not proceeding.');
        }
    };

    // Join existing call
    const handleJoinExistingCall = async (callRoom) => {
        if (!user) {
            setError('Please log in to join audio calls.');
            return;
        }

        console.log('Joining existing audio call...');
        setError('');
        setStatusMessage('Joining existing audio call...');

        const generatedJwt = await generateCallJwt(callRoom);

        if (generatedJwt) {
            setCurrentCallRoomName(callRoom);
            setIsIncomingCall(true);
            setInputCallName('');
        } else {
            console.error('JWT generation failed for joining audio call.');
        }
    };

    // Toggle mute
    const toggleMute = () => {
        toggleMicrophone();
    };

    const roleInfo = getCallRoleDisplayInfo();

    return (
        <div
            className="relative min-h-screen flex items-center justify-center overflow-hidden"
            style={{ perspective: "1200px" }}
        >
            <h1 className="w-full py-3 rounded-xl font-bold text-2xl
                            bg-gradient-to-r from-purple-800 to-blue-300 mt-10s
                            hover:scale-105 transform transition fixed top-0 text-center text-white mt-6 drop-shadow-sm animate-fade-in z-30 font-800 font-size-2xl">
                {roleInfo.title}
            </h1>

            <div className="absolute inset-0 bg-[url('/assets/bg-3d.png')] bg-cover bg-center animate-[scrollBackground_60s_linear_infinite] opacity-40"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 via-blue-900/40 to-black/80"></div>

            <div
                className="relative z-10 w-full max-w-4xl p-6 rounded-3xl 
                bg-black/40 backdrop-blur-2xl border border-white/10 shadow-2xl
                transform transition-all duration-700 hover:rotate-x-2 hover:-rotate-y-2"
                style={{ transformStyle: "preserve-3d" }}
            >
                <h2 className="text-3xl font-bold text-center text-white mb-6 drop-shadow-lg">
                    📞 {roleInfo.title}
                </h2>

                {!user ? (
                    <div className="text-center text-red-400">
                        <p>Please log in to access audio calling features.</p>
                    </div>
                ) : !isCallActive && !isOutgoingCall && !isIncomingCall ? (
                    <div className="space-y-4 text-white">
                        <div className="text-center text-sm text-gray-300 mb-4">
                            Welcome, {user.name}! | Role: {user.role.toUpperCase()} | {roleInfo.description}
                        </div>

                        {/* Active Calls */}
                        {activeCalls.length > 0 && (
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-lg font-semibold text-green-300 flex items-center gap-2">
                                        <PhoneCall className="w-4 h-4" />
                                        Active {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Calls
                                    </h3>
                                    <button
                                        onClick={() => setShowActiveCalls(!showActiveCalls)}
                                        className="text-sm text-purple-300 hover:text-purple-200"
                                    >
                                        {showActiveCalls ? 'Hide' : `Show (${activeCalls.length})`}
                                    </button>
                                </div>
                                
                                {showActiveCalls && (
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {activeCalls.map((call, index) => (
                                            <div key={index} className="flex items-center justify-between bg-green-600/20 p-3 rounded-lg border border-green-500/30">
                                                <div>
                                                    <div className="font-medium text-green-300">{call.callTitle}</div>
                                                    <div className="text-sm text-gray-300">
                                                        From: {call.userName} ({call.userEmail}) •
                                                        {call.participants || 1} participant(s)
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleJoinExistingCall(call.roomName)}
                                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm flex items-center gap-2"
                                                >
                                                    <Phone className="w-4 h-4" />
                                                    Join
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Create New Call */}
                        <p className="text-gray-200 text-center">Enter a call name to create or join a {user.role} audio call.</p>
                        <input
                            type="text"
                            placeholder="Enter call name (e.g., Daily Standup, Project Review)"
                            value={inputCallName}
                            onChange={(e) => setInputCallName(e.target.value)}
                            className="w-full p-3 rounded-xl bg-white/10 text-white placeholder-gray-400 border border-white/20 focus:ring-2 focus:ring-purple-500"
                        />
                        
                        {/* Email Invitations for Team Calls */}
                        {user.role === 'team' && (
                            <div className="space-y-2">
                                <label className="text-sm text-gray-300 flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Team Member Emails (comma-separated)
                                </label>
                                <input
                                    type="text"
                                    placeholder="email1@company.com, email2@company.com"
                                    value={inviteEmails}
                                    onChange={(e) => setInviteEmails(e.target.value)}
                                    className="w-full p-3 rounded-xl bg-white/10 text-white placeholder-gray-400 border border-white/20 focus:ring-2 focus:ring-purple-500"
                                />
                                <p className="text-xs text-gray-400">
                                    Only invited team members can join this audio call
                                </p>
                            </div>
                        )}

                        {error && <p className="text-red-400">{error}</p>}
                        {statusMessage && <p className="text-blue-400">{statusMessage}</p>}
                        
                        <button
                            onClick={handleStartCallClick}
                            disabled={!inputCallName.trim() || loadingCall || !isJitsiScriptLoaded}
                            className="w-full py-3 rounded-xl font-semibold text-lg
                                        bg-gradient-to-r from-green-600 to-blue-600 
                                        hover:scale-105 transform transition disabled:opacity-50"
                        >
                            {loadingCall ? 'Starting...' : `Start/Join ${user.role.charAt(0).toUpperCase() + user.role.slice(1)} Audio Call`}
                        </button>

                        {!isJitsiScriptLoaded && (
                            <p className="text-sm text-gray-500 text-center">
                                Loading API... Please wait.
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Call Status */}
                        <div className="text-center">
                            {isOutgoingCall && !isCallActive && (
                                <div className="animate-pulse">
                                    <PhoneCall className="w-12 h-12 mx-auto mb-2 text-blue-400" />
                                    <p className="text-blue-400 font-medium">Starting Call...</p>
                                    <p className="text-sm text-gray-300">Audio Only Mode</p>
                                </div>
                            )}
                            
                            {isIncomingCall && !isCallActive && (
                                <div className="animate-pulse">
                                    <Phone className="w-12 h-12 mx-auto mb-2 text-green-400" />
                                    <p className="text-green-400 font-medium">Connecting...</p>
                                    <p className="text-sm text-gray-300">Audio Only Mode</p>
                                </div>
                            )}

                            {isCallActive && (
                                <div>
                                    <Phone className="w-12 h-12 mx-auto mb-2 text-green-400" />
                                    <p className="text-green-400 font-medium">
                                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Audio Call: <span className="font-bold">{inputCallName || 'Active Session'}</span>
                                    </p>
                                    <p className="text-2xl font-mono text-white">{formatDuration(callDuration)}</p>
                                    <p className="text-xs text-gray-400">Video disabled - Audio only</p>
                                    <p className="text-xs text-gray-300">Room: {currentCallRoomName}</p>
                                </div>
                            )}
                        </div>

                        {loadingCall && !jitsiApiRef.current && (
                            <p className="text-blue-600 text-center">Loading Call interface... Please wait.</p>
                        )}
                        {error && <p className="text-red-400 text-center">{error}</p>}
                        {statusMessage && <p className="text-blue-400 text-center">{statusMessage}</p>}

                        {/* Call Interface Container */}
                        <div
                            ref={jitsiContainerRef}
                            className="w-full h-[400px] rounded-2xl overflow-hidden border border-white/20 bg-black/50 relative"
                        >
                            {loadingCall && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                                </div>
                            )}
                            {/* Audio-only indicator when call is active */}
                            {isCallActive && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-900/50 to-blue-900/50">
                                    <Volume2 className="w-16 h-16 text-white/70 mb-2" />
                                    <p className="text-white/70 text-lg">Audio Only Call</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        {isMuted ? (
                                            <MicOff className="w-6 h-6 text-red-400" />
                                        ) : (
                                            <Mic className="w-6 h-6 text-green-400" />
                                        )}
                                        <span className="text-sm text-white/60">
                                            {isMuted ? 'Muted' : 'Speaking'}
                                        </span>
                                    </div>
                                </div>
                            )}
                            {!loadingCall && !jitsiApiRef.current && !error && !isCallActive && (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                    <span>Call will load here. Grant microphone permissions if prompted.</span>
                                </div>
                            )}
                        </div>

                        {/* Call Controls */}
                        <div className="flex justify-center gap-4 mt-6">
                            <button
                                onClick={toggleMute}
                                className={`p-3 rounded-full ${isMuted ? 'bg-red-600' : 'bg-gray-600'} hover:scale-110 transition`}
                                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                            >
                                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                            </button>
                            
                            <button
                                onClick={endCall}
                                className="p-3 rounded-full bg-red-600 hover:bg-red-700 hover:scale-110 transition"
                                title="End call"
                            >
                                <PhoneOff className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AudioCall;