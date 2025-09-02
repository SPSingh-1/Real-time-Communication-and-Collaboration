import React, { useState } from 'react';
import { Bell, FileText, Users, Settings, Sparkles } from 'lucide-react';

// Mock components for demonstration
const NotificationFeed = () => (
  <div className="p-6 space-y-4">
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4 border border-blue-200 dark:border-blue-800">
      <div className="flex items-start gap-3">
        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 animate-pulse"></div>
        <div>
          <p className="text-gray-800 dark:text-gray-200 font-medium">New event created</p>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Team meeting scheduled for tomorrow at 2 PM</p>
          <span className="text-xs text-blue-600 dark:text-blue-400">2 minutes ago</span>
        </div>
      </div>
    </div>
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-4 border border-green-200 dark:border-green-800">
      <div className="flex items-start gap-3">
        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
        <div>
          <p className="text-gray-800 dark:text-gray-200 font-medium">Note added</p>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">New daily note: "Remember to review quarterly reports"</p>
          <span className="text-xs text-green-600 dark:text-green-400">15 minutes ago</span>
        </div>
      </div>
    </div>
  </div>
);

const DailyNotes = () => (
  <div className="p-6 space-y-4">
    <div className="bg-white/80 dark:bg-slate-700/80 rounded-2xl p-4 border border-gray-200 dark:border-gray-600 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="text-emerald-500" size={16} />
        <span className="font-semibold text-gray-800 dark:text-gray-200">Meeting Notes</span>
        <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs">Important</span>
      </div>
      <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
        Discussed project timeline and resource allocation. Need to follow up on budget approval by Friday.
      </p>
      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">Today, 10:30 AM</div>
    </div>
    
    <div className="bg-white/80 dark:bg-slate-700/80 rounded-2xl p-4 border border-gray-200 dark:border-gray-600 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="text-blue-500" size={16} />
        <span className="font-semibold text-gray-800 dark:text-gray-200">Quick Note</span>
        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs">Comment</span>
      </div>
      <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
        Great presentation today! The new design concepts really resonated with the client.
      </p>
      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">Today, 2:15 PM</div>
    </div>
  </div>
);

const AttendeeList = () => (
  <div className="p-6 space-y-4">
    <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-medium">J</div>
          <span className="font-medium text-gray-800 dark:text-gray-200">John Smith</span>
        </div>
        <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-xs font-medium flex items-center gap-1">
          <div className="w-2 h-2 bg-white rounded-full"></div>
          Going
        </span>
      </div>
      <p className="text-sm text-emerald-700 dark:text-emerald-300">Weekly Team Sync - Tomorrow 2:00 PM</p>
    </div>
    
    <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-2xl p-4 border border-yellow-200 dark:border-yellow-800">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white text-sm font-medium">M</div>
          <span className="font-medium text-gray-800 dark:text-gray-200">Mary Johnson</span>
        </div>
        <span className="px-3 py-1 bg-yellow-500 text-white rounded-full text-xs font-medium flex items-center gap-1">
          <div className="w-2 h-2 bg-white rounded-full"></div>
          Busy
        </span>
      </div>
      <p className="text-sm text-yellow-700 dark:text-yellow-300">Project Review - Friday 10:00 AM</p>
      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Reason: Client meeting conflict</p>
    </div>
  </div>
);

const RightPanel = () => {
  const [activeTab, setActiveTab] = useState('notifications');

  const tabs = [
    { 
      id: 'notifications', 
      label: 'Notifications', 
      icon: Bell, 
      component: NotificationFeed,
      color: 'text-blue-500',
      gradient: 'from-blue-500 to-indigo-600',
      count: 3
    },
    { 
      id: 'notes', 
      label: 'Notes', 
      icon: FileText, 
      component: DailyNotes,
      color: 'text-emerald-500',
      gradient: 'from-emerald-500 to-green-600',
      count: 5
    },
    { 
      id: 'attendees', 
      label: 'Attendees', 
      icon: Users, 
      component: AttendeeList,
      color: 'text-purple-500',
      gradient: 'from-purple-500 to-pink-600',
      count: 8
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;
  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-2xl h-full flex flex-col bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-cyan-500/5"></div>
      
      {/* Floating Orbs */}
      <div className="absolute top-8 right-8 w-24 h-24 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 rounded-full blur-2xl animate-pulse"></div>
      <div className="absolute bottom-8 left-8 w-20 h-20 bg-gradient-to-r from-pink-400/20 to-purple-600/20 rounded-2xl blur-xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-r from-emerald-400/10 to-teal-500/10 rounded-full blur-3xl animate-spin-slow"></div>

      {/* Header */}
      <div className="relative z-10 p-6 border-b border-white/10 dark:border-slate-700/50 bg-white/20 dark:bg-slate-800/20">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white">
              <Settings size={20} />
            </div>
            Activity Hub
            <Sparkles className="text-yellow-500 animate-pulse" size={18} />
          </h3>
        </div>
        
        {/* Enhanced Tab Navigation */}
        <div className="flex gap-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`relative flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-2xl transition-all duration-300 transform hover:scale-105 group ${
                  isActive
                    ? 'bg-white/90 dark:bg-slate-700/90 text-gray-800 dark:text-gray-100 shadow-xl border border-white/50 dark:border-slate-600/50'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/40 dark:hover:bg-slate-700/40'
                }`}
                onClick={() => setActiveTab(tab.id)}
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
                
                {/* Count Badge */}
                {tab.count > 0 && (
                  <span className={`relative z-10 px-2 py-1 rounded-full text-xs font-bold ${
                    isActive 
                      ? 'bg-gradient-to-r ' + tab.gradient + ' text-white shadow-lg' 
                      : 'bg-gray-400/20 text-gray-600 dark:text-gray-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
                
                {/* Hover Glow Effect */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/10 dark:bg-slate-600/10"></div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab Header */}
      {activeTabData && (
        <div className="relative z-10 px-6 py-4 bg-gradient-to-r from-white/30 to-transparent dark:from-slate-800/30 border-b border-white/10 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-gradient-to-r ${activeTabData.gradient} rounded-xl text-white shadow-lg`}>
              <activeTabData.icon size={16} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-gray-100">{activeTabData.label}</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {activeTabData.count} {activeTabData.count === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="relative z-10 flex-1 overflow-hidden">
        <div className="h-full transition-all duration-500 transform overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
          {ActiveComponent && <ActiveComponent />}
        </div>
      </div>

      {/* Enhanced Styles */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        
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