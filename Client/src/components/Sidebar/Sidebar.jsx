
import { FaSignOutAlt, FaTasks, FaFileAlt, FaComments, FaClipboardList, FaCalendarAlt } from 'react-icons/fa';
import useAppContext from '../../context/useAppContext';
import './Sidebar.css';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAppContext();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-user">Welcome, {user?.name || 'Guest'}</h2>
      </div>

      <nav className="sidebar-nav">
        <SidebarButton icon={<FaComments />} label="Chat" tab="chat" activeTab={activeTab} setActiveTab={setActiveTab} />
        <SidebarButton icon={<FaTasks />} label="Tasks" tab="tasks" activeTab={activeTab} setActiveTab={setActiveTab} />
        <SidebarButton icon={<FaFileAlt />} label="Files" tab="files" activeTab={activeTab} setActiveTab={setActiveTab} />
        <SidebarButton icon={<FaCalendarAlt />} label="Calendar" tab="calendar" activeTab={activeTab} setActiveTab={setActiveTab} />
        <SidebarButton icon={<FaClipboardList />} label="Figma Tool" tab="figma" activeTab={activeTab} setActiveTab={setActiveTab} />
        <SidebarButton icon={<FaClipboardList />} label="Video Conference" tab="VideoConferenc" activeTab={activeTab} setActiveTab={setActiveTab} />
      </nav>

      <button onClick={logout} className="sidebar-logout">
        <FaSignOutAlt /> Logout
      </button>
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
