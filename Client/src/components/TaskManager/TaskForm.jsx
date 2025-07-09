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
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">
                {isEditMode ? 'Edit Task' : 'Add New Task'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Task Title Input */}
                    <InputField
                        label="Task Title"
                        name="taskTitle"
                        value={formData.taskTitle}
                        onChange={handleChange}
                        placeholder="e.g., Implement User Auth"
                        required={true}
                        disabled={isEditMode} // Disabled in edit mode to prevent changing initial task title
                    />
                    {/* Project Name Input */}
                    <InputField
                        label="Project Name"
                        name="projectName"
                        value={formData.projectName}
                        onChange={handleChange}
                        placeholder="e.g., Project Hansel"
                        required={true}
                        disabled={isEditMode} // Disabled in edit mode
                    />
                    {/* Priority Select */}
                    <InputField
                        label="Priority"
                        name="priority"
                        type="select"
                        value={formData.priority}
                        onChange={handleChange}
                        options={['High', 'Medium', 'Low']}
                        required={true}
                    />
                    {/* Task Status Select */}
                    <InputField
                        label="Task Status"
                        name="taskStatus"
                        type="select"
                        value={formData.taskStatus}
                        onChange={handleChange}
                        options={['To Do', 'In Progress', 'Completed', 'Blocked']}
                        required={true}
                    />
                    {/* Assigned To Input (comma-separated) */}
                    <InputField
                        label="Assigned To (comma-separated)"
                        name="assignedTo"
                        value={formData.assignedTo}
                        onChange={handleChange}
                        placeholder="e.g., Alice, Bob"
                        required={true}
                    />
                    {/* Due Date Input */}
                    <InputField
                        label="Due Date"
                        name="dueDate"
                        type="date"
                        value={formData.dueDate}
                        onChange={handleChange}
                        required={true}
                    />
                    {/* Project Manager Input */}
                    <InputField
                        label="Project Manager"
                        name="projectManagerName"
                        value={formData.projectManagerName}
                        onChange={handleChange}
                        placeholder="e.g., Mary Cassatt"
                        required={true}
                    />
                </div>
                {/* Task Description Textarea */}
                <InputField
                    label="Task Description"
                    name="taskDescription"
                    type="textarea"
                    value={formData.taskDescription}
                    onChange={handleChange}
                    placeholder="Detailed overview of the task..."
                    required={true}
                />

                {/* Created By Field - always disabled, displays initial creator */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField
                        label="Created By"
                        name="createdBy"
                        value={formData.createdBy}
                        onChange={handleChange} // onChange is still passed, but won't do anything due to disabled
                        disabled={true} // This field is read-only
                    />
                </div>

                {/* Form Action Buttons */}
                <div className="flex justify-end space-x-4 mt-6">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 py-3 bg-gray-300 text-gray-800 rounded-lg shadow-md hover:bg-gray-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className={`px-6 py-3 rounded-lg shadow-md hover:opacity-90 transition-colors duration-200 focus:outline-none focus:ring-2 ${
                            isEditMode ? 'bg-blue-600 focus:ring-blue-500' : 'bg-green-600 focus:ring-green-500'
                        } text-white`}
                    >
                        {isEditMode ? 'Update Task' : 'Add Task'}
                    </button>
                </div>
            </form>
        </div>
    );
};

// PropTypes for TaskForm component
TaskForm.propTypes = {
    task: PropTypes.object, // Can be null for new tasks
    onSave: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    loggedInUserName: PropTypes.string.isRequired, // Ensure this prop is passed and is a string
};

export default TaskForm;