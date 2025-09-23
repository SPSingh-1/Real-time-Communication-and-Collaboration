// src/pages/VideoConferencePage.jsx
import React, { useEffect, useState } from 'react';
import VideoConference from '../VideoConference/VideoConferenc.jsx';
// Using your existing App context with correct import
import useAppContext from '../../context/useAppContext.js';

const VideoConferencePage = () => {
  const { user } = useAppContext(); // Get user from your existing app context
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Check user authentication on component mount
  useEffect(() => {
    // Simple check - if you have more complex auth validation, add it here
    if (!user) {
      setError('Please log in to access video conferencing');
    } else {
      setError('');
    }
    setLoading(false);
  }, [user]);

  if (loading) {
    return (
      <div className="tool-container p-6 bg-gradient-to-br from-gray-100 to-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tool-container p-6 bg-gradient-to-br from-gray-100 to-white min-h-screen flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold mb-2">Access Required</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tool-container p-6 bg-gradient-to-br from-gray-100 to-white min-h-screen">
      {/* Render the main VideoConference component with user data */}
      <VideoConference user={user} />
    </div>
  );
};

export default VideoConferencePage;