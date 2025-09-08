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
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
            {/* Animated 3D Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Floating geometric shapes */}
                <div className="absolute top-10 left-10 w-20 h-20 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg opacity-20 animate-spin-slow transform-gpu"></div>
                <div className="absolute top-40 right-20 w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full opacity-30 animate-bounce-slow transform-gpu"></div>
                <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-lg opacity-25 animate-pulse transform-gpu"></div>
                <div className="absolute top-1/2 right-10 w-24 h-24 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full opacity-20 animate-ping transform-gpu"></div>
                
                {/* Large background orbs */}
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse transform-gpu"></div>
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000 transform-gpu"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full blur-3xl animate-pulse delay-500 transform-gpu"></div>
            </div>

            {/* Floating particles */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 bg-white/40 rounded-full animate-float-3d transform-gpu"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${3 + Math.random() * 4}s`
                        }}
                    ></div>
                ))}
            </div>

            <div className="relative z-10 p-6 max-w-6xl mx-auto">
                {/* 3D Container with perspective */}
                <div 
                    className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl mb-6 transform-gpu transition-all duration-1000 hover:scale-[1.02] hover:rotate-x-2"
                    style={{
                        transformStyle: 'preserve-3d',
                        perspective: '1000px'
                    }}
                >
                    {/* Glowing border effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-xl animate-pulse-glow"></div>
                    
                    <div className="relative z-10 p-6">
                        {/* Enhanced 3D Header with Role Information */}
                        <div className="mb-6 transform-gpu transition-all duration-700 hover:translate-z-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 text-transparent bg-clip-text mb-2 animate-text-shimmer">
                                        🚀 Task Manager
                                    </h2>
                                    <div className="h-1 w-32 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full animate-width-expand"></div>
                                </div>
                                
                                {/* Role Badge */}
                                <div className="flex items-center space-x-4">
                                    <div className="text-right">
                                        <div className="text-sm text-white/60">Welcome back,</div>
                                        <div className="text-lg font-bold text-white/90">{currentUser.name}</div>
                                    </div>
                                    <div className={`px-4 py-2 rounded-xl bg-gradient-to-r ${roleInfo.color} text-white font-bold shadow-lg transform-gpu transition-all duration-500 hover:scale-110 hover:rotate-y-6`}>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-lg">{roleInfo.icon}</span>
                                            <span>{roleInfo.label} Mode</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Role-based Information Panel */}
                        <div className="mb-6 p-4 bg-gradient-to-r from-white/10 to-white/5 rounded-2xl border border-white/20 transform-gpu transition-all duration-500 hover:scale-105">
                            <div className="text-sm text-white/70">
                                {currentUser.role === 'single' && (
                                    <div className="flex items-center space-x-2">
                                        <span>📝</span>
                                        <span>You can create and manage your personal tasks</span>
                                    </div>
                                )}
                                {currentUser.role === 'team' && (
                                    <div className="flex items-center space-x-2">
                                        <span>👥</span>
                                        <span>You can create and manage tasks for your team {currentUser.teamId ? `(Team ID: ${currentUser.teamId})` : ''}</span>
                                    </div>
                                )}
                                {currentUser.role === 'global' && (
                                    <div className="flex items-center space-x-2">
                                        <span>🌍</span>
                                        <span>You can create and manage global organization tasks {currentUser.globalId ? `(Global ID: ${currentUser.globalId})` : ''}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 3D Navigation Buttons */}
                        <div className="flex justify-end mb-6">
                            {currentView === 'list' && (
                                <button
                                    onClick={handleAddTaskClick}
                                    className="group relative px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl shadow-2xl hover:shadow-emerald-500/50 transform-gpu transition-all duration-500 hover:scale-110 hover:rotate-y-12 focus:outline-none focus:ring-4 focus:ring-emerald-500/50"
                                    style={{ transformStyle: 'preserve-3d' }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl transform translate-z-[-4px] group-hover:translate-z-[-8px] transition-transform duration-500"></div>
                                    <div className="relative z-10 font-bold flex items-center space-x-2">
                                        <span className="text-xl">✨</span>
                                        <span>Add New {roleInfo.label} Task</span>
                                    </div>
                                    <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                </button>
                            )}
                            
                            {currentView === 'form' && (
                                <button
                                    onClick={handleBackToListClick}
                                    className="group relative px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-2xl shadow-2xl hover:shadow-gray-500/50 transform-gpu transition-all duration-500 hover:scale-110 hover:rotate-y-12 focus:outline-none focus:ring-4 focus:ring-gray-500/50"
                                    style={{ transformStyle: 'preserve-3d' }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-gray-700 to-gray-800 rounded-2xl transform translate-z-[-4px] group-hover:translate-z-[-8px] transition-transform duration-500"></div>
                                    <div className="relative z-10 font-bold flex items-center space-x-2">
                                        <span className="text-xl">⬅️</span>
                                        <span>Back to Task List</span>
                                    </div>
                                    <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                </button>
                            )}
                        </div>
                        {/* 3D Content Container with transition effects */}
                        <div 
                            className={`transform-gpu transition-all duration-1000 ${
                                currentView === 'form' 
                                    ? 'translate-x-0 rotate-y-0 opacity-100' 
                                    : 'translate-x-0 rotate-y-0 opacity-100'
                            }`}
                            style={{ 
                                transformStyle: 'preserve-3d',
                                perspective: '1000px'
                            }}
                        >
                            {/* Conditional Rendering of TaskForm or TaskList with 3D effects */}
                            {currentView === 'form' ? (
                                <div className="transform-gpu transition-all duration-1000 animate-slide-in-right">
                                    <TaskForm
                                        task={editingTask}
                                        onSave={handleSaveTask}
                                        onCancel={handleBackToListClick}
                                        currentUser={currentUser}
                                    />
                                </div>
                            ) : (
                                <div className="transform-gpu transition-all duration-1000 animate-slide-in-left">
                                    <TaskList
                                        tasks={tasks}
                                        onEdit={handleEditTaskClick}
                                        onDelete={handleDeleteTask}
                                        currentUser={currentUser}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg) rotateY(0deg); }
                    to { transform: rotate(360deg) rotateY(360deg); }
                }
                @keyframes bounce-slow {
                    0%, 100% { 
                        transform: translateY(0px) rotateX(0deg) scale(1); 
                        opacity: 0.3; 
                    }
                    50% { 
                        transform: translateY(-30px) rotateX(180deg) scale(1.1); 
                        opacity: 0.6; 
                    }
                }
                @keyframes float-3d {
                    0%, 100% { 
                        transform: translateY(0px) translateX(0px) rotateZ(0deg) rotateY(0deg); 
                        opacity: 0.4; 
                    }
                    25% { 
                        transform: translateY(-20px) translateX(10px) rotateZ(90deg) rotateY(90deg); 
                        opacity: 0.8; 
                    }
                    50% { 
                        transform: translateY(-40px) translateX(0px) rotateZ(180deg) rotateY(180deg); 
                        opacity: 1; 
                    }
                    75% { 
                        transform: translateY(-20px) translateX(-10px) rotateZ(270deg) rotateY(270deg); 
                        opacity: 0.8; 
                    }
                }
                @keyframes pulse-glow {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.05); }
                }
                @keyframes text-shimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                @keyframes width-expand {
                    0% { width: 0; opacity: 0; }
                    100% { width: 8rem; opacity: 1; }
                }
                @keyframes slide-in-right {
                    from { 
                        transform: translateX(100%) rotateY(90deg) scale(0.8); 
                        opacity: 0; 
                    }
                    to { 
                        transform: translateX(0) rotateY(0deg) scale(1); 
                        opacity: 1; 
                    }
                }
                @keyframes slide-in-left {
                    from { 
                        transform: translateX(-100%) rotateY(-90deg) scale(0.8); 
                        opacity: 0; 
                    }
                    to { 
                        transform: translateX(0) rotateY(0deg) scale(1); 
                        opacity: 1; 
                    }
                }
                @keyframes rotate-y-12 {
                    to { transform: rotateY(12deg); }
                }
                
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
                .animate-bounce-slow {
                    animation: bounce-slow 4s ease-in-out infinite;
                }
                .animate-float-3d {
                    animation: float-3d 6s ease-in-out infinite;
                }
                .animate-pulse-glow {
                    animation: pulse-glow 3s ease-in-out infinite;
                }
                .animate-text-shimmer {
                    background: linear-gradient(90deg, #06b6d4, #8b5cf6, #ec4899, #06b6d4);
                    background-size: 400% 400%;
                    animation: text-shimmer 3s ease-in-out infinite;
                }
                .animate-width-expand {
                    animation: width-expand 2s ease-out forwards;
                }
                .animate-slide-in-right {
                    animation: slide-in-right 1s ease-out forwards;
                }
                .animate-slide-in-left {
                    animation: slide-in-left 1s ease-out forwards;
                }
                .hover\\:rotate-y-12:hover {
                    animation: rotate-y-12 0.5s ease-out forwards;
                }
                .hover\\:rotate-y-6:hover {
                    transform: rotateY(6deg);
                }
                .hover\\:translate-z-4:hover {
                    transform: translateZ(16px);
                }
                .translate-z-\\[-4px\\] {
                    transform: translateZ(-4px);
                }
                .group:hover .group-hover\\:translate-z-\\[-8px\\] {
                    transform: translateZ(-8px);
                }
                .hover\\:rotate-x-2:hover {
                    transform: rotateX(2deg);
                }
            `}</style>
        </div>
    );
};

export default TaskManager;