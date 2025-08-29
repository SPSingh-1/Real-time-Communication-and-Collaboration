import React, { useState } from 'react';
import Sidebar from '../components/Sidebar/Sidebar';
import ChatBox from '../components/Chat/ChatBox';
import Dashboard from '../components/Dashboard/Dashboard';
import TaskManager from '../components/Tools/TaskManager';
import FileManager from '../components/Tools/FileManager';
import CalendarTool from '../components/Tools/CalendarTool';
import FigmaTool from '../components/Tools/FigmaTool';
import VideoConferenc from '../components/Tools/VideoConferenc';

const DashboardPage = () => {
  const [activeTab, setActiveTab] = useState('Dashboard');

  return (
    <div
      className="flex min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black overflow-hidden overflow-y-hidden relative"
    >
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-700/30 via-blue-600/20 to-transparent blur-3xl"></div>

      {/* Sidebar with 3D tilt */}
      <div
        className="relative z-20 transform transition-all duration-500 hover:rotate-y-6"
        style={{
          transformStyle: "preserve-3d",
        }}
      >
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Main Content */}
      <main
        className="flex-1 h-screen flex flex-col relative z-20 
        bg-gray-900/70 backdrop-blur-xl 
        shadow-2xl rounded-tl-3xl border border-gray-700/40 
        transform transition-all duration-700 hover:rotate-x-3 hover:-rotate-y-3"
      >
        <div className="p-6 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
          {activeTab === 'Dashboard' && <Dashboard />}
          {activeTab === 'chat' && <ChatBox />}
          {activeTab === 'tasks' && <TaskManager />}
          {activeTab === 'files' && <FileManager />}
          {activeTab === 'calendar' && <CalendarTool />}
          {activeTab === 'figma' && <FigmaTool />}
          {activeTab === 'VideoConferenc' && <VideoConferenc />}
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
