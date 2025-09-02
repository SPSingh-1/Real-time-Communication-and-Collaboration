// backend/models/Task.js
import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  taskTitle: { type: String, required: true, trim: true },
  projectName: { type: String, required: true, trim: true },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium',
    required: true
  },
  taskStatus: {
    type: String,
    enum: ['To Do', 'In Progress', 'Completed', 'Blocked'],
    default: 'To Do',
    required: true
  },
  assignedTo: [{ type: String, required: true, trim: true }],
  dueDate: { type: Date, required: true },
  taskDescription: { type: String, required: true, trim: true },
  projectManagerName: { type: String, required: true, trim: true },

  // Tracking fields
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },

  // Role-specific fields
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  globalId: { type: String, default: null }, // will store "GLOBAL123" for global tasks
  scope: { type: String, enum: ['single', 'team', 'global'], default: 'single' }

}, { timestamps: true });

const Task = mongoose.model('Task', taskSchema);
export default Task;
