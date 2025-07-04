import React, { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const socket = io('http://localhost:3001');

const DailyNotes = ({ date }) => {
  const [notes, setNotes] = useState([]);
  const [input, setInput] = useState('');
  const [noteType, setNoteType] = useState('comment');
  const [filter, setFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(date || new Date().toISOString().split('T')[0]);
  const [editingNote, setEditingNote] = useState(null);

  const fetchNotes = useCallback(() => {
    let url = `http://localhost:3001/notes/${selectedDate}`;
    if (filter !== 'all') url += `?type=${filter}`;

    fetch(url, {
      headers: { 'auth-token': localStorage.getItem('token') }
    })
      .then(async res => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then(setNotes)
      .catch(error => {
        console.error('Failed to fetch notes:', error);
        toast.error('⚠️ Failed to load notes');
      });
  }, [selectedDate, filter]);

  useEffect(() => {
    fetchNotes();
  }, [selectedDate, filter, fetchNotes]);

  useEffect(() => {
    socket.on('note-added', fetchNotes);
    socket.on('note-updated', fetchNotes);
    socket.on('note-deleted', fetchNotes);

    return () => {
      socket.off('note-added');
      socket.off('note-updated');
      socket.off('note-deleted');
    };
  }, [fetchNotes]);

  const handleAddOrEdit = () => {
    if (!input) {
      toast.error('Please enter note content');
      return;
    }

    const payload = {
      content: input,
      date: selectedDate,
      type: noteType
    };

    const url = editingNote
      ? `http://localhost:3001/notes/${editingNote._id}`
      : 'http://localhost:3001/notes';

    const method = editingNote ? 'PUT' : 'POST';

    fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'auth-token': localStorage.getItem('token')
      },
      body: JSON.stringify(payload)
    })
      .then(async res => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then(() => {
        setInput('');
        setNoteType('comment');
        setEditingNote(null);
        toast.success(editingNote ? 'Note updated' : 'Note added');
        fetchNotes();
      })
      .catch(async err => {
        const msg = await err.message || 'Failed to save note';
        toast.error(msg);
      });
  };

  const handleDelete = (id) => {
    fetch(`http://localhost:3001/notes/${id}`, {
      method: 'DELETE',
      headers: { 'auth-token': localStorage.getItem('token') }
    })
      .then(async res => {
        if (!res.ok) throw new Error(await res.text());
        toast.success('Note deleted');
        fetchNotes();
      })
      .catch(async (err) => {
        const msg = await err.message || 'Failed to delete note';
        toast.error(msg);
      });
  };

  const startEdit = (note) => {
    setEditingNote(note);
    setInput(note.content);
    setNoteType(note.type);
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-lg mt-6 transition-all duration-300 ease-in-out hover:shadow-2xl overflow-x-hidden">
      <div className="mb-4 flex gap-3 items-center">
        <label className="text-sm font-medium text-gray-600">📅 Select Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      <h3 className="font-bold text-lg text-indigo-600 mb-3">📝 Notes for {selectedDate}</h3>

      <div className="flex gap-2 mb-4">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          className="border rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Write a note..."
        />
        <select
          value={noteType}
          onChange={e => setNoteType(e.target.value)}
          className="text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-400"
        >
          <option value="quote">Quote</option>
          <option value="comment">Comment</option>
          <option value="important">Important</option>
        </select>
        <button
          onClick={handleAddOrEdit}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-all"
        >
          {editingNote ? 'Update' : 'Add'}
        </button>
      </div>

      <div className="mb-4 flex gap-2 items-center">
        <label className="text-sm font-medium text-gray-600">🔍 Filter:</label>
        <select
          className="text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="quote">Quotes</option>
          <option value="comment">Comments</option>
          <option value="important">Important Notes</option>
        </select>
      </div>

      <ul className="space-y-2">
        {notes.length === 0 && (
          <li className="text-sm text-gray-500 italic">
            No {filter !== 'all' ? filter : 'notes'} for this day.
          </li>
        )}
        {notes.map((n) => (
          <li key={n._id} className="text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded p-2 flex justify-between items-center transition duration-200">
            <div>
              <span className="font-semibold capitalize text-indigo-500">{n.type}:</span> {n.content}
              <span className="text-xs text-gray-500 ml-2">({n.user?.name})</span>
            </div>
            <div className="text-xs space-x-1">
              <button onClick={() => startEdit(n)} className="text-blue-600 hover:underline">Edit</button>
              <button onClick={() => handleDelete(n._id)} className="text-red-600 hover:underline">Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DailyNotes;
