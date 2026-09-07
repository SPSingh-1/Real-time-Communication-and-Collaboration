import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import moment from 'moment';
import { jwtDecode } from 'jwt-decode';
import toast, { Toaster } from 'react-hot-toast';
import { getFileViewUrl, getFileDownloadUrl } from '../../Utils/helpers';

const FileUploader = () => {
    const [files, setFiles] = useState([]);
    const [chatFiles, setChatFiles] = useState([]);
    const [meetingFiles, setMeetingFiles] = useState([]);
    const [filteredFiles, setFilteredFiles] = useState([]);
    const [filteredChatFiles, setFilteredChatFiles] = useState([]);
    const [filteredMeetingFiles, setFilteredMeetingFiles] = useState([]);
    const [category, setCategory] = useState('all');
    const [chatCategory, setChatCategory] = useState('all');
    const [meetingCategory, setMeetingCategory] = useState('all');
    const [activeTab, setActiveTab] = useState('uploader'); // 'uploader', 'chat', 'meeting'
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isTokenValid, setIsTokenValid] = useState(false);
    const fileInputRef = useRef(null);

    // Role-based state management
    const [currentUserName, setCurrentUserName] = useState('Guest');
    const [currentUserId, setCurrentUserId] = useState(null);
    const [currentUserRole, setCurrentUserRole] = useState('single');
    const [currentTeamId, setCurrentTeamId] = useState(null);

    // Helper function to validate and decode token
    const validateAndDecodeToken = () => {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log("No token found in localStorage");
            setIsTokenValid(false);
            return null;
        }

        try {
            const decodedToken = jwtDecode(token);
            console.log("Raw decoded token:", decodedToken);

            // Handle different token structures
            const userId = decodedToken.user?.id || decodedToken.id;
            const userName = decodedToken.name || decodedToken.username || decodedToken.user?.name || 'Guest';
            const userRole = decodedToken.role || 'single';
            const teamId = decodedToken.teamId || decodedToken.user?.teamId || null;

            if (!userId) {
                console.log("No user ID found in token");
                setIsTokenValid(false);
                toast.error("Invalid token: No user ID found. Please log in again.");
                return null;
            }

            const userInfo = {
                id: userId,
                name: userName,
                role: userRole,
                teamId: teamId
            };

            console.log("Extracted user info:", userInfo);

            setCurrentUserName(userName);
            setCurrentUserId(userId);
            setCurrentUserRole(userRole);
            setCurrentTeamId(teamId);
            setIsTokenValid(true);

            return userInfo;

        } catch (error) {
            console.error("Error decoding token:", error);
            setCurrentUserName('Guest');
            setCurrentUserId(null);
            setCurrentUserRole('single');
            setCurrentTeamId(null);
            setIsTokenValid(false);
            toast.error("Session expired or invalid token. Please log in again.");
            return null;
        }
    };

    // Effect to decode token and set current user info
    useEffect(() => {
        validateAndDecodeToken();
    }, []);

    // Test token validity with a simple API call
    const testTokenValidity = async () => {
        const token = localStorage.getItem('token');
        if (!token) return false;

        try {
            // Try a simple authenticated request
            await axios.get(`${import.meta.env.VITE_BACKEND_URL}/files`, {
                headers: { 'auth-token': token }
            });
            console.log("Token validation successful");
            return true;
        } catch (error) {
            console.error("Token validation failed:", error.response?.data || error.message);
            if (error.response?.status === 401) {
                toast.error("Authentication failed. Please log in again.");
                setIsTokenValid(false);
            }
            return false;
        }
    };

    // Effect to filter regular files
    useEffect(() => {
        if (!Array.isArray(files)) {
            setFilteredFiles([]);
            return;
        }

        let filtered = files;
        if (category !== 'all') {
            filtered = files.filter((file) => file.type === category);
        }
        setFilteredFiles(filtered);
    }, [category, files]);

    // Effect to filter chat files
    useEffect(() => {
        if (!Array.isArray(chatFiles)) {
            setFilteredChatFiles([]);
            return;
        }

        let filtered = chatFiles;
        if (chatCategory !== 'all') {
            filtered = chatFiles.filter((file) => file.type === chatCategory);
        }
        setFilteredChatFiles(filtered);
    }, [chatCategory, chatFiles]);

    // Apply filtering for meeting files
    useEffect(() => {
        if (!Array.isArray(meetingFiles)) {
            setFilteredMeetingFiles([]);
            return;
        }

        let filtered = meetingFiles;
        if (meetingCategory !== 'all') {
            filtered = meetingFiles.filter((file) => file.type === meetingCategory);
        }
        setFilteredMeetingFiles(filtered);
    }, [meetingCategory, meetingFiles]);

    // Fetch regular files with better error handling
    useEffect(() => {
        const fetchFiles = async () => {
            if (!currentUserId || !isTokenValid) {
                console.log("Skipping file fetch: no user ID or invalid token");
                return;
            }

            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    toast.error("Authentication required");
                    return;
                }

                console.log("Fetching regular files...");
                const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/files`, {
                    headers: { 'auth-token': token }
                });
                
                console.log("Regular files response:", res.data);
                
                if (Array.isArray(res.data)) {
                    setFiles(res.data);
                } else {
                    setFiles([]);
                    console.warn('Received non-array data for files:', res.data);
                }
            } catch (err) {
                console.error('Error fetching files:', err);
                setFiles([]);
                
                if (err.response?.status === 401) {
                    setIsTokenValid(false);
                    toast.error("Authentication failed. Please log in again.");
                } else {
                    const errorMsg = err.response?.data?.error || "Failed to load files";
                    toast.error(errorMsg);
                }
            }
        };

        fetchFiles();
    }, [currentUserId, currentUserRole, currentTeamId, isTokenValid]);

    // Fetch chat files with better error handling
    useEffect(() => {
        const fetchChatFiles = async () => {
            if (!currentUserId || !isTokenValid) {
                console.log("Skipping chat files fetch: no user ID or invalid token");
                return;
            }

            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                console.log("Fetching chat files...");
                const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/chat/files`, {
                    headers: { 'auth-token': token }
                });
                
                if (Array.isArray(res.data)) {
                    setChatFiles(res.data);
                } else {
                    setChatFiles([]);
                }
            } catch (err) {
                console.error('Error fetching chat files:', err);
                setChatFiles([]);
                
                if (err.response?.status === 401) {
                    setIsTokenValid(false);
                }
            }
        };

        fetchChatFiles();
    }, [currentUserId, currentUserRole, currentTeamId, isTokenValid]);

    // Fetch meeting files with meeting & host metadata
    useEffect(() => {
        const fetchMeetingFiles = async () => {
            if (!currentUserId || !isTokenValid) return;

            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                console.log("Fetching meeting files...");
                const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/chat/meeting-files`, {
                    headers: { 'auth-token': token }
                });

                if (Array.isArray(res.data)) {
                    setMeetingFiles(res.data);
                } else {
                    setMeetingFiles([]);
                }
            } catch (err) {
                console.error('Error fetching meeting files:', err);
                setMeetingFiles([]);
            }
        };

        fetchMeetingFiles();
    }, [currentUserId, currentUserRole, currentTeamId, isTokenValid]);

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

    // Enhanced file upload with better authentication handling
    const handleUpload = async () => {
        if (!selectedFile) {
            toast.error('Please select a file first!');
            return;
        }

        if (!currentUserId || !isTokenValid) {
            toast.error('You must be logged in to upload files.');
            return;
        }

        if (selectedFile.size > 5 * 1024 * 1024) {
            toast.error('File size exceeds the 5MB limit. Please select a file smaller than 5MB.');
            return;
        }

        // Test token validity first
        const tokenValid = await testTokenValidity();
        if (!tokenValid) {
            toast.error('Authentication failed. Please log in again.');
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);

        const token = localStorage.getItem('token');
        console.log("Starting upload with token present:", !!token);
        console.log("File info:", {
            name: selectedFile.name,
            size: selectedFile.size,
            type: selectedFile.type
        });

        const uploadPromise = axios.post(`${import.meta.env.VITE_BACKEND_URL}/collab_uploads`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'auth-token': token,
            },
            onUploadProgress: (e) => {
                const percent = Math.round((e.loaded * 100) / e.total);
                setUploadProgress(percent);
            },
        });

        toast.promise(uploadPromise, {
            loading: 'Uploading file...',
            success: (res) => {
                console.log("Upload successful:", res.data);
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
                console.error('Error response:', err.response?.data);
                setUploadProgress(0);
                
                if (err.response?.status === 401) {
                    setIsTokenValid(false);
                }
                
                const errorMessage = err.response?.data?.error || err.message || 'Unknown error';
                return `Upload failed: ${errorMessage}`;
            },
        });
    };

    // Enhanced file deletion with better authorization
    const handleDelete = async (id, isChat = false) => {
        if (!currentUserId || !isTokenValid) {
            toast.error('You must be logged in to delete files.');
            return;
        }

        const deletePromise = new Promise((resolve, reject) => {
            const fileList = isChat ? chatFiles : files;
            const fileToDelete = fileList.find(f => f._id === id);
            if (!fileToDelete) {
                reject(new Error("File not found in list."));
                return;
            }

            // Role-based authorization check
            let canDelete = false;
            if (currentUserRole === 'single') {
                canDelete = fileToDelete.uploadedById === currentUserId && fileToDelete.scope === 'single';
            } else if (currentUserRole === 'team') {
                canDelete = fileToDelete.scope === 'team' && fileToDelete.teamId === currentTeamId;
            } else if (currentUserRole === 'global') {
                canDelete = fileToDelete.scope === 'global';
            }

            if (!canDelete) {
                reject(new Error("You don't have permission to delete this file."));
                return;
            }

            const endpoint = isChat ? `${import.meta.env.VITE_BACKEND_URL}/api/chat/files/${id}` : `${import.meta.env.VITE_BACKEND_URL}/files/${id}`;

            axios.delete(endpoint, {
                headers: { 'auth-token': localStorage.getItem('token') },
            })
            .then(() => {
                if (isChat) {
                    setChatFiles((prev) => prev.filter((file) => file._id !== id));
                } else {
                    setFiles((prev) => prev.filter((file) => file._id !== id));
                }
                resolve(`File "${truncateFileName(fileToDelete.filename, 30)}" deleted successfully!`);
            })
            .catch((err) => {
                console.error('Delete failed:', err);
                if (err.response?.status === 401) {
                    setIsTokenValid(false);
                }
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

    // Role-based display helpers
    const getRoleDisplayName = () => {
        switch (currentUserRole) {
            case 'single': return 'Personal Files';
            case 'team': return `Team Files${currentTeamId ? ` (${currentTeamId})` : ''}`;
            case 'global': return 'Global Shared Files';
            default: return 'Files';
        }
    };

    const getRoleDescription = () => {
        switch (currentUserRole) {
            case 'single': return 'Your private file storage';
            case 'team': return 'Files shared within your team';
            case 'global': return 'Files shared with the global community';
            default: return 'File storage';
        }
    };

    // Check if user can delete a specific file
    const canDeleteFile = (file) => {
        if (currentUserRole === 'single') {
            return file.uploadedById === currentUserId && file.scope === 'single';
        } else if (currentUserRole === 'team') {
            return file.scope === 'team' && file.teamId === currentTeamId;
        } else if (currentUserRole === 'global') {
            return file.scope === 'global';
        }
        return false;
    };

    // Define the types for filtering buttons
    const fileTypeCategories = [
        { name: 'All', value: 'all' },
        { name: 'Images', value: 'image' },
        { name: 'Videos', value: 'video' },
        { name: 'Audio', value: 'audio' },
        { name: 'Documents', value: 'document' },
        { name: 'Code', value: 'code' },
        { name: 'Other', value: 'other' },
    ];

    // File renderer component
    const FileCard = ({ file, isChat = false, isMeeting = false }) => {
        const isOwner = file.uploadedById === currentUserId;
        const canDelete = canDeleteFile(file);
        const isFromMeeting = isMeeting || file.isFromMeeting;
        
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors flex flex-col justify-between">
                <div>
                    {/* Header with icon and badges */}
                    <div className="flex items-start justify-between mb-3">
                        <div className="text-2xl">
                            {file.type === 'image' ? '🖼️' : 
                             file.type === 'video' ? '🎥' :
                             file.type === 'audio' ? '🎵' :
                             file.type === 'document' ? '📄' :
                             file.type === 'code' ? '💻' : '📎'}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {isOwner && (
                                <span className="text-[10px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded">
                                    YOURS
                                </span>
                            )}
                            {isFromMeeting ? (
                                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
                                    MEETING
                                </span>
                            ) : isChat ? (
                                <span className="text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded">
                                    CHAT
                                </span>
                            ) : null}
                        </div>
                    </div>
                    
                    {/* File name */}
                    <h3 className="text-white font-semibold text-sm mb-2 break-words line-clamp-2">
                        {truncateFileName(file.filename, window.innerWidth < 640 ? 25 : 50)}
                    </h3>
                    
                    {/* File info */}
                    <div className="space-y-1.5 text-xs text-slate-400 mb-4">
                        {isFromMeeting && (
                            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 space-y-1 text-[11px] mb-2">
                                <p className="truncate text-blue-400 font-medium">
                                    🏢 <span className="text-slate-400">Meeting:</span> {file.meetingRoom || 'General Conference'}
                                </p>
                                <p className="truncate text-emerald-400 font-medium">
                                    👑 <span className="text-slate-400">Conducted by:</span> {file.meetingHost || 'Team Host'}
                                </p>
                            </div>
                        )}
                        <p className="truncate">👤 <span className="text-slate-300">{file.uploadedBy || 'N/A'}</span></p>
                        <p>📅 {formatUploadTime(file.createdAt)}</p>
                        <p>🗂 <span className="capitalize">{file.type}</span></p>
                        <p>🌐 <span className="capitalize font-medium text-slate-300">{file.scope}</span></p>
                    </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex gap-2 pt-3 border-t border-slate-800">
                    <a
                        href={getFileViewUrl(file.fileUrl, file.filename, file.mimetype)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center bg-slate-800 hover:bg-slate-700 text-slate-200 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors"
                        onClick={() => toast.success('Opening file!')}
                    >
                        View
                    </a>
                    <a
                        href={getFileDownloadUrl(file.fileUrl)}
                        download={getDownloadFileName(file.fileUrl, file.filename)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-2 rounded-lg text-xs font-medium transition-colors"
                        onClick={() => toast.success('Download started!')}
                    >
                        Download
                    </a>
                    {canDelete && (
                        <button
                            onClick={() => handleDelete(file._id, isChat)}
                            className="bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 py-1.5 px-2.5 rounded-lg text-xs font-medium transition-colors"
                            title="Delete file"
                        >
                            🗑️
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const currentDisplayFiles = activeTab === 'uploader'
        ? filteredFiles
        : activeTab === 'chat'
        ? filteredChatFiles
        : filteredMeetingFiles;

    const currentCategory = activeTab === 'uploader'
        ? category
        : activeTab === 'chat'
        ? chatCategory
        : meetingCategory;

    const handleCategorySelect = (val) => {
        if (activeTab === 'uploader') setCategory(val);
        else if (activeTab === 'chat') setChatCategory(val);
        else setMeetingCategory(val);
    };

    return (
        <div className="min-h-full bg-slate-950 text-slate-100 p-4 sm:p-6 max-w-7xl mx-auto">
            <Toaster position="top-center" reverseOrder={false} />

            {/* Header Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">
                            {getRoleDisplayName()}
                        </h1>
                        <p className="text-slate-400 text-xs sm:text-sm">{getRoleDescription()}</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-semibold">
                            {currentUserRole.toUpperCase()} MODE
                        </div>
                    </div>
                </div>

                {/* Authentication Status */}
                <div className="mt-4 pt-4 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isTokenValid ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
                            <span className="text-slate-300 font-medium">
                                {isTokenValid ? 
                                    `Authenticated as ${currentUserName} (${currentUserRole})` : 
                                    'Authentication Required'
                                }
                            </span>
                        </div>
                        {!isTokenValid && (
                            <button 
                                onClick={validateAndDecodeToken}
                                className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                            >
                                Retry
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Tab Navigation (3 Tabs) */}
            <div className="flex justify-center mb-6">
                <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-lg gap-1">
                    <button
                        onClick={() => setActiveTab('uploader')}
                        className={`px-4 py-2 rounded-md font-semibold text-xs transition-colors ${
                            activeTab === 'uploader'
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                        📁 File Manager
                    </button>
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`px-4 py-2 rounded-md font-semibold text-xs transition-colors ${
                            activeTab === 'chat'
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                        💬 Chat Files
                    </button>
                    <button
                        onClick={() => setActiveTab('meeting')}
                        className={`px-4 py-2 rounded-md font-semibold text-xs transition-colors ${
                            activeTab === 'meeting'
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                        📹 Meeting Files
                    </button>
                </div>
            </div>

            {/* Upload Section - Only in uploader tab */}
            {activeTab === 'uploader' && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 mb-6">
                    <div className="mb-4">
                        <h3 className="text-sm font-semibold text-white">Upload New File</h3>
                        <p className="text-xs text-slate-400">Select and upload documents or media to {getRoleDisplayName()}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            disabled={!isTokenValid}
                            className="flex-1 text-xs text-slate-300 bg-slate-950 border border-slate-800 rounded-lg p-2.5 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                        />
                        <button
                            onClick={handleUpload}
                            disabled={!selectedFile || uploadProgress > 0 || !currentUserId || !isTokenValid}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                            {uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : 'Upload File'}
                        </button>
                    </div>
                    
                    {uploadProgress > 0 && (
                        <div className="mt-4">
                            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                                <div
                                    className="bg-blue-600 h-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Filter Buttons */}
            <div className="flex flex-wrap justify-center gap-1.5 mb-6">
                {fileTypeCategories.map((type) => (
                    <button
                        key={type.value}
                        onClick={() => handleCategorySelect(type.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            currentCategory === type.value
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                        {type.name}
                    </button>
                ))}
            </div>

            {/* File List */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6">
                <div className="mb-6 pb-4 border-b border-slate-800">
                    <h2 className="text-base font-bold text-white">
                        {activeTab === 'uploader'
                            ? 'Available Files'
                            : activeTab === 'chat'
                            ? 'Chat Shared Files'
                            : 'In-Meeting Shared Files'} ({currentDisplayFiles.length})
                    </h2>
                </div>

                {!isTokenValid ? (
                    <div className="text-center py-12">
                        <div className="text-3xl mb-2">🔒</div>
                        <p className="text-slate-300 font-medium text-sm">Authentication Required</p>
                        <p className="text-slate-500 text-xs mt-1">Please log in to access your files</p>
                    </div>
                ) : currentDisplayFiles.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-3xl mb-2">
                            {activeTab === 'uploader' ? '📂' : activeTab === 'chat' ? '💬' : '📹'}
                        </div>
                        <p className="text-slate-300 font-medium text-sm">No files found in this category</p>
                        <p className="text-slate-500 text-xs mt-1">
                            {activeTab === 'meeting'
                                ? 'Files uploaded during video/voice meetings will appear here with meeting name & host info'
                                : 'Upload or share files to view them here'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {currentDisplayFiles.map((file, index) => (
                            <FileCard
                                key={file._id || index}
                                file={file}
                                isChat={activeTab === 'chat'}
                                isMeeting={activeTab === 'meeting'}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileUploader;