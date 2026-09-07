import React, { useState, useEffect, useCallback } from 'react';
import TaskForm from '../TaskManager/TaskForm';
import TaskList from '../TaskManager/TaskList';
import { jwtDecode } from 'jwt-decode'; // Import jwtDecode

// Base URL for your Node.js MongoDB backend
const MONGODB_API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api/tasks`;

const TaskManager = () => {
    const [tasks, setTasks] = useState([]);
    const [currentView, setCurrentView] = useState('list');
    const [editingTask, setEditingTask] = useState(null);

    // State to hold the current logged-in user's info including role
    const [currentUser, setCurrentUser] = useState({
        name: 'Guest',
        id: null,
        role: 'single',
        teamId: null,
        globalId: null
    });

    // --- Enhanced Effect to decode token and set current user info with role support ---
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decodedToken = jwtDecode(token);
                console.log("Full decoded token:", decodedToken);
                
                // Handle different token structures more comprehensively
                const userId = decodedToken.user?.id || decodedToken.id || null;
                const userRole = decodedToken.user?.role || decodedToken.role || 'single';
                const teamId = decodedToken.user?.teamId || decodedToken.teamId || null;
                const globalId = decodedToken.user?.globalId || decodedToken.globalId || null;
                const userName = decodedToken.user?.name || decodedToken.name || decodedToken.username || 'Guest';

                setCurrentUser({
                    name: userName,
                    id: userId,
                    role: userRole,
                    teamId: teamId,
                    globalId: globalId
                });

                console.log("Decoded Token in TaskManager:", {
                    name: userName,
                    id: userId,
                    role: userRole,
                    teamId: teamId,
                    globalId: globalId
                });
            } catch (error) {
                console.error("Error decoding token in TaskManager:", error);
                setCurrentUser({
                    name: 'Guest',
                    id: null,
                    role: 'single',
                    teamId: null,
                    globalId: null
                });
            }
        } else {
            console.log("No token found in localStorage");
            setCurrentUser({
                name: 'Guest',
                id: null,
                role: 'single',
                teamId: null,
                globalId: null
            });
        }
    }, []);

    // Function to fetch all tasks from the backend with authentication
    const fetchTasks = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No authentication token found');
                return;
            }

            console.log('Fetching tasks with token:', token.substring(0, 20) + '...');

            const response = await fetch(MONGODB_API_BASE_URL, {
                method: 'GET',
                headers: {
                    'auth-token': token, // Changed from 'Authorization': `Bearer ${token}`
                    'Content-Type': 'application/json'
                }
            });

            console.log('Fetch response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Fetch error details:', errorData);
                throw new Error(`Failed to fetch tasks: ${errorData.message || errorData.error || response.statusText}`);
            }
            const data = await response.json();
            console.log('Fetched tasks:', data);
            setTasks(data);
        } catch (error) {
            console.error("Error fetching tasks:", error);
        }
    }, []);

    // Effect to load tasks when the component mounts or when navigating to the list view
    useEffect(() => {
        if (currentView === 'list') {
            fetchTasks();
        }
    }, [currentView, fetchTasks]);

    // Handle saving a task (add or update) with authentication
    const handleSaveTask = async (taskData) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No authentication token found');
                return;
            }

            console.log('Saving task data:', taskData);

            let response;
            if (taskData._id) {
                // This is an update operation because _id exists
                response = await fetch(`${MONGODB_API_BASE_URL}/${taskData._id}`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'auth-token': token // Changed from 'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(taskData),
                });
            } else {
                // This is an add operation - the backend will handle setting the correct scope and IDs
                response = await fetch(MONGODB_API_BASE_URL, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'auth-token': token // Changed from 'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(taskData),
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Save task error:', errorData);
                throw new Error(`Failed to save task: ${errorData.message || errorData.error || JSON.stringify(errorData) || response.statusText}`);
            }

            console.log('Task saved successfully!');
            await fetchTasks(); // Re-fetch tasks to update the list
            setCurrentView('list'); // Go back to the task list view
            setEditingTask(null); // Clear editing state after save
        } catch (error) {
            console.error("Error saving task:", error);
            alert(`Error saving task: ${error.message}`);
        }
    };

    // Handle deleting a task with authentication
    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('Are you sure you want to delete this task?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No authentication token found');
                return;
            }

            const response = await fetch(`${MONGODB_API_BASE_URL}/${taskId}`, {
                method: 'DELETE',
                headers: {
                    'auth-token': token // Changed from 'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Delete task error:', errorData);
                throw new Error(`Failed to delete task: ${errorData.message || errorData.error || response.statusText}`);
            }
            console.log('Task deleted successfully!');
            await fetchTasks(); // Re-fetch tasks to update the list
        } catch (error) {
            console.error("Error deleting task:", error);
            alert(`Error deleting task: ${error.message}`);
        }
    };

    // Navigation functions
    const handleAddTaskClick = () => {
        setEditingTask(null); // Clear editingTask to indicate new task
        setCurrentView('form');
    };

    const handleEditTaskClick = (task) => {
        // When edit button is clicked, set the task to be edited
        setEditingTask(task);
        setCurrentView('form'); // Switch to the form view
    };

    const handleBackToListClick = () => {
        setCurrentView('list');
        setEditingTask(null); // Clear editing state when navigating back
    };

    // Get role display information
    const getRoleDisplayInfo = () => {
        switch (currentUser.role) {
            case 'single':
                return { icon: '👤', label: 'Personal', color: 'from-blue-400 to-cyan-400' };
            case 'team':
                return { icon: '👥', label: 'Team', color: 'from-emerald-400 to-teal-400' };
            case 'global':
                return { icon: '🌍', label: 'Global', color: 'from-purple-400 to-pink-400' };
            default:
                return { icon: '👤', label: 'Personal', color: 'from-blue-400 to-cyan-400' };
        }
    };

    const roleInfo = getRoleDisplayInfo();

    return (
        <div className="min-h-full bg-slate-950 text-slate-100 p-4 sm:p-6 max-w-7xl mx-auto">
            {/* Header Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
                            Task Manager
                        </h2>
                        <p className="text-slate-400 text-xs sm:text-sm">Create, track, and manage workspace assignments</p>
                    </div>
                    
                    {/* Role & User Info */}
                    <div className="flex items-center gap-3">
                        <div className="text-left sm:text-right">
                            <div className="text-xs text-slate-400">Welcome,</div>
                            <div className="text-sm font-semibold text-white truncate max-w-xs">{currentUser.name}</div>
                        </div>
                        <div className="px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-semibold flex items-center gap-1.5">
                            <span>{roleInfo.icon}</span>
                            <span>{roleInfo.label} Mode</span>
                        </div>
                    </div>
                </div>

                {/* Role Description Panel */}
                <div className="mt-4 pt-4 border-t border-slate-800/80 text-xs text-slate-400">
                    {currentUser.role === 'single' && (
                        <span>📝 Personal workspace mode: manage your individual tasks.</span>
                    )}
                    {currentUser.role === 'team' && (
                        <span>👥 Team workspace mode: manage tasks for your team {currentUser.teamId ? `(Team ID: ${currentUser.teamId})` : ''}.</span>
                    )}
                    {currentUser.role === 'global' && (
                        <span>🌍 Organization workspace mode: manage global organization tasks.</span>
                    )}
                </div>

                {/* Action Bar */}
                <div className="mt-4 flex justify-end">
                    {currentView === 'list' && (
                        <button
                            onClick={handleAddTaskClick}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <span>+</span>
                            <span>Add New {roleInfo.label} Task</span>
                        </button>
                    )}
                    {currentView === 'form' && (
                        <button
                            onClick={handleBackToListClick}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs sm:text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <span>←</span>
                            <span>Back to Task List</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div>
                {currentView === 'form' ? (
                    <TaskForm
                        task={editingTask}
                        onSave={handleSaveTask}
                        onCancel={handleBackToListClick}
                        currentUser={currentUser}
                    />
                ) : (
                    <TaskList
                        tasks={tasks}
                        onEdit={handleEditTaskClick}
                        onDelete={handleDeleteTask}
                        currentUser={currentUser}
                    />
                )}
            </div>
        </div>
    );
};

export default TaskManager;