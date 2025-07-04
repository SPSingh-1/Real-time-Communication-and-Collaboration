import React from 'react';
import CalendarView from '../Calendar/CalendarView';

const CalendarTool = () => (
  <div className="tool-container p-6 bg-gradient-to-br from-gray-100 to-white min-h-screen">
    <h1 className="text-center text-4xl font-bold text-blue-700 mb-6 drop-shadow-sm animate-fade-in">📆 Calendar Collaboration Hub</h1>
    <CalendarView />
  </div>
);

export default CalendarTool;