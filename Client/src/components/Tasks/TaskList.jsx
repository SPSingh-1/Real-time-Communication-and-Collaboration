import { useState } from 'react';

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [input, setInput] = useState('');

  const addTask = () => {
    if (input.trim()) {
      setTasks([...tasks, { text: input, done: false }]);
      setInput('');
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Tasks</h2>
      <input className="border p-2" value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={addTask} className="ml-2 p-2 bg-blue-500 text-white">Add</button>
      <ul className="mt-4">
        {tasks.map((task, i) => (
          <li key={i}>{task.text}</li>
        ))}
      </ul>
    </div>
  );
};
export default TaskList;
