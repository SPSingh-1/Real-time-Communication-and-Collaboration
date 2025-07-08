import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import moment from 'moment'; // Make sure moment.js is installed (npm install moment)
import { jwtDecode } from 'jwt-decode'; // Make sure jwt-decode is installed (npm install jwt-decode)

const FileUploader = () => {
  const [files, setFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [category, setCategory] = useState('all'); // 'all', 'image', 'video', 'audio', 'document', 'code'
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null); // To hold the actual file object
  const fileInputRef = useRef(null); // Ref for the file input element

  const token = localStorage.getItem('token');
  const currentUser = token ? jwtDecode(token).name : 'Guest'; // Get the current logged-in user's name

  // Effect to filter files when category or files state changes
  useEffect(() => {
    if (!Array.isArray(files)) {
      setFilteredFiles([]);
      return;
    }

    if (category === 'all') {
      setFilteredFiles(files);
    } else {
      // Determine the category based on file.fileType (MIME type)
      setFilteredFiles(
        files.filter((file) => {
          const fileMimeType = file.fileType.toLowerCase();
          if (category === 'image') return fileMimeType.startsWith('image/');
          if (category === 'video') return fileMimeType.startsWith('video/');
          if (category === 'audio') return fileMimeType.startsWith('audio/');
          if (category === 'document')
            return (
              fileMimeType.includes('pdf') ||
              fileMimeType.includes('doc') ||
              fileMimeType.includes('text') ||
              fileMimeType.includes('csv') ||
              fileMimeType.includes('excel')
            );
          if (category === 'code')
            return (
              fileMimeType.includes('javascript') ||
              fileMimeType.includes('json') ||
              fileMimeType.includes('html') ||
              fileMimeType.includes('css')
            );
          return false; // Fallback for unknown categories
        })
      );
    }
  }, [category, files]);

  // Effect to fetch files on component mount
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await axios.get('http://localhost:3001/files');
        if (Array.isArray(res.data)) {
          setFiles(res.data);
        } else {
          setFiles([]);
          console.warn('Received non-array data for files:', res.data);
        }
      } catch (err) {
        console.error('Error fetching files:', err);
        setFiles([]); // Ensure files is an array even on error
      }
    };
    fetchFiles();
  }, []); // Empty dependency array means this runs once on mount

  // Handles file selection from input
  const handleFileSelect = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  // Handles the actual file upload to the backend
  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file first!');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('username', currentUser); // Pass the current user's name

    try {
      const res = await axios.post('http://localhost:3001/general-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data', // Important for FormData
        },
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded * 100) / e.total);
          setUploadProgress(percent);
        },
      });

      // Add the new file to the beginning of the list
      setFiles((prev) => [res.data, ...prev]);
      setSelectedFile(null); // Clear selected file
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Clear the input field
      }
      setUploadProgress(0); // Reset progress
    } catch (err) {
      console.error('Upload failed:', err);
      alert('File upload failed. Please try again.');
      setUploadProgress(0); // Reset progress on error
    }
  };

  // Handles file deletion
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }
    try {
      await axios.delete(`http://localhost:3001/files/${id}`);
      setFiles((prev) => prev.filter((file) => file._id !== id)); // Remove from local state
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete file.');
    }
  };

  // Helper function to format the time/date
  const formatUploadTime = (dateString) => {
    const now = moment();
    const uploaded = moment(dateString);
    const diffDays = now.diff(uploaded, 'days');

    if (diffDays === 0) return uploaded.format('[Today at] h:mm A');
    if (diffDays === 1) return uploaded.format('[Yesterday at] h:mm A');
    if (diffDays < 7) return uploaded.format('dddd [at] h:mm A');
    return uploaded.format('MMM D, YYYY [at] h:mm A');
  };

  // Helper to get the file name for download attribute
  const getDownloadFileName = (fileUrl, originalFileName) => {
    if (originalFileName) return originalFileName;
    // Fallback: extract from URL if originalFileName is not available
    try {
      const url = new URL(fileUrl);
      const pathname = url.pathname;
      return pathname.substring(pathname.lastIndexOf('/') + 1);
    } catch (e) {
      console.error("Error parsing URL for download name:", e); // This uses 'e'
      return 'download'; // Generic name if URL is invalid
    }
  };

  // Define the types for filtering buttons and ensure they match backend MIME types
  const fileTypeCategories = [
    { name: 'All', value: 'all' },
    { name: 'Images', value: 'image' },
    { name: 'Videos', value: 'video' },
    { name: 'Audio', value: 'audio' },
    { name: 'Documents', value: 'document' },
    { name: 'Code', value: 'code' },
  ];

  return (
    <div className="container mx-auto p-4 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-extrabold mb-6 text-center text-blue-700">
        📁 Shared Files
      </h1>

      {/* Upload Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-gray-200">
        <p className="text-sm font-medium mb-4 text-gray-700">
          👤 Uploading as: <span className="font-semibold text-blue-600">{currentUser}</span>
        </p>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="flex-1 block w-full text-sm text-gray-900
                       border border-gray-300 rounded-lg cursor-pointer bg-gray-50
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-full file:border-0
                       file:text-sm file:font-semibold
                       file:bg-blue-50 file:text-blue-700
                       hover:file:bg-blue-100"
          />
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploadProgress > 0}
            className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg
                       hover:bg-blue-700 transition duration-300 ease-in-out
                       disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : 'Upload'}
          </button>
        </div>
        {uploadProgress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        )}
      </div>

      {/* Filter Buttons */}
      <div className="mb-6 flex flex-wrap gap-2 justify-center">
        {fileTypeCategories.map((type) => (
          <button
            key={type.value}
            onClick={() => setCategory(type.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition duration-300
                        ${category === type.value
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            {type.name}
          </button>
        ))}
      </div>

      {/* File List */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Available Files ({filteredFiles.length})</h2>
        {filteredFiles.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No files found in this category.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFiles.map((file) => (
              <div
                key={file._id}
                className="p-5 border border-gray-200 rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow duration-200 flex flex-col justify-between"
              >
                <div>
                  <p className="text-xl font-semibold text-gray-900 mb-2 break-words">
                    📄 {file.fileName}
                  </p>
                  <p className="text-sm text-gray-700 mb-1">
                    📤 Uploaded by: <span className="font-medium text-blue-700">{file.uploadedBy || 'N/A'}</span>
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    📅 {formatUploadTime(file.createdAt)}
                  </p>
                  <p className="text-sm text-gray-600 mb-3">
                    🗂 Type: <span className="font-medium text-gray-800">{file.fileType}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 mt-auto pt-3 border-t border-gray-100">
                  {/* View Button (opens in new tab) */}
                  <a
                    href={file.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium
                               hover:bg-indigo-600 transition duration-200"
                  >
                    View
                  </a>
                  {/* Download Button */}
                  <a
                    href={file.fileUrl}
                    download={getDownloadFileName(file.fileUrl, file.fileName)} // Use the original file name for download
                    className="flex-1 text-center bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium
                               hover:bg-yellow-600 transition duration-200"
                  >
                    Download
                  </a>
                  {/* Delete Button (conditionally rendered) */}
                  {file.uploadedBy === currentUser && (
                    <button
                      onClick={() => handleDelete(file._id)}
                      className="flex-1 text-center bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium
                                 hover:bg-red-700 transition duration-200"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploader;