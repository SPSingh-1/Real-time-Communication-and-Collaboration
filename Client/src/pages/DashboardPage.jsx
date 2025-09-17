import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import DailyReporting from '../components/Tools/DailyReporting';

const DashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, authChecked, isAuthenticated } = useAppContext();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Determine active tab based on URL
  const getActiveTabFromUrl = () => {
    const pathname = location.pathname;
    
    // Handle nested tool routes
    if (pathname.startsWith('/dashboard/tools/')) {
      const toolName = pathname.split('/')[3];
      switch (toolName) {
        case 'figma':
          return 'figma';
        case 'calendar':
          return 'calendar';
        case 'tasks':
          return 'tasks';
        case 'files':
          return 'files';
        case 'video':
          return 'VideoConferenc';
        case 'reporting':
          return 'DailyReporting'; // Fixed: This should match the case in the render section
        default:
          return 'Dashboard';
      }
    }
    
    // Handle direct dashboard routes
    switch (pathname) {
      case '/dashboard':
        return 'Dashboard';
      case '/dashboard/chat':
        return 'chat';
      case '/dashboard/profile':
        return 'profile';
      default:
        return 'Dashboard';
    }
  };

  const [activeTab, setActiveTab] = useState(getActiveTabFromUrl());

  // Update active tab when URL changes
  useEffect(() => {
    setActiveTab(getActiveTabFromUrl());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Handle tab navigation - update URL when tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false); // Close mobile menu when tab changes
    
    // Navigate to appropriate URL
    switch (tab) {
      case 'Dashboard':
        navigate('/dashboard');
        break;
      case 'chat':
        navigate('/dashboard/chat');
        break;
      case 'tasks':
        navigate('/dashboard/tools/tasks');
        break;
      case 'files':
        navigate('/dashboard/tools/files');
        break;
      case 'calendar':
        navigate('/dashboard/tools/calendar');
        break;
      case 'figma':
        navigate('/dashboard/tools/figma');
        break;
      case 'VideoConferenc':
        navigate('/dashboard/tools/video');
        break;
      case 'profile':
        navigate('/dashboard/profile');
        break;
      case 'DailyReporting':
        navigate('/dashboard/tools/reporting');
        break;
      default:
        navigate('/dashboard');
    }
  };

  // Handle window resize to close mobile menu on desktop
  useEffect(() => {
  const handleResize = () => {
    if (window.innerWidth >= 1500) { // Changed from lg breakpoint to 1500px
      setIsMobileMenuOpen(false);
    }
  };

    window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

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
        <div className="text-center text-white px-4">
          <CircularProgress sx={{ color: 'white', mb: 2 }} size={60} />
          <div className="text-xl font-semibold mt-4">Loading Dashboard...</div>
          <div className="text-gray-400 mt-2 text-sm sm:text-base">Please wait while we prepare your workspace</div>
        </div>
      </div>
    );
  }

  // Show error if user not found
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black px-4">
        <div className="text-center text-white">
          <div className="text-4xl sm:text-6xl mb-4">⚠️</div>
          <div className="text-lg sm:text-xl font-semibold mb-2">Authentication Error</div>
          <div className="text-gray-400 mb-6 text-sm sm:text-base">Unable to load user data</div>
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-600 hover:bg-blue-700 px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition text-sm sm:text-base"
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
          logo: "/logo.png",
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

      {/* MOBILE MENU OVERLAY */}
      {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 xl:hidden" // Changed from lg:hidden to xl:hidden
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

      {/* SIDEBAR - Desktop */}
      <div className={`relative z-20 transition-all duration-500 hidden xl:block ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={handleTabChange}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          userRole={user.role}
          user={user}
        />
      </div>

      {/* SIDEBAR - Mobile/Tablet */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 xl:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={handleTabChange}
          collapsed={false}
          setCollapsed={() => {}}
          userRole={user.role}
          user={user}
        />
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 h-screen flex flex-col relative z-20 bg-gray-900/40 backdrop-blur-xl shadow-2xl lg:border-l border-gray-700/40">
        {/* HEADER */}
        <header className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-sm border-b border-gray-700/50 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <button
                  className="xl:hidden text-white hover:text-gray-300 transition-colors p-1" // Changed from lg:hidden to xl:hidden
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-label="Toggle menu"
                >
                <svg 
                  className="w-6 h-6" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>

              <div>
                <div className='flex gap-2 items-center'>
                  <img src="/logo.png" alt="applogo" className='h-[30px] w-[30px] sm:h-[40px] sm:w-[40px] rounded-3xl'/>
                  <h1 className="text-lg sm:text-2xl font-bold text-white truncate">{roleInfo.title}</h1>
                </div>
                <p className="text-gray-400 text-xs sm:text-sm truncate">{roleInfo.subtitle}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="text-right">
                <div className="text-white font-medium">
                  <button
                    className="sidebar-user-btn flex items-center space-x-1 sm:space-x-2"
                    onClick={() => handleTabChange("profile")}
                    title="View Profile"
                  >
                    {/* Profile image OR dummy icon */}
                    {user?.photo ? (
                      <img
                        src={user.photo}
                        alt="Profile"
                        className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover border"
                      />
                    ) : (
                      <span className="text-lg sm:text-xl">👤</span>
                    )}

                    {/* Welcome text - hidden on small screens */}
                    <span className="hidden sm:block">
                      {user?.name
                        ? user.name
                        : user?.email
                        ? user.email.split("@")[0]
                        : "Guest"}
                    </span>
                  </button>
                </div>
                <div className="text-gray-400 text-xs sm:text-sm truncate hidden sm:block max-w-[150px]">{user.email}</div>
              </div>
              <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                user.role === 'single' ? 'bg-blue-500' :
                user.role === 'team' ? 'bg-green-500' : 'bg-purple-500'
              }`}></div>
            </div>
          </div>
        </header>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full p-3 sm:p-4 lg:p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
            {activeTab === 'Dashboard' && <Dashboard />}
            {activeTab === 'chat' && <ChatBox />}
            {activeTab === 'tasks' && <TaskManager />}
            {activeTab === 'files' && <FileManager />}
            {activeTab === 'calendar' && <CalendarTool />}
            {activeTab === 'figma' && <FigmaTool user={user} />}
            {activeTab === 'VideoConferenc' && <VideoConferenc />}
            {activeTab === "profile" && <UserProfile />}
            {/* FIXED: Changed from "dailyreporting" to "DailyReporting" */}
            {activeTab === "DailyReporting" && <DailyReporting user={user} />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;