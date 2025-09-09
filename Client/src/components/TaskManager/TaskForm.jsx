import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types'; // Import PropTypes for type checking

// Reusable Input Field Component with 3D styling
const InputField = ({ label, name, type = 'text', value, onChange, placeholder, options = [], multiple = false, disabled = false, required = false }) => {
    const commonClasses = "mt-2 block w-full p-3 lg:p-4 border-2 border-white/20 rounded-xl lg:rounded-2xl shadow-2xl focus:ring-4 focus:ring-cyan-500/50 focus:border-cyan-400 text-sm lg:text-base bg-white/10 backdrop-blur-md text-white placeholder-white/60 transform-gpu transition-all duration-500 hover:scale-102 lg:hover:scale-105 hover:shadow-cyan-500/25 focus:scale-102 lg:focus:scale-105";
    const labelClasses = "block text-sm font-bold text-white/90 mb-2 transform-gpu transition-all duration-300 hover:text-cyan-400";

    // Handle array values for 'assignedTo' when converting to string for input 'value'
    const displayValue = Array.isArray(value) ? value.join(', ') : value;

    switch (type) {
        case 'select':
            return (
                <div className="transform-gpu transition-all duration-700 hover:translate-y-[-1px] lg:hover:translate-y-[-2px]">
                    <label htmlFor={name} className={labelClasses}>
                        {label} {required && <span className="text-red-400 animate-pulse">*</span>}
                    </label>
                    <div className="relative group">
                        <select
                            id={name}
                            name={name}
                            value={displayValue}
                            onChange={onChange}
                            className={`${commonClasses} cursor-pointer appearance-none`}
                            multiple={multiple}
                            disabled={disabled}
                            required={required}
                        >
                            <option value="" className="bg-gray-800 text-white">{placeholder || `Select a ${label}`}</option>
                            {options.map((option) => (
                                <option key={option} value={option} className="bg-gray-800 text-white">{option}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-3 lg:px-4 pointer-events-none">
                            <div className="w-3 h-3 lg:w-4 lg:h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                    </div>
                </div>
            );
        case 'textarea':
            return (
                <div className="transform-gpu transition-all duration-700 hover:translate-y-[-1px] lg:hover:translate-y-[-2px]">
                    <label htmlFor={name} className={labelClasses}>
                        {label} {required && <span className="text-red-400 animate-pulse">*</span>}
                    </label>
                    <div className="relative group">
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
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl lg:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                    </div>
                </div>
            );
        case 'date':
            return (
                <div className="transform-gpu transition-all duration-700 hover:translate-y-[-1px] lg:hover:translate-y-[-2px]">
                    <label htmlFor={name} className={labelClasses}>
                        {label} {required && <span className="text-red-400 animate-pulse">*</span>}
                    </label>
                    <div className="relative group">
                        <input
                            type="date"
                            id={name}
                            name={name}
                            value={displayValue ? new Date(displayValue).toISOString().split('T')[0] : ''}
                            onChange={onChange}
                            className={`${commonClasses} [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70`}
                            disabled={disabled}
                            required={required}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl lg:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                    </div>
                </div>
            );
        case 'number':
            return (
                <div className="transform-gpu transition-all duration-700 hover:translate-y-[-1px] lg:hover:translate-y-[-2px]">
                    <label htmlFor={name} className={labelClasses}>
                        {label} {required && <span className="text-red-400 animate-pulse">*</span>}
                    </label>
                    <div className="relative group">
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
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl lg:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                    </div>
                </div>
            );
        case 'checkbox':
            return (
                <div className="flex items-center transform-gpu transition-all duration-700 hover:translate-y-[-1px] lg:hover:translate-y-[-2px] hover:scale-105">
                    <div className="relative">
                        <input
                            type="checkbox"
                            id={name}
                            name={name}
                            checked={value}
                            onChange={onChange}
                            className="h-5 w-5 lg:h-6 lg:w-6 text-cyan-600 border-2 border-white/30 rounded-lg focus:ring-cyan-500 focus:ring-4 bg-white/10 backdrop-blur-md transform-gpu transition-all duration-300 hover:scale-110"
                            disabled={disabled}
                        />
                        <div className="absolute inset-0 bg-cyan-500/20 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    </div>
                    <label htmlFor={name} className="ml-3 block text-sm font-medium text-white/90 transition-colors duration-300 hover:text-cyan-400">{label}</label>
                </div>
            );
        default:
            return (
                <div className="transform-gpu transition-all duration-700 hover:translate-y-[-1px] lg:hover:translate-y-[-2px]">
                    <label htmlFor={name} className={labelClasses}>
                        {label} {required && <span className="text-red-400 animate-pulse">*</span>}
                    </label>
                    <div className="relative group">
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
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl lg:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                    </div>
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

const TaskForm = ({ task, onSave, onCancel, currentUser }) => {
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
                // The backend will handle setting createdBy, teamId, globalId, and scope based on the authenticated user
            };
        }
    });

    // Effect to update form data when 'task' prop changes or when 'currentUser' changes
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
            });
        }
    }, [task, isEditMode, currentUser]); // Dependency array: re-run if task or currentUser changes

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
        // The backend will determine the correct scope, teamId, globalId based on the authenticated user
        onSave(formData);
    };

    // Get role-specific styling and information
    const getRoleInfo = () => {
        switch (currentUser.role) {
            case 'single':
                return { 
                    icon: '👤', 
                    label: 'Personal', 
                    color: 'from-blue-500 to-cyan-500',
                    description: 'This task will be created as a personal task visible only to you.'
                };
            case 'team':
                return { 
                    icon: '👥', 
                    label: 'Team', 
                    color: 'from-emerald-500 to-teal-500',
                    description: `This task will be created for your team and visible to all team members.`
                };
            case 'global':
                return { 
                    icon: '🌍', 
                    label: 'Global', 
                    color: 'from-purple-500 to-pink-500',
                    description: 'This task will be created as a global task visible to the entire organization.'
                };
            default:
                return { 
                    icon: '👤', 
                    label: 'Personal', 
                    color: 'from-blue-500 to-cyan-500',
                    description: 'This task will be created as a personal task.'
                };
        }
    };

    const roleInfo = getRoleInfo();

    return (
        <div className="w-full relative overflow-hidden">
            {/* Enhanced 3D animated background elements - mobile optimized */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Geometric shapes with responsive sizing */}
                <div className="absolute top-5 left-2 sm:left-5 lg:left-20 w-16 h-16 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 rounded-2xl lg:rounded-3xl blur-xl animate-float-3d transform-gpu"></div>
                <div className="absolute bottom-5 right-2 sm:right-5 lg:right-20 w-20 h-20 sm:w-32 sm:h-32 lg:w-40 lg:h-40 bg-gradient-to-r from-purple-400/20 to-pink-500/20 rounded-full blur-2xl animate-spin-3d transform-gpu"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14 sm:w-20 sm:h-20 lg:w-28 lg:h-28 bg-gradient-to-r from-emerald-400/20 to-teal-500/20 rounded-xl lg:rounded-2xl blur-xl animate-bounce-3d transform-gpu"></div>
                
                {/* Orbital rings - hidden on small mobile */}
                <div className="hidden sm:block absolute top-5 right-5 lg:top-10 lg:right-10 w-32 h-32 lg:w-64 lg:h-64 border-2 border-white/10 rounded-full animate-spin-slow transform-gpu"></div>
                <div className="hidden sm:block absolute bottom-5 left-5 lg:bottom-10 lg:left-10 w-24 h-24 lg:w-48 lg:h-48 border-2 border-cyan-400/20 rounded-full animate-spin-reverse transform-gpu"></div>
            </div>

            {/* Enhanced floating particles with responsive count */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(window.innerWidth < 768 ? 8 : 15)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 sm:w-2 sm:h-2 bg-white/50 rounded-full animate-particle-3d transform-gpu shadow-lg sm:shadow-2xl shadow-white/20"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${4 + Math.random() * 6}s`
                        }}
                    ></div>
                ))}
            </div>

            <div className="w-full relative z-10">
                {/* Main 3D container with enhanced effects - responsive */}
                <div 
                    className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl rounded-xl lg:rounded-3xl border border-white/30 shadow-2xl p-4 sm:p-6 lg:p-8 transform-gpu transition-all duration-1000 hover:scale-101 lg:hover:scale-[1.01] hover:rotate-x-1"
                    style={{ 
                        transformStyle: 'preserve-3d',
                        perspective: '1200px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 60px rgba(34, 211, 238, 0.15)'
                    }}
                >
                    {/* Enhanced glowing border */}
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/30 via-purple-500/30 to-pink-500/30 rounded-xl lg:rounded-3xl blur-2xl animate-pulse-rainbow -z-10"></div>
                    
                    {/* 3D Header with window controls and role info - responsive */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 lg:mb-8 gap-4 transform-gpu transition-all duration-700 hover:translate-z-2">
                        <div className="flex items-center space-x-3 lg:space-x-4 justify-center sm:justify-start">
                            {/* Animated window controls - smaller on mobile */}
                            <div className="w-3 h-3 lg:w-4 lg:h-4 bg-red-500 rounded-full shadow-lg shadow-red-500/50 animate-pulse transform-gpu hover:scale-125 transition-transform duration-300"></div>
                            <div className="w-3 h-3 lg:w-4 lg:h-4 bg-yellow-500 rounded-full shadow-lg shadow-yellow-500/50 animate-pulse delay-200 transform-gpu hover:scale-125 transition-transform duration-300"></div>
                            <div className="w-3 h-3 lg:w-4 lg:h-4 bg-green-500 rounded-full shadow-lg shadow-green-500/50 animate-pulse delay-400 transform-gpu hover:scale-125 transition-transform duration-300"></div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 text-transparent bg-clip-text animate-text-glow">
                                {isEditMode ? '✏️ Edit Task' : '➕ Add New Task'}
                            </h3>
                            {/* Role indicator - responsive */}
                            <div className={`mt-2 inline-flex items-center px-2 py-1 lg:px-3 lg:py-1 rounded-full bg-gradient-to-r ${roleInfo.color} text-white text-xs sm:text-sm font-medium shadow-lg`}>
                                <span className="mr-1">{roleInfo.icon}</span>
                                <span>{roleInfo.label} Mode</span>
                            </div>
                        </div>
                    </div>

                    {/* Role Information Panel - responsive */}
                    {!isEditMode && (
                        <div className="mb-4 lg:mb-8 p-3 lg:p-4 bg-gradient-to-r from-white/10 to-white/5 rounded-xl lg:rounded-2xl border border-white/20 transform-gpu transition-all duration-500 hover:scale-105">
                            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                                <div className="text-xl lg:text-2xl text-center sm:text-left">{roleInfo.icon}</div>
                                <div className="text-center sm:text-left">
                                    <div className="text-white/90 font-medium text-sm lg:text-base">Creating {roleInfo.label} Task</div>
                                    <div className="text-white/70 text-xs lg:text-sm">{roleInfo.description}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Enhanced 3D form - responsive grid */}
                    <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
                            <InputField
                                label="🎯 Task Title"
                                name="taskTitle"
                                value={formData.taskTitle}
                                onChange={handleChange}
                                placeholder="e.g., Implement User Auth"
                                required={true}
                            />
                            <InputField
                                label="🚀 Project Name"
                                name="projectName"
                                value={formData.projectName}
                                onChange={handleChange}
                                placeholder="e.g., Project Hansel"
                                required={true}
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
                                placeholder={currentUser.role === 'single' ? "e.g., Just yourself" : "e.g., Alice, Bob"}
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
                            {/* Show user info field for reference */}
                            <InputField
                                label="👤 Created By"
                                name="createdBy"
                                value={currentUser.name}
                                onChange={() => {}} // No-op since this is read-only
                                disabled={true}
                            />
                        </div>

                        <InputField
                            label="📝 Task Description"
                            name="taskDescription"
                            type="textarea"
                            value={formData.taskDescription}
                            onChange={handleChange}
                            placeholder="Detailed overview of the task..."
                            required={true}
                        />

                        {/* Role-based scope information - responsive */}
                        {!isEditMode && (
                            <div className="p-3 lg:p-4 bg-gradient-to-r from-gray-800/30 to-gray-900/30 rounded-xl lg:rounded-2xl border border-white/10">
                                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 text-white/80">
                                    <span className="text-base lg:text-lg text-center sm:text-left">ℹ️</span>
                                    <div className="text-center sm:text-left">
                                        <div className="font-medium text-sm lg:text-base">Task Scope: {roleInfo.label}</div>
                                        <div className="text-xs lg:text-sm text-white/60">
                                            {currentUser.role === 'single' && 'Only you will be able to see and edit this task.'}
                                            {currentUser.role === 'team' && `All members of your team will be able to see and edit this task.`}
                                            {currentUser.role === 'global' && 'All users in your organization will be able to see and edit this task.'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Enhanced 3D action buttons - responsive layout */}
                        <div className="flex flex-col sm:flex-row justify-end space-y-4 sm:space-y-0 sm:space-x-4 lg:space-x-8 mt-8 lg:mt-12">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="group relative w-full sm:w-auto px-6 py-3 lg:px-10 lg:py-5 bg-gradient-to-r from-gray-600 to-gray-700 text-white font-bold rounded-2xl lg:rounded-3xl
                                         shadow-2xl hover:shadow-gray-500/50 transform-gpu transition-all duration-500 
                                         hover:scale-105 lg:hover:scale-110 hover:rotate-y-6 focus:outline-none focus:ring-4 focus:ring-gray-500/50
                                         overflow-hidden"
                                style={{ transformStyle: 'preserve-3d' }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-gray-700 to-gray-800 rounded-2xl lg:rounded-3xl transform translate-z-[-6px] group-hover:translate-z-[-12px] transition-transform duration-500"></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl lg:rounded-3xl"></div>
                                <div className="relative z-10 flex items-center justify-center space-x-2">
                                    <span className="text-lg lg:text-2xl animate-bounce">❌</span>
                                    <span className="text-sm lg:text-base">Cancel</span>
                                </div>
                            </button>
                            <button
                                type="submit"
                                className={`group relative w-full sm:w-auto px-6 py-3 lg:px-10 lg:py-5 font-bold rounded-2xl lg:rounded-3xl transform-gpu transition-all duration-500 
                                         hover:scale-105 lg:hover:scale-110 hover:rotate-y-6 shadow-2xl overflow-hidden focus:outline-none focus:ring-4
                                         ${isEditMode ? 
                                           'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-blue-500/50 focus:ring-blue-500/50' : 
                                           `bg-gradient-to-r ${roleInfo.color} hover:shadow-emerald-500/50 focus:ring-emerald-500/50`
                                         } text-white`}
                                style={{ transformStyle: 'preserve-3d' }}
                            >
                                <div className={`absolute inset-0 rounded-2xl lg:rounded-3xl transform translate-z-[-6px] group-hover:translate-z-[-12px] transition-transform duration-500
                                    ${isEditMode ? 'bg-gradient-to-r from-blue-700 to-indigo-700' : `bg-gradient-to-r ${roleInfo.color.replace('500', '600')}`}`}></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl lg:rounded-3xl"></div>
                                <div className="relative z-10 flex items-center justify-center space-x-2">
                                    <span className="text-lg lg:text-2xl animate-pulse">
                                        {isEditMode ? '💫' : roleInfo.icon}
                                    </span>
                                    <span className="text-sm lg:text-base">
                                        {isEditMode ? 'Update Task' : `Add ${roleInfo.label} Task`}
                                    </span>
                                </div>
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <style>{`
                @keyframes float-3d {
                    0%, 100% { 
                        transform: translateY(0px) translateX(0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg); 
                    }
                    33% { 
                        transform: translateY(-20px) translateX(15px) rotateX(120deg) rotateY(120deg) rotateZ(120deg); 
                    }
                    66% { 
                        transform: translateY(10px) translateX(-15px) rotateX(240deg) rotateY(240deg) rotateZ(240deg); 
                    }
                }
                @keyframes spin-3d {
                    from { 
                        transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); 
                    }
                    to { 
                        transform: rotateX(360deg) rotateY(360deg) rotateZ(360deg); 
                    }
                }
                @keyframes bounce-3d {
                    0%, 100% { 
                        transform: translateY(0px) rotateY(0deg) scale(1); 
                        opacity: 0.6; 
                    }
                    50% { 
                        transform: translateY(-30px) rotateY(180deg) scale(1.2); 
                        opacity: 1; 
                    }
                }
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes spin-reverse {
                    from { transform: rotate(360deg); }
                    to { transform: rotate(0deg); }
                }
                @keyframes particle-3d {
                    0%, 100% { 
                        transform: translateY(0px) translateX(0px) translateZ(0px) rotateX(0deg) rotateY(0deg); 
                        opacity: 0.3; 
                    }
                    25% { 
                        transform: translateY(-25px) translateX(15px) translateZ(10px) rotateX(90deg) rotateY(90deg); 
                        opacity: 0.8; 
                    }
                    50% { 
                        transform: translateY(-40px) translateX(0px) translateZ(20px) rotateX(180deg) rotateY(180deg); 
                        opacity: 1; 
                    }
                    75% { 
                        transform: translateY(-25px) translateX(-15px) translateZ(10px) rotateX(270deg) rotateY(270deg); 
                        opacity: 0.8; 
                    }
                }
                @keyframes pulse-rainbow {
                    0%, 100% { 
                        opacity: 0.2; 
                        transform: scale(1); 
                    }
                    50% { 
                        opacity: 0.4; 
                        transform: scale(1.05); 
                    }
                }
                @keyframes text-glow {
                    0%, 100% { 
                        text-shadow: 0 0 20px rgba(6, 182, 212, 0.5), 0 0 40px rgba(139, 92, 246, 0.3), 0 0 60px rgba(236, 72, 153, 0.2); 
                    }
                    50% { 
                        text-shadow: 0 0 40px rgba(6, 182, 212, 0.8), 0 0 80px rgba(139, 92, 246, 0.6), 0 0 120px rgba(236, 72, 153, 0.4); 
                    }
                }

                .animate-float-3d {
                    animation: float-3d 8s ease-in-out infinite;
                }
                .animate-spin-3d {
                    animation: spin-3d 12s linear infinite;
                }
                .animate-bounce-3d {
                    animation: bounce-3d 4s ease-in-out infinite;
                }
                .animate-spin-slow {
                    animation: spin-slow 20s linear infinite;
                }
                .animate-spin-reverse {
                    animation: spin-reverse 15s linear infinite;
                }
                .animate-particle-3d {
                    animation: particle-3d 8s ease-in-out infinite;
                }
                .animate-pulse-rainbow {
                    animation: pulse-rainbow 4s ease-in-out infinite;
                }
                .animate-text-glow {
                    animation: text-glow 3s ease-in-out infinite;
                }
                .hover\\:rotate-y-6:hover {
                    transform: rotateY(6deg);
                }
                .hover\\:rotate-x-1:hover {
                    transform: rotateX(1deg);
                }
                .hover\\:translate-z-2:hover {
                    transform: translateZ(8px);
                }
                .translate-z-\\[-6px\\] {
                    transform: translateZ(-6px);
                }
                .group:hover .group-hover\\:translate-z-\\[-12px\\] {
                    transform: translateZ(-12px);
                }
                .hover\\:scale-101:hover {
                    transform: scale(1.01);
                }
                .hover\\:scale-102:hover {
                    transform: scale(1.02);
                }
                
                /* Mobile optimizations */
                @media (max-width: 640px) {
                    .hover\\:scale-110:hover,
                    .hover\\:scale-105:hover,
                    .hover\\:scale-101:hover,
                    .hover\\:scale-102:hover {
                        transform: scale(1.02);
                    }
                    
                    .animate-bounce-3d,
                    .animate-float-3d {
                        animation-duration: 8s;
                    }
                    
                    .animate-spin-3d {
                        animation-duration: 16s;
                    }
                    
                    .animate-spin-slow {
                        animation-duration: 25s;
                    }
                }
                
                /* Tablet optimizations */
                @media (min-width: 641px) and (max-width: 1024px) {
                    .hover\\:scale-110:hover {
                        transform: scale(1.05);
                    }
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
    currentUser: PropTypes.shape({
        name: PropTypes.string.isRequired,
        id: PropTypes.string,
        role: PropTypes.string.isRequired,
        teamId: PropTypes.string,
        globalId: PropTypes.string
    }).isRequired,
};

export default TaskForm;