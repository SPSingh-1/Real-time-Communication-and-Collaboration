import React, { useState, useEffect } from 'react';
import { Grid, List, Calendar, User, Clock, Star, CheckCircle, AlertCircle, PlayCircle } from 'lucide-react';

// Priority Component - Fully Responsive
const Priority = ({ priori }) => {
  const getPriorityConfig = (priority) => {
    switch (priority) {
      case 'High':
        return { color: 'bg-red-500', icon: '🔥', text: 'text-red-100' };
      case 'Medium':
        return { color: 'bg-yellow-500', icon: '⚡', text: 'text-yellow-100' };
      case 'Low':
        return { color: 'bg-green-500', icon: '🟢', text: 'text-green-100' };
      default:
        return { color: 'bg-gray-500', icon: '◯', text: 'text-gray-100' };
    }
  };

  const config = getPriorityConfig(priori);
  
  return (
    <div className={`inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 xl:px-3 xl:py-1 rounded-full text-xs font-bold ${config.color} ${config.text} shadow-lg transform transition-all duration-300 hover:scale-110`}>
      <span className="mr-0.5 sm:mr-1 text-xs">{config.icon}</span>
      <span className="text-xs">{priori}</span>
    </div>
  );
};

// Status Component - Fully Responsive
const Status = ({ status }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'Completed':
        return { color: 'bg-emerald-500', icon: '✅', text: 'text-emerald-100' };
      case 'In Progress':
        return { color: 'bg-blue-500', icon: '🔄', text: 'text-blue-100' };
      case 'To Do':
        return { color: 'bg-orange-500', icon: '⏳', text: 'text-orange-100' };
      case 'Blocked':
        return { color: 'bg-red-500', icon: '🚫', text: 'text-red-100' };
      default:
        return { color: 'bg-gray-500', icon: '❓', text: 'text-gray-100' };
    }
  };

  const config = getStatusConfig(status);
  
  return (
    <div className={`inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 xl:px-3 xl:py-1 rounded-full text-xs font-bold ${config.color} ${config.text} shadow-lg transform transition-all duration-300 hover:scale-110`}>
      <span className="mr-0.5 sm:mr-1 text-xs">{config.icon}</span>
      <span className="text-xs">{status}</span>
    </div>
  );
};

