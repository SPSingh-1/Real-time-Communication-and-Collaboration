// src/pages/VideoConferencePage.jsx
import React, { useEffect, useState } from 'react';
import VideoConference from '../VideoConference/VideoConferenc.jsx';
import useAppContext from '../../context/useAppContext.js';
import AudioCall from '../VideoConference/AudioCall.jsx';
import { Video, Phone, Monitor, Smartphone } from 'lucide-react';

const VideoConferencePage = () => {
  const { user } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('video'); // 'video' or 'audio'

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
    <div className="min-h-screen bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-black/5">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-lg border-b border-gray-200/30 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Title */}
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Conference Center
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Welcome back, <span className="font-semibold text-purple-600">{user?.name}</span>
              </p>
            </div>

            {/* Tab Navigation - Unified for all screen sizes */}
            <div className="flex w-full sm:w-auto">
              <div className="flex bg-gray-100 rounded-xl p-1 shadow-inner w-full sm:w-auto">
                <button
                  onClick={() => setActiveTab('video')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap flex-1 sm:flex-initial justify-center sm:justify-start ${
                    activeTab === 'video'
                      ? 'bg-white text-purple-600 shadow-md transform scale-105'
                      : 'text-gray-600 hover:text-purple-600 hover:bg-white/50'
                  }`}
                >
                  <Video className="w-4 h-4" />
                  <span className="hidden xs:inline">Video Conference</span>
                  <span className="xs:hidden">Video</span>
                </button>
                <button
                  onClick={() => setActiveTab('audio')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap flex-1 sm:flex-initial justify-center sm:justify-start ${
                    activeTab === 'audio'
                      ? 'bg-white text-green-600 shadow-md transform scale-105'
                      : 'text-gray-600 hover:text-green-600 hover:bg-white/50'
                  }`}
                >
                  <Phone className="w-4 h-4" />
                  <span className="hidden xs:inline">Audio Call</span>
                  <span className="xs:hidden">Audio</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Tab Content Container */}
        <div className="relative">
          {/* Active Tab Indicator */}
          <div className="flex items-center gap-3 mb-6 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm">
            <div className={`w-3 h-3 rounded-full ${
              activeTab === 'video' 
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 shadow-lg' 
                : 'bg-gradient-to-r from-green-500 to-green-600 shadow-lg'
            }`}></div>
            <span className="text-sm font-medium text-gray-700">
              Currently in: <span className={`${
                activeTab === 'video' ? 'text-purple-600' : 'text-green-600'
              } font-semibold`}>
                {activeTab === 'video' ? 'Video Conference Mode' : 'Audio Call Mode'}
              </span>
            </span>
            <div className="hidden sm:flex items-center gap-1 ml-auto text-xs text-gray-500">
              <Smartphone className="w-3 h-3" />
              <Monitor className="w-3 h-3" />
              <span>Responsive Design</span>
            </div>
          </div>

          {/* Content Area */}
          <div className="relative min-h-[600px] lg:min-h-[700px]">
            {/* Video Conference Tab */}
            <div className={`transition-all duration-300 ${
              activeTab === 'video' 
                ? 'opacity-100 transform translate-x-0' 
                : 'opacity-0 absolute inset-0 transform translate-x-full pointer-events-none'
            }`}>
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
                <div className="p-4 lg:p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                      <Video className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-lg lg:text-xl font-semibold text-gray-800">
                      Video Conference
                    </h2>
                    <div className="hidden sm:block px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                      High Quality
                    </div>
                  </div>
                  <VideoConference user={user} />
                </div>
              </div>
            </div>

            {/* Audio Call Tab */}
            <div className={`transition-all duration-300 ${
              activeTab === 'audio' 
                ? 'opacity-100 transform translate-x-0' 
                : 'opacity-0 absolute inset-0 transform -translate-x-full pointer-events-none'
            }`}>
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
                <div className="p-4 lg:p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <Phone className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-lg lg:text-xl font-semibold text-gray-800">
                      Audio Call
                    </h2>
                    <div className="hidden sm:block px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      Voice Only
                    </div>
                  </div>
                  <AudioCall user={user} />
                </div>
              </div>
            </div>
          </div>
        </div>

        
      </div>

      {/* Responsive Design Indicators */}
      <div className="fixed bottom-2 right-2 text-xs text-gray-400 opacity-50">
        <div className="sm:hidden">Mobile</div>
        <div className="hidden sm:block md:hidden">Tablet</div>
        <div className="hidden md:block lg:hidden">Desktop</div>
        <div className="hidden lg:block">Large Desktop</div>
      </div>
    </div>
  );
};

export default VideoConferencePage;