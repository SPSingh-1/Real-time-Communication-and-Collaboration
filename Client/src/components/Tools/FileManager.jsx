import React from 'react';
import FileUploader from '../FileUpload/FileUploader';

const FileManager = () => (
  // The main container for the File Manager tool
  <div className="
    min-h-screen flex flex-col items-center justify-center py-8 px-4 sm:px-6 lg:px-8
    bg-gradient-to-br from-blue-50 to-indigo-100 font-inter
  ">
    {/* Card-like container for the content */}
    <div className="
      max-w-5xl w-full bg-white p-8 rounded-xl shadow-2xl border border-blue-200
      transform transition-all duration-300 hover:scale-[1.005]
    ">
      {/* Heading for the File Manager */}
      <h2 className="
        text-4xl font-extrabold text-center text-blue-800 mb-8
        tracking-tight leading-tight
        drop-shadow-sm
      ">
        🚀 File Manager Hub
      </h2>

      {/* The FileUploader component is rendered here */}
      <FileUploader />
    </div>
  </div>
);

export default FileManager;
