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

    console.log('📤 Submitting decision:', payload);

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
      .catch((err) => {
        console.error('❌ Add attendee failed:', err);
        setError('Unable to save your decision');
      });
  };

  return (
    <div className="bg-gradient-to-br from-white via-gray-50 to-blue-50 p-6 rounded-xl shadow-xl mt-4 transition-all duration-300 ease-in-out hover:shadow-2xl">
      <div className="flex justify-between mb-4 items-center">
        <h3 className="text-xl font-bold text-gray-800">🎯 Event Attendance</h3>
        <select
          className="border rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="add">➕ Add Decision</option>
          <option value="view">👁️ View Decisions</option>
        </select>
      </div>

      {mode === 'add' && (
        <div className="space-y-4 animate-fadeIn">
          <select
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
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
              className="border rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="going">✅ Going</option>
              <option value="busy">🕒 Busy</option>
              <option value="declined">❌ Declined</option>
            </select>
            <button
              onClick={addDecision}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1 rounded shadow transition-all duration-200 transform hover:scale-105"
            >
              Submit Decision
            </button>
          </div>

          {(status === 'busy' || status === 'declined') && (
            <textarea
              className="w-full border rounded p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 transition"
              placeholder="Enter reason..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          )}

          {error && <p className="text-red-500 text-sm mt-2 animate-pulse">{error}</p>}
        </div>
      )}

      {mode === 'view' && (
        <ul className="divide-y mt-4 animate-fadeIn space-y-2">
          {myDecisions.length === 0 && (
            <li className="text-sm text-gray-500 italic">
              No decisions recorded yet.
            </li>
          )}
          {myDecisions.map((decision) => (
            <li key={decision._id} className="py-3 px-2 bg-white rounded shadow-sm hover:bg-gray-50 transition-all">
              <div className="font-medium text-blue-800">📌 {decision.event?.title}</div>
              <div className="text-xs text-gray-600">
                👤 {decision.user?.name || decision.user?.email}
              </div>
              <div>
                Status: <span className="font-semibold text-gray-700">{decision.status}</span>
              </div>
              {decision.reason && (
                <div className="text-xs text-gray-600">
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
  );
};

export default AttendeeList;