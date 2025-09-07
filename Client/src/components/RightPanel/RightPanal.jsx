import React, { useState, useEffect } from 'react';
import { Bell, FileText, Users, Settings, Sparkles } from 'lucide-react';
import NotificationFeed from '../RightTabs/NotificationFeed';
import DailyNotes from '../RightTabs/DailyNotes';
import AttendeeList from '../RightTabs/AttendeeList';

const RightPanel = () => {
  const [activeTab, setActiveTab] = useState('notifications');
  const [hasLanded, setHasLanded] = useState(false);
  const [isTabChanging, setIsTabChanging] = useState(false);
  const [animationType, setAnimationType] = useState('bounce');

  const tabs = [
    { 
      id: 'notifications', 
      label: 'Notifications', 
      icon: Bell, 
      component: NotificationFeed,
      color: 'text-blue-500',
      gradient: 'from-blue-500 to-indigo-600'
    },
    { 
      id: 'notes', 
      label: 'Notes', 
      icon: FileText, 
      component: DailyNotes,
      color: 'text-emerald-500',
      gradient: 'from-emerald-500 to-green-600'
    },
    { 
      id: 'attendees', 
      label: 'Attendees', 
      icon: Users, 
      component: AttendeeList,
      color: 'text-purple-500',
      gradient: 'from-purple-500 to-pink-600'
    }
  ];

  // Landing animation effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasLanded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Tab change handler with transition
  const handleTabChange = (tabId) => {
  if (tabId !== activeTab) {
    // Cycle through different animation types
    const animations = ['bounce', 'swipeLeft', 'swipeRight', 'flip', 'zoom', 'slide'];
    const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
    setAnimationType(randomAnimation);
    
    setIsTabChanging(true);
    setTimeout(() => {
      setActiveTab(tabId);
      setTimeout(() => {
        setIsTabChanging(false);
      }, 100);
    }, 300);
  }
};

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;
  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <div className={`relative rounded-3xl overflow-hidden shadow-2xl h-full flex flex-col bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 transition-all duration-700 ${
      hasLanded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
    }`}>
      {/* Animated Background */}
      <div className={`absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-cyan-500/5 transition-all duration-1000 delay-200 ${
        hasLanded ? 'opacity-100' : 'opacity-0'
      }`}></div>
      
      {/* Floating Orbs */}
      <div className={`absolute top-8 right-8 w-24 h-24 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 rounded-full blur-2xl animate-pulse transition-all duration-1200 delay-300 ${
        hasLanded ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
      }`}></div>
      <div className={`absolute bottom-8 left-8 w-20 h-20 bg-gradient-to-r from-pink-400/20 to-purple-600/20 rounded-2xl blur-xl animate-pulse delay-1000 transition-all duration-1200 ${
        hasLanded ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0'
      }`}></div>
      <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-r from-emerald-400/10 to-teal-500/10 rounded-full blur-3xl animate-spin-slow transition-all duration-1500 delay-700 ${
        hasLanded ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
      }`}></div>

      {/* Header */}
      <div className={`relative z-10 p-6 border-b border-white/10 dark:border-slate-700/50 bg-white/20 dark:bg-slate-800/20 transition-all duration-800 delay-400 ${
        hasLanded ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
      }`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3 transition-all duration-800 delay-600 ${
            hasLanded ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
          }`}>
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white">
              <Settings size={20} />
            </div>
            Activity Hub
            <Sparkles className="text-yellow-500 animate-pulse" size={18} />
          </h3>
        </div>
        
        {/* Enhanced Tab Navigation */}
          <div className={`flex gap-3 ${isTabChanging ? `animate-tab-${animationType}` : ''}`}>
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  className={`relative flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-2xl transition-all duration-300 transform hover:scale-105 group ${
                    isActive
                      ? 'bg-white/90 dark:bg-slate-700/90 text-gray-800 dark:text-gray-100 shadow-xl border border-white/50 dark:border-slate-600/50'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/40 dark:hover:bg-slate-700/40'
                  } ${hasLanded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
                  style={{
                    transitionDelay: hasLanded ? `${800 + (index * 150)}ms` : '0ms',
                    transitionDuration: '600ms'
                  }}
                  onClick={() => handleTabChange(tab.id)}
                >
                {/* Active Tab Gradient Background */}
                {isActive && (
                  <div className={`absolute inset-0 bg-gradient-to-r ${tab.gradient} opacity-10 rounded-2xl`}></div>
                )}
                
                <Icon 
                  size={18} 
                  className={`relative z-10 ${isActive ? tab.color : 'text-current'} ${isActive ? 'drop-shadow-sm' : ''}`} 
                />
                <span className="hidden sm:inline relative z-10 font-medium">{tab.label}</span>
                
                {/* Hover Glow Effect */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/10 dark:bg-slate-600/10"></div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab Header */}
      {activeTabData && (
          <div className={`relative z-10 px-6 py-4 bg-gradient-to-r from-white/30 to-transparent dark:from-slate-800/30 border-b border-white/10 dark:border-slate-700/50 transition-all duration-600 delay-1000 ${
            hasLanded ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
          } ${isTabChanging ? `animate-header-${animationType}` : ''}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-gradient-to-r ${activeTabData.gradient} rounded-xl text-white shadow-lg`}>
              <activeTabData.icon size={16} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-gray-100">{activeTabData.label}</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Manage your {activeTabData.label.toLowerCase()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className={`relative z-10 flex-1 overflow-hidden transition-all duration-700 delay-1200 ${
          hasLanded ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
        }`}>
          <div className={`h-full transition-all duration-500 transform overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent ${
            isTabChanging ? `animate-content-${animationType}` : ''
          }`}>
            {ActiveComponent && <ActiveComponent date={new Date().toISOString().split('T')[0]} />}
          </div>
      </div>

      {/* Enhanced Styles */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        /* Tab Bounce Animation */
        @keyframes tab-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          25% { transform: translateY(-8px) scale(1.05); }
          50% { transform: translateY(-4px) scale(1.02); }
          75% { transform: translateY(-2px) scale(1.01); }
        }
        
        /* Swipe Left Animation */
        @keyframes tab-swipeLeft {
          0% { transform: translateX(0); }
          50% { transform: translateX(-20px) rotateY(-10deg); }
          100% { transform: translateX(0) rotateY(0deg); }
        }
        
        /* Swipe Right Animation */
        @keyframes tab-swipeRight {
          0% { transform: translateX(0); }
          50% { transform: translateX(20px) rotateY(10deg); }
          100% { transform: translateX(0) rotateY(0deg); }
        }
        
        /* Flip Animation */
        @keyframes tab-flip {
          0% { transform: rotateY(0); }
          50% { transform: rotateY(90deg) scale(0.8); }
          100% { transform: rotateY(0) scale(1); }
        }
        
        /* Zoom Animation */
        @keyframes tab-zoom {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2) rotate(5deg); }
        }
        
        /* Slide Animation */
        @keyframes tab-slide {
          0% { transform: translateY(0); }
          25% { transform: translateY(-10px) translateX(-5px); }
          50% { transform: translateY(-5px) translateX(5px); }
          75% { transform: translateY(-8px) translateX(-2px); }
          100% { transform: translateY(0) translateX(0); }
        }
        
        /* Header Animations */
        @keyframes header-bounce {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(10px) scale(1.02); }
        }
        
        @keyframes header-swipeLeft {
          0% { transform: translateX(0); opacity: 1; }
          50% { transform: translateX(-30px); opacity: 0.7; }
          100% { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes header-swipeRight {
          0% { transform: translateX(0); opacity: 1; }
          50% { transform: translateX(30px); opacity: 0.7; }
          100% { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes header-flip {
          0% { transform: rotateX(0); }
          50% { transform: rotateX(90deg); }
          100% { transform: rotateX(0); }
        }
        
        @keyframes header-zoom {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes header-slide {
          0% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0); }
        }
        
        /* Content Animations */
        @keyframes content-bounce {
          0% { transform: translateY(0) scale(1); }
          30% { transform: translateY(-20px) scale(0.95); }
          60% { transform: translateY(-10px) scale(0.98); }
          100% { transform: translateY(0) scale(1); }
        }
        
        @keyframes content-swipeLeft {
          0% { transform: translateX(0); opacity: 1; }
          50% { transform: translateX(-100px); opacity: 0.3; }
          100% { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes content-swipeRight {
          0% { transform: translateX(0); opacity: 1; }
          50% { transform: translateX(100px); opacity: 0.3; }
          100% { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes content-flip {
          0% { transform: rotateY(0); opacity: 1; }
          50% { transform: rotateY(180deg); opacity: 0.5; }
          100% { transform: rotateY(0); opacity: 1; }
        }
        
        @keyframes content-zoom {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes content-slide {
          0% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(-30px); opacity: 0.7; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        
        /* Tab Animation Classes */
        .animate-tab-bounce { animation: tab-bounce 0.6s ease-in-out; }
        .animate-tab-swipeLeft { animation: tab-swipeLeft 0.6s ease-in-out; }
        .animate-tab-swipeRight { animation: tab-swipeRight 0.6s ease-in-out; }
        .animate-tab-flip { animation: tab-flip 0.6s ease-in-out; }
        .animate-tab-zoom { animation: tab-zoom 0.6s ease-in-out; }
        .animate-tab-slide { animation: tab-slide 0.6s ease-in-out; }
        
        /* Header Animation Classes */
        .animate-header-bounce { animation: header-bounce 0.6s ease-in-out; }
        .animate-header-swipeLeft { animation: header-swipeLeft 0.6s ease-in-out; }
        .animate-header-swipeRight { animation: header-swipeRight 0.6s ease-in-out; }
        .animate-header-flip { animation: header-flip 0.6s ease-in-out; }
        .animate-header-zoom { animation: header-zoom 0.6s ease-in-out; }
        .animate-header-slide { animation: header-slide 0.6s ease-in-out; }
        
        /* Content Animation Classes */
        .animate-content-bounce { animation: content-bounce 0.6s ease-in-out; }
        .animate-content-swipeLeft { animation: content-swipeLeft 0.6s ease-in-out; }
        .animate-content-swipeRight { animation: content-swipeRight 0.6s ease-in-out; }
        .animate-content-flip { animation: content-flip 0.6s ease-in-out; }
        .animate-content-zoom { animation: content-zoom 0.6s ease-in-out; }
        .animate-content-slide { animation: content-slide 0.6s ease-in-out; }
        
        .scrollbar-thin {
          scrollbar-width: thin;
        }
        
        .scrollbar-thumb-gray-300::-webkit-scrollbar {
          width: 6px;
        }
        
        .scrollbar-thumb-gray-300::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .scrollbar-thumb-gray-300::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }
        
        .dark .scrollbar-thumb-slate-600::-webkit-scrollbar-thumb {
          background: #475569;
        }
        
        .glass-effect {
          backdrop-filter: blur(20px);
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .tab-transition {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}
      </style>
    </div>
  );
};

export default RightPanel;