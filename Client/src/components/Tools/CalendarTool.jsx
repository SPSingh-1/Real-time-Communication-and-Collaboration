import React from 'react';
import CalendarView from '../Calendar/CalendarView';

const CalendarTool = () => (
  <div className="relative min-h-screen flex flex-col items-center justify-start p-8 overflow-hidden">
    {/* 🔹 Background Gradient */}
    <div className="absolute inset-0 bg-gradient-to-br from-purple-800 via-indigo-700 to-blue-900"></div>

    {/* 🔹 Floating Background Blobs */}
    <div className="absolute top-20 left-16 w-60 h-60 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full opacity-25 blur-3xl animate-pulse"></div>
    <div className="absolute bottom-20 right-16 w-72 h-72 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full opacity-25 blur-3xl animate-spin-slow"></div>

    {/* 🔹 Header */}
    <h1 className="relative z-10 text-center text-5xl font-extrabold text-white drop-shadow-2xl mb-10 animate-bounce">
      📆 Calendar Collaboration Hub
    </h1>

    {/* 🔹 Main Calendar View (3D tilt container) */}
    <div className="relative z-10 w-full max-w-[1400px] transform transition duration-500 hover:rotate-1 hover:scale-[1.01]">
      <CalendarView />
    </div>
  </div>
);

export default CalendarTool;
