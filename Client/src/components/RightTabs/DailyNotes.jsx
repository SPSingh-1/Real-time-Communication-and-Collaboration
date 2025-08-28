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
    const payload = { content: input, date: selectedDate, type: noteType };
    const url = editingNote
      ? `http://localhost:3001/notes/${editingNote._id}`
      : 'http://localhost:3001/notes';
    const method = editingNote ? 'PUT' : 'POST';

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'auth-token': localStorage.getItem('token') },
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
    <div className="relative p-6 rounded-3xl shadow-2xl h-[85vh] flex flex-col transition-all duration-500 hover:scale-[1.02]">
      {/* 🔹 Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-200 via-purple-700 to-blue-400 opacity-90 rounded-xl"></div>

      {/* 🔹 Floating Shape */}
      <div className="absolute top-10 right-10 w-28 h-28 bg-gradient-to-r from-yellow-200 to-red-500 rounded-full opacity-25 animate-pulse"></div>

      {/* 🔹 Foreground Content (scrollable) */}
      <div className="relative z-10 flex-1 overflow-y-auto pr-2">
        <div className="mb-4 flex gap-3 items-center">
          <label className="text-sm font-medium text-white">📅 Select Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="rounded-xl px-2 py-1 text-sm bg-white shadow-md text-black focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>

        <h3 className="font-bold text-lg text-white mb-3 drop-shadow">📝 Notes for {selectedDate}</h3>

        {/* Input Row */}
        <div className="flex gap-2 mb-4">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            className="rounded-xl px-3 py-2 text-sm w-full bg-white shadow-md text-black focus:outline-none focus:ring-2 focus:ring-pink-400"
            placeholder="Write a note..."
          />
          <select
            value={noteType}
            onChange={e => setNoteType(e.target.value)}
            className="rounded-xl text-sm bg-white shadow-md text-black px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="quote">Quote</option>
            <option value="comment">Comment</option>
            <option value="important">Important</option>
          </select>
          <button
            onClick={handleAddOrEdit}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl shadow-lg transition-transform hover:scale-105"
          >
            {editingNote ? 'Update' : 'Add'}
          </button>
        </div>

        {/* Filter */}
        <div className="mb-4 flex gap-2 items-center">
          <label className="text-sm font-medium text-white">🔍 Filter:</label>
          <select
            className="rounded-xl text-sm bg-white shadow-md text-black px-2 py-1 focus:outline-none focus:ring-2 focus:ring-pink-400"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="quote">Quotes</option>
            <option value="comment">Comments</option>
            <option value="important">Important Notes</option>
          </select>
        </div>

        {/* Notes List */}
        <ul className="space-y-2">
          {notes.length === 0 && (
            <li className="text-sm text-white/80 italic">
              No {filter !== 'all' ? filter : 'notes'} for this day.
            </li>
          )}
          {notes.map((n) => (
            <li
              key={n._id}
              className="bg-white/20 backdrop-blur-md rounded-xl p-3 shadow-md flex justify-between items-center hover:bg-white/30 transition"
            >
              <div>
                <span className="font-semibold capitalize text-yellow-200">{n.type}:</span> {n.content}
                <span className="text-xs text-gray-200 ml-2">({n.user?.name})</span>
              </div>
              <div className="text-xs space-x-2">
                <button onClick={() => startEdit(n)} className="text-blue-200 hover:underline">Edit</button>
                <button onClick={() => handleDelete(n._id)} className="text-red-200 hover:underline">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DailyNotes;
