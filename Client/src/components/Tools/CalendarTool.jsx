import React from 'react';
import CalendarView from '../Calendar/CalendarView';

const CalendarTool = () => (
  <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6 lg:p-8">
    <div className="max-w-7xl mx-auto">
      <CalendarView />
    </div>
  </div>
);

export default CalendarTool;