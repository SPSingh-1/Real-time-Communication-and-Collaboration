// RightPanel.jsx
import React, { useState } from 'react';
import NotificationFeed from '../RightTabs/NotificationFeed';
import DailyNotes from '../RightTabs/DailyNotes';
import AttendeeList from '../RightTabs/AttendeeList';
import { Bell, FileText, Users } from 'lucide-react';

const RightPanel = () => {
  const [activeTab, setActiveTab] = useState('notifications');

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'notifications':
        return <NotificationFeed />;
      case 'notes':
        return <DailyNotes />;
      case 'attendees':
        return <AttendeeList />;
      default:
        return null;
    }
  };

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-2xl p-4 w-full h-[85vh] flex flex-col transition-all duration-500 transform hover:scale-[1.02]">
      {/* 🔹 Gradient Background Layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-600 opacity-90"></div>

      {/* 🔹 Animated Gradient Blobs */}
      <div className="absolute top-10 left-10 w-28 h-28 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg opacity-30 animate-spin-slow transform-gpu"></div>
      <div className="absolute bottom-12 right-12 w-32 h-32 bg-gradient-to-r from-pink-400 to-purple-600 rounded-full opacity-30 animate-pulse transform-gpu"></div>
      <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-gradient-to-r from-blue-300 to-indigo-500 rounded-xl opacity-20 animate-bounce transform-gpu"></div>

      {/* 🔹 Foreground Content */}
      <div className="relative z-10">
        {/* Tab Buttons */}
        <div className="flex justify-around border-b border-white/20 pb-2 mb-4">
          <button
            className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-t-lg transition-all duration-300 transform hover:scale-105 ${
              activeTab === 'notifications'
                ? 'border-b-2 border-white text-white bg-white/20 backdrop-blur-sm shadow-inner'
                : 'text-gray-200 hover:text-white hover:bg-white/10'
            }`}
            onClick={() => setActiveTab('notifications')}
          >
            <Bell size={18} /> Notifications
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-300 transform hover:scale-105 ${
              activeTab === 'notes'
                ? 'border-b-2 border-white text-white bg-white/20 backdrop-blur-sm shadow-inner'
                : 'text-gray-200 hover:text-white hover:bg-white/10'
            }`}
            onClick={() => setActiveTab('notes')}
          >
            <FileText size={18} /> Notes
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-300 transform hover:scale-105 ${
              activeTab === 'attendees'
                ? 'border-b-2 border-white text-white bg-white/20 backdrop-blur-sm shadow-inner'
                : 'text-gray-200 hover:text-white hover:bg-white/10'
            }`}
            onClick={() => setActiveTab('attendees')}
          >
            <Users size={18} /> Attendees
          </button>
        </div>

        {/* Active Content */}
        <div className="flex-1 transition-all duration-500 transform perspective-1000 backdrop-blur-md">
          {renderActiveTab()}
        </div>
      </div>
    </div>
  );
};

export default RightPanel;
