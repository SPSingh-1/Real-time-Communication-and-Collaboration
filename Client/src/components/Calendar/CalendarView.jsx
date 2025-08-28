import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Calendar from 'react-calendar';
import axios from 'axios';
import { io } from 'socket.io-client';
import NotificationEvent from '../Notifications/NotificationEvent';
import { MdDeleteForever, MdEditCalendar } from 'react-icons/md';
import { IoMdClose } from 'react-icons/io';
import 'react-toastify/dist/ReactToastify.css';
import 'react-calendar/dist/Calendar.css';
import RightPanel from '../RightPanel/RightPanal';

const CalendarView = () => {
  const [value, setValue] = useState(new Date());
  const [events, setEvents] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [inputEvent, setInputEvent] = useState('');
  const [inputDescription, setInputDescription] = useState('');
  const [inputTime, setInputTime] = useState('');
  const [editId, setEditId] = useState(null);
  const [userEmail, setUserEmail] = useState('');

  const isPastDate = (date) => {
    const today = new Date();
    return new Date(date.toDateString()) < new Date(today.toDateString());
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    axios.post('http://localhost:3001/api/auth/getuser', {}, {
      headers: { 'auth-token': token },
    })
      .then((res) => setUserEmail(res.data.email))
      .catch((err) => console.error('❌ Failed to fetch user:', err));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    axios.get('http://localhost:3001/events', {
      headers: { 'auth-token': token },
    })
      .then((res) => {
        const grouped = {};
        res.data.forEach((ev) => {
          const key = new Date(ev.date).toDateString();
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(ev);
        });
        setEvents(grouped);
        NotificationEvent(grouped, userEmail);
      })
      .catch((err) => console.error('❌ Error fetching events:', err.message));
  }, [userEmail]);

  useEffect(() => {
    const socket = io('http://localhost:3001');
    socket.on('newEvent', (event) => {
      const key = new Date(event.date).toDateString();
      setEvents((prev) => ({
        ...prev,
        [key]: prev[key] ? [...prev[key], event] : [event],
      }));
    });
    return () => socket.disconnect();
  }, []);

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setInputEvent('');
    setInputTime('');
    setInputDescription('');
    setEditId(null);
    setShowPrompt(true); 
  };

  const isPastTime = (date, time) => {
    const [hours, minutes] = time.split(':').map(Number);
    const selected = new Date(date);
    selected.setHours(hours);
    selected.setMinutes(minutes);
    return selected < new Date();
  };

  const addOrUpdateEvent = async () => {
    if (!inputEvent.trim() || !selectedDate || !inputTime) return;
    if (isPastTime(selectedDate, inputTime)) {
      toast.warn('⏳ Cannot select past time for event.');
      return;
    }
    const token = localStorage.getItem('token');
    const eventData = {
      title: inputEvent,
      date: selectedDate.toISOString(),
      time: inputTime,
      description: inputDescription.trim()
    };

    try {
      if (editId) {
        const updated = await axios.put(
          `http://localhost:3001/events/${editId}`,
          eventData,
          { headers: { 'auth-token': token } }
        );
        const key = selectedDate.toDateString();
        setEvents((prev) => ({
          ...prev,
          [key]: prev[key].map((ev) => (ev._id === editId ? updated.data : ev)),
        }));
        setEditId(null);
        toast.success('Event Updated Successfully 🎉');
      } else {
        await axios.post('http://localhost:3001/events', eventData, {
          headers: { 'auth-token': token },
        });
        toast.success('Event Created Successfully 🎉');
      }

      setInputEvent('');
      setInputTime('');
      setInputDescription('');
      setShowPrompt(false);
    } catch (err) {
      toast.error('Something went wrong ❌');
      console.error('❌ Error saving event:', err.response?.data || err.message);
    }
  };

  const deleteEvent = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3001/events/${id}`, {
        headers: { 'auth-token': token },
      });
      if (selectedDate) {
        const key = selectedDate.toDateString();
        setEvents((prev) => ({
          ...prev,
          [key]: prev[key].filter((ev) => ev._id !== id),
        }));
        toast.success('Event Deleted Successfully 🎉');
      }
    } catch (err) {
      console.error('❌ Error deleting event:', err.message);
      toast.error('Something went wrong ❌');
    }
  };

  const handleEdit = (event) => {
    setEditId(event._id);
    setInputEvent(event.title);
    setInputTime(event.time);
    setInputDescription(event.description || '');
    setShowPrompt(true);
  };

  const tileContent = ({ date }) => {
    const key = date.toDateString();
    return events[key] ? <span className="text-yellow-400 font-bold animate-pulse">★</span> : null;
  };

  return (
    <div className="relative min-h-screen p-8 rounded-3xl overflow-hidden">
      {/* 🔹 Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-indigo-700 to-blue-800"></div>
      <div className="absolute top-20 left-10 w-40 h-40 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full opacity-20 animate-spin-slow"></div>
      <div className="absolute bottom-20 right-10 w-44 h-44 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-xl opacity-20 animate-pulse"></div>

      {/* 🔹 Foreground Content */}
      <div className="relative z-10 flex flex-col lg:flex-row gap-6">
        
        {/* Event List */}
        <div className="bg-white/20 backdrop-blur-lg shadow-2xl rounded-3xl p-6 w-[320px] h-[85vh] overflow-y-auto transform transition hover:scale-[1.02]">
          {selectedDate && (
            <div>
              <h4 className="text-lg font-bold mb-4 text-white drop-shadow">
                {isPastDate(selectedDate) ? 'Held Events' : 'Upcoming Events'}
              </h4>
              <ul className="space-y-3">
                {(events[selectedDate.toDateString()] || [])
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((ev) => (
                    <li key={ev._id} className="p-4 bg-white/30 rounded-xl shadow-md hover:shadow-lg transition">
                      <span className="text-sm block text-gray-900">📅 {selectedDate.toDateString()}</span>
                      <span className="text-sm block">🕒 {ev.time}</span>
                      <span className="text-md font-semibold">{ev.title}</span>
                      <span className="text-sm text-gray-700">👤 {ev.user?.name || ev.user?.email || 'Unknown'}</span>
                      <span className="text-sm italic text-gray-600">📝 {ev.description || 'No description provided.'}</span>
                      {!isPastDate(selectedDate) && (
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => handleEdit(ev)} className="text-blue-600 hover:text-blue-800">
                            <MdEditCalendar size={20} />
                          </button>
                          <button onClick={() => deleteEvent(ev._id)} className="text-red-600 hover:text-red-800">
                            <MdDeleteForever size={20} />
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>

        {/* Calendar */}
        <div className="bg-white/20 backdrop-blur-lg shadow-2xl rounded-3xl p-6 transform transition hover:scale-[1.02]">
          <Calendar
            onClickDay={handleDateClick}
            value={value}
            onChange={setValue}
            tileContent={tileContent}
            className="bg-transparent border-0 text-black rounded-2xl shadow-lg "
          />
        </div>

        {/* Right Panel */}
        <div className="w-[420px] h-[85vh]">
          <RightPanel />
        </div>
      </div>

      {/* Prompt (Add/Edit Event) */}
      {showPrompt && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md transform transition hover:scale-[1.02]">
            <h2 className="text-lg font-bold mb-4 text-center border-b pb-2">
              {isPastDate(selectedDate) ? 'Events on' : 'Manage Events for'} {selectedDate.toDateString()}
            </h2>
            <input
              type="text"
              value={inputEvent}
              onChange={(e) => setInputEvent(e.target.value)}
              placeholder="Event title..."
              className="w-full border rounded-xl px-3 py-2 mb-3 focus:ring-2 focus:ring-blue-400"
            />
            <input
              type="text"
              value={inputDescription}
              onChange={(e) => setInputDescription(e.target.value)}
              placeholder="Event description..."
              className="w-full border rounded-xl px-3 py-2 mb-3 focus:ring-2 focus:ring-blue-400"
            />
            <input
              type="time"
              value={inputTime}
              onChange={(e) => setInputTime(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 mb-4 focus:ring-2 focus:ring-blue-400"
            />
            <div className="flex justify-between">
              <button onClick={addOrUpdateEvent} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow-md">
                {editId ? 'Update' : 'Add'}
              </button>
              <button onClick={() => setShowPrompt(false)} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-xl shadow-md">
                <IoMdClose size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
