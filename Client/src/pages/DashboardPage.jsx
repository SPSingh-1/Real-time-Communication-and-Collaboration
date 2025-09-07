import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar/Sidebar';
import ChatBox from '../components/Chat/ChatBox';
import Dashboard from '../components/Dashboard/Dashboard';
import TaskManager from '../components/Tools/TaskManager';
import FileManager from '../components/Tools/FileManager';
import CalendarTool from '../components/Tools/CalendarTool';
import FigmaTool from '../components/Tools/FigmaTool';
import VideoConferenc from '../components/Tools/VideoConferenc';
import useAppContext from "../context/useAppContext";
import CircularProgress from '@mui/material/CircularProgress';
import UserProfile from '../components/Tools/UserProfil';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, loading, authChecked, isAuthenticated } = useAppContext();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (authChecked && !isAuthenticated) {
      navigate('/login');
    }
  }, [authChecked, isAuthenticated, navigate]);

  // Show loading screen while checking authentication
  if (loading || !authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="text-center text-white">
          <CircularProgress sx={{ color: 'white', mb: 2 }} size={60} />
          <div className="text-xl font-semibold mt-4">Loading Dashboard...</div>
          <div className="text-gray-400 mt-2">Please wait while we prepare your workspace</div>
        </div>
      </div>
    );
  }

  // Show error if user not found
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">⚠️</div>
          <div className="text-xl font-semibold mb-2">Authentication Error</div>
          <div className="text-gray-400 mb-6">Unable to load user data</div>
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg transition"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const getRoleDisplayInfo = () => {
  switch (user.role) {
    case "single":
      return {
        title: "Personal Workspace",
        subtitle: "Your private dashboard",
        gradient: "from-blue-600/20 to-purple-600/20",
        logo: "/logo.png", // ✅ app logo
      };
    case "team":
      return {
        title: "Team Workspace",
        subtitle: user.teamId ? `Team: ${user.teamId}` : "Team Dashboard",
        gradient: "from-green-600/20 to-blue-600/20",
        logo: "/logo.png",
      };
    case "global":
      return {
        title: "Global Community",
        subtitle: "Connected worldwide",
        gradient: "from-purple-600/20 to-pink-600/20",
        logo: "/logo.png",
      };
    default:
      return {
        title: "Dashboard",
        subtitle: "Welcome",
        gradient: "from-gray-600/20 to-gray-700/20",
        logo: "/logo.png",
      };
  }
};

  const roleInfo = getRoleDisplayInfo();

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black overflow-hidden relative">
      {/* ANIMATED BACKGROUND */}
      <div className={`absolute inset-0 bg-gradient-to-tr ${roleInfo.gradient} blur-3xl opacity-50`}></div>
      <div className="absolute inset-0 bg-gradient-to-bl from-blue-600/10 via-transparent to-purple-600/10"></div>

      {/* SIDEBAR */}
      <div className={`relative z-20 transition-all duration-500 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          userRole={user.role}
        />
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 h-screen flex flex-col relative z-20 bg-gray-900/40 backdrop-blur-xl shadow-2xl border-l border-gray-700/40">
        {/* HEADER */}
        <header className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-sm border-b border-gray-700/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className='flex gap-2 items-center'>
                <img src="/logo.png" alt="applogo" className='h-[40px] w-[40px] rounded-3xl'/>
                <h1 className="text-2xl font-bold text-white">{roleInfo.title}</h1>
              </div>
              <p className="text-gray-400">{roleInfo.subtitle}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
               <div className="text-white font-medium">
                  <button
                    className="sidebar-user-btn flex items-center space-x-2"
                    onClick={() => setActiveTab("profile")}
                    title="View Profile"
                  >
                    {/* Profile image OR dummy icon */}
                    {user?.photo ? (
                      <img
                        src={user.photo}
                        alt="Profile"
                        className="w-8 h-8 rounded-full object-cover border"
                      />
                    ) : (
                      <span className="text-xl">👤</span>
                    )}

                    {/* Welcome text */}
                    <span>
                      {user?.name
                        ? user.name
                        : user?.email
                        ? user.email.split("@")[0]
                        : "Guest"}
                    </span>
                  </button>
                </div>
                <div className="text-gray-400 text-sm">{user.email}</div>
              </div>
              <div className={`w-3 h-3 rounded-full ${
                user.role === 'single' ? 'bg-blue-500' :
                user.role === 'team' ? 'bg-green-500' : 'bg-purple-500'
              }`}></div>
            </div>
          </div>
        </header>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
            {activeTab === 'Dashboard' && <Dashboard />}
            {activeTab === 'chat' && <ChatBox />}
            {activeTab === 'tasks' && <TaskManager />}
            {activeTab === 'files' && <FileManager />}
            {activeTab === 'calendar' && <CalendarTool />}
            {activeTab === 'figma' && <FigmaTool />}
            {activeTab === 'VideoConferenc' && <VideoConferenc />}
            {activeTab === "profile" && <UserProfile />} 
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;