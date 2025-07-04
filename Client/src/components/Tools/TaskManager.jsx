import React from 'react';

const mockTasks = [
  { name: 'Project Hansel', priority: 'P4', status: 'In Progress', manager: 'Mary Cassatt', date: 'Feb 28, 2023' },
  { name: 'Pie chart coloring', priority: 'P1🔥', status: 'Not Started', manager: 'Marie Bracquemond', date: 'Mar 14, 2022' }
];

const TaskManager = () => (
  <div className="tool-container">
    <h2>Task Manager</h2>
    <table>
      <thead>
        <tr>
          <th>Project</th><th>Priority</th><th>Status</th><th>Manager</th><th>Due Date</th>
        </tr>
      </thead>
      <tbody>
        {mockTasks.map((task, idx) => (
          <tr key={idx}>
            <td>{task.name}</td>
            <td>{task.priority}</td>
            <td>{task.status}</td>
            <td>{task.manager}</td>
            <td>{task.date}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default TaskManager;
