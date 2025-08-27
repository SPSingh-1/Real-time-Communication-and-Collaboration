// src/pages/VideoConferencePage.jsx (Example file path)
import React from 'react';
// Assuming your main VideoConference component is in src/components/
import VideoConference from '../VideoConference/VideoConferenc.jsx';

const VideoConferencePage = () => {
  return (
    <div className="tool-container p-6 bg-gradient-to-br from-gray-100 to-white min-h-screen">
      {/* Render the main VideoConference logic component */}
      <VideoConference />
    </div>
  );
};

export default VideoConferencePage;
