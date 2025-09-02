import React, { useState } from 'react';
import { Grid, List, Calendar, User, Clock, Star, CheckCircle, AlertCircle, PlayCircle } from 'lucide-react';

// Mock Priority Component
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
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${config.color} ${config.text} shadow-lg transform transition-all duration-300 hover:scale-110`}>
      <span className="mr-1">{config.icon}</span>
      {priori}
    </div>
  );
};

// Mock Status Component
const Status = ({ status }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'Completed':
        return { color: 'bg-emerald-500', icon: '✅', text: 'text-emerald-100' };
      case 'In Progress':
        return { color: 'bg-blue-500', icon: '🔄', text: 'text-blue-100' };
      case 'Pending':
        return { color: 'bg-orange-500', icon: '⏳', text: 'text-orange-100' };
      default:
        return { color: 'bg-gray-500', icon: '❓', text: 'text-gray-100' };
    }
  };

  const config = getStatusConfig(status);
  
  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${config.color} ${config.text} shadow-lg transform transition-all duration-300 hover:scale-110`}>
      <span className="mr-1">{config.icon}</span>
      {status}
    </div>
  );
};

const TaskList = ({ tasks: propTasks, onEdit, onDelete }) => {
  const [viewMode, setViewMode] = useState('linear'); // 'linear' or 'grid'
  
  // Mock tasks for demonstration
  const mockTasks = propTasks || [
    {
      _id: '1',
      taskTitle: 'Design System Implementation',
      projectName: 'Web Platform 2024',
      priority: 'High',
      taskStatus: 'In Progress',
      assignedTo: ['Alice Johnson', 'Bob Smith'],
      dueDate: '2024-12-15',
      projectManagerName: 'Sarah Wilson',
      description: 'Implement the new design system across all components'
    },
    {
      _id: '2',
      taskTitle: 'API Documentation',
      projectName: 'Backend Services',
      priority: 'Medium',
      taskStatus: 'Pending',
      assignedTo: ['Charlie Brown'],
      dueDate: '2024-12-20',
      projectManagerName: 'Mike Davis',
      description: 'Create comprehensive API documentation'
    },
    {
      _id: '3',
      taskTitle: 'User Testing',
      projectName: 'Mobile App',
      priority: 'High',
      taskStatus: 'Completed',
      assignedTo: ['Diana Prince', 'Eve Adams'],
      dueDate: '2024-12-10',
      projectManagerName: 'Tom Anderson',
      description: 'Conduct user testing sessions for new features'
    },
    {
      _id: '4',
      taskTitle: 'Performance Optimization',
      projectName: 'Web Platform 2024',
      priority: 'Low',
      taskStatus: 'In Progress',
      assignedTo: ['Frank Miller'],
      dueDate: '2024-12-25',
      projectManagerName: 'Sarah Wilson',
      description: 'Optimize application performance and loading times'
    }
  ];

  const tasks = mockTasks;

  if (!tasks || tasks.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl p-12 text-center transform hover:scale-105 transition-all duration-700">
          <div className="text-6xl mb-6 animate-bounce">📝</div>
          <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-400 text-transparent bg-clip-text">
            No Tasks Found
          </h3>
          <p className="text-white/70 text-lg">
            Ready to get productive? Click "Add New Task" to create your first one!
          </p>
        </div>
      </div>
    );
  }

  const ViewToggle = () => (
    <div className="flex items-center bg-white/10 backdrop-blur-xl rounded-2xl p-1 border border-white/20 shadow-lg">
      <button
        onClick={() => setViewMode('linear')}
        className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
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
        className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
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

  const TaskCard = ({ task, index }) => (
    <div
      className="group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl p-6 transform transition-all duration-700 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 hover:border-purple-400/30"
      style={{
        animationDelay: `${index * 100}ms`,
        animation: 'slideInUp 0.8s ease-out forwards'
      }}
    >
      <div className="flex justify-between items-start mb-4 flex-wrap">
        <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors duration-300 line-clamp-2">
          {task.taskTitle}
        </h3>
        <div className="flex space-x-2">
          <Priority priori={task.priority} />
          <Status status={task.taskStatus} />
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center text-white/70 group-hover:text-purple-400 transition-colors duration-300">
          <Star size={16} className="mr-2" />
          <span className="text-sm font-medium">{task.projectName}</span>
        </div>

        {task.description && (
          <p className="text-white/60 text-sm line-clamp-2 group-hover:text-white/80 transition-colors duration-300">
            {task.description}
          </p>
        )}

        <div className="flex items-center text-white/70 group-hover:text-emerald-400 transition-colors duration-300">
          <User size={16} className="mr-2" />
          <span className="text-sm">
            {task.assignedTo && task.assignedTo.length > 0 ? task.assignedTo.join(', ') : 'Unassigned'}
          </span>
        </div>

        <div className="flex items-center text-white/70 group-hover:text-yellow-400 transition-colors duration-300">
          <Calendar size={16} className="mr-2" />
          <span className="text-sm">
            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
          </span>
        </div>

        <div className="flex items-center text-white/70 group-hover:text-pink-400 transition-colors duration-300">
          <User size={16} className="mr-2" />
          <span className="text-sm">PM: {task.projectManagerName || 'Not assigned'}</span>
        </div>
      </div>

      <div className="flex space-x-3 pt-4 border-t border-white/10">
        <button
          onClick={() => onEdit && onEdit(task)}
          className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-bold py-2 px-4 rounded-xl transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          ✏️ Edit
        </button>
        <button
          onClick={() => onDelete && onDelete(task._id)}
          className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm font-bold py-2 px-4 rounded-xl transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-24 h-24 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 rounded-2xl animate-float"></div>
        <div className="absolute top-40 right-32 w-16 h-16 bg-gradient-to-r from-purple-400/20 to-pink-500/20 rounded-full animate-pulse"></div>
        <div className="absolute bottom-32 left-1/3 w-20 h-20 bg-gradient-to-r from-emerald-400/20 to-teal-500/20 rounded-lg animate-bounce"></div>
        
        {/* Particle System */}
        {[...Array(12)].map((_, i) => (
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

      <div className="relative z-10 p-6">
        {/* Header with Toggle */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 text-transparent bg-clip-text mb-2">
              Task Dashboard
            </h1>
            <p className="text-white/70">Manage your projects with style</p>
          </div>
          <ViewToggle />
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Tasks', value: tasks.length, icon: '📊', color: 'from-cyan-500 to-blue-500' },
            { label: 'Completed', value: tasks.filter(t => t.taskStatus === 'Completed').length, icon: '✅', color: 'from-emerald-500 to-teal-500' },
            { label: 'In Progress', value: tasks.filter(t => t.taskStatus === 'In Progress').length, icon: '🔄', color: 'from-yellow-500 to-orange-500' },
            { label: 'High Priority', value: tasks.filter(t => t.priority === 'High').length, icon: '🔥', color: 'from-red-500 to-pink-500' }
          ].map((stat, index) => (
            <div
              key={stat.label}
              className={`bg-gradient-to-r ${stat.color} rounded-2xl p-6 shadow-xl transform transition-all duration-500 hover:scale-105`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/90 text-sm font-medium">{stat.label}</p>
                  <p className="text-white text-3xl font-bold">{stat.value}</p>
                </div>
                <div className="text-3xl">{stat.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Task Display */}
        {viewMode === 'linear' ? (
          /* Linear View - Table */
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-800/50 to-gray-900/50">
                    {[
                      { label: 'Task', icon: '🎯' },
                      { label: 'Project', icon: '🚀' },
                      { label: 'Priority', icon: '⚡' },
                      { label: 'Status', icon: '📊' },
                      { label: 'Assigned To', icon: '👥' },
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
                        <div className="text-sm font-bold text-white/90 group-hover:text-cyan-400 transition-colors duration-300">
                          {task.taskTitle}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white/70 group-hover:text-purple-400 transition-colors duration-300">
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
                        <div className="text-sm text-white/70 group-hover:text-emerald-400 transition-colors duration-300">
                          {task.assignedTo && task.assignedTo.length > 0 ? task.assignedTo.join(', ') : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white/70 group-hover:text-yellow-400 transition-colors duration-300">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white/70 group-hover:text-pink-400 transition-colors duration-300">
                          {task.projectManagerName || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
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
          /* Grid View - Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
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
          50% { transform: translateY(-20px) rotate(180deg); }
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
        /* Custom scrollbar */
        .overflow-x-auto::-webkit-scrollbar {
          height: 8px;
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
      `}</style>
    </div>
  );
};

export default TaskList;