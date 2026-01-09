import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaComments, FaUsers, FaGlobeAmericas, FaTimes, FaBars } from 'react-icons/fa';
import ChatBox from '../components/Chat/ChatBox';
import PersonalChatBox from '../components/Chat/PersonalChatBox';
import useAppContext from '../context/useAppContext';

const ChatPage = () => {
  const { chatType } = useParams();
  const navigate = useNavigate();
  const { user } = useAppContext();
  const [activeChat, setActiveChat] = useState('group');
  const [showChatSidebar, setShowChatSidebar] = useState(false); // Default false for mobile-first
  const [isMobile, setIsMobile] = useState(false);
  const [showTeammatesList, setShowTeammatesList] = useState(true);


  // Detect screen size changes
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [showChatSidebar]);

  // Update active chat based on URL parameter
  useEffect(() => {
    if (chatType) {
      if (chatType === 'personal' && (user?.role === 'team' || user?.role === 'global')) {
        setActiveChat('personal');
      } else if (chatType === 'group') {
        setActiveChat('group');
      } else {
        // Invalid chat type or permission, redirect to group chat
        navigate('/dashboard/chat', { replace: true });
      }
    } else {
      setActiveChat('group');
    }
  }, [chatType, user, navigate]);

  // Handle chat navigation
  const handleChatChange = (type) => {
  setActiveChat(type);
  setShowChatSidebar(false); // Close chat type selector
  setShowTeammatesList(true); // Show teammates list when switching to personal
  if (type === 'personal') {
    navigate('/dashboard/chat/personal');
  } else {
    navigate('/dashboard/chat');
  }
};

  const getChatOptions = () => {
    const options = [
      {
        id: 'group',
        name: getRoleGroupChatName(),
        icon: <FaComments />,
        description: getRoleGroupDescription(),
        available: true
      }
    ];

    // Add personal chat for team and global users
    if (user?.role === 'team' || user?.role === 'global') {
      options.push({
        id: 'personal',
        name: 'Personal Chat',
        icon: <FaUsers />,
        description: user?.role === 'team' ? 'Private chat with teammates' : 'Private chat with global users',
        available: true
      });
    }

    return options;
  };

  const getRoleGroupChatName = () => {
    switch (user?.role) {
      case 'single':
        return 'Personal Chat';
      case 'team':
        return 'Team Group Chat';
      case 'global':
        return 'Global Community';
      default:
        return 'Group Chat';
    }
  };

  const getRoleGroupDescription = () => {
    switch (user?.role) {
      case 'single':
        return 'Your personal messages';
      case 'team':
        return 'Chat with your team members';
      case 'global':
        return 'Join the global conversation';
      default:
        return 'Group messaging';
    }
  };

  const chatOptions = getChatOptions();

  return (
    <div className="flex h-full relative overflow-hidden">
      {/* MOBILE OVERLAY */}
      {isMobile && showChatSidebar && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setShowChatSidebar(false)}
        />
      )}

      {/* CHAT SIDEBAR - Responsive */}
      <div className={`
        ${showChatSidebar 
          ? 'w-full sm:w-80 md:w-80 lg:w-80' 
          : 'w-0'
        } 
        ${isMobile 
          ? 'fixed inset-y-0 left-0 z-50' 
          : 'relative'
        }
        transition-all duration-300 bg-gray-800/95 backdrop-blur-sm border-r border-gray-700 
        overflow-hidden flex-shrink-0 min-w-0
      `}>
        <div className="flex flex-col h-full w-full">
          {/* SIDEBAR HEADER */}
          <div className="p-3 sm:p-4 border-b border-gray-700 bg-gradient-to-r from-gray-700/50 to-gray-800/50 flex-shrink-0">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="text-lg sm:text-2xl flex-shrink-0">💬</div>
                <h2 className="text-lg sm:text-xl font-bold text-white truncate">
                  Chat Types
                </h2>
              </div>
              <button
                onClick={() => setShowChatSidebar(false)}
                className="text-gray-400 hover:text-white transition p-1 flex-shrink-0 ml-2"
                title="Hide chat sidebar"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs sm:text-sm text-gray-400 truncate">
              {user?.name} • {user?.role} user
            </div>
          </div>

          {/* CHAT OPTIONS LIST */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {chatOptions.map((option) => (
              <div
                key={option.id}
                onClick={() => option.available && handleChatChange(option.id)}
                className={`
                  p-3 sm:p-4 cursor-pointer transition-all border-b border-gray-700/50 
                  ${activeChat === option.id 
                    ? 'bg-blue-600/20 border-blue-500/30' 
                    : option.available 
                      ? 'hover:bg-gray-700/30 active:bg-gray-700/50' 
                      : 'opacity-50 cursor-not-allowed'
                  }
                `}
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className={`
                    p-2 sm:p-3 rounded-full text-lg sm:text-xl flex-shrink-0
                    ${activeChat === option.id 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-300'
                    }
                  `}>
                    {option.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate text-sm sm:text-base">
                      {option.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-400 truncate">
                      {option.description}
                    </p>
                    {activeChat === option.id && (
                      <div className="text-xs text-blue-400 mt-1">• Active</div>
                    )}
                  </div>
                  {activeChat === option.id && (
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                  )}
                </div>
              </div>
            ))}

            {/* INFO SECTION */}
            <div className="p-3 sm:p-4 mt-2 sm:mt-4">
              <div className="bg-gray-700/30 rounded-lg p-3 sm:p-4 text-center text-gray-400">
                <div className="mb-2 sm:mb-3 text-base sm:text-lg">🚀 Chat Features</div>
                <div className="text-xs space-y-1 sm:space-y-2 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 flex-shrink-0">•</span>
                    <span className="truncate">File & media sharing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 flex-shrink-0">•</span>
                    <span className="truncate">Emoji reactions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 flex-shrink-0">•</span>
                    <span className="truncate">Message replies & editing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 flex-shrink-0">•</span>
                    <span className="truncate">Pin & star messages</span>
                  </div>
                  {(user?.role === 'team' || user?.role === 'global') && (
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400 flex-shrink-0">•</span>
                      <span className="truncate">Private messaging</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex flex-col flex-1 h-full min-w-0">
        {/* Show/Hide Sidebar Button */}
        {!showChatSidebar && (
        <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-20">
          <button
            onClick={() => {
              setShowChatSidebar(true);
              if (activeChat === 'personal') {
                setShowTeammatesList(false); // Hide teammates when showing chat types
              }
            }}
            className="
              bg-gray-800/95 backdrop-blur-sm text-white p-2 sm:p-2.5 rounded-full 
              hover:bg-gray-700 active:bg-gray-600 transition shadow-lg border border-gray-600
              text-sm sm:text-base
            "
            title="Show chat types"
          >
            <FaBars className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      )}


        {/* MOBILE HEADER - Shows active chat info when sidebar is closed */}
        {isMobile && !showChatSidebar && (
          <div className="bg-gray-800/90 backdrop-blur-sm border-b border-gray-700 p-3 flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => {
                setShowChatSidebar(true);
                if (activeChat === 'personal') {
                  setShowTeammatesList(false);
                }
              }}
              className="text-gray-400 hover:text-white transition p-1"
            >
              <FaBars className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="p-2 bg-blue-600 rounded-full text-white text-sm">
                {chatOptions.find(opt => opt.id === activeChat)?.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-white truncate text-sm">
                  {chatOptions.find(opt => opt.id === activeChat)?.name}
                </h3>
                <p className="text-xs text-gray-400 truncate">
                  {chatOptions.find(opt => opt.id === activeChat)?.description}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* RENDER ACTIVE CHAT COMPONENT */}
        {activeChat === 'group' && (
          <div className="h-full flex-1 min-h-0">
            <ChatBox />
          </div>
        )}

        {activeChat === 'personal' && (user?.role === 'team' || user?.role === 'global') && (
          <div className="h-full flex-1 min-h-0">
            <PersonalChatBox  showTeammatesList={showTeammatesList}
              setShowTeammatesList={setShowTeammatesList}
            />
          </div>
        )}

        {/* FALLBACK STATE */}
        {!activeChat && (
          <div className="flex flex-col items-center justify-center h-full text-white p-4">
            <FaComments className="text-4xl sm:text-6xl mb-4 text-gray-600" />
            <h3 className="text-lg sm:text-xl font-semibold mb-2 text-center">
              Welcome to Chat
            </h3>
            <p className="text-gray-400 text-center text-sm sm:text-base max-w-sm">
              {isMobile 
                ? 'Tap the menu button to select a chat type' 
                : 'Select a chat type from the sidebar to get started'
              }
            </p>
          </div>
        )}

        {/* ACCESS DENIED STATE */}
        {activeChat === 'personal' && user?.role === 'single' && (
          <div className="flex flex-col items-center justify-center h-full text-white p-4">
            <FaUsers className="text-4xl sm:text-6xl mb-4 text-red-500" />
            <h3 className="text-lg sm:text-xl font-semibold mb-2 text-center">
              Access Restricted
            </h3>
            <p className="text-gray-400 text-center text-sm sm:text-base mb-4 max-w-sm">
              Personal chat is only available for team and global users
            </p>
            <button
              onClick={() => handleChatChange('group')}
              className="
                bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-4 py-2 rounded-lg 
                transition text-sm sm:text-base font-medium
              "
            >
              Go to Group Chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;