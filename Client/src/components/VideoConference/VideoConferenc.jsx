// frontend/src/VideoConference.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios'; // Import axios for making API requests

// IMPORTANT: Change this to your Jitsi as a Service (Jaas) domain
// e.g., '8x8.vc' if using 8x8 JaaS, or your self-hosted Jitsi instance URL
const JITSI_DOMAIN = '8x8.vc'; // Default for 8x8 JaaS

const VideoConference = () => {
    const [roomName, setRoomName] = useState('');
    const [jitsiApi, setJitsiApi] = useState(null);
    const [isMeetingStarted, setIsMeetingStarted] = useState(false);
    const [loadingJitsi, setLoadingJitsi] = useState(false);
    const [error, setError] = useState('');
    const [jitsiJwt, setJitsiJwt] = useState(''); // State to store the JWT
    const jitsiContainerRef = useRef(null);

    // Backend API base URL
    const API_BASE_URL = 'http://localhost:3001/api'; // Or your deployed backend URL

    // 1. Load Jitsi Meet External API script dynamically
    useEffect(() => {
        const scriptId = 'jitsi-meet-api-script';
        if (document.getElementById(scriptId)) {
            return; // Script already loaded
        }

        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://${JITSI_DOMAIN}/external_api.js`;
        script.async = true;
        script.onload = () => console.log('Jitsi Meet External API script loaded.');
        script.onerror = () => setError('Failed to load Jitsi Meet API script.');
        document.body.appendChild(script);

        return () => {
            if (jitsiApi) {
                jitsiApi.dispose();
            }
        };
    }, [jitsiApi]);

    // Function to generate Jitsi JWT from backend
    const generateJitsiJwt = async (room) => {
        try {
            setLoadingJitsi(true);
            setError('');
            // You might want to get actual user details (userId, userName, etc.)
            // from your app's authentication context or state.
            // For now, using static values or placeholders.
            const userDetails = {
                room: room,
                userId: "auth0|686f54a92070f9f6f70dd1a4", // Example ID, get from your auth system
                userName: "spsrajjput",
                userEmail: "spsrajjput@gmail.com",
                userAvatar: "https://www.google.com/imgres?q=real%20time%20communication%20logo&imgurl=https%3A%2F%2Fwww.clipartmax.com%2Fpng%2Fmiddle%2F185-1851819_real-time-communication-real-time-communication.png&imgrefurl=https%3A%2F%2Fwww.clipartmax.com%2Fmiddle%2Fm2i8b1K9i8H7m2N4_real-time-communication-real-time-communication%2F&docid=RLS_JXE28tJ5dM&tbnid=6o-WByBlDQhQ5M&vet=2ahUKEwi0qOjfz7GOAxXxumMGHdgsLsYQM3oECGQQAA..i&w=840&h=380&hcb=2&ved=2ahUKEwi0qOjfz7GOAxXxumMGHdgsLsYQM3oECGQQAA",
                moderator: true, // Based on your provided JWT payload
            };
            const response = await axios.post(`${API_BASE_URL}/jitsi/generate-jwt`, userDetails);
            setJitsiJwt(response.data.jwt);
            console.log('Jitsi JWT generated successfully.');
        } catch (err) {
            console.error('Error generating Jitsi JWT:', err);
            setError('Failed to generate Jitsi token. Please check backend configuration and server logs.');
            setLoadingJitsi(false);
            return null;
        } finally {
            setLoadingJitsi(false); // Ensure loading state is reset
        }
    };


    // 2. Initialize Jitsi API when isMeetingStarted becomes true, ref is available, and JWT is present
    useEffect(() => {
        if (isMeetingStarted && jitsiContainerRef.current && window.JitsiMeetExternalAPI && jitsiJwt) {
            setLoadingJitsi(true);
            setError('');

            const options = {
                roomName: roomName.trim(),
                width: '100%',
                height: '100%',
                parentNode: jitsiContainerRef.current,
                jwt: jitsiJwt, // Pass the generated JWT here
                configOverwrite: {
                    startWithAudioMuted: false,
                    startWithVideoMuted: false,
                    prejoinPageEnabled: false,
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
                setJitsiApi(api);
                setLoadingJitsi(false);

                api.addEventListener('videoConferenceJoined', () => {
                    console.log('Jitsi conference joined!');
                });
                api.addEventListener('participantLeft', (participant) => {
                    console.log('Participant left:', participant);
                });

            } catch (apiError) {
                console.error('Error initializing Jitsi meeting:', apiError);
                setError('Failed to start Jitsi meeting. Please check console for details.');
                setIsMeetingStarted(false);
                setLoadingJitsi(false);
            }
        }
    }, [isMeetingStarted, roomName, jitsiJwt]); // Add jitsiJwt to dependencies

    const handleStartMeetingClick = async () => {
        if (!roomName.trim()) {
            setError('Please enter a room name.');
            return;
        }
        if (!window.JitsiMeetExternalAPI) {
            setError('Jitsi Meet API script is not loaded yet. Please wait a moment and try again.');
            return;
        }

        // Generate JWT before starting the meeting
        await generateJitsiJwt(roomName.trim());

        // The useEffect hook will now trigger the Jitsi API initialization
        // once jitsiJwt state is updated and it's not null.
        if (jitsiJwt) { // This check might be slightly delayed if `setJitsiJwt` is asynchronous
            setIsMeetingStarted(true);
        }
    };

    const endMeeting = () => {
        if (jitsiApi) {
            jitsiApi.dispose();
            setJitsiApi(null);
            setIsMeetingStarted(false);
            setRoomName('');
            setError('');
            setLoadingJitsi(false);
            setJitsiJwt(''); // Clear JWT on end
            console.log('Jitsi meeting ended.');
        }
    };

    const copyMeetingLink = () => {
        if (roomName) {
            // Note: The meeting link structure depends on your JaaS setup.
            // For 8x8.vc it's generally meet.8x8.vc/ROOM_NAME
            const meetingLink = `https://${JITSI_DOMAIN}/${roomName}`;
            const el = document.createElement('textarea');
            el.value = meetingLink;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            alert('Meeting link copied to clipboard!');
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md max-w-lg mx-auto my-8 font-inter">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Jitsi Meet Integration</h2>

            {!isMeetingStarted ? (
                <div className="space-y-4">
                    <p className="text-gray-600 text-center">Create or join a Jitsi meeting.</p>
                    <input
                        type="text"
                        placeholder="Enter meeting room name"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {error && (
                        <p className="text-red-600 text-sm text-center bg-red-100 p-3 rounded-md border border-red-300">
                            Error: {error}
                        </p>
                    )}
                    <button
                        onClick={handleStartMeetingClick}
                        disabled={!roomName.trim() || loadingJitsi}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loadingJitsi ? 'Generating Token...' : 'Start/Join Meeting'}
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-green-600 font-medium text-center">Meeting in progress: {roomName}</p>
                    {loadingJitsi && (
                        <p className="text-blue-600 text-center">Loading Jitsi meeting interface...</p>
                    )}
                    <div ref={jitsiContainerRef} className="w-full h-[500px] border border-gray-300 rounded-lg overflow-hidden">
                        {/* Jitsi meeting will be embedded here */}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={copyMeetingLink}
                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75"
                        >
                            Copy Meeting Link
                        </button>
                        <button
                            onClick={endMeeting}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
                        >
                            End Meeting
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoConference;