import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// Reusable Input Field Component with clean slate styling
const InputField = ({ label, name, type = 'text', value, onChange, placeholder, options = [], multiple = false, disabled = false, required = false }) => {
    const commonClasses = "mt-1.5 block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed";
    const labelClasses = "block text-xs font-semibold text-slate-300";

    const displayValue = Array.isArray(value) ? value.join(', ') : value;

    switch (type) {
        case 'select':
            return (
                <div>
                    <label htmlFor={name} className={labelClasses}>
                        {label} {required && <span className="text-red-400">*</span>}
                    </label>
                    <select
                        id={name}
                        name={name}
                        value={displayValue}
                        onChange={onChange}
                        className={`${commonClasses} cursor-pointer`}
                        multiple={multiple}
                        disabled={disabled}
                        required={required}
                    >
                        <option value="" className="bg-slate-900 text-white">{placeholder || `Select a ${label}`}</option>
                        {options.map((option) => (
                            <option key={option} value={option} className="bg-slate-900 text-white">{option}</option>
                        ))}
                    </select>
                </div>
            );
        case 'textarea':
            return (
                <div>
                    <label htmlFor={name} className={labelClasses}>
                        {label} {required && <span className="text-red-400">*</span>}
                    </label>
                    <textarea
                        id={name}
                        name={name}
                        value={displayValue}
                        onChange={onChange}
                        rows="3"
                        className={`${commonClasses} resize-none`}
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
                        {label} {required && <span className="text-red-400">*</span>}
                    </label>
                    <input
                        type="date"
                        id={name}
                        name={name}
                        value={displayValue ? new Date(displayValue).toISOString().split('T')[0] : ''}
                        onChange={onChange}
                        min={new Date().toISOString().split('T')[0]}
                        className={`${commonClasses} [color-scheme:dark] cursor-pointer`}
                        disabled={disabled}
                        required={required}
                    />
                </div>
            );
        case 'number':
            return (
                <div>
                    <label htmlFor={name} className={labelClasses}>
                        {label} {required && <span className="text-red-400">*</span>}
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
        default:
            return (
                <div>
                    <label htmlFor={name} className={labelClasses}>
                        {label} {required && <span className="text-red-400">*</span>}
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

const TaskForm = ({ task, onSave, onCancel, currentUser }) => {
    const isEditMode = !!task;

    const [formData, setFormData] = useState({
        taskTitle: '',
        projectName: '',
        priority: 'Medium',
        taskStatus: 'To Do',
        assignedTo: '',
        dueDate: '',
        projectManagerName: '',
        taskDescription: '',
        createdBy: currentUser.name,
        role: currentUser.role,
        teamId: currentUser.teamId || null,
        globalId: currentUser.globalId || null
    });

    useEffect(() => {
        if (task) {
            setFormData({
                ...task,
                assignedTo: Array.isArray(task.assignedTo) ? task.assignedTo.join(', ') : task.assignedTo || '',
                dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
                createdBy: task.createdBy || currentUser.name,
                role: task.role || currentUser.role,
                teamId: task.teamId || currentUser.teamId || null,
                globalId: task.globalId || currentUser.globalId || null
            });
        } else {
            setFormData({
                taskTitle: '',
                projectName: '',
                priority: 'Medium',
                taskStatus: 'To Do',
                assignedTo: '',
                dueDate: '',
                projectManagerName: '',
                taskDescription: '',
                createdBy: currentUser.name,
                role: currentUser.role,
                teamId: currentUser.teamId || null,
                globalId: currentUser.globalId || null
            });
        }
    }, [task, currentUser]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (formData.dueDate) {
            const todayStr = new Date().toISOString().split('T')[0];
            const dueStr = new Date(formData.dueDate).toISOString().split('T')[0];
            if (dueStr < todayStr) {
                alert('Due date cannot be in the past. Please select today or a future date.');
                return;
            }
        }
        
        const payload = {
            ...formData,
            assignedTo: formData.assignedTo.split(',').map(item => item.trim()).filter(Boolean),
            dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
            createdBy: currentUser.name,
            role: currentUser.role,
            teamId: currentUser.teamId || null,
            globalId: currentUser.globalId || null
        };

        if (isEditMode && task._id) {
            payload._id = task._id;
        }

        onSave(payload);
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6">
            <div className="mb-6 pb-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                    <h3 className="text-base sm:text-lg font-bold text-white">
                        {isEditMode ? 'Edit Task' : 'Add New Task'}
                    </h3>
                    <p className="text-xs text-slate-400">Fill in task details and assignments</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField
                        label="Task Title"
                        name="taskTitle"
                        value={formData.taskTitle}
                        onChange={handleChange}
                        placeholder="e.g., Implement User Auth"
                        required={true}
                    />
                    <InputField
                        label="Project Name"
                        name="projectName"
                        value={formData.projectName}
                        onChange={handleChange}
                        placeholder="e.g., Project Hansel"
                        required={true}
                    />
                    <InputField
                        label="Priority"
                        name="priority"
                        type="select"
                        value={formData.priority}
                        onChange={handleChange}
                        options={['High', 'Medium', 'Low']}
                        required={true}
                    />
                    <InputField
                        label="Task Status"
                        name="taskStatus"
                        type="select"
                        value={formData.taskStatus}
                        onChange={handleChange}
                        options={['To Do', 'In Progress', 'Completed', 'Blocked']}
                        required={true}
                    />
                    <InputField
                        label="Assigned To (comma-separated)"
                        name="assignedTo"
                        value={formData.assignedTo}
                        onChange={handleChange}
                        placeholder={currentUser.role === 'single' ? "e.g., Just yourself" : "e.g., Alice, Bob"}
                        required={true}
                    />
                    <InputField
                        label="Due Date"
                        name="dueDate"
                        type="date"
                        value={formData.dueDate}
                        onChange={handleChange}
                        required={true}
                    />
                    <InputField
                        label="Project Manager"
                        name="projectManagerName"
                        value={formData.projectManagerName}
                        onChange={handleChange}
                        placeholder="e.g., Mary Cassatt"
                        required={true}
                    />
                    <InputField
                        label="Created By"
                        name="createdBy"
                        value={currentUser.name}
                        onChange={() => {}}
                        disabled={true}
                    />
                </div>

                <InputField
                    label="Task Description"
                    name="taskDescription"
                    type="textarea"
                    value={formData.taskDescription}
                    onChange={handleChange}
                    placeholder="Detailed overview of the task..."
                    required={true}
                />

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg text-xs sm:text-sm transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs sm:text-sm transition-colors shadow-sm"
                    >
                        {isEditMode ? 'Update Task' : 'Create Task'}
                    </button>
                </div>
            </form>
        </div>
    );
};

TaskForm.propTypes = {
    task: PropTypes.object,
    onSave: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    currentUser: PropTypes.shape({
        name: PropTypes.string.isRequired,
        id: PropTypes.string,
        role: PropTypes.string.isRequired,
        teamId: PropTypes.string,
        globalId: PropTypes.string
    }).isRequired,
};

export default TaskForm;