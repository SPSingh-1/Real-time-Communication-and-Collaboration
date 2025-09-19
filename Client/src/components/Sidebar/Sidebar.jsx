// Sidebar.jsx
import { FaSignOutAlt, FaTasks, FaFileAlt, FaComments, FaClipboardList, FaCalendarAlt, FaVideo } from 'react-icons/fa';
import { TbLayoutDashboardFilled } from "react-icons/tb";
import { FiChevronRight, FiChevronLeft } from "react-icons/fi";
import useAppContext from '../../context/useAppContext';
import './Sidebar.css';

const Sidebar = ({ activeTab, setActiveTab, collapsed, setCollapsed }) => {
  const { user, logout } = useAppContext();

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Thin line toggle when collapsed */}
      {collapsed && (
        <div
          className="sidebar-toggle"
          onClick={() => setCollapsed(false)}
          title="Expand Sidebar"
        >
          <FiChevronRight size={50} />
        </div>
      )}

      {/* Full Sidebar when expanded */}
      {!collapsed && (
        <>
          <div className="sidebar-header">
            <button
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => setActiveTab("profile")}
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
              <span> Welcome, {" "}
                {user?.name
                  ? user.name
                  : user?.email
                  ? user.email.split("@")[0]
                  : "Guest"}
              </span>
            </button>
            <div
              className="sidebar-toggle expanded"
              onClick={() => setCollapsed(true)}
              title="Collapse Sidebar"
            >
              <FiChevronLeft size={20} />
            </div>
          </div>
          <nav className="sidebar-nav">
            <SidebarButton 
              icon={<TbLayoutDashboardFilled />} 
              label="Dashboard" 
              tab="Dashboard" 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
            />
            
            <SidebarButton 
              icon={<FaComments />} 
              label="Chat" 
              tab="chat" 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
            />
            
            <SidebarButton 
              icon={<FaTasks />} 
              label="Tasks" 
              tab="tasks" 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
            />
            
            <SidebarButton 
              icon={<FaFileAlt />} 
              label="Files" 
              tab="files" 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
            />
            
            <SidebarButton 
              icon={<FaCalendarAlt />} 
              label="Calendar" 
              tab="calendar" 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
            />
            
            <SidebarButton 
              icon={<FaClipboardList />} 
              label="Figma Tool" 
              tab="figma" 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
            />

            <SidebarButton 
              icon={<FaClipboardList />} 
              label="Daily Reporting" 
              tab="DailyReporting"  // Make sure this matches exactly
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
            />

            {/* Only show Video Conference if role is NOT "single" */}
            {user?.role !== "single" && (
              <SidebarButton 
                icon={<FaVideo />} 
                label="Video Conference" 
                tab="VideoConferenc" 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
              />
            )}
          </nav>

          <button onClick={logout} className="sidebar-logout">
            <FaSignOutAlt /> Logout
          </button>
        </>
      )}
    </aside>
  );
};

const SidebarButton = ({ icon, label, tab, activeTab, setActiveTab }) => (
  <button
    className={`sidebar-button ${activeTab === tab ? 'active' : ''}`}
    onClick={() => setActiveTab(tab)}
  >
    {icon} <span>{label}</span>
  </button>
);

export default Sidebar;