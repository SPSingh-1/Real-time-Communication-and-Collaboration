import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import moment from 'moment';
import { jwtDecode } from 'jwt-decode';
import toast, { Toaster } from 'react-hot-toast'; // Import toast and Toaster

const FileUploader = () => {
    const [files, setFiles] = useState([]);
    const [filteredFiles, setFilteredFiles] = useState([]);
    const [category, setCategory] = useState('all'); // 'all', 'image', 'video', 'audio', 'document', 'code', 'other'
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedFile, setSelectedFile] = useState(null); // To hold the actual file object
    const fileInputRef = useRef(null); // Ref for the file input element

    const [currentUserName, setCurrentUserName] = useState('Guest');
    const [currentUserId, setCurrentUserId] = useState(null);

    // Effect to decode token and set current user info
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decodedToken = jwtDecode(token);
                setCurrentUserName(decodedToken.name || decodedToken.username || 'Guest');
                setCurrentUserId(decodedToken.user?.id || decodedToken.id || null);
                console.log("Decoded Token Info:", {
                    name: decodedToken.name,
                    id: decodedToken.user?.id || decodedToken.id
                });
            } catch (error) {
                console.error("Error decoding token:", error);
                setCurrentUserName('Guest');
                setCurrentUserId(null);
                toast.error("Session expired or invalid token. Please log in again."); // Toast for token decode error
            }
        } else {
            setCurrentUserName('Guest');
            setCurrentUserId(null);
        }
    }, []);

    // Effect to filter files when category or files state changes
    useEffect(() => {
        if (!Array.isArray(files)) {
            setFilteredFiles([]);
            return;
        }

        if (category === 'all') {
            setFilteredFiles(files);
        } else {
            setFilteredFiles(
                files.filter((file) => file.type === category)
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
                setFiles([]);
                toast.error("Failed to load files."); // Toast for fetching error
            }
        };
        fetchFiles();
    }, []);

    // Handles file selection from input
    const handleFileSelect = (e) => {
        setSelectedFile(e.target.files[0]);
    };

    // Helper function for truncating filename
    const truncateFileName = (name, maxLength = 50) => {
        if (!name) return '';
        if (name.length <= maxLength) {
            return name;
        }
        return name.substring(0, maxLength) + '...';
    };

    // Handles the actual file upload to the backend
    const handleUpload = async () => {
        if (!selectedFile) {
            toast.error('Please select a file first!'); // Toast instead of alert
            return;
        }

        if (!currentUserId) {
            toast.error('You must be logged in to upload files.'); // Toast instead of alert
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);

        // Use toast.promise for a loading, success, and error state
        const uploadPromise = axios.post('http://localhost:3001/collab_uploads', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'auth-token': localStorage.getItem('token'),
            },
            onUploadProgress: (e) => {
                const percent = Math.round((e.loaded * 100) / e.total);
                setUploadProgress(percent);
            },
        });

        toast.promise(uploadPromise, {
            loading: 'Uploading file...',
            success: (res) => {
                setFiles((prev) => [res.data, ...prev]);
                setSelectedFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                setUploadProgress(0);
                return `File "${truncateFileName(res.data.filename, 30)}" uploaded successfully!`;
            },
            error: (err) => {
                console.error('Upload failed:', err);
                setUploadProgress(0);
                const errorMessage = err.response?.data?.error || err.message || 'Unknown error';
                return `Upload failed: ${errorMessage}`;
            },
        });
    };

    // Handles file deletion
    const handleDelete = async (id) => {
        if (!currentUserId) {
            toast.error('You must be logged in to delete files.');
            return;
        }

        // Use toast.promise for a confirmation-like flow for deletion
        // Removed 'async' from the Promise executor function to fix ESLint warning
        const deletePromise = new Promise((resolve, reject) => {
            // Fetch file details to show in confirmation toast
            const fileToDelete = files.find(f => f._id === id);
            if (!fileToDelete) {
                reject(new Error("File not found in list."));
                return;
            }

            // Perform the actual deletion
            axios.delete(`http://localhost:3001/files/${id}`, {
                headers: {
                    'auth-token': localStorage.getItem('token'),
                },
            })
            .then(() => {
                setFiles((prev) => prev.filter((file) => file._id !== id));
                resolve(`File "${truncateFileName(fileToDelete.filename, 30)}" deleted successfully!`);
            })
            .catch((err) => {
                console.error('Delete failed:', err);
                const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Unknown error';
                reject(`Failed to delete: ${errorMessage}`);
            });
        });

        toast.promise(deletePromise, {
            loading: 'Deleting file...',
            success: (message) => message,
            error: (message) => message,
        });
    };

    // Helper function to format the time/date
    const formatUploadTime = (dateString) => {
        const now = moment();
        const uploaded = moment(dateString);
        const diffDays = now.diff(uploaded, 'days');

        if (diffDays === 0) return uploaded.format('[Today at] h:mm A');
        if (diffDays === 1) return uploaded.format('[Yesterday at] h:mm A');
        if (diffDays < 7) return uploaded.format('dddd [at] h:mm A');
        return uploaded.format('MMM D,YYYY [at] h:mm A');
    };

    // Helper to get the file name for download attribute
    const getDownloadFileName = (fileUrl, originalFileName) => {
        if (originalFileName) return originalFileName;
        try {
            const url = new URL(fileUrl);
            const pathname = url.pathname;
            return pathname.substring(pathname.lastIndexOf('/') + 1);
        } catch (e) {
            console.error("Error parsing URL for download name:", e);
            return 'download';
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
        { name: 'Other', value: 'other' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
            </div>
            {/* Toaster component for displaying toasts */}
            <Toaster position="top-center" reverseOrder={false} />

            {/* Main Content */}
            <div className="text-center mb-12 relative z-10">
            <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 text-transparent bg-clip-text drop-shadow-2xl transform hover:scale-105 transition-transform duration-500">
                📁 Shared Files
                <div className="w-32 h-1 bg-gradient-to-r from-cyan-400 to-purple-400 mx-auto rounded-full shadow-lg shadow-cyan-400/50"></div>
            </h1>
            </div>

            {/* Upload Section */}
            <div className="max-w-4xl mx-auto mb-12 relative z-10">
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl transform hover:scale-[1.02] hover:rotate-1 transition-all duration-700 hover:shadow-cyan-500/25">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-3xl blur-xl -z-10"></div>

                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-3">
                                <div className="w-3 h-3 bg-red-500 rounded-full shadow-lg shadow-red-500/50"></div>
                                <div className="w-3 h-3 bg-yellow-500 rounded-full shadow-lg shadow-yellow-500/50"></div>
                                <div className="w-3 h-3 bg-green-500 rounded-full shadow-lg shadow-green-500/50"></div>
                            </div>
                            <p className="text-white/90 font-semibold">
                                👤 Uploading as: <span className="text-cyan-400">{currentUserName}</span>
                            </p>
                        </div>

                    <div className="flex flex-col lg:flex-row gap-6 items-end">
                            <div className="flex-1">
                                <label className="block text-white/80 text-sm font-medium mb-3">Select File</label>
                                <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileSelect}
                                            className="w-full text-white bg-white/10 border border-white/30 rounded-2xl p-4 backdrop-blur-sm
                                                    file:mr-4 file:py-2 file:px-6 file:rounded-full file:border-0
                                                    file:text-sm file:font-semibold file:bg-gradient-to-r file:from-cyan-500 file:to-purple-500
                                                    file:text-white file:shadow-lg hover:file:shadow-xl file:transition-all file:duration-300
                                                    hover:bg-white/20 transition-all duration-300"
                                />
                            </div>
                            <button
                                    onClick={handleUpload}
                                    disabled={!selectedFile || uploadProgress > 0 || !currentUserId}
                                    className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-2xl
                                            hover:from-cyan-600 hover:to-purple-600 transform hover:scale-105 hover:rotate-1
                                            transition-all duration-300 shadow-2xl hover:shadow-cyan-500/25
                                            disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                                            relative overflow-hidden group"
                            >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <span className="relative z-10">
                                    {uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : '🚀 Upload'}
                                </span>
                            </button>
                    </div>
                    {uploadProgress > 0 && (
                            <div className="mt-6">
                                <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-cyan-400 to-purple-500 h-full rounded-full transition-all duration-500 shadow-lg"
                                        style={{ width: `${uploadProgress}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                </div>
            </div>

            {/* Filter Buttons */}
            <div className="max-w-4xl mx-auto mb-12 relative z-10">
                <div className="flex flex-wrap justify-center gap-4">
                    {fileTypeCategories.map((type) => (
                        <button
                            key={type.value}
                            onClick={() => setCategory(type.value)}
                            className={`px-6 py-3 rounded-2xl font-semibold transform hover:scale-110 hover:rotate-3
                                     transition-all duration-300 shadow-lg relative overflow-hidden group
                                     ${category === type.value
                                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-cyan-500/50'
                                    : 'bg-white/10 text-white/90 hover:bg-white/20 backdrop-blur-sm border border-white/20'
                                }`}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <span className="relative z-10">{type.name}</span>
                        </button>
                    ))}
                </div>
            </div>
            {/* File List */}
            <div className="max-w-6xl mx-auto relative z-10">
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-8">
                    <h2 className="text-3xl font-bold text-white mb-8 text-center">
                        📂 Available Files ({filteredFiles.length})
                    </h2>

                    {filteredFiles.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-white/10 to-white/5 rounded-full flex items-center justify-center">
                                <span className="text-4xl">📭</span>
                            </div>
                            <p className="text-white/60 text-xl">No files found in this category</p>
                        </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredFiles.map((file, index) => (
                                <div
                                    key={file._id}
                                    className="group relative bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl 
                                             rounded-3xl border border-white/20 p-6 shadow-2xl
                                             transform hover:scale-105 hover:rotate-2 transition-all duration-700
                                             hover:shadow-cyan-500/20 cursor-pointer perspective-1000"
                                    style={{ 
                                        animationDelay: `${index * 100}ms`,
                                        transform: 'rotateX(5deg) rotateY(-5deg)'
                                    }}
                                >
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="text-2xl">
                                                {file.type === 'image' ? '🖼️' : 
                                                 file.type === 'video' ? '🎥' :
                                                 file.type === 'audio' ? '🎵' :
                                                 file.type === 'document' ? '📄' :
                                                 file.type === 'code' ? '💻' : '📎'}
                                            </div>
                                            <div className="w-3 h-3 bg-green-400 rounded-full shadow-lg shadow-green-400/50 animate-pulse"></div>
                                        </div>
                                        <h3 className="text-white font-bold text-lg mb-3 break-words group-hover:text-cyan-300 transition-colors duration-300">
                                            {truncateFileName(file.filename)}
                                        </h3>
                                        <div className="space-y-2 text-sm text-white/70 mb-6">
                                            <p>📤 <span className="text-cyan-300">{file.uploadedBy || 'N/A'}</span></p>
                                            <p>📅 {formatUploadTime(file.createdAt)}</p>
                                            <p>🗂 <span className="capitalize text-purple-300">{file.type}</span></p>
                                        </div>
                                        <div className="flex gap-2">
                                            <a
                                                href={file.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 text-center bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-2 px-3 rounded-xl text-xs font-medium
                                                         hover:from-blue-600 hover:to-indigo-600 transform hover:scale-105 transition-all duration-300 shadow-lg"
                                                onClick={() => toast.success('Opening file!')}
                                            >
                                                👁️ View
                                            </a>
                                            {/* Download Button */}
                                            <a
                                                href={file.fileUrl}
                                                download={getDownloadFileName(file.fileUrl, file.filename)}
                                                className="flex-1 text-center bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-2 px-3 rounded-xl text-xs font-medium
                                                         hover:from-emerald-600 hover:to-teal-600 transform hover:scale-105 transition-all duration-300 shadow-lg"
                                                onClick={() => toast.success('Download started!')}
                                            >
                                                ⬇️ Get
                                            </a>
                                            {/* Delete Button */}
                                            {currentUserId && file.uploadedById === currentUserId && (
                                                <button
                                                    onClick={() => handleDelete(file._id)}
                                                    className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white py-2 px-3 rounded-xl text-xs font-medium
                                                             hover:from-red-600 hover:to-pink-600 transform hover:scale-105 transition-all duration-300 shadow-lg"
                                                >
                                                    🗑️ Del
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
             {/* Floating particles */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-white/30 rounded-full animate-float"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${3 + Math.random() * 4}s`
                        }}
                    ></div>
                ))}
            </div>

            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(180deg); }
                }
                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }
                .perspective-1000 {
                    perspective: 1000px;
                }
            `}</style>
        </div>
    );
};


export default FileUploader;
