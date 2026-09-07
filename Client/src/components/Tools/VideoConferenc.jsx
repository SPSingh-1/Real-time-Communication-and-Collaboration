// src/pages/VideoConferencePage.jsx
import React, { useEffect, useState } from 'react';
import VideoConference from '../VideoConference/VideoConferenc.jsx';
import useAppContext from '../../context/useAppContext.js';
import AudioCall from '../VideoConference/AudioCall.jsx';
import { Video, Phone, Monitor, Smartphone } from 'lucide-react';

const VideoConferencePage = ({ autoJoinMeeting }) => {
  const { user } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('video'); // 'video' or 'audio'

  // Sync tab with URL search params or incoming auto-join data
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const typeParam = params.get('type');
    if (typeParam === 'audio') {
      setActiveTab('audio');
    } else if (typeParam === 'video') {
      setActiveTab('video');
    }
    if (autoJoinMeeting) {
      setActiveTab(autoJoinMeeting.isAudio ? 'audio' : 'video');
    }
  }, [autoJoinMeeting]);

  // Check user authentication on component mount
  useEffect(() => {
    if (!user) {
      setError('Please log in to access video conferencing');
    } else {
      setError('');
    }
    setLoading(false);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-black/5">
        <div className="text-center p-8 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 shadow-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading Conference Platform...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900/20 via-orange-900/10 to-black/5">
        <div className="text-center p-8 rounded-2xl bg-white/10 backdrop-blur-lg border border-red-200/30 shadow-xl max-w-md mx-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Monitor className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-red-700 mb-2">Access Required</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6 bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Title */}
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Calling & Collaboration Hub
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              User: <span className="font-semibold text-blue-400">{user?.name || user?.email}</span> • Role: <span className="uppercase text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">{user?.role || 'single'}</span>
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('video')}
              className={`flex items-center justify-center gap-2 px-5 py-2 rounded-md font-medium text-sm transition-colors flex-1 sm:flex-initial ${
                activeTab === 'video'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Video Conference</span>
            </button>
            <button
              onClick={() => setActiveTab('audio')}
              className={`flex items-center justify-center gap-2 px-5 py-2 rounded-md font-medium text-sm transition-colors flex-1 sm:flex-initial ${
                activeTab === 'audio'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Phone className="w-4 h-4" />
              <span>Voice Lounge</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto">
        {activeTab === 'video' ? (
          <VideoConference user={user} autoJoinMeeting={autoJoinMeeting} />
        ) : (
          <AudioCall user={user} autoJoinMeeting={autoJoinMeeting} />
        )}
      </div>
    </div>
  );
};

export default VideoConferencePage;