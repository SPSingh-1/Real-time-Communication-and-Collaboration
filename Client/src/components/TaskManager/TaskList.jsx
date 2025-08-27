// src/TaskManager/TaskList.jsx
import React from 'react';
import Priority from '../Badge/Priority'; // Assuming correct path
import Status from '../Badge/Status';     // Assuming correct path

const TaskList = ({ tasks, onEdit, onDelete }) => {
    if (!tasks || tasks.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden flex items-center justify-center">
                {/* Animated background for empty state */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse transform-gpu"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000 transform-gpu"></div>
                </div>

                <div className="relative z-10 bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-12 text-center transform-gpu hover:scale-105 transition-all duration-700">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-3xl blur-xl animate-pulse-glow"></div>
                    <div className="relative z-10">
                        <div className="text-6xl mb-6 animate-bounce">📝</div>
                        <h3 className="text-2xl font-bold  mb-4 bg-gradient-to-r from-cyan-400 to-purple-400 text-transparent bg-clip-text">
                            No Tasks Found
                        </h3>
                        <p className="text-white/70 text-lg">
                            Ready to get productive? Click "Add New Task" to create your first one!
                        </p>
                    </div>
                </div>

                <style jsx>{`
                    @keyframes pulse-glow {
                        0%, 100% { opacity: 0.3; transform: scale(1); }
                        50% { opacity: 0.6; transform: scale(1.05); }
                    }
                    .animate-pulse-glow {
                        animation: pulse-glow 3s ease-in-out infinite;
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
            {/* Enhanced 3D background elements */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Floating geometric shapes */}
                <div className="absolute top-20 left-20 w-24 h-24 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 rounded-2xl animate-float-geometric transform-gpu"></div>
                <div className="absolute top-40 right-32 w-16 h-16 bg-gradient-to-r from-purple-400/20 to-pink-500/20 rounded-full animate-orbit transform-gpu"></div>
                <div className="absolute bottom-32 left-1/3 w-20 h-20 bg-gradient-to-r from-emerald-400/20 to-teal-500/20 rounded-lg animate-wobble transform-gpu"></div>
                
                {/* Grid lines for depth */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-full h-full" 
                         style={{ 
                             backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                             backgroundSize: '60px 60px',
                             transform: 'perspective(400px) rotateX(60deg)'
                         }}>
                    </div>
                </div>
            </div>

            {/* Particle system */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(15)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-white/60 rounded-full animate-particle-drift transform-gpu"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${5 + Math.random() * 5}s`
                        }}
                    ></div>
                ))}
            </div>

            <div className="relative z-10 p-6">
                {/* 3D Table Container */}
                <div 
                    className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl rounded-3xl border border-white/30 shadow-2xl overflow-hidden transform-gpu transition-all duration-1000 hover:scale-[1.01]"
                    style={{ 
                        transformStyle: 'preserve-3d',
                        perspective: '1000px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 80px rgba(34, 211, 238, 0.2)'
                    }}
                >
                    {/* Animated border glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/30 via-purple-500/30 to-pink-500/30 rounded-3xl blur-2xl animate-border-dance -z-10"></div>
                    
                    <div className="overflow-x-auto">
                        {/* Enhanced 3D Table */}
                        <table className="min-w-full">
                            <thead>
                                <tr className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-md">
                                    {[
                                        { label: 'Task Title', icon: '🎯' },
                                        { label: 'Project Name', icon: '🚀' },
                                        { label: 'Priority', icon: '⚡' },
                                        { label: 'Status', icon: '📊' },
                                        { label: 'Assigned To', icon: '👥' },
                                        { label: 'Due Date', icon: '📅' },
                                        { label: 'Project Manager', icon: '👨‍💼' },
                                        { label: 'Actions', icon: '⚙️' }
                                    ].map((header, index) => (
                                        <th 
                                            key={header.label}
                                            scope="col" 
                                            className={`px-6 py-4 text-left text-sm font-bold text-white/90 uppercase tracking-wider
                                                     transform-gpu transition-all duration-500 hover:scale-105 hover:text-cyan-400
                                                     ${index === 0 ? 'rounded-tl-2xl' : ''}
                                                     ${index === 7 ? 'rounded-tr-2xl' : ''}`}
                                            style={{ 
                                                textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                                                borderBottom: '2px solid rgba(255,255,255,0.1)'
                                            }}
                                        >
                                            <div className="flex items-center space-x-2 group">
                                                <span className="text-lg group-hover:animate-bounce">{header.icon}</span>
                                                <span className="group-hover:animate-pulse">{header.label}</span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {tasks.map((task, index) => (
                                    <tr 
                                        key={task._id} 
                                        className="group bg-gradient-to-r from-white/5 to-transparent hover:from-white/10 hover:to-white/5 
                                                 transform-gpu transition-all duration-700 hover:scale-[1.02] hover:shadow-2xl hover:shadow-cyan-500/10"
                                        style={{ 
                                            animationDelay: `${index * 100}ms`,
                                            animation: 'slideInUp 0.8s ease-out forwards'
                                        }}
                                    >
                                        {/* Task Title */}
                                        <td className="px-6 py-4 whitespace-nowrap transform-gpu transition-all duration-500 group-hover:translate-x-2">
                                            <div className="text-sm font-bold text-white/90 group-hover:text-cyan-400 transition-colors duration-300">
                                                {task.taskTitle}
                                            </div>
                                        </td>

                                        {/* Project Name */}
                                        <td className="px-6 py-4 whitespace-nowrap transform-gpu transition-all duration-500 group-hover:translate-x-1">
                                            <div className="text-sm font-semibold text-white/70 group-hover:text-purple-400 transition-colors duration-300">
                                                {task.projectName}
                                            </div>
                                        </td>

                                        {/* Priority Badge with enhanced 3D effects */}
                                        <td className="px-6 py-4 whitespace-nowrap transform-gpu transition-all duration-500 group-hover:scale-110">
                                            <div className="transform-gpu transition-all duration-500 hover:rotate-y-12 hover:scale-125">
                                                <Priority priori={task.priority}/>
                                            </div>
                                        </td>

                                        {/* Status Badge with enhanced 3D effects */}
                                        <td className="px-6 py-4 whitespace-nowrap transform-gpu transition-all duration-500 group-hover:scale-110">
                                            <div className="transform-gpu transition-all duration-500 hover:rotate-y-12 hover:scale-125">
                                                <Status status={task.taskStatus}/>
                                            </div>
                                        </td>

                                        {/* Assigned To */}
                                        <td className="px-6 py-4 whitespace-nowrap transform-gpu transition-all duration-500 group-hover:translate-x-1">
                                            <div className="text-sm text-white/70 group-hover:text-emerald-400 transition-colors duration-300">
                                                {task.assignedTo && task.assignedTo.length > 0 ? task.assignedTo.join(', ') : 'N/A'}
                                            </div>
                                        </td>

                                        {/* Due Date */}
                                        <td className="px-6 py-4 whitespace-nowrap transform-gpu transition-all duration-500 group-hover:translate-x-1">
                                            <div className="text-sm text-white/70 group-hover:text-yellow-400 transition-colors duration-300">
                                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}
                                            </div>
                                        </td>

                                        {/* Project Manager */}
                                        <td className="px-6 py-4 whitespace-nowrap transform-gpu transition-all duration-500 group-hover:translate-x-1">
                                            <div className="text-sm text-white/70 group-hover:text-pink-400 transition-colors duration-300">
                                                {task.projectManagerName || 'N/A'}
                                            </div>
                                        </td>

                                        {/* Enhanced 3D Action Buttons */}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex space-x-3">
                                                {/* Enhanced 3D Edit Button */}
                                                <button
                                                    onClick={() => onEdit(task)}
                                                    className="group relative px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-bold rounded-xl
                                                             transform-gpu transition-all duration-500 hover:scale-110 hover:rotate-y-6 hover:shadow-2xl hover:shadow-blue-500/50
                                                             focus:outline-none focus:ring-2 focus:ring-blue-400 overflow-hidden"
                                                    style={{ transformStyle: 'preserve-3d' }}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl transform translate-z-[-2px] group-hover:translate-z-[-4px] transition-transform duration-300"></div>
                                                    <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                                    <div className="relative z-10 flex items-center space-x-1">
                                                        <span className="animate-pulse">✏️</span>
                                                        <span>Edit</span>
                                                    </div>
                                                </button>

                                                {/* Enhanced 3D Delete Button */}
                                                <button
                                                    onClick={() => onDelete(task._id)}
                                                    className="group relative px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm font-bold rounded-xl
                                                             transform-gpu transition-all duration-500 hover:scale-110 hover:rotate-y-6 hover:shadow-2xl hover:shadow-red-500/50
                                                             focus:outline-none focus:ring-2 focus:ring-red-400 overflow-hidden"
                                                    style={{ transformStyle: 'preserve-3d' }}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-pink-600 rounded-xl transform translate-z-[-2px] group-hover:translate-z-[-4px] transition-transform duration-300"></div>
                                                    <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                                    <div className="relative z-10 flex items-center space-x-1">
                                                        <span className="animate-pulse">🗑️</span>
                                                        <span>Delete</span>
                                                    </div>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Table footer with stats */}
                    <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-md px-6 py-4 rounded-b-3xl border-t border-white/10">
                        <div className="flex justify-between items-center text-white/70">
                            <div className="flex items-center space-x-4">
                                <span className="text-sm font-medium">
                                    📊 Total Tasks: 
                                    <span className="text-cyan-400 font-bold ml-2 text-lg animate-pulse">
                                        {tasks.length}
                                    </span>
                                </span>
                                <span className="text-sm font-medium">
                                    ✅ Completed: 
                                    <span className="text-emerald-400 font-bold ml-2 text-lg animate-pulse">
                                        {tasks.filter(t => t.taskStatus === 'Completed').length}
                                    </span>
                                </span>
                                <span className="text-sm font-medium">
                                    🔄 In Progress: 
                                    <span className="text-yellow-400 font-bold ml-2 text-lg animate-pulse">
                                        {tasks.filter(t => t.taskStatus === 'In Progress').length}
                                    </span>
                                </span>
                            </div>
                            <div className="text-xs text-white/50 italic">
                                ✨ Hover over rows for 3D effects
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes slideInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px) rotateX(-15deg);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) rotateX(0deg);
                    }
                }
                @keyframes float-geometric {
                    0%, 100% { 
                        transform: translateY(0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg); 
                        opacity: 0.6;
                    }
                    50% { 
                        transform: translateY(-20px) rotateX(180deg) rotateY(180deg) rotateZ(180deg); 
                        opacity: 1;
                    }
                }
                @keyframes orbit {
                    0% { 
                        transform: rotate(0deg) translateX(50px) rotate(0deg); 
                        opacity: 0.4;
                    }
                    100% { 
                        transform: rotate(360deg) translateX(50px) rotate(-360deg); 
                        opacity: 0.8;
                    }
                }
                @keyframes wobble {
                    0%, 100% { 
                        transform: translateX(0px) rotateZ(0deg); 
                        opacity: 0.5;
                    }
                    25% { 
                        transform: translateX(5px) rotateZ(5deg); 
                        opacity: 0.8;
                    }
                    75% { 
                        transform: translateX(-5px) rotateZ(-5deg); 
                        opacity: 0.8;
                    }
                }
                @keyframes particle-drift {
                    0%, 100% { 
                        transform: translateY(0px) translateX(0px) scale(1); 
                        opacity: 0.3; 
                    }
                    50% { 
                        transform: translateY(-60px) translateX(30px) scale(1.5); 
                        opacity: 1; 
                    }
                }
                @keyframes border-dance {
                    0%, 100% { 
                        opacity: 0.2; 
                        transform: scale(1) rotate(0deg); 
                    }
                    33% { 
                        opacity: 0.4; 
                        transform: scale(1.02) rotate(120deg); 
                    }
                    66% { 
                        opacity: 0.3; 
                        transform: scale(0.98) rotate(240deg); 
                    }
                }
                @keyframes rotate-y-12 {
                    to { transform: rotateY(12deg); }
                }

                .animate-float-geometric {
                    animation: float-geometric 6s ease-in-out infinite;
                }
                .animate-orbit {
                    animation: orbit 10s linear infinite;
                }
                .animate-wobble {
                    animation: wobble 3s ease-in-out infinite;
                }
                .animate-particle-drift {
                    animation: particle-drift 8s ease-in-out infinite;
                }
                .animate-border-dance {
                    animation: border-dance 6s ease-in-out infinite;
                }
                .hover\\:rotate-y-6:hover {
                    animation: rotate-y-12 0.5s ease-out forwards;
                    transform: rotateY(6deg);
                }
                .hover\\:rotate-y-12:hover {
                    animation: rotate-y-12 0.5s ease-out forwards;
                    transform: rotateY(12deg);
                }
                .translate-z-\\[-2px\\] {
                    transform: translateZ(-2px);
                }
                .group:hover .group-hover\\:translate-z-\\[-4px\\] {
                    transform: translateZ(-4px);
                }

                /* Custom scrollbar for the table */
                .overflow-x-auto::-webkit-scrollbar {
                    height: 8px;
                }
                .overflow-x-auto::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .overflow-x-auto::-webkit-scrollbar-thumb {
                    background: linear-gradient(90deg, #06b6d4, #8b5cf6);
                    border-radius: 10px;
                }
                .overflow-x-auto::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(90deg, #0891b2, #7c3aed);
                }

                /* Enhanced table row animations */
                tr {
                    opacity: 0;
                    animation: slideInUp 0.8s ease-out forwards;
                }
                tr:nth-child(1) { animation-delay: 0.1s; }
                tr:nth-child(2) { animation-delay: 0.2s; }
                tr:nth-child(3) { animation-delay: 0.3s; }
                tr:nth-child(4) { animation-delay: 0.4s; }
                tr:nth-child(5) { animation-delay: 0.5s; }
                tr:nth-child(6) { animation-delay: 0.6s; }
                tr:nth-child(7) { animation-delay: 0.7s; }
                tr:nth-child(8) { animation-delay: 0.8s; }
                tr:nth-child(9) { animation-delay: 0.9s; }
                tr:nth-child(10) { animation-delay: 1.0s; }

                /* Glowing effects for interactive elements */
                button:hover {
                    filter: drop-shadow(0 0 20px currentColor);
                }

                /* Enhanced table cell hover effects */
                td {
                    position: relative;
                    overflow: hidden;
                }
                td::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
                    transition: left 0.5s;
                }
                tr:hover td::before {
                    left: 100%;
                }
            `}</style>
        </div>
    );
};

export default TaskList;