import React, { useState, useEffect } from 'react';
import { Grid, List, Calendar, User, Star } from 'lucide-react';

// Priority Component
const Priority = ({ priori }) => {
  const getPriorityConfig = (priority) => {
    switch (priority) {
      case 'High':
        return { color: 'bg-red-500/20 text-red-400 border border-red-500/30' };
      case 'Medium':
        return { color: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' };
      case 'Low':
        return { color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' };
      default:
        return { color: 'bg-slate-800 text-slate-400 border border-slate-700' };
    }
  };

  const config = getPriorityConfig(priori);
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${config.color}`}>
      {priori}
    </span>
  );
};

// Status Component
const Status = ({ status }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'Completed':
        return { color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' };
      case 'In Progress':
        return { color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' };
      case 'To Do':
        return { color: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' };
      case 'Blocked':
        return { color: 'bg-red-500/20 text-red-400 border border-red-500/30' };
      default:
        return { color: 'bg-slate-800 text-slate-400 border border-slate-700' };
    }
  };

  const config = getStatusConfig(status);
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${config.color}`}>
      {status}
    </span>
  );
};

const TaskList = ({ tasks: propTasks, onEdit, onDelete }) => {
  const [viewMode, setViewMode] = useState('grid');
  const [screenSize, setScreenSize] = useState('mobile');
  
  const tasks = propTasks || [];

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
        setViewMode('grid');
      } else if (width < 1500) {
        setScreenSize('tablet');
        setViewMode('grid');
      } else {
        setScreenSize('desktop');
      }
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  if (!tasks || tasks.length === 0) {
    return (
      <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
        <div className="text-4xl mb-3">📝</div>
        <h3 className="text-lg font-bold text-white mb-1">
          No Tasks Found
        </h3>
        <p className="text-slate-400 text-sm max-w-sm mx-auto">
          Ready to get productive? Click "Add New Task" to create your first workspace assignment.
        </p>
      </div>
    );
  }

  const ViewToggle = () => {
    if (screenSize !== 'desktop') return null;
    
    return (
      <div className="flex items-center bg-slate-900 rounded-lg p-1 border border-slate-800">
        <button
          onClick={() => setViewMode('linear')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            viewMode === 'linear'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <List size={14} />
          <span>Linear</span>
        </button>
        <button
          onClick={() => setViewMode('grid')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            viewMode === 'grid'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Grid size={14} />
          <span>Grid</span>
        </button>
      </div>
    );
  };

  const TaskCard = ({ task }) => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-3 gap-2">
          <h3 className="text-sm font-bold text-white line-clamp-2 flex-1">
            {task.taskTitle}
          </h3>
          <div className="flex flex-wrap gap-1 shrink-0">
            <Priority priori={task.priority} />
            <Status status={task.taskStatus} />
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-xs text-slate-400">
            <Star size={13} className="mr-1.5 text-slate-500 shrink-0" />
            <span className="font-medium text-slate-300 truncate">{task.projectName}</span>
          </div>

          {task.taskDescription && (
            <p className="text-xs text-slate-400 line-clamp-2">
              {task.taskDescription}
            </p>
          )}

          <div className="flex items-center text-xs text-slate-400">
            <User size={13} className="mr-1.5 text-slate-500 shrink-0" />
            <span className="truncate">
              {task.assignedTo && task.assignedTo.length > 0 ? 
                (Array.isArray(task.assignedTo) ? task.assignedTo.join(', ') : task.assignedTo) : 
                'Unassigned'
              }
            </span>
          </div>

          <div className="flex items-center text-xs text-slate-400">
            <Calendar size={13} className="mr-1.5 text-slate-500 shrink-0" />
            <span>
              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-3 border-t border-slate-800">
        <button
          onClick={() => onEdit && onEdit(task)}
          className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium py-1.5 px-3 rounded-lg transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete && onDelete(task._id)}
          className="bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 text-xs font-medium py-1.5 px-3 rounded-lg transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {/* Header with Toggle */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white mb-0.5">
            Tasks Overview
          </h1>
          <p className="text-slate-400 text-xs">
            Monitor and update team deliverables
          </p>
        </div>
        <div className="flex justify-end">
          <ViewToggle />
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Tasks', value: tasks.length, color: 'text-blue-400' },
          { label: 'Completed', value: tasks.filter(t => t.taskStatus === 'Completed').length, color: 'text-emerald-400' },
          { label: 'In Progress', value: tasks.filter(t => t.taskStatus === 'In Progress').length, color: 'text-amber-400' },
          { label: 'High Priority', value: tasks.filter(t => t.priority === 'High').length, color: 'text-red-400' }
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-slate-900 border border-slate-800 rounded-xl p-3.5"
          >
            <p className="text-slate-400 text-xs font-medium">{stat.label}</p>
            <p className={`text-xl sm:text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Task Display */}
      {viewMode === 'linear' && screenSize === 'desktop' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assigned</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {tasks.map((task) => (
                <tr key={task._id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-white max-w-xs truncate">
                    {task.taskTitle}
                  </td>
                  <td className="px-4 py-3 text-slate-300 max-w-xs truncate">
                    {task.projectName}
                  </td>
                  <td className="px-4 py-3">
                    <Priority priori={task.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <Status status={task.taskStatus} />
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {task.assignedTo && task.assignedTo.length > 0 ? 
                      (Array.isArray(task.assignedTo) ? task.assignedTo.join(', ') : task.assignedTo) : 
                      'N/A'
                    }
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => onEdit && onEdit(task)}
                      className="text-blue-400 hover:text-blue-300 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete && onDelete(task._id)}
                      className="text-red-400 hover:text-red-300 font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tasks.map((task) => (
            <TaskCard key={task._id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskList;