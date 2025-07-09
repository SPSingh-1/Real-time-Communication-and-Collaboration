// src/TaskManager/TaskList.jsx
import React from 'react';
import Priority from '../Badge/Priority'; // Assuming correct path
import Status from '../Badge/Status';     // Assuming correct path

const TaskList = ({ tasks, onEdit, onDelete }) => {
    if (!tasks || tasks.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-lg p-6 text-center text-gray-500">
                No tasks found. Click "Add New Task" to create one!
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider rounded-tl-lg">
                            Task Title
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Project Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Priority
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Assigned To
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Due Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Project Manager
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider rounded-tr-lg">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {tasks.map((task) => (
                        <tr key={task._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {task.taskTitle}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-sm text-gray-500">
                                {task.projectName}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm`}>
                                <Priority priori={task.priority}/>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full`}>
                                    <Status status={task.taskStatus}/>
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {task.assignedTo && task.assignedTo.length > 0 ? task.assignedTo.join(', ') : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {task.projectManagerName || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                    onClick={() => onEdit(task)} // Pass the task to be edited
                                    className="text-blue-600 hover:text-blue-900 mr-3 transition-colors duration-200"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => onDelete(task._id)}
                                    className="text-red-600 hover:text-red-900 transition-colors duration-200"
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default TaskList;