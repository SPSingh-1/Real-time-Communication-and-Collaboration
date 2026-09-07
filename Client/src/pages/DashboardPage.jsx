import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import Sidebar from '../components/Sidebar/Sidebar';
import Dashboard from '../components/Dashboard/Dashboard';
import TaskManager from '../components/Tools/TaskManager';
import FileManager from '../components/Tools/FileManager';
import CalendarTool from '../components/Tools/CalendarTool';
import FigmaTool from '../components/Tools/FigmaTool';
import VideoConferenc from '../components/Tools/VideoConferenc';
import TeamCRM from '../components/Tools/TeamCRM';
import useAppContext from "../context/useAppContext";
import CircularProgress from '@mui/material/CircularProgress';
import UserProfile from '../components/Tools/UserProfil';
import DailyReporting from '../components/Tools/DailyReporting';
import ChatPage from './ChatPage';
import TeamAdminPanel from '../components/Dashboard/TeamAdminPanel';
import AdminSubscriptionDashboard from '../components/Dashboard/AdminSubscriptionDashboard';
import AdminTeamsManager from '../components/Admin/AdminTeamsManager';
import AdminBillingCRM from '../components/Admin/AdminBillingCRM';
import AdminBroadcasts from '../components/Admin/AdminBroadcasts';
import AdminPlansMatrix from '../components/Admin/AdminPlansMatrix';
import IncomingCallModal from '../components/VideoConference/IncomingCallModal';
import GlobalAnnouncementBanner from '../components/Notifications/GlobalAnnouncementBanner';
import MeetingHub from '../components/MeetingHub/MeetingHub';

const DashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  //eslint-disable-next-line
  const { chatType } = useParams();
  const { user, loading, authChecked, isAuthenticated } = useAppContext();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [globalSocket, setGlobalSocket] = useState(null);
  const [autoJoinMeetingData, setAutoJoinMeetingData] = useState(null);

  // Global socket registration for incoming calls and notifications
  useEffect(() => {
    if (!user) return;
    const socket = io(`${import.meta.env.VITE_BACKEND_URL}`, {
      transports: ['websocket', 'polling'],
    });

    const register = () => {
      const uid = user._id || user.id;
      if (uid) {
        socket.emit('register-user-socket', {
          userId: String(uid),
          teamId: user.teamId ? String(user.teamId) : null,
          role: user.role
        });
      }
    };

    socket.on('connect', register);
    if (socket.connected) {
      register();
    }

    setGlobalSocket(socket);
    window._socket = socket;

    return () => {
      socket.off('connect', register);
      socket.disconnect();
    };
  }, [user]);

  const handleAcceptIncomingCall = (callData) => {
    if (!callData) return;
    const targetRoom = callData.roomId;
    const isAudio = callData.callType === 'audio';

    setAutoJoinMeetingData({
      roomId: targetRoom,
      isAudio,
      timestamp: Date.now()
    });

    handleTabChange('VideoConferenc');
    navigate(`/dashboard/tools/video?room=${encodeURIComponent(targetRoom)}&type=${isAudio ? 'audio' : 'video'}&autoJoin=true`);
  };

  const isSuperAdmin = Boolean(
    user?.isSuperAdmin === true ||
    user?.role === 'superadmin' ||
    user?.email === 'admin@platform.com'
  );

  // Determine active tab based on URL
  const getActiveTabFromUrl = () => {
    const pathname = location.pathname;
    
    // For Super Admin, direct to specific admin pages
    if (isSuperAdmin) {
      if (pathname === '/dashboard/profile') return 'profile';
      if (pathname === '/dashboard/admin/billing') return 'admin-billing';
      if (pathname === '/dashboard/admin/broadcasts') return 'admin-broadcasts';
      if (pathname === '/dashboard/admin/plans') return 'admin-plans';
      if (pathname === '/dashboard/admin/teams' || pathname === '/dashboard/subscriptions' || pathname === '/dashboard') return 'admin-teams';
      return 'admin-teams';
    }

    // Handle chat routes
    if (pathname.startsWith('/dashboard/chat')) {
      if (pathname === '/dashboard/chat') {
        return 'chat';
      }
      // Handle chat with type parameter
      const pathChatType = pathname.split('/')[3];
      return pathChatType ? `chat-${pathChatType}` : 'chat';
    }
    
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
        case 'meetings':
          return 'MeetingHub';
        case 'crm':
          return 'TeamCRM';
        case 'reporting':
          return 'DailyReporting';
        default:
          return 'Dashboard';
      }
    }
    
    // Handle direct dashboard routes
    switch (pathname) {
      case '/dashboard':
        return 'Dashboard';
      case '/dashboard/profile':
        return 'profile';
      case '/dashboard/team-admin':
        return 'teamAdmin';
      case '/dashboard/subscriptions':
        return 'subscriptions';
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
      case 'admin-teams':
        navigate('/dashboard/admin/teams');
        break;
      case 'admin-billing':
        navigate('/dashboard/admin/billing');
        break;
      case 'admin-broadcasts':
        navigate('/dashboard/admin/broadcasts');
        break;
      case 'admin-plans':
        navigate('/dashboard/admin/plans');
        break;
      case 'Dashboard':
        navigate(isSuperAdmin ? '/dashboard/admin/teams' : '/dashboard');
        break;
      case 'chat':
        navigate('/dashboard/chat');
        break;
      case 'chat-personal':
        navigate('/dashboard/chat/personal');
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
      case 'MeetingHub':
        navigate('/dashboard/tools/meetings');
        break;
      case 'profile':
        navigate('/dashboard/profile');
        break;
      case 'DailyReporting':
        navigate('/dashboard/tools/reporting');
        break;
      case 'teamAdmin':
        navigate('/dashboard/team-admin');
        break;
      case 'subscriptions':
        navigate('/dashboard/admin/teams');
        break;
      default:
        navigate(isSuperAdmin ? '/dashboard/admin/teams' : '/dashboard');
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
    if (isSuperAdmin) {
      let sub = "Platform & Quotas Management";
      if (activeTab === 'admin-billing') sub = "Billing & Financial CRM";
      if (activeTab === 'admin-broadcasts') sub = "Global System Announcements";
      if (activeTab === 'admin-plans') sub = "Subscription Tiers Matrix";
      return {
        title: "Super Admin Console",
        subtitle: sub,
        logo: "/logo.png",
      };
    }
    switch (user.role) {
      case "single":
        return {
          title: "Personal Workspace",
          subtitle: "Your private dashboard",
          logo: "/logo.png",
        };
      case "team":
        return {
          title: "Team Workspace",
          subtitle: user.teamId ? `Team: ${user.teamId}` : "Team Dashboard",
          logo: "/logo.png",
        };
      case "global":
        return {
          title: "Global Community",
          subtitle: "Connected worldwide",
          logo: "/logo.png",
        };
      default:
        return {
          title: "Dashboard",
          subtitle: "Welcome",
          logo: "/logo.png",
        };
    }
  };

  const roleInfo = getRoleDisplayInfo();

  // Helper function to check if current tab is chat-related
  const isChatActive = () => {
    return activeTab === 'chat' || activeTab === 'chat-personal';
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* Clean Subtle Background */}
      <div className="absolute inset-0 bg-slate-950"></div>

      {/* MOBILE MENU OVERLAY */}
      {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/60 z-40 xl:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

      {/* SIDEBAR - Desktop */}
      <div className={`relative z-20 transition-all duration-300 hidden xl:block flex-shrink-0 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
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
      <main className="flex-1 h-screen flex flex-col relative z-20 bg-slate-950 border-l border-slate-800 min-w-0 overflow-hidden">
        {/* HEADER */}
        <header className="bg-slate-900 border-b border-slate-800 p-3 sm:p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <button
                className="xl:hidden text-slate-300 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle mobile menu"
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

              {/* Desktop Collapse/Expand Toggle Button */}
              <button
                className="hidden xl:flex text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </button>

              <div>
                <div className='flex gap-2 items-center'>
                  <img src="/logo.png" alt="applogo" className='h-[30px] w-[30px] sm:h-[40px] sm:w-[40px] rounded-3xl'/>
                  <h1 className="text-lg sm:text-2xl font-bold text-white truncate">
                    {isChatActive() ? 'Chat' : roleInfo.title}
                  </h1>
                </div>
                <p className="text-gray-400 text-xs sm:text-sm truncate">
                  {isChatActive() ? 'Communication Hub' : roleInfo.subtitle}
                </p>
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
          {isChatActive() ? (
            // Chat content takes full height without padding
            <div className="h-full">
              <ChatPage />
            </div>
          ) : (
            // Other content with normal padding and scrolling
            <div className="h-full p-3 sm:p-4 lg:p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
              {/* Regular Dashboard view */}
              {activeTab === 'Dashboard' && (
                isSuperAdmin ? <AdminTeamsManager /> : <Dashboard />
              )}

              {/* ── SUPER ADMIN DEDICATED INDIVIDUAL PAGES ── */}
              {isSuperAdmin && (activeTab === 'admin-teams' || activeTab === 'subscriptions') && (
                <AdminTeamsManager />
              )}
              {isSuperAdmin && activeTab === 'admin-billing' && (
                <AdminBillingCRM />
              )}
              {isSuperAdmin && activeTab === 'admin-broadcasts' && (
                <AdminBroadcasts />
              )}
              {isSuperAdmin && activeTab === 'admin-plans' && (
                <AdminPlansMatrix />
              )}

              {/* ── REGULAR USER WORKSPACE TOOLS ── */}
              {!isSuperAdmin && activeTab === 'tasks' && <TaskManager />}
              {!isSuperAdmin && activeTab === 'files' && <FileManager />}
              {!isSuperAdmin && activeTab === 'calendar' && <CalendarTool />}
              {!isSuperAdmin && activeTab === 'figma' && <FigmaTool user={user} />}
              {!isSuperAdmin && activeTab === 'VideoConferenc' && (
                <VideoConferenc
                  user={user}
                  autoJoinMeeting={autoJoinMeetingData}
                />
              )}
              {!isSuperAdmin && activeTab === 'MeetingHub' && (
                <MeetingHub user={user} />
              )}
              {activeTab === "profile" && <UserProfile />}
              {!isSuperAdmin && activeTab === 'DailyReporting' && <DailyReporting user={user} />}
              {!isSuperAdmin && activeTab === 'TeamCRM' && <TeamCRM user={user} />}
              {!isSuperAdmin && activeTab === "teamAdmin" && (
                user?.isTeamAdmin || user?.isLeader || user?.teamRole === 'admin' || user?.role === 'admin' ? (
                  <TeamAdminPanel user={user} />
                ) : (
                  <div className="text-center py-16 text-slate-400">
                    <p className="text-lg font-bold text-white mb-2">Access Restricted</p>
                    <p className="text-sm">Team Admin settings are only accessible by team administrators.</p>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </main>

      {/* Global Incoming Call Modal Across All Pages */}
      <IncomingCallModal
        socket={globalSocket}
        onAcceptCall={handleAcceptIncomingCall}
        currentUser={user}
      />

      {/* Global System Broadcast & Announcement Alerts */}
      <GlobalAnnouncementBanner socket={globalSocket} />
    </div>
  );
};

export default DashboardPage;