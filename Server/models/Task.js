// backend/models/Task.js
import mongoose from 'mongoose'; // Changed from const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  // Only the 8 specified fields
  taskTitle: { type: String, required: true, trim: true }, // Name of the task (brief and clear)
  projectName: { type: String, required: true, trim: true }, // The project under which this task falls
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium',
    required: true // Importance level (e.g., High, Medium, Low)
  },
  taskStatus: {
    type: String,
    enum: ['To Do', 'In Progress', 'Completed', 'Blocked'],
    default: 'To Do',
    required: true // Current state (To Do, In Progress, Completed, Blocked)
  },
  assignedTo: [{ type: String, required: true, trim: true }], // Team member responsible for the task
  dueDate: { type: Date, required: true }, // The deadline for task completion
  taskDescription: { type: String, required: true, trim: true }, // Detailed explanation of the task
  projectManagerName: { type: String, required: true, trim: true }, // The manager or lead overseeing the task/project

  // Auto-filled field (not part of the 8, but useful for tracking)
  createdBy: { type: String, trim: true }, // Auto-filled by frontend

}, { timestamps: true }); // Mongoose option to auto-add createdAt and updatedAt fields

// Changed from module.exports = mongoose.model('Task', taskSchema);
const Task = mongoose.model('Task', taskSchema);
export default Task;
