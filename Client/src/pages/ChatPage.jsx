import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaComments, FaUsers, FaGlobeAmericas } from 'react-icons/fa';
import ChatBox from '../components/Chat/ChatBox';
import PersonalChatBox from '../components/Chat/PersonalChatBox';
import useAppContext from '../context/useAppContext';

const ChatPage = () => {
  const { chatType } = useParams();
  const navigate = useNavigate();
  const { user } = useAppContext();
  const [activeChat, setActiveChat] = useState('group');
  const [showSidebar, setShowSidebar] = useState(true);

  // Update active chat based on URL parameter
  useEffect(() => {
    if (chatType) {
      if (chatType === 'personal' && (user?.role === 'team' || user?.role === 'global')) {
        setActiveChat('personal');
      } else if (chatType === 'group') {
        setActiveChat('group');
      } else {
        // Invalid chat type or permission, redirect to group chat
        navigate('/chat', { replace: true });
      }
    } else {
      setActiveChat('group');
    }
  }, [chatType, user, navigate]);

  // Handle chat navigation
  const handleChatChange = (type) => {
    setActiveChat(type);
    if (type === 'personal') {
      navigate('/chat/personal');
    } else {
      navigate('/chat');
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

  const getRoleColor = () => {
    switch (user?.role) {
      case 'single':
        return 'from-blue-600/20 to-purple-600/20';
      case 'team':
        return 'from-green-600/20 to-blue-600/20';
      case 'global':
        return 'from-purple-600/20 to-pink-600/20';
      default:
        return 'from-gray-600/20 to-gray-700/20';
    }
  };

  const chatOptions = getChatOptions();
  const roleGradient = getRoleColor();

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black relative overflow-hidden">
      {/* ANIMATED BACKGROUND */}
      <div className={`absolute inset-0 bg-gradient-to-tr ${roleGradient} blur-3xl opacity-50`}></div>
      <div className="absolute inset-0 bg-gradient-to-bl from-blue-600/10 via-transparent to-purple-600/10"></div>

      {/* CHAT SIDEBAR - WhatsApp Style */}
      <div className={`${showSidebar ? 'w-80' : 'w-0'} transition-all duration-300 bg-gray-800/90 backdrop-blur-sm border-r border-gray-700 overflow-hidden relative z-10`}>
        <div className="flex flex-col h-full">
          {/* SIDEBAR HEADER */}
          <div className="p-4 border-b border-gray-700 bg-gradient-to-r from-gray-700/50 to-gray-800/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-full" />
                <h1 className="text-xl font-bold text-white">Chats</h1>
              </div>
              <button
                onClick={() => setShowSidebar(false)}
                className="lg:hidden text-gray-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>
            <div className="text-sm text-gray-400">
              {user?.name} • {user?.role} user
            </div>
          </div>

          {/* CHAT OPTIONS LIST */}
          <div className="flex-1 overflow-y-auto">
            {chatOptions.map((option) => (
              <div
                key={option.id}
                onClick={() => option.available && handleChatChange(option.id)}
                className={`p-4 cursor-pointer transition-all border-b border-gray-700/50 hover:bg-gray-700/50 ${
                  activeChat === option.id 
                    ? 'bg-blue-600/20 border-blue-500/30' 
                    : option.available 
                      ? 'hover:bg-gray-700/30' 
                      : 'opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-full text-xl ${
                    activeChat === option.id 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-300'
                  }`}>
                    {option.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{option.name}</h3>
                    <p className="text-sm text-gray-400 truncate">{option.description}</p>
                    {activeChat === option.id && (
                      <div className="text-xs text-blue-400 mt-1">Active</div>
                    )}
                  </div>
                  {activeChat === option.id && (
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              </div>
            ))}

            {/* INFO SECTION */}
            <div className="p-4 text-center text-gray-500 text-sm">
              <div className="mb-2">💬 Chat Features</div>
              <div className="text-xs space-y-1">
                <div>• File sharing</div>
                <div>• Emoji reactions</div>
                <div>• Message replies</div>
                <div>• Pin & star messages</div>
                {(user?.role === 'team' || user?.role === 'global') && (
                  <div>• Personal messaging</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex flex-col flex-1 h-full relative z-10">
        {!showSidebar && (
          <div className="absolute top-4 left-4 z-20">
            <button
              onClick={() => setShowSidebar(true)}
              className="bg-gray-800/90 backdrop-blur-sm text-white p-2 rounded-full hover:bg-gray-700 transition shadow-lg border border-gray-600"
            >
              <FaComments className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* RENDER ACTIVE CHAT COMPONENT */}
        {activeChat === 'group' && (
          <div className="h-full">
            <ChatBox />
          </div>
        )}

        {activeChat === 'personal' && (user?.role === 'team' || user?.role === 'global') && (
          <div className="h-full">
            <PersonalChatBox />
          </div>
        )}

        {/* FALLBACK STATE */}
        {!activeChat && (
          <div className="flex flex-col items-center justify-center h-full text-white">
            <FaComments className="text-6xl mb-4 text-gray-600" />
            <h3 className="text-xl font-semibold mb-2">Welcome to Chat</h3>
            <p className="text-gray-400 text-center">
              Select a chat type from the sidebar to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;