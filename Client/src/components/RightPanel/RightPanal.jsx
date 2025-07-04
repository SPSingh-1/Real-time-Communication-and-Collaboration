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
    <div className="bg-white rounded-xl overflow-x-hidden shadow-xl p-4 w-full h-[85vh] flex flex-col transition-all duration-500">
      <div className="flex justify-around border-b pb-2 mb-4">
        <button
          className={`flex items-center gap-1 px-2 py-2 text-sm font-medium rounded-t transition-all duration-300 ${
            activeTab === 'notifications'
              ? 'border-b-2 border-blue-600 text-blue-700 bg-blue-50'
              : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
          }`}
          onClick={() => setActiveTab('notifications')}
        >
          <Bell size={18} /> Notifications
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t transition-all duration-300 ${
            activeTab === 'notes'
              ? 'border-b-2 border-blue-600 text-blue-700 bg-blue-50'
              : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
          }`}
          onClick={() => setActiveTab('notes')}
        >
          <FileText size={18} /> Notes
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t transition-all duration-300 ${
            activeTab === 'attendees'
              ? 'border-b-2 border-blue-600 text-blue-700 bg-blue-50'
              : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
          }`}
          onClick={() => setActiveTab('attendees')}
        >
          <Users size={18} /> Attendees
        </button>
      </div>

      <div className="flex-1 overflow-y-auto transition-all duration-500">
        {renderActiveTab()}
      </div>
    </div>
  );
};

export default RightPanel;
