import React, { useState, useEffect, useCallback } from 'react';
import TaskForm from '../TaskManager/TaskForm';
import TaskList from '../TaskManager/TaskList';
import { jwtDecode } from 'jwt-decode'; // Import jwtDecode

// Base URL for your Node.js MongoDB backend
const MONGODB_API_BASE_URL = 'http://localhost:3001/api/tasks';

const TaskManager = () => {
    const [tasks, setTasks] = useState([]);
    const [currentView, setCurrentView] = useState('list');
    const [editingTask, setEditingTask] = useState(null);

    // State to hold the current logged-in user's name
    const [currentUserName, setCurrentUserName] = useState('Guest');

    // --- New Effect to decode token and set current user info ---
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decodedToken = jwtDecode(token);
                // Adjust these property names based on your actual JWT payload structure
                setCurrentUserName(decodedToken.name || decodedToken.username || 'Guest');
                // You might also want to set currentUserId here if needed for backend validation
                // For this scenario, we only strictly need the name for the frontend display.
                console.log("Decoded Token in TaskManager:", {
                    name: decodedToken.name || decodedToken.username,
                    // id: decodedToken.user?.id || decodedToken.id // Uncomment if you need the ID here
                });
            } catch (error) {
                console.error("Error decoding token in TaskManager:", error);
                setCurrentUserName('Guest'); // Fallback in case of invalid token
                // You could also show a toast here if you wanted, similar to FileUploader
            }
        } else {
            setCurrentUserName('Guest'); // No token found, default to Guest
        }
    }, []); // Empty dependency array means this runs once on component mount

    // Function to fetch all tasks from the backend
    const fetchTasks = useCallback(async () => {
        try {
            const response = await fetch(MONGODB_API_BASE_URL);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to fetch tasks: ${errorData.message || response.statusText}`);
            }
            const data = await response.json();
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

    // Handle saving a task (add or update)
    const handleSaveTask = async (taskData) => {
        try {
            let response;
            if (taskData._id) {
                // This is an update operation because _id exists
                response = await fetch(`${MONGODB_API_BASE_URL}/${taskData._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(taskData),
                });
            } else {
                // This is an add operation
                // --- Automatically add currentUserName to the new task data ---
                const newTaskData = { ...taskData, createdBy: currentUserName };
                response = await fetch(MONGODB_API_BASE_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newTaskData),
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to save task: ${errorData.message || JSON.stringify(errorData) || response.statusText}`);
            }

            console.log('Task saved successfully!');
            await fetchTasks(); // Re-fetch tasks to update the list
            setCurrentView('list'); // Go back to the task list view
            setEditingTask(null); // Clear editing state after save
        } catch (error) {
            console.error("Error saving task:", error);
        }
    };

    // Handle deleting a task (requires DELETE route in backend)
    const handleDeleteTask = async (taskId) => {
        try {
            const response = await fetch(`${MONGODB_API_BASE_URL}/${taskId}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to delete task: ${errorData.message || response.statusText}`);
            }
            console.log('Task deleted successfully!');
            await fetchTasks(); // Re-fetch tasks to update the list
        } catch (error) {
            console.error("Error deleting task:", error);
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

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-4 border-b pb-2">Task Manager</h2>

            {/* Conditional Navigation Buttons */}
            <div className="flex justify-end mb-4">
                {currentView === 'list' && (
                    <button
                        onClick={handleAddTaskClick}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                        Add New Task
                    </button>
                )}
                {/* Always show "Back to Task List" when in form view */}
                {currentView === 'form' && (
                    <button
                        onClick={handleBackToListClick}
                        className="px-6 py-3 bg-gray-600 text-white rounded-lg shadow-md hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                        Back to Task List
                    </button>
                )}
            </div>

            {/* Conditional Rendering of TaskForm or TaskList */}
            {currentView === 'form' ? (
                <TaskForm
                    // Pass the task to be edited; it will be null for adding a new task
                    task={editingTask}
                    onSave={handleSaveTask}
                    onCancel={handleBackToListClick}
                    // Pass the fetched currentUserName here
                    loggedInUserName={currentUserName}
                />
            ) : ( // currentView === 'list'
                <TaskList
                    tasks={tasks}
                    onEdit={handleEditTaskClick} // Pass the handler for editing
                    onDelete={handleDeleteTask}
                />
            )}
        </div>
    );
};

export default TaskManager;