const TaskList = ({ tasks: propTasks, onEdit, onDelete}) => {
  const [viewMode, setViewMode] = useState('grid'); // Default to 'grid' for mobile
  const [screenSize, setScreenSize] = useState('mobile');
  
  // Use provided tasks or show mock message
  const tasks = propTasks || [];

  // Track screen size changes
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
        setViewMode('grid'); // Force grid on mobile
      } else if (width < 1500) {
        setScreenSize('tablet');
        setViewMode('grid'); // Force grid on tablet
      } else {
        setScreenSize('desktop');
        // Keep current view mode on desktop
      }
    };

    // Set initial screen size
    updateScreenSize();

    // Add event listener
    window.addEventListener('resize', updateScreenSize);
    
    // Cleanup
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  if (!tasks || tasks.length === 0) {
    return (
      <div className="w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden rounded-xl xl:rounded-3xl min-h-[300px] sm:min-h-[400px] flex items-center justify-center">
        {/* Background elements - responsive */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-20 h-20 sm:w-32 sm:h-32 xl:w-64 xl:h-64 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-24 h-24 sm:w-40 sm:h-40 xl:w-80 xl:h-80 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 bg-white/10 backdrop-blur-2xl rounded-xl xl:rounded-3xl border border-white/20 shadow-2xl p-4 sm:p-6 xl:p-12 text-center transform hover:scale-105 transition-all duration-700 max-w-sm sm:max-w-md mx-auto">
          <div className="text-3xl sm:text-4xl xl:text-6xl mb-3 sm:mb-4 xl:mb-6 animate-bounce">📝</div>
          <h3 className="text-lg sm:text-xl xl:text-2xl font-bold mb-2 sm:mb-3 xl:mb-4 bg-gradient-to-r from-cyan-400 to-purple-400 text-transparent bg-clip-text">
            No Tasks Found
          </h3>
          <p className="text-white/70 text-sm sm:text-base xl:text-lg">
            Ready to get productive? Click "Add New Task" to create your first one!
          </p>
        </div>
      </div>
    );
  }

  const ViewToggle = () => {
    // Only show toggle on desktop
    if (screenSize !== 'desktop') return null;
    
    return (
      <div className="flex items-center bg-white/10 backdrop-blur-xl rounded-xl xl:rounded-2xl p-1 border border-white/20 shadow-lg">
        <button
          onClick={() => setViewMode('linear')}
          className={`flex items-center space-x-2 px-3 py-2 xl:px-4 xl:py-2 rounded-lg xl:rounded-xl text-sm font-semibold transition-all duration-300 ${
            viewMode === 'linear'
              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg transform scale-105'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <List size={16} />
          <span>Linear</span>
        </button>
        <button
          onClick={() => setViewMode('grid')}
          className={`flex items-center space-x-2 px-3 py-2 xl:px-4 xl:py-2 rounded-lg xl:rounded-xl text-sm font-semibold transition-all duration-300 ${
            viewMode === 'grid'
              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg transform scale-105'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <Grid size={16} />
          <span>Grid</span>
        </button>
      </div>
    );
  };

  const TaskCard = ({ task, index }) => (
    <div
      className="group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-lg sm:rounded-xl xl:rounded-2xl border border-white/20 shadow-xl p-3 sm:p-4 xl:p-6 transform transition-all duration-700 hover:scale-102 xl:hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 hover:border-purple-400/30"
      style={{
        animationDelay: `${index * 100}ms`,
        animation: 'slideInUp 0.8s ease-out forwards'
      }}
    >
      <div className="flex justify-between items-start mb-2 sm:mb-3 xl:mb-4 flex-wrap gap-2">
        <h3 className="text-sm sm:text-base xl:text-lg font-bold text-white group-hover:text-cyan-400 transition-colors duration-300 line-clamp-2 flex-1 min-w-0">
          {task.taskTitle}
        </h3>
        <div className="flex flex-col gap-1 shrink-0">
          <Priority priori={task.priority} />
          <Status status={task.taskStatus} />
        </div>
      </div>

      <div className="space-y-2 xl:space-y-3 mb-3 sm:mb-4 xl:mb-6">
        <div className="flex items-center text-white/70 group-hover:text-purple-400 transition-colors duration-300">
          <Star size={14} className="mr-2 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-medium truncate">{task.projectName}</span>
        </div>

        {task.taskDescription && (
          <p className="text-white/60 text-xs sm:text-sm line-clamp-2 group-hover:text-white/80 transition-colors duration-300">
            {task.taskDescription}
          </p>
        )}

        <div className="flex items-center text-white/70 group-hover:text-emerald-400 transition-colors duration-300">
          <User size={14} className="mr-2 flex-shrink-0" />
          <span className="text-xs sm:text-sm truncate">
            {task.assignedTo && task.assignedTo.length > 0 ? 
              (Array.isArray(task.assignedTo) ? task.assignedTo.join(', ') : task.assignedTo) : 
              'Unassigned'
            }
          </span>
        </div>

        <div className="flex items-center text-white/70 group-hover:text-yellow-400 transition-colors duration-300">
          <Calendar size={14} className="mr-2 flex-shrink-0" />
          <span className="text-xs sm:text-sm">
            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
          </span>
        </div>

        <div className="flex items-center text-white/70 group-hover:text-pink-400 transition-colors duration-300">
          <User size={14} className="mr-2 flex-shrink-0" />
          <span className="text-xs sm:text-sm truncate">PM: {task.projectManagerName || 'Not assigned'}</span>
        </div>
      </div>

      <div className="flex gap-2 pt-3 xl:pt-4 border-t border-white/10">
        <button
          onClick={() => onEdit && onEdit(task)}
          className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-bold py-2 px-2 sm:px-3 xl:px-4 rounded-lg xl:rounded-xl transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <span className="sm:hidden">✏️</span>
          <span className="hidden sm:inline">✏️ Edit</span>
        </button>
        <button
          onClick={() => onDelete && onDelete(task._id)}
          className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold py-2 px-2 sm:px-3 xl:px-4 rounded-lg xl:rounded-xl transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          <span className="sm:hidden">🗑️</span>
          <span className="hidden sm:inline">🗑️ Delete</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden rounded-lg sm:rounded-xl xl:rounded-3xl">
      {/* Animated Background - responsive */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-5 left-2 sm:left-5 xl:left-20 w-8 h-8 sm:w-12 sm:h-12 xl:w-24 xl:h-24 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 rounded-lg xl:rounded-2xl animate-float"></div>
        <div className="absolute top-20 right-4 sm:right-8 xl:right-32 w-6 h-6 sm:w-8 sm:h-8 xl:w-16 xl:h-16 bg-gradient-to-r from-purple-400/20 to-pink-500/20 rounded-full animate-pulse"></div>
        <div className="absolute bottom-16 left-1/3 w-8 h-8 sm:w-12 sm:h-12 xl:w-20 xl:h-20 bg-gradient-to-r from-emerald-400/20 to-teal-500/20 rounded-lg animate-bounce"></div>
        
        {/* Particle System - reduced count on mobile */}
        {[...Array(screenSize === 'mobile' ? 4 : screenSize === 'tablet' ? 8 : 12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/60 rounded-full animate-ping"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 p-3 sm:p-4 xl:p-6">
        {/* Header with Toggle - responsive */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 xl:mb-8 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl xl:text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 text-transparent bg-clip-text mb-1 sm:mb-2">
              Task Dashboard
            </h1>
            <p className="text-white/70 text-xs sm:text-sm xl:text-base">
              {screenSize === 'desktop' ? 'Manage your projects with style' : 'Your tasks at a glance'}
            </p>
          </div>
          <div className="flex justify-center sm:justify-end">
            <ViewToggle />
          </div>
        </div>

        {/* Stats Bar - responsive grid */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 xl:gap-4 mb-4 xl:mb-8">
          {[
            { label: 'Total Tasks', value: tasks.length, icon: '📊', color: 'from-cyan-500 to-blue-500' },
            { label: 'Completed', value: tasks.filter(t => t.taskStatus === 'Completed').length, icon: '✅', color: 'from-emerald-500 to-teal-500' },
            { label: 'In Progress', value: tasks.filter(t => t.taskStatus === 'In Progress').length, icon: '🔄', color: 'from-yellow-500 to-orange-500' },
            { label: 'High Priority', value: tasks.filter(t => t.priority === 'High').length, icon: '🔥', color: 'from-red-500 to-pink-500' }
          ].map((stat, index) => (
            <div
              key={stat.label}
              className={`bg-gradient-to-r ${stat.color} rounded-lg sm:rounded-xl xl:rounded-2xl p-2 sm:p-3 xl:p-6 shadow-xl transform transition-all duration-500 hover:scale-105`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-white/90 text-xs xl:text-sm font-medium truncate">{stat.label}</p>
                  <p className="text-white text-lg sm:text-xl xl:text-3xl font-bold">{stat.value}</p>
                </div>
                <div className="text-lg sm:text-xl xl:text-3xl flex-shrink-0 ml-2">{stat.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Task Display */}
        {viewMode === 'linear' && screenSize === 'desktop' ? (
          /* Linear View - Only for Desktop */
          <div className="bg-white/10 backdrop-blur-2xl rounded-xl xl:rounded-3xl border border-white/20 shadow-2xl overflow-x-auto">
            <div className="min-w-full">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-800/50 to-gray-900/50">
                    {[
                      { label: 'Task', icon: '🎯' },
                      { label: 'Project', icon: '🚀' },
                      { label: 'Priority', icon: '⚡' },
                      { label: 'Status', icon: '📊' },
                      { label: 'Assigned', icon: '👥' },
                      { label: 'Due Date', icon: '📅' },
                      { label: 'PM', icon: '👨‍💼' },
                      { label: 'Actions', icon: '⚙️' }
                    ].map((header) => (
                      <th
                        key={header.label}
                        className="px-6 py-4 text-left text-sm font-bold text-white/90 uppercase tracking-wider"
                      >
                        <div className="flex items-center space-x-2 group cursor-pointer">
                          <span className="text-lg group-hover:animate-bounce">{header.icon}</span>
                          <span className="group-hover:text-cyan-400 transition-colors duration-300">{header.label}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {tasks.map((task, index) => (
                    <tr
                      key={task._id}
                      className="group bg-gradient-to-r from-white/5 to-transparent hover:from-white/10 hover:to-white/5 transition-all duration-500"
                      style={{
                        animationDelay: `${index * 100}ms`,
                        animation: 'slideInUp 0.8s ease-out forwards'
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-white/90 group-hover:text-cyan-400 transition-colors duration-300 line-clamp-2 max-w-xs">
                          {task.taskTitle}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm text-white/70 group-hover:text-purple-400 transition-colors duration-300 max-w-xs truncate">
                          {task.projectName}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <Priority priori={task.priority} />
                      </td>
                      
                      <td className="px-6 py-4">
                        <Status status={task.taskStatus} />
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm text-white/70 group-hover:text-emerald-400 transition-colors duration-300 max-w-xs truncate">
                          {task.assignedTo && task.assignedTo.length > 0 ? 
                            (Array.isArray(task.assignedTo) ? task.assignedTo.join(', ') : task.assignedTo) : 
                            'N/A'
                          }
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm text-white/70 group-hover:text-yellow-400 transition-colors duration-300">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm text-white/70 group-hover:text-pink-400 transition-colors duration-300 max-w-xs truncate">
                          {task.projectManagerName || 'N/A'}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => onEdit && onEdit(task)}
                            className="px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-bold rounded-lg transform transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/50"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => onDelete && onDelete(task._id)}
                            className="px-3 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-lg transform transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-red-500/50"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Grid View - Mobile, Tablet, and Desktop */
          <div className={`grid gap-3 sm:gap-4 xl:gap-6 ${
            screenSize === 'mobile' 
              ? 'grid-cols-1' 
              : screenSize === 'tablet'
              ? 'grid-cols-1 sm:grid-cols-2'
              : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
          }`}>
            {tasks.map((task, index) => (
              <TaskCard key={task._id} task={task} index={index} />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(180deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .line-clamp-2 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }
        .hover\\:scale-102:hover {
          transform: scale(1.02);
        }
        
        /* Custom scrollbar for table */
        .overflow-x-auto::-webkit-scrollbar {
          height: 6px;
        }
        .overflow-x-auto::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb {
          background: linear-gradient(90deg, #06b6d4, #8b5cf6);
          border-radius: 10px;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(90deg, #0891b2, #7c3aed);
        }
        
        /* Responsive optimizations */
        @media (max-width: 640px) {
          .hover\\:scale-110:hover,
          .hover\\:scale-105:hover,
          .hover\\:scale-102:hover {
            transform: scale(1.02);
          }
          
          .animate-float {
            animation-duration: 8s;
          }
        }
        
        /* Tablet optimizations */
        @media (min-width: 641px) and (max-width: 1499px) {
          .hover\\:scale-110:hover {
            transform: scale(1.05);
          }
          
          .hover\\:scale-105:hover {
            transform: scale(1.03);
          }
        }
        
        /* Desktop optimizations */
        @media (min-width: 1500px) {
          .hover\\:scale-110:hover {
            transform: scale(1.1);
          }
          
          .hover\\:scale-105:hover {
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
};

export default TaskList;