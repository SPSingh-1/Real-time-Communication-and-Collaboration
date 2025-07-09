import React, { useState } from 'react';
import Sidebar from '../components/Sidebar/Sidebar';
import ChatBox from '../components/Chat/ChatBox';
import TaskManager from '../components/Tools/TaskManager';
import FileManager from '../components/Tools/FileManager';
import CalendarTool from '../components/Tools/CalendarTool';
import FigmaTool from '../components/Tools/FigmaTool';
import VideoConferenc from '../components/Tools/VideoConferenc';

const DashboardPage = () => {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div className="flex min-h-screen bg-gray-100 overflow-y-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 p-6 bg-gray-300 overflow-y-auto dashboard-content">
        {activeTab === 'chat' && <ChatBox />}
        {activeTab === 'tasks' && <TaskManager />}
        {activeTab === 'files' && <FileManager />}
        {activeTab === 'calendar' && <CalendarTool />}
        {activeTab === 'figma' && <FigmaTool />}
        {activeTab === 'VideoConferenc' && <VideoConferenc />}
      </main>
    </div>
  );
};

export default DashboardPage;
