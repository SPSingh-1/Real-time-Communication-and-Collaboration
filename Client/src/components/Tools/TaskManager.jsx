import React, { useState, useEffect, useCallback } from 'react';
// These import paths are based on your specific request:
// Assuming TaskManager.jsx is in 'src/MyComponents/'
// and TaskForm.jsx & TaskList.jsx are in 'src/TaskManager/'
import TaskForm from '../TaskManager/TaskForm';
import TaskList from '../TaskManager/TaskList';

// Base URL for your Node.js MongoDB backend
const MONGODB_API_BASE_URL = 'http://localhost:3001/api/tasks'; // Ensure this matches your backend server.js port and prefix

const TaskManager = () => {
  const [tasks, setTasks] = useState([]);
  // currentView can be 'list' (TaskList) or 'form' (TaskForm)
  const [currentView, setCurrentView] = useState('list');
  const [editingTask, setEditingTask] = useState(null); // Null for new task, object for editing

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
      // In a real app, you might show an error message to the user
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
        // Update existing task (requires PUT route in backend)
        response = await fetch(`${MONGODB_API_BASE_URL}/${taskData._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData),
        });
      } else {
        // Add new task (uses POST route in backend)
        response = await fetch(MONGODB_API_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to save task: ${errorData.message || JSON.stringify(errorData) || response.statusText}`);
      }

      console.log('Task saved successfully!');
      await fetchTasks(); // Re-fetch tasks to update the list
      setCurrentView('list'); // Go back to the task list view
      setEditingTask(null); // Clear editing state
    } catch (error) {
      console.error("Error saving task:", error);
      // In a real app, show a user-friendly error message
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
    setEditingTask(task); // Set the task object to be edited
    setCurrentView('form');
  };

  const handleBackToListClick = () => {
    setCurrentView('list');
    setEditingTask(null); // Clear editing state
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
          task={editingTask} // Pass null for new task, or the task object for editing
          onSave={handleSaveTask}
          onCancel={handleBackToListClick}
          userId="sampleUserId123" // Replace with actual user ID from your auth system
        />
      ) : ( // currentView === 'list'
        <TaskList
          tasks={tasks}
          onEdit={handleEditTaskClick}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
};

export default TaskManager;
