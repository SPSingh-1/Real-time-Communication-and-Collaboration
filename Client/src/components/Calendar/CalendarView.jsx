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
    setShowPrompt(true); // Always show prompt to view events
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
    return events[key] ? <span className="text-yellow-500 font-bold animate-pulse">★</span> : null;
  };

  return (
    <div className="p-1 max-w-5xl mx-[40px] animate-fadeIn transition-all duration-500">
      <div className="flex flex-col lg:flex-row gap-4 p-1">
        <div className="bg-white shadow-xl rounded-2xl p-6 max-h-96 overflow-y-auto w-[300px] transition-transform hover:scale-105">
         {selectedDate && (
  <div className="mt-6 bg-gray-50 rounded-xl p-4 shadow-md animate-fadeInUp">
    <h4 className="text-lg font-bold mb-3 border-b-2 border-gray-200">
      {isPastDate(selectedDate) ? 'Held Events' : 'Upcoming Events'}
    </h4>
    <ul className="space-y-3">
      {(events[selectedDate.toDateString()] || [])
        .sort((a, b) => a.time.localeCompare(b.time))
        .map((ev) => (
          <li key={ev._id} className="flex flex-col space-y-1 p-3 bg-white rounded-xl shadow hover:shadow-lg transition-all">
            <span className="text-sm">📅 {selectedDate.toDateString()}</span>
            <span className="text-sm">🕒 {ev.time}</span>
            <span className="text-md font-semibold">{ev.title}</span>
            <span className="text-sm text-gray-700">👤 {ev.user?.name || ev.user?.email || 'Unknown'}</span>
            <span className="text-sm italic text-gray-500">📝 {ev.description || 'No description provided.'}</span>
          </li>
        ))}
    </ul>
  </div>
)}
</div>

        <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition duration-300">
          <div className="flex-1 w-[300px] space-y-4">
            <Calendar
              onClickDay={handleDateClick}
              value={value}
              onChange={setValue}
              tileContent={tileContent}
              className="w-[30%] border-0 transition-transform hover:scale-105"
            />
          </div>
        </div>

        <div className="w-[40%] max-h-96 overflow-y-auto animate-fadeIn">
          <RightPanel />
        </div>
      </div>

      {showPrompt && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md transition-all scale-95 hover:scale-100">
            <h2 className="text-lg font-bold mb-4 text-center border-b pb-2">
              {isPastDate(selectedDate) ? 'Events on' : 'Manage Events for'} {selectedDate.toDateString()}
            </h2>

            <ul className="max-h-32 overflow-y-auto overflow-x-hidden mb-4 space-y-2">
              {(events[selectedDate.toDateString()] || []).map((e) => (
                <li key={e._id} className="flex justify-between items-center p-2 bg-gray-50 rounded shadow-sm">
                  <div className="text-sm">
                    • {e.title} — {e.time}
                    <span className="ml-2 text-gray-600">👤 {e.user?.name || e.user?.email}</span>
                  </div>
                  {!isPastDate(selectedDate) && (
                    <div className="space-x-2">
                      <button onClick={() => handleEdit(e)} className="text-blue-600 hover:text-blue-800 transition-colors"><MdEditCalendar size={20} /></button>
                      <button onClick={() => deleteEvent(e._id)} className="text-red-600 hover:text-red-800 transition-colors"><MdDeleteForever size={20} /></button>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {!isPastDate(selectedDate) && (
              <>
                <input
                  type="text"
                  value={inputEvent}
                  onChange={(e) => setInputEvent(e.target.value)}
                  placeholder="Event title..."
                  className="w-full border rounded-md px-3 py-2 mb-3 focus:ring-2 focus:ring-blue-400 transition"
                />
                <input
                  type="text"
                  value={inputDescription}
                  onChange={(e) => setInputDescription(e.target.value)}
                  placeholder="Event description..."
                  className="w-full border rounded-md px-3 py-2 mb-3 focus:ring-2 focus:ring-blue-400 transition"
                />
                <input
                  type="time"
                  value={inputTime}
                  onChange={(e) => setInputTime(e.target.value)}
                  min={selectedDate?.toDateString() === new Date().toDateString()
                    ? new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                    : undefined}
                  className="w-full border rounded-md px-3 py-2 mb-4 focus:ring-2 focus:ring-blue-400 transition"
                />
                <div className="flex justify-between">
                  <button onClick={addOrUpdateEvent} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-md transition-transform hover:scale-105">
                    {editId ? 'Update' : 'Add'}
                  </button>
                  <button onClick={() => setShowPrompt(false)} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md shadow-md transition-transform hover:scale-105">
                    <IoMdClose size={20} />
                  </button>
                </div>
              </>
            )}

            {isPastDate(selectedDate) && (
              <div className="flex justify-end">
                <button onClick={() => setShowPrompt(false)} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md shadow-md transition-transform hover:scale-105">
                  <IoMdClose size={20} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
