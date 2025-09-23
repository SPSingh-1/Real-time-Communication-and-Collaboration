import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const JITSI_DOMAIN = '8x8.vc';
const JITSI_APP_ID = 'vpaas-magic-cookie-c83f4958a05a42488b4b573a55a25cb0';
const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

const VideoConference = ({ user }) => {
    // This state will hold the *normalized* room name once the meeting is started
    const [currentMeetingRoomName, setCurrentMeetingRoomName] = useState('');
    // This state will hold the value typed into the input field
    const [inputRoomName, setInputRoomName] = useState('');

    const jitsiApiRef = useRef(null);
    const [isMeetingStarted, setIsMeetingStarted] = useState(false);
    const [loadingJitsi, setLoadingJitsi] = useState(false);
    const [error, setError] = useState('');
    const [jitsiJwt, setJitsiJwt] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [activeMeetings, setActiveMeetings] = useState([]);
    const [showActiveMeetings, setShowActiveMeetings] = useState(false);

    const jitsiContainerRef = useRef(null);
    const [isJitsiScriptLoaded, setIsJitsiScriptLoaded] = useState(false);

    // Generate role-based room name
    const generateRoleBasedRoomName = useCallback((customName) => {
        if (!user || !user.role) {
            console.error('User information is required for role-based meetings');
            return null;
        }
        
        const roomSuffix = customName.toLowerCase().replace(/\s+/g, '-');
        
        switch (user.role) {
            case 'single': {
                // Single users get their own private room
                return `single-${user.id}-${roomSuffix}`;
            }
            case 'team': {
                // Team users get team-scoped rooms
                const teamId = user.teamId ? user.teamId.toString() : 'noteam';
                return `team-${teamId}-${roomSuffix}`;
            }
            case 'global': {
                // Global users get global-scoped rooms
                return `global-${user.globalId || 'Global123'}-${roomSuffix}`;
            }
            default: {
                return `default-${user.id}-${roomSuffix}`;
            }
        }
    }, [user]);

    // Get role display info
    const getRoleDisplayInfo = useCallback(() => {
        if (!user) return { title: 'Video Conferencing', description: 'Please log in to access video conferencing' };
        
        switch (user.role) {
            case 'single':
                return { 
                    title: 'Personal Meeting Room', 
                    description: 'Your private meeting space' 
                };
            case 'team':
                return { 
                    title: 'Team Meeting Room', 
                    description: 'Collaborate with your team members' 
                };
            case 'global':
                return { 
                    title: 'Global Meeting Room', 
                    description: 'Connect with all global users' 
                };
            default:
                return { 
                    title: 'Video Conferencing', 
                    description: 'Connect with others' 
                };
        }
    }, [user]);

    // Fetch active meetings based on user role
    const fetchActiveMeetings = useCallback(async () => {
        if (!user?.token) return;

        try {
            const response = await axios.get(`${API_BASE_URL}/role-meetings/${user.role}`, {
                headers: { Authorization: `Bearer ${user.token}` },
                params: { 
                    userId: user.id,
                    teamId: user.teamId,
                    globalId: user.globalId
                }
            });
            setActiveMeetings(response.data.meetings || []);
        } catch (err) {
            console.error('Error fetching active meetings:', err);
        }
    }, [user]);

    // Function to end the meeting and clean up Jitsi resources and component state
    const endMeeting = useCallback(async () => {
        console.log('Attempting to end meeting and dispose Jitsi API instance...');
        
        // Notify backend about meeting end
        if (currentMeetingRoomName && user?.token) {
            try {
                await axios.delete(`${API_BASE_URL}/role-meetings/${currentMeetingRoomName}`, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
            } catch (err) {
                console.error('Error notifying backend about meeting end:', err);
            }
        }

        if (jitsiApiRef.current) {
            jitsiApiRef.current.dispose();
            jitsiApiRef.current = null;
            console.log('Jitsi API disposed.');
        } else {
            console.log('No Jitsi API instance to dispose (meeting might not have fully started or already ended).');
        }

        setIsMeetingStarted(false);
        setCurrentMeetingRoomName('');
        setInputRoomName('');
        setError('');
        setLoadingJitsi(false);
        setJitsiJwt('');
        setStatusMessage('');
        
        // Refresh active meetings list
        fetchActiveMeetings();
        
        console.log('Jitsi meeting ended and component state reset.');
    }, [currentMeetingRoomName, user?.token, fetchActiveMeetings]);

    // Effect to load Jitsi Meet External API script dynamically
    useEffect(() => {
        const scriptId = 'jitsi-meet-api-script';
        if (document.getElementById(scriptId)) {
            console.log('Jitsi Meet External API script already present in DOM.');
            setIsJitsiScriptLoaded(true);
            return;
        }

        console.log(`Attempting to load Jitsi Meet External API script from https://${JITSI_DOMAIN}/external_api.js`);
        setStatusMessage('Loading Jitsi API script...');
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://${JITSI_DOMAIN}/external_api.js`;
        script.async = true;

        script.onload = () => {
            console.log('Jitsi Meet External API script loaded successfully into the browser.');
            setIsJitsiScriptLoaded(true);
            setStatusMessage('Jitsi API script loaded.');
            setError('');
        };

        script.onerror = (e) => {
            console.error('Failed to load Jitsi Meet API script. Check network or ad-blockers:', e);
            setError('Failed to load Jitsi Meet API script. Please check your internet connection or browser extensions.');
            setStatusMessage('');
            setIsJitsiScriptLoaded(false);
        };

        document.body.appendChild(script);

        return () => {
            const existingScript = document.getElementById(scriptId);
            if (existingScript) {
                console.log('Cleanup: Removing Jitsi Meet External API script from DOM.');
                existingScript.remove();
            }
        };
    }, []);

    // Effect to fetch active meetings on component mount
    useEffect(() => {
        if (user) {
            fetchActiveMeetings();
            
            // Set up interval to refresh active meetings every 30 seconds
            const interval = setInterval(fetchActiveMeetings, 30000);
            return () => clearInterval(interval);
        }
    }, [fetchActiveMeetings, user]);

    // Function to generate Jitsi JWT from backend with role information
    const generateJitsiJwt = useCallback(async (room) => {
        try {
            setLoadingJitsi(true);
            setError('');
            setStatusMessage('Generating meeting token...');
            console.log(`Frontend: Requesting Jitsi JWT from backend for room: "${room}"`);

            const userDetails = {
                room: room,
                userId: user?.id || "guest-" + Math.random().toString(36).substring(7),
                userName: user?.name || "Guest-" + Math.floor(Math.random() * 1000),
                userEmail: user?.email || "guest." + Math.floor(Math.random() * 1000) + "@example.com",
                userAvatar: user?.photo || "https://gravatar.com/avatar/" + Math.floor(Math.random() * 100000) + "?d=mp",
                moderator: false, // You can set role-based moderation here
                userRole: user?.role,
                teamId: user?.teamId,
                globalId: user?.globalId
            };

            const response = await axios.post(`${API_BASE_URL}/jitsi/generate-jwt`, userDetails, {
                headers: user?.token ? { 'auth-token': user.token } : {}
            });
            
            setJitsiJwt(response.data.jwt);
            setStatusMessage('Meeting token generated.');
            console.log('Frontend: Jitsi JWT generated successfully and stored in state.');
            return response.data.jwt;
        } catch (err) {
            console.error('Frontend: Error generating Jitsi JWT:', err.response ? err.response.data : err.message);
            setError(`Failed to generate Jitsi token: ${err.response?.data?.error || err.message}. Please check backend configuration and server logs.`);
            setStatusMessage('');
            return null;
        } finally {
            setLoadingJitsi(false);
        }
    }, [user]);

    // Function to notify backend about new meeting
    const notifyMeetingStart = useCallback(async (roomName) => {
        if (!user?.token) return;

        try {
            await axios.post(`${API_BASE_URL}/role-meetings`, {
                roomName: roomName,
                meetingTitle: inputRoomName || 'Meeting',
                userRole: user.role,
                userId: user.id,
                userName: user.name,
                teamId: user.teamId,
                globalId: user.globalId
            }, {
                headers: { 'auth-token': user.token }
            });
            
            // Refresh active meetings list
            fetchActiveMeetings();
        } catch (err) {
            console.error('Error notifying backend about meeting start:', err);
        }
    }, [user, inputRoomName, fetchActiveMeetings]);

    // New function to initialize the Jitsi API
    const initializeJitsiApi = useCallback((roomApi, jwtToken) => {
        if (!roomApi || !jwtToken || !jitsiContainerRef.current) {
            console.error("Attempted to initialize Jitsi API with missing parameters.");
            setError("Cannot initialize meeting: missing room name, token, or container.");
            return;
        }

        if (jitsiApiRef.current) {
            console.log("Jitsi API already initialized. Skipping re-creation.");
            setStatusMessage('Meeting active.');
            return;
        }

        console.log(`Initializing Jitsi meeting for room: "${roomApi}" with JWT present.`);
        setLoadingJitsi(true);
        setError('');
        setStatusMessage('Initializing Jitsi meeting interface...');

        const options = {
            roomName: `${JITSI_APP_ID}/${roomApi}`,
            width: '100%',
            height: '100%',
            parentNode: jitsiContainerRef.current,
            jwt: jwtToken,
            configOverwrite: {
                startWithAudioMuted: true,
                startWithVideoMuted: true,
                prejoinPageEnabled: true,
                disableInviteFunctions: true,
            },
            interfaceConfigOverwrite: {
                TOOLBAR_BUTTONS: [
                    'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                    'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                    'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                    'videoquality', 'filmstrip', 'feedback', 'stats', 'shortcuts',
                    'tileview', 'videobackgroundblur', 'help', 'mute-everyone', 'security'
                ],
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
            },
        };

        try {
            const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, options);
            jitsiApiRef.current = api;

            setLoadingJitsi(false);
            setStatusMessage('Jitsi meeting loaded. Grant camera/mic permissions.');
            console.log('JitsiMeetExternalAPI instance created successfully. The Jitsi iframe should now be rendering.');

            api.addEventListener('videoConferenceJoined', () => {
                console.log('Jitsi conference joined successfully!');
                setError('');
                setStatusMessage(`Joined ${getRoleDisplayInfo().title}!`);
            });
            
            api.addEventListener('readyToClose', () => {
                console.log('Jitsi Event: Jitsi API signaled readyToClose. Triggering endMeeting cleanup.');
                endMeeting();
            });
            
            api.addEventListener('participantLeft', (participant) => {
                console.log(`Participant left: ${participant.displayName || participant.id}`);
            });
            
            api.addEventListener('participantJoined', (participant) => {
                console.log(`Participant joined: ${participant.displayName || participant.id}`);
            });

        } catch (apiError) {
            console.error('CRITICAL ERROR: Failed to start Jitsi meeting via API:', apiError);
            setError(`Failed to start Jitsi meeting: ${apiError.message || 'Unknown API error'}. Please check browser console for details.`);
            setStatusMessage('');
            setIsMeetingStarted(false);
            setLoadingJitsi(false);
        }
    }, [endMeeting, getRoleDisplayInfo]);

    // Effect to trigger Jitsi API initialization when conditions are met
    useEffect(() => {
        console.log('--- Jitsi API Initialization Effect Triggered ---');
        console.log(`Conditions: Started=${isMeetingStarted}, ScriptLoaded=${isJitsiScriptLoaded},
                      ContainerRef=${!!jitsiContainerRef.current}, JWT_Present=${!!jitsiJwt},
                      API_Exists=${!!jitsiApiRef.current}, CurrentRoomName=${currentMeetingRoomName}`);

        if (isMeetingStarted && isJitsiScriptLoaded && jitsiContainerRef.current && jitsiJwt && currentMeetingRoomName && !jitsiApiRef.current) {
            console.log('All conditions met and Jitsi API not yet initialized. Calling initializeJitsiApi...');
            initializeJitsiApi(currentMeetingRoomName, jitsiJwt);
        } else if (isMeetingStarted && !isJitsiScriptLoaded) {
            console.warn('Jitsi initialization skipped: Script not loaded yet.');
            setLoadingJitsi(true);
            setStatusMessage('Waiting for Jitsi API script to load...');
        } else if (isMeetingStarted && !jitsiJwt) {
            console.warn('Jitsi initialization skipped: JWT not available.');
            setLoadingJitsi(true);
            setStatusMessage('Waiting for Jitsi authentication token...');
        } else if (isMeetingStarted && !currentMeetingRoomName) {
            console.warn('Jitsi initialization skipped: Current meeting room name not set.');
            setLoadingJitsi(true);
            setStatusMessage('Waiting for room name to be set...');
        }

        return () => {
            if (jitsiApiRef.current && !isMeetingStarted) {
                console.log('Cleanup Effect: Disposing Jitsi API instance because meeting ended or component unmounted.');
                jitsiApiRef.current.dispose();
                jitsiApiRef.current = null;
            }
        };
    }, [isMeetingStarted, isJitsiScriptLoaded, jitsiJwt, currentMeetingRoomName, initializeJitsiApi]);

    // Event Handlers
    const handleStartMeetingClick = async () => {
        if (!user) {
            setError('Please log in to access video conferencing.');
            return;
        }

        if (!inputRoomName.trim()) {
            setError('Please enter a meeting name to start or join.');
            setStatusMessage('');
            return;
        }

        if (!isJitsiScriptLoaded) {
            setError('Jitsi Meet API script is not loaded yet. Please wait a moment and try again, or check your network connection.');
            setStatusMessage('Still loading Jitsi API script...');
            return;
        }

        console.log('Frontend: Starting role-based meeting sequence: generating JWT and setting meeting state...');
        setError('');
        setStatusMessage('Starting meeting setup...');

        const roleBasedRoomName = generateRoleBasedRoomName(inputRoomName.trim());
        
        if (!roleBasedRoomName) {
            setError('Failed to generate room name. Please check your login status.');
            return;
        }

        console.log(`Frontend: Using role-based room name for JWT and Jitsi API: "${roleBasedRoomName}"`);

        // Generate JWT first
        const generatedJwt = await generateJitsiJwt(roleBasedRoomName);

        if (generatedJwt) {
            // Notify backend about meeting start
            await notifyMeetingStart(roleBasedRoomName);
            
            // Update state to start meeting
            setCurrentMeetingRoomName(roleBasedRoomName);
            setIsMeetingStarted(true);
        } else {
            console.error('Frontend: JWT generation failed, not proceeding to start meeting.');
        }
    };

    const handleJoinExistingMeeting = async (meetingRoom) => {
        if (!user) {
            setError('Please log in to join meetings.');
            return;
        }

        console.log('Frontend: Joining existing meeting...');
        setError('');
        setStatusMessage('Joining existing meeting...');

        const generatedJwt = await generateJitsiJwt(meetingRoom);

        if (generatedJwt) {
            setCurrentMeetingRoomName(meetingRoom);
            setIsMeetingStarted(true);
            setInputRoomName(''); // Clear input since we're joining existing
        } else {
            console.error('Frontend: JWT generation failed for joining meeting.');
        }
    };

    const copyMeetingLink = () => {
        if (currentMeetingRoomName) {
            const meetingLink = `https://${JITSI_DOMAIN}/${JITSI_APP_ID}/${currentMeetingRoomName}`;
            navigator.clipboard.writeText(meetingLink)
                .then(() => {
                    alert('Meeting link copied to clipboard!');
                    console.log('Frontend: Meeting link copied:', meetingLink);
                })
                .catch(err => {
                    console.error('Frontend: Failed to copy meeting link to clipboard:', err);
                    alert('Failed to copy link. Please copy it manually from your browser address bar.');
                });
        }
    };

    const roleInfo = getRoleDisplayInfo();

    // Render Logic
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
                    🚀 {roleInfo.title}
                </h2>

                {!user ? (
                    <div className="text-center text-red-400">
                        <p>Please log in to access video conferencing.</p>
                    </div>
                ) : !isMeetingStarted ? (
                    <div className="space-y-4 text-white">
                        <div className="text-center text-sm text-gray-300 mb-4">
                            Welcome, {user.name}! | Role: {user.role.toUpperCase()} | {roleInfo.description}
                        </div>

                        {/* Active Meetings */}
                        {activeMeetings.length > 0 && (
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-lg font-semibold text-blue-300">Active {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Meetings</h3>
                                    <button
                                        onClick={() => setShowActiveMeetings(!showActiveMeetings)}
                                        className="text-sm text-purple-300 hover:text-purple-200"
                                    >
                                        {showActiveMeetings ? 'Hide' : `Show (${activeMeetings.length})`}
                                    </button>
                                </div>
                                
                                {showActiveMeetings && (
                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                        {activeMeetings.map((meeting, index) => (
                                            <div key={index} className="flex items-center justify-between bg-white/10 p-3 rounded-lg">
                                                <div>
                                                    <div className="font-medium">{meeting.meetingTitle}</div>
                                                    <div className="text-sm text-gray-300">
                                                        Created by: {meeting.userName} • 
                                                        {meeting.participants || 1} participant(s)
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleJoinExistingMeeting(meeting.roomName)}
                                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm"
                                                >
                                                    Join
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Create New Meeting */}
                        <p className="text-gray-200 text-center">Enter a meeting name to create or join a {user.role} meeting.</p>
                        <input
                            type="text"
                            placeholder={`Enter meeting name (e.g., Daily Standup, Project Review)`}
                            value={inputRoomName}
                            onChange={(e) => setInputRoomName(e.target.value)}
                            className="w-full p-3 rounded-xl bg-white/10 text-white placeholder-gray-400 border border-white/20 focus:ring-2 focus:ring-purple-500"
                        />
                        {error && <p className="text-red-400">{error}</p>}
                        {statusMessage && <p className="text-blue-400">{statusMessage}</p>}
                        <button
                            onClick={handleStartMeetingClick}
                            disabled={!inputRoomName.trim() || loadingJitsi || !isJitsiScriptLoaded}
                            className="w-full py-3 rounded-xl font-semibold text-lg
                                        bg-gradient-to-r from-purple-600 to-blue-600 
                                        hover:scale-105 transform transition disabled:opacity-50"
                        >
                            {loadingJitsi ? 'Starting...' : `Start/Join ${user.role.charAt(0).toUpperCase() + user.role.slice(1)} Meeting`}
                        </button>

                        {!isJitsiScriptLoaded && (
                            <p className="text-sm text-gray-500 text-center">
                                Loading API... Please wait.
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-green-400 font-medium text-center">
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Meeting: <span className="font-bold">{inputRoomName || 'Active Session'}</span>
                            <br />
                            <span className="text-sm text-gray-300">Room: {currentMeetingRoomName}</span>
                        </p>
                        {loadingJitsi && !jitsiApiRef.current && (
                            <p className="text-blue-600 text-center">Loading Meeting interface... Please wait.</p>
                        )}
                        {error && <p className="text-red-400">{error}</p>}
                        {statusMessage && <p className="text-blue-400">{statusMessage}</p>}
                        <div
                            ref={jitsiContainerRef}
                            className="w-full h-[500px] rounded-2xl overflow-hidden border border-white/20 bg-black/50"
                        >
                            {!loadingJitsi && !jitsiApiRef.current && !error && (
                                <span>Meeting will load here. Grant camera/mic permissions if prompted.</span>
                            )}
                        </div>
                        <div className="flex flex-col gap-4">
                            <button
                                onClick={copyMeetingLink}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:scale-105 transition"
                            >
                                Copy Meeting Link
                            </button>
                            <button
                                onClick={endMeeting}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 hover:scale-105 transition"
                            >
                                End Meeting
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoConference;