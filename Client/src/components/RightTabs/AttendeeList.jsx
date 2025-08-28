import React, { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

const AttendeeList = () => {
  const [pendingEvents, setPendingEvents] = useState([]);
  const [myDecisions, setMyDecisions] = useState([]);
  const [status, setStatus] = useState('going');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState('add');
  const [selectedEvent, setSelectedEvent] = useState('');

  const token = localStorage.getItem('token');

  const fetchData = useCallback(() => {
    const endpoint =
      mode === 'add'
        ? 'http://localhost:3001/attendees/pending-events'
        : 'http://localhost:3001/attendees/all-decisions';

    fetch(endpoint, {
      headers: { 'auth-token': token },
    })
      .then((res) => res.json())
      .then((data) => {
        if (mode === 'add') setPendingEvents(data);
        else setMyDecisions(data);
      })
      .catch(() => setError('Failed to load data'));
  }, [mode, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    socket.on('attendeeUpdate', () => {
      fetchData();
    });
    return () => {
      socket.off('attendeeUpdate');
    };
  }, [fetchData]);

  const addDecision = () => {
    if (!selectedEvent) return setError('Please select an event.');
    if ((status === 'busy' || status === 'declined') && !reason.trim()) {
      return setError('Please provide a reason for not attending.');
    }

    const payload = {
      event: selectedEvent,
      status,
      reason: status === 'busy' || status === 'declined' ? reason : '',
    };

    fetch('http://localhost:3001/attendees', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'auth-token': token,
      },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to add');
        return res.json();
      })
      .then(() => {
        setError('');
        setReason('');
        setSelectedEvent('');
        setPendingEvents((prev) =>
          prev.filter((e) => e._id !== selectedEvent)
        );
      })
      .catch(() => {
        setError('Unable to save your decision');
      });
  };

  return (
    <div className="relative p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.3)] mt-4 transition-all duration-500 transform hover:scale-[1.02]">
      {/* 🔹 Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-700 via-indigo-600 to-blue-700 opacity-95 rounded-xl "></div>

      {/* 🔹 Floating Shapes for Depth */}
      <div className="absolute top-6 left-6 w-24 h-24 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl opacity-30 animate-spin-slow transform-gpu"></div>
      <div className="absolute bottom-10 right-8 w-28 h-28 bg-gradient-to-r from-pink-400 to-purple-600 rounded-full opacity-30 animate-pulse"></div>

      {/* 🔹 Foreground Content */}
      <div className="relative z-10 overflow-y-auto max-h-[60vh] pr-2">
        <div className="flex justify-between mb-4 items-center">
          <h3 className="text-2xl font-bold text-white drop-shadow-lg">🎯 Event Attendance</h3>
          <select
            className="rounded-2xl px-3 py-1 text-sm bg-white shadow-md text-black focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="add">➕ Add Decision</option>
            <option value="view">👁️ View Decisions</option>
          </select>
        </div>

        {/* Add Mode */}
        {mode === 'add' && (
          <div className="space-y-4 animate-fadeIn">
            <select
              className="w-full rounded-2xl px-3 py-2 text-sm bg-white shadow-md text-black focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
            >
              <option value="">-- Select an Event --</option>
              {pendingEvents.map((event) => (
                <option key={event._id} value={event._id}>
                  📅 {event.title} — {new Date(event.date).toLocaleDateString()}
                </option>
              ))}
            </select>

            <div className="flex gap-2 items-center">
              <select
                className="rounded-2xl px-3 py-1 text-sm bg-white shadow-md text-black focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="going">✅ Going</option>
                <option value="busy">🕒 Busy</option>
                <option value="declined">❌ Declined</option>
              </select>
              <button
                onClick={addDecision}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                Submit Decision
              </button>
            </div>

            {(status === 'busy' || status === 'declined') && (
              <textarea
                className="w-full rounded-2xl p-3 text-sm bg-white shadow-md text-black focus:outline-none focus:ring-2 focus:ring-red-400 transition"
                placeholder="Enter reason..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            )}

            {error && <p className="text-red-200 text-sm mt-2 animate-pulse">{error}</p>}
          </div>
        )}

        {/* View Mode */}
        {mode === 'view' && (
          <ul className="divide-y divide-white/20 mt-4 animate-fadeIn space-y-2">
            {myDecisions.length === 0 && (
              <li className="text-sm text-white/70 italic">
                No decisions recorded yet.
              </li>
            )}
            {myDecisions.map((decision) => (
              <li
                key={decision._id}
                className="py-3 px-3 bg-white/20 rounded-2xl shadow-lg hover:shadow-2xl transition-all"
              >
                <div className="font-medium text-white">📌 {decision.event?.title}</div>
                <div className="text-xs text-gray-200">
                  👤 {decision.user?.name || decision.user?.email}
                </div>
                <div>
                  Status: <span className="font-semibold text-yellow-300">{decision.status}</span>
                </div>
                {decision.reason && (
                  <div className="text-xs text-gray-300">
                    Reason: {decision.reason}
                  </div>
                )}
                <div className="text-xs text-gray-400">
                  Date: {new Date(decision.event?.date).toLocaleDateString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AttendeeList;
