// Sidebar.jsx
import React from 'react';
import { FaSignOutAlt, FaTasks, FaFileAlt, FaComments, FaClipboardList, FaCalendarAlt, FaVideo, FaBriefcase } from 'react-icons/fa';
import { TbLayoutDashboardFilled } from "react-icons/tb";
import { FiChevronRight, FiChevronLeft } from 'react-icons/fi';
import { ShieldCheck, CreditCard, Users, Megaphone, Layers, Video } from 'lucide-react';
import useAppContext from '../../context/useAppContext';
import './Sidebar.css';

const Sidebar = ({ activeTab, setActiveTab, collapsed, setCollapsed }) => {
  const { user, logout } = useAppContext();

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* SIDEBAR HEADER */}
      <div className="sidebar-header flex items-center justify-between gap-2 p-3 border-b border-slate-800">
        {!collapsed ? (
          <button
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-800 text-left min-w-0 flex-1 transition-colors"
            onClick={() => setActiveTab("profile")}
            title="View Profile"
          >
            {user?.photo ? (
              <img
                src={user.photo}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover border border-slate-700 flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-400">Welcome,</p>
              <p className="text-sm font-semibold text-white truncate">
                {user?.name || user?.email?.split("@")[0] || "Guest"}
              </p>
            </div>
          </button>
        ) : (
          <div className="w-full flex justify-center py-1">
            <button
              onClick={() => setActiveTab("profile")}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="View Profile"
            >
              {user?.photo ? (
                <img
                  src={user.photo}
                  alt="Profile"
                  className="w-7 h-7 rounded-full object-cover border border-slate-700"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  {user?.name ? user.name[0].toUpperCase() : 'U'}
                </div>
              )}
            </button>
          </div>
        )}
      </div>

      {/* NAVIGATION ITEMS */}
      <nav className="sidebar-nav flex-1 py-3 px-2 space-y-1 overflow-y-auto custom-scrollbar">
        {/* ── SUPER ADMIN EXCLUSIVE NAVIGATION ── */}
        {(user?.isSuperAdmin === true || user?.role === 'superadmin' || user?.email === 'admin@platform.com') ? (
          <>
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {!collapsed && 'System Management'}
            </div>
            
            <SidebarButton
              icon={<Users size={18} />}
              label="Teams & Quotas"
              tab="admin-teams"
              activeTab={activeTab === 'subscriptions' ? 'admin-teams' : activeTab}
              setActiveTab={setActiveTab}
              collapsed={collapsed}
            />

            <SidebarButton
              icon={<CreditCard size={18} />}
              label="Billing & CRM"
              tab="admin-billing"
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              collapsed={collapsed}
            />

            <SidebarButton
              icon={<Megaphone size={18} />}
              label="Broadcasts"
              tab="admin-broadcasts"
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              collapsed={collapsed}
            />

            <SidebarButton
              icon={<Layers size={18} />}
              label="Plans Matrix"
              tab="admin-plans"
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              collapsed={collapsed}
            />
          </>
        ) : (
          /* ── REGULAR USERS & TEAM MEMBERS NAVIGATION ── */
          <>
            <SidebarButton 
              icon={<TbLayoutDashboardFilled />} 
              label="Dashboard" 
              tab="Dashboard" 
              activeTab={activeTab} 
              setActiveTab={setActiveTab}
              collapsed={collapsed}
            />
            
            <SidebarButton 
              icon={<FaComments />} 
              label="Chat" 
              tab="chat" 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              collapsed={collapsed}
            />
            
            <SidebarButton 
              icon={<FaTasks />} 
              label="Tasks" 
              tab="tasks" 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              collapsed={collapsed}
            />
            
            <SidebarButton 
              icon={<FaFileAlt />} 
              label="Files" 
              tab="files" 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              collapsed={collapsed}
            />
            
            <SidebarButton 
              icon={<FaCalendarAlt />} 
              label="Calendar" 
              tab="calendar" 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              collapsed={collapsed}
            />

            {/* Dedicated Meeting Hub (Attendance, Chat, Recording) */}
            <SidebarButton 
              icon={<Video size={18} className="text-blue-400" />} 
              label="Meeting Hub" 
              tab="MeetingHub" 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              collapsed={collapsed}
            />
            
            <SidebarButton 
              icon={<FaClipboardList />} 
              label="Figma Tool" 
              tab="figma" 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              collapsed={collapsed}
            />

            <SidebarButton 
              icon={<FaClipboardList />} 
              label="Reports & Complaints" 
              tab="DailyReporting" 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              collapsed={collapsed}
            />

            {/* Only show Video Conference if role is NOT "single" */}
            {user?.role !== "single" && (
              <SidebarButton 
                icon={<FaVideo />} 
                label="Video Conference" 
                tab="VideoConferenc" 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                collapsed={collapsed}
              />
            )}

            {/* Dynamic Team CRM */}
            <SidebarButton 
              icon={<FaBriefcase />} 
              label="Team CRM" 
              tab="TeamCRM" 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              collapsed={collapsed}
            />

            {/* Only show Team Admin tab to users who are actual team admins */}
            {(user?.isTeamAdmin === true || user?.isLeader === true || user?.teamRole === 'admin' || user?.role === 'admin') && (
              <SidebarButton
                icon={<ShieldCheck size={16} />}
                label="Team Admin"
                tab="teamAdmin"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                collapsed={collapsed}
              />
            )}
          </>
        )}
      </nav>

      {/* LOGOUT BUTTON */}
      <div className="p-2 border-t border-slate-800">
        <button 
          onClick={logout} 
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors ${
            collapsed ? 'px-0' : ''
          }`}
          title={collapsed ? "Logout" : undefined}
        >
          <FaSignOutAlt className="flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

const SidebarButton = ({ icon, label, tab, activeTab, setActiveTab, collapsed }) => {
  const isActive = activeTab === tab;
  return (
    <button
      className={`sidebar-button w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-blue-600 text-white font-semibold shadow-sm'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      } ${collapsed ? 'justify-center px-0' : ''}`}
      onClick={() => setActiveTab(tab)}
      title={collapsed ? label : undefined}
    >
      <span className="text-base flex-shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
};

export default Sidebar;