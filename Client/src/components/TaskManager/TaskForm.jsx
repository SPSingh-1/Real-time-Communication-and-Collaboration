import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types'; // Import PropTypes for type checking

// Reusable Input Field Component
// This component handles rendering different types of form inputs (text, select, textarea, date, number, checkbox)
// It abstracts away the common styling and structure for each input.
const InputField = ({ label, name, type = 'text', value, onChange, placeholder, options = [], multiple = false, disabled = false, required = false }) => {
    const commonClasses = "mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg";
    const labelClasses = "block text-sm font-medium text-gray-700";

    // Handle array values for 'assignedTo' when converting to string for input 'value'
    const displayValue = Array.isArray(value) ? value.join(', ') : value;

    switch (type) {
        case 'select':
            return (
                <div>
                    <label htmlFor={name} className={labelClasses}>
                        {label} {required && <span className="text-red-500">*</span>}
                    </label>
                    <select
                        id={name}
                        name={name}
                        value={displayValue}
                        onChange={onChange}
                        className={commonClasses}
                        multiple={multiple}
                        disabled={disabled}
                        required={required}
                    >
                        <option value="">{placeholder || `Select a ${label}`}</option>
                        {options.map((option) => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </div>
            );
        case 'textarea':
            return (
                <div>
                    <label htmlFor={name} className={labelClasses}>
                        {label} {required && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                        id={name}
                        name={name}
                        value={displayValue}
                        onChange={onChange}
                        rows="3"
                        className={`${commonClasses} resize-y`}
                        placeholder={placeholder}
                        disabled={disabled}
                        required={required}
                    />
                </div>
            );
        case 'date':
            return (
                <div>
                    <label htmlFor={name} className={labelClasses}>
                        {label} {required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                        type="date"
                        id={name}
                        name={name}
                        // Format date to 'YYYY-MM-DD' for date input type
                        value={displayValue ? new Date(displayValue).toISOString().split('T')[0] : ''}
                        onChange={onChange}
                        className={commonClasses}
                        disabled={disabled}
                        required={required}
                    />
                </div>
            );
        case 'number':
            return (
                <div>
                    <label htmlFor={name} className={labelClasses}>
                        {label} {required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                        type="number"
                        id={name}
                        name={name}
                        value={displayValue}
                        onChange={onChange}
                        className={commonClasses}
                        placeholder={placeholder}
                        disabled={disabled}
                        required={required}
                    />
                </div>
            );
        case 'checkbox':
            return (
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id={name}
                        name={name}
                        checked={value}
                        onChange={onChange}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        disabled={disabled}
                    />
                    <label htmlFor={name} className="ml-2 block text-sm text-gray-900">{label}</label>
                </div>
            );
        default:
            return (
                <div>
                    <label htmlFor={name} className={labelClasses}>
                        {label} {required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                        type={type}
                        id={name}
                        name={name}
                        value={displayValue}
                        onChange={onChange}
                        className={commonClasses}
                        placeholder={placeholder}
                        disabled={disabled}
                        required={required}
                    />
                </div>
            );
    }
};

// PropTypes for InputField component
InputField.propTypes = {
    label: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    type: PropTypes.string,
    value: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
        PropTypes.bool,
        PropTypes.arrayOf(PropTypes.string)
    ]),
    onChange: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
    options: PropTypes.arrayOf(PropTypes.string),
    multiple: PropTypes.bool,
    disabled: PropTypes.bool,
    required: PropTypes.bool,
};


const TaskForm = ({ task, onSave, onCancel, loggedInUserName }) => { // Changed 'userId' to 'loggedInUserName'
    // Determine if the form is in edit mode (true if 'task' prop is provided)
    const isEditMode = !!task;

    // State to manage form data
    const [formData, setFormData] = useState(() => {
        if (isEditMode) {
            // If in edit mode, populate form with existing task data
            return {
                ...task,
                // Ensure assignedTo is an array, splitting string if necessary
                assignedTo: Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? task.assignedTo.split(',').map(s => s.trim()).filter(Boolean) : []),
                // Format dueDate for HTML date input
                dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
            };
        } else {
            // If adding a new task, initialize with default values
            return {
                taskTitle: '',
                projectName: '',
                priority: 'Medium', // Default priority
                taskStatus: 'To Do', // Default status
                assignedTo: [],
                dueDate: '',
                taskDescription: '',
                projectManagerName: '',
                // Set 'createdBy' to the loggedInUserName for new tasks
                createdBy: loggedInUserName || 'Unknown User',
            };
        }
    });

    // Effect to update form data when 'task' prop changes (e.g., when switching from add to edit mode)
    // or when 'loggedInUserName' changes (relevant for new task creation)
    useEffect(() => {
        if (isEditMode && task) {
            setFormData({
                ...task,
                assignedTo: Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? task.assignedTo.split(',').map(s => s.trim()).filter(Boolean) : []),
                dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
            });
        } else if (!isEditMode && !task) {
            // If navigating from edit to add, or first render in add mode, reset form
            setFormData({
                taskTitle: '',
                projectName: '',
                priority: 'Medium',
                taskStatus: 'To Do',
                assignedTo: [],
                dueDate: '',
                taskDescription: '',
                projectManagerName: '',
                // Ensure 'createdBy' is correctly set for a new task when the view changes
                createdBy: loggedInUserName || 'Unknown User',
            });
        }
    }, [task, isEditMode, loggedInUserName]); // Dependency array: re-run if task or loggedInUserName changes

    // Handle input changes
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setFormData(prev => {
            if (name === 'assignedTo') {
                // Split comma-separated string into an array for 'assignedTo'
                return {
                    ...prev,
                    [name]: value.split(',').map(s => s.trim()).filter(Boolean),
                };
            } else if (type === 'number') {
                // Convert to number for number inputs
                return {
                    ...prev,
                    [name]: parseFloat(value) || 0,
                };
            } else if (type === 'checkbox') {
                // Handle checkbox checked state
                return {
                    ...prev,
                    [name]: checked,
                };
            } else {
                // For all other input types
                return {
                    ...prev,
                    [name]: value,
                };
            }
        });
    };

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault(); // Prevent default form submission behavior

        // Basic client-side validation for required fields
        if (!formData.taskTitle || !formData.projectName || !formData.priority ||
            !formData.taskStatus || !formData.assignedTo.length || !formData.dueDate ||
            !formData.taskDescription || !formData.projectManagerName) {
            console.error('Please fill in all required fields (marked with *).');
            alert('Please fill in all required fields (marked with *).'); // Simple alert for missing fields
            return;
        }

        // Call the onSave prop with the current form data
        // The parent component (TaskManager) will determine if it's an add or update based on formData._id
        onSave(formData);
    };

  return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
            </div>

            {/* Floating particles */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(15)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-white/30 rounded-full animate-float"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${3 + Math.random() * 4}s`
                        }}
                    ></div>
                ))}
            </div>

            <div className="max-w-5xl mx-auto relative z-10">
                <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-8 transform hover:scale-[1.01] transition-all duration-700">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-3xl blur-xl -z-10"></div>
                    
                    {/* Header with window controls */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-red-500 rounded-full shadow-lg shadow-red-500/50"></div>
                            <div className="w-3 h-3 bg-yellow-500 rounded-full shadow-lg shadow-yellow-500/50"></div>
                            <div className="w-3 h-3 bg-green-500 rounded-full shadow-lg shadow-green-500/50"></div>
                        </div>
                        <h3 className="text-3xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
                            {isEditMode ? '✏️ Edit Task' : '➕ Add New Task'}
                        </h3>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <InputField
                                label="📝 Task Title"
                                name="taskTitle"
                                value={formData.taskTitle}
                                onChange={handleChange}
                                placeholder="e.g., Implement User Auth"
                                required={true}
                                disabled={isEditMode}
                            />
                            <InputField
                                label="🚀 Project Name"
                                name="projectName"
                                value={formData.projectName}
                                onChange={handleChange}
                                placeholder="e.g., Project Hansel"
                                required={true}
                                disabled={isEditMode}
                            />
                            <InputField
                                label="⚡ Priority"
                                name="priority"
                                type="select"
                                value={formData.priority}
                                onChange={handleChange}
                                options={['High', 'Medium', 'Low']}
                                required={true}
                            />
                            <InputField
                                label="📊 Task Status"
                                name="taskStatus"
                                type="select"
                                value={formData.taskStatus}
                                onChange={handleChange}
                                options={['To Do', 'In Progress', 'Completed', 'Blocked']}
                                required={true}
                            />
                            <InputField
                                label="👥 Assigned To (comma-separated)"
                                name="assignedTo"
                                value={formData.assignedTo}
                                onChange={handleChange}
                                placeholder="e.g., Alice, Bob"
                                required={true}
                            />
                            <InputField
                                label="📅 Due Date"
                                name="dueDate"
                                type="date"
                                value={formData.dueDate}
                                onChange={handleChange}
                                required={true}
                            />
                            <InputField
                                label="👨‍💼 Project Manager"
                                name="projectManagerName"
                                value={formData.projectManagerName}
                                onChange={handleChange}
                                placeholder="e.g., Mary Cassatt"
                                required={true}
                            />
                            <InputField
                                label="👤 Created By"
                                name="createdBy"
                                value={formData.createdBy}
                                onChange={handleChange}
                                disabled={true}
                            />
                        </div>

                        <InputField
                            label="📄 Task Description"
                            name="taskDescription"
                            type="textarea"
                            value={formData.taskDescription}
                            onChange={handleChange}
                            placeholder="Detailed overview of the task..."
                            required={true}
                        />

                        <div className="flex justify-end space-x-6 mt-12">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="px-8 py-4 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-bold rounded-2xl
                                         hover:from-gray-600 hover:to-gray-700 transform hover:scale-105 hover:rotate-1
                                         transition-all duration-300 shadow-2xl hover:shadow-gray-500/25
                                         relative overflow-hidden group"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <span className="relative z-10">❌ Cancel</span>
                            </button>
                            <button
                                type="submit"
                                className={`px-8 py-4 font-bold rounded-2xl transform hover:scale-105 hover:rotate-1
                                         transition-all duration-300 shadow-2xl relative overflow-hidden group
                                         ${isEditMode ? 
                                           'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 hover:shadow-blue-500/25' : 
                                           'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 hover:shadow-green-500/25'
                                         } text-white`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <span className="relative z-10">
                                    {isEditMode ? '💫 Update Task' : '✨ Add Task'}
                                </span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(180deg); }
                }
                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

// PropTypes for TaskForm component
TaskForm.propTypes = {
    task: PropTypes.object,
    onSave: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    loggedInUserName: PropTypes.string.isRequired,
};

export default TaskForm;