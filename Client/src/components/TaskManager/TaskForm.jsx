import React, { useState, useEffect } from 'react';

// Reusable Input Field Component
const InputField = ({ label, name, type = 'text', value, onChange, placeholder, options = [], multiple = false, disabled = false, required = false }) => {
  const commonClasses = "mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg";
  const labelClasses = "block text-sm font-medium text-gray-700";

  // If value is an array, join it for display in text inputs
  const displayValue = Array.isArray(value) ? value.join(', ') : value;

  if (type === 'select') {
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
  } else if (type === 'textarea') {
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
  } else if (type === 'date') {
    return (
      <div>
        <label htmlFor={name} className={labelClasses}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
          type="date"
          id={name}
          name={name}
          value={displayValue ? new Date(displayValue).toISOString().split('T')[0] : ''}
          onChange={onChange}
          className={commonClasses}
          disabled={disabled}
          required={required}
        />
      </div>
    );
  } else if (type === 'number') {
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
  } else if (type === 'checkbox') {
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
  } else {
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

const TaskForm = ({ onSave, onCancel, userId }) => {
  const [formData, setFormData] = useState({
    taskTitle: '',
    projectName: '',
    priority: 'Medium',
    taskStatus: 'To Do',
    assignedTo: [],
    dueDate: '',
    taskDescription: '',
    projectManagerName: '',
    createdBy: userId || 'Unknown User', // Auto-filled
  });

  // Reset form when component mounts or userId changes (for new task)
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      taskTitle: '',
      projectName: '',
      priority: 'Medium',
      taskStatus: 'To Do',
      assignedTo: [],
      dueDate: '',
      taskDescription: '',
      projectManagerName: '',
      createdBy: userId || 'Unknown User',
    }));
  }, [userId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'assignedTo') {
      setFormData(prev => ({
        ...prev,
        [name]: value.split(',').map(s => s.trim()).filter(Boolean),
      }));
    } else if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0,
      }));
    } else if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked,
      }));
    }
    else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Basic validation for all 8 required fields
    if (!formData.taskTitle || !formData.projectName || !formData.priority ||
        !formData.taskStatus || !formData.assignedTo.length || !formData.dueDate ||
        !formData.taskDescription || !formData.projectManagerName) {
      console.error('Please fill in all required fields (marked with *).');
      // In a real app, you'd show a user-friendly message in the UI, e.g., a modal or toast
      return;
    }
    onSave(formData);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">
        Add New Task
      </h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main 8 Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Task Title" name="taskTitle" value={formData.taskTitle} onChange={handleChange} placeholder="e.g., Implement User Auth" required={true} />
          <InputField label="Project Name" name="projectName" value={formData.projectName} onChange={handleChange} placeholder="e.g., Project Hansel" required={true} />
          <InputField label="Priority" name="priority" type="select" value={formData.priority} onChange={handleChange}
            options={['High', 'Medium', 'Low']} required={true} />
          <InputField label="Task Status" name="taskStatus" type="select" value={formData.taskStatus} onChange={handleChange}
            options={['To Do', 'In Progress', 'Completed', 'Blocked']} required={true} />
          <InputField label="Assigned To (comma-separated)" name="assignedTo" value={formData.assignedTo} onChange={handleChange} placeholder="e.g., Alice, Bob" required={true} />
          <InputField label="Due Date" name="dueDate" type="date" value={formData.dueDate} onChange={handleChange} required={true} />
          <InputField label="Project Manager" name="projectManagerName" value={formData.projectManagerName} onChange={handleChange} placeholder="e.g., Mary Cassatt" required={true} />
        </div>
        <InputField label="Task Description" name="taskDescription" type="textarea" value={formData.taskDescription} onChange={handleChange} placeholder="Detailed overview of the task..." required={true} />

        {/* Auto-filled field */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Created By" name="createdBy" value={formData.createdBy} onChange={handleChange} disabled={true} />
        </div>

        <div className="flex justify-end space-x-4 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 bg-gray-300 text-gray-800 rounded-lg shadow-md hover:bg-gray-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Back to Task List
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add Task
          </button>
        </div>
      </form>
    </div>
  );
};

export default TaskForm;
