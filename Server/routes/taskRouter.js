import express from 'express'; // Use import for ES Modules
const router = express.Router();
import Task from '../models/Task.js'; // Use import and .js extension for ES Modules

// --- API Routes for Tasks ---

/**
 * @route GET /api/tasks
 * @description Get all tasks, sorted by creation date.
 * @access Public
 */
router.get('/', async (req, res) => {
    try {
        const tasks = await Task.find().sort({ createdAt: 1 });
        res.status(200).json(tasks);
    } catch (err) {
        console.error('Error fetching tasks:', err);
        res.status(500).json({ message: 'Server error fetching tasks', error: err.message });
    }
});

/**
 * @route POST /api/tasks
 * @description Create a new task.
 * @access Public
 */
router.post('/', async (req, res) => {
    try {
        const newTask = new Task(req.body);
        const savedTask = await newTask.save();
        res.status(201).json(savedTask);
    } catch (err) {
        console.error('Error creating task:', err);
        if (err.name === 'ValidationError') {
            // Send detailed validation errors to the client
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
 * @access Public
 */
router.get('/:id', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        res.json(task);
    } catch (err) {
        console.error('Error fetching single task:', err.message);
        // Check for Mongoose CastError if ID is invalid format
        if (err.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid task ID format' });
        }
        res.status(500).json({ message: 'Server error fetching task', error: err.message });
    }
});

/**
 * @route PUT /api/tasks/:id
 * @description Update an existing task by ID.
 * @access Public
 */
router.put('/:id', async (req, res) => {
    // Destructure fields you expect to update from req.body
    const { taskTitle, priority, taskStatus, assignedTo, dueDate, taskDescription, projectManagerName } = req.body;

    // Basic validation: You might want to adjust which fields are strictly required for an update
    if (!taskTitle || !dueDate) { // Example: requiring at least title and due date
        return res.status(400).json({ message: 'Task title and due date are required for updating a task.' });
    }

    try {
        // Create an object with the fields to update
        const updateFields = {
            taskTitle,
            priority,
            taskStatus,
            assignedTo,
            dueDate,
            taskDescription,
            projectManagerName,
            updatedAt: Date.now() // Always update the timestamp
        };

        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id,
            updateFields, // Use the object with your specific fields
            { new: true, runValidators: true } // Return the updated document and run schema validators
        );

        if (!updatedTask) {
            return res.status(404).json({ message: 'Task not found' });
        }
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
 * @access Public
 */
router.delete('/:id', async (req, res) => {
    try {
        const deletedTask = await Task.findByIdAndDelete(req.params.id);

        if (!deletedTask) {
            return res.status(404).json({ message: 'Task not found' });
        }
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