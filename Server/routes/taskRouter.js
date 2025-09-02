import express from 'express'; // Use import for ES Modules
const router = express.Router();
import Task from '../models/Task.js'; // Use import and .js extension for ES Modules
import fetchUser from '../middleware/fetchUser.js';

// --- API Routes for Tasks ---

/**
 * @route GET /api/tasks
 * @description Get all tasks, filtered by user role/team/global, sorted by creation date.
 * @access Private
 */
router.get('/', fetchUser, async (req, res) => {
    try {
        let filter = {};

        if (req.user.role === 'single') {
            filter = { createdBy: req.user.id, scope: 'single' };
        } else if (req.user.role === 'team') {
            filter = { teamId: req.user.teamId, scope: 'team' };
        } else if (req.user.role === 'global') {
            filter = { globalId: req.user.globalId, scope: 'global' };
        }

        const tasks = await Task.find(filter).sort({ createdAt: 1 });
        res.status(200).json(tasks);
    } catch (err) {
        console.error('Error fetching tasks:', err);
        res.status(500).json({ message: 'Server error fetching tasks', error: err.message });
    }
});

/**
 * @route POST /api/tasks
 * @description Create a new task.
 * @access Private
 */
router.post('/', fetchUser, async (req, res) => {
    try {
        const newTask = new Task({
            ...req.body,
            createdBy: req.user.id,
            teamId: req.user.role === 'team' ? req.user.teamId : null,
            globalId: req.user.role === 'global' ? req.user.globalId : null,
            scope: req.user.role
        });
        const savedTask = await newTask.save();
        res.status(201).json(savedTask);
    } catch (err) {
        console.error('Error creating task:', err);
        if (err.name === 'ValidationError') {
            const errors = Object.keys(err.errors).map(key => ({
                field: key,
                message: err.errors[key].message
            }));
            return res.status(400).json({ message: 'Validation Error', errors: errors });
        }
        res.status(500).json({ message: 'Server error creating task', error: err.message });
    }
});

/**
 * @route GET /api/tasks/:id
 * @description Get a single task by ID.
 * @access Private
 */
router.get('/:id', fetchUser, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        // Authorization check
        if (req.user.role === 'single' && task.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to view this task' });
        }

        if (req.user.role === 'team' && task.teamId?.toString() !== req.user.teamId?.toString()) {
            return res.status(403).json({ message: 'Not authorized to view this task' });
        }

        if (req.user.role === 'global' && task.globalId?.toString() !== req.user.globalId?.toString()) {
            return res.status(403).json({ message: 'Not authorized to view this task' });
        }

        res.json(task);
    } catch (err) {
        console.error('Error fetching single task:', err.message);
        if (err.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid task ID format' });
        }
        res.status(500).json({ message: 'Server error fetching task', error: err.message });
    }
});

/**
 * @route PUT /api/tasks/:id
 * @description Update an existing task by ID.
 * @access Private
 */
router.put('/:id', fetchUser, async (req, res) => {
    const { taskTitle, priority, taskStatus, assignedTo, dueDate, taskDescription, projectManagerName } = req.body;

    if (!taskTitle || !dueDate) {
        return res.status(400).json({ message: 'Task title and due date are required for updating a task.' });
    }

    try {
        let task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        // Authorization check
        if (req.user.role === 'single' && task.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to update this task' });
        }

        if (req.user.role === 'team' && task.teamId?.toString() !== req.user.teamId?.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this task' });
        }

        if (req.user.role === 'global' && task.globalId?.toString() !== req.user.globalId?.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this task' });
        }

        const updateFields = {
            taskTitle,
            priority,
            taskStatus,
            assignedTo,
            dueDate,
            taskDescription,
            projectManagerName,
            updatedAt: Date.now()
        };

        const updatedTask = await Task.findByIdAndUpdate(req.params.id, updateFields, { new: true, runValidators: true });
        res.json(updatedTask);
    } catch (err) {
        console.error('Error updating task:', err.message);
        if (err.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid task ID format' });
        }
        if (err.name === 'ValidationError') {
            const errors = Object.keys(err.errors).map(key => ({
                field: key,
                message: err.errors[key].message
            }));
            return res.status(400).json({ message: 'Validation Error', errors: errors });
        }
        res.status(500).json({ message: 'Server error updating task', error: err.message });
    }
});

/**
 * @route DELETE /api/tasks/:id
 * @description Delete a task by ID.
 * @access Private
 */
router.delete('/:id', fetchUser, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        // Authorization check
        if (req.user.role === 'single' && task.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this task' });
        }

        if (req.user.role === 'team' && task.teamId?.toString() !== req.user.teamId?.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this task' });
        }

        if (req.user.role === 'global' && task.globalId?.toString() !== req.user.globalId?.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this task' });
        }

        await task.deleteOne();
        res.json({ message: 'Task removed successfully' });
    } catch (err) {
        console.error('Error deleting task:', err.message);
        if (err.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid task ID format' });
        }
        res.status(500).json({ message: 'Server error deleting task', error: err.message });
    }
});

export default router; // Use export default for ES Modules
