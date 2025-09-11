import React from 'react';
import CalendarView from '../Calendar/CalendarView';

const CalendarTool = () => (
  <div className="relative min-h-screen flex flex-col items-center justify-start overflow-hidden
                  p-2 sm:p-4 md:p-6 lg:p-8">
    {/* 🔹 Background Gradient */}
    <div className="absolute inset-0 bg-gradient-to-br from-purple-800 via-indigo-700 to-blue-900"></div>
     
    {/* 🔹 Floating Background Blobs - Responsive sizing and positioning */}
    <div className="absolute 
                    top-10 left-4 w-32 h-32
                    sm:top-16 sm:left-8 sm:w-40 sm:h-40
                    md:top-20 md:left-12 md:w-52 md:h-52
                    lg:top-20 lg:left-16 lg:w-60 lg:h-60
                    bg-gradient-to-r from-pink-500 to-purple-600 rounded-full 
                    opacity-20 sm:opacity-25 blur-2xl sm:blur-3xl animate-pulse"></div>
    
    <div className="absolute 
                    bottom-10 right-4 w-36 h-36
                    sm:bottom-16 sm:right-8 sm:w-44 sm:h-44
                    md:bottom-20 md:right-12 md:w-60 md:h-60
                    lg:bottom-20 lg:right-16 lg:w-72 lg:h-72
                    bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full 
                    opacity-20 sm:opacity-25 blur-2xl sm:blur-3xl animate-spin-slow"></div>
     
    {/* 🔹 Header - Responsive text sizing */}
    <h1 className="relative z-10 text-center font-extrabold text-white drop-shadow-2xl 
                   mb-4 sm:mb-6 md:mb-8 lg:mb-10
                   text-2xl sm:text-3xl md:text-4xl lg:text-5xl
                   animate-bounce px-2 sm:px-4">
      <span className="inline-block mr-2">📆</span>
      <span className="hidden sm:inline">Calendar Collaboration Hub</span>
      <span className="sm:hidden">Calendar Hub</span>
    </h1>
     
    {/* 🔹 Main Calendar View - Responsive container */}
    <div className="relative z-10 w-full 
                    max-w-sm sm:max-w-md md:max-w-4xl lg:max-w-[1400px]
                    transform transition-all duration-500 
                    hover:rotate-0 sm:hover:rotate-1 
                    hover:scale-[1.005] sm:hover:scale-[1.01]
                    mx-2 sm:mx-4 md:mx-6">
      <div className="bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl md:rounded-2xl 
                      shadow-xl border border-white/20 overflow-hidden">
        <CalendarView />
      </div>
    </div>
  </div>
);

export default CalendarTool;