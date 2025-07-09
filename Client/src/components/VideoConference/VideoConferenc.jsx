import React, { useState, useEffect, useRef } from 'react';

// Assume Tailwind CSS is available in your project
// No explicit CSS import needed if using Tailwind classes directly

// IMPORTANT: If you want to use your own self-hosted Jitsi Meet instance,
// change this domain to your Jitsi server's domain (e.g., 'your-jitsi-domain.com')
const JITSI_DOMAIN = 'meet.jit.si';

const VideoConference = () => {
  const [roomName, setRoomName] = useState('');
  const [jitsiApi, setJitsiApi] = useState(null);
  const [isMeetingStarted, setIsMeetingStarted] = useState(false);
  const [loadingJitsi, setLoadingJitsi] = useState(false); // New loading state for Jitsi initialization
  const [error, setError] = useState('');
  const jitsiContainerRef = useRef(null); // Ref for the div where Jitsi will be embedded

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

    // Cleanup function: Dispose Jitsi API when component unmounts
    return () => {
      if (jitsiApi) {
        jitsiApi.dispose();
      }
      // Note: Removing the script itself is generally not necessary unless memory is critical
      // as it might be used by other components or pages.
    };
  }, [jitsiApi]); // Dependency array: run when jitsiApi changes (for cleanup)

  // 2. Initialize Jitsi API when isMeetingStarted becomes true and ref is available
  useEffect(() => {
    if (isMeetingStarted && jitsiContainerRef.current && window.JitsiMeetExternalAPI) {
      setLoadingJitsi(true); // Start loading indicator for Jitsi embed
      setError(''); // Clear previous errors

      const options = {
        roomName: roomName.trim(),
        width: '100%',
        height: '100%', // Use 100% height to fill the parent div
        parentNode: jitsiContainerRef.current,
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false, // Skip the prejoin page
          // 'speaker-selection' was an unrecognized feature, ensure valid toolbar buttons
          // You can customize the toolbar buttons here if needed
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
          // Removed 'speaker-selection' as it was causing a warning
        },
      };

      try {
        const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, options);
        setJitsiApi(api);
        setLoadingJitsi(false); // Jitsi API initialized

        // Add event listeners for Jitsi API if needed
        api.addEventListener('videoConferenceJoined', () => {
          console.log('Jitsi conference joined!');
        });
        api.addEventListener('participantLeft', (participant) => {
          console.log('Participant left:', participant);
        });
        // You can also set the display name here
        // api.executeCommand('displayName', 'Your User Name');

      } catch (apiError) {
        console.error('Error initializing Jitsi meeting:', apiError);
        setError('Failed to start Jitsi meeting. Please check console for details.');
        setIsMeetingStarted(false); // Revert state if initialization fails
        setLoadingJitsi(false);
      }
    }
  }, [isMeetingStarted, roomName]); // Dependencies: re-run when these change

  // Function to initiate the meeting start process (sets isMeetingStarted to true)
  const handleStartMeetingClick = () => {
    if (!roomName.trim()) {
      setError('Please enter a room name.');
      return;
    }
    if (!window.JitsiMeetExternalAPI) {
      setError('Jitsi Meet API script is not loaded yet. Please wait a moment and try again.');
      return;
    }
    setIsMeetingStarted(true); // This will trigger the useEffect above
  };

  // Function to end the current Jitsi meeting
  const endMeeting = () => {
    if (jitsiApi) {
      jitsiApi.dispose(); // Dispose of the Jitsi instance
      setJitsiApi(null);
      setIsMeetingStarted(false);
      setRoomName(''); // Clear room name after ending
      setError(''); // Clear any errors
      setLoadingJitsi(false); // Reset loading state
      console.log('Jitsi meeting ended.');
    }
  };

  // Function to copy the meeting link to clipboard
  const copyMeetingLink = () => {
    if (roomName) {
      const meetingLink = `https://${JITSI_DOMAIN}/${roomName}`;
      // Using document.execCommand('copy') as navigator.clipboard.writeText() might not work in iframes
      const el = document.createElement('textarea');
      el.value = meetingLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      // IMPORTANT: Replace alert with a custom modal/toast notification in a real app
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
            {loadingJitsi ? 'Loading Jitsi...' : 'Start/Join Meeting'}
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
