import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import moment from 'moment';
import { jwtDecode } from 'jwt-decode';
import toast, { Toaster } from 'react-hot-toast';

const FileUploader = () => {
    const [files, setFiles] = useState([]);
    const [chatFiles, setChatFiles] = useState([]);
    const [filteredFiles, setFilteredFiles] = useState([]);
    const [filteredChatFiles, setFilteredChatFiles] = useState([]);
    const [category, setCategory] = useState('all');
    const [chatCategory, setChatCategory] = useState('all');
    const [activeTab, setActiveTab] = useState('uploader');
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
            console.log("❌ No token found in localStorage");
            setIsTokenValid(false);
            return null;
        }

        try {
            const decodedToken = jwtDecode(token);
            console.log("🔍 Raw decoded token:", decodedToken);

            // Handle different token structures
            const userId = decodedToken.user?.id || decodedToken.id;
            const userName = decodedToken.name || decodedToken.username || decodedToken.user?.name || 'Guest';
            const userRole = decodedToken.role || 'single';
            const teamId = decodedToken.teamId || decodedToken.user?.teamId || null;

            if (!userId) {
                console.log("❌ No user ID found in token");
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

            console.log("✅ Extracted user info:", userInfo);

            setCurrentUserName(userName);
            setCurrentUserId(userId);
            setCurrentUserRole(userRole);
            setCurrentTeamId(teamId);
            setIsTokenValid(true);

            return userInfo;

        } catch (error) {
            console.error("❌ Error decoding token:", error);
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
            await axios.get('http://localhost:3001/files', {
                headers: { 'auth-token': token }
            });
            console.log("✅ Token validation successful");
            return true;
        } catch (error) {
            console.error("❌ Token validation failed:", error.response?.data || error.message);
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

    // Fetch regular files with better error handling
    useEffect(() => {
        const fetchFiles = async () => {
            if (!currentUserId || !isTokenValid) {
                console.log("⏳ Skipping file fetch: no user ID or invalid token");
                return;
            }

            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    toast.error("Authentication required");
                    return;
                }

                console.log("🔄 Fetching regular files...");
                const res = await axios.get('http://localhost:3001/files', {
                    headers: { 'auth-token': token }
                });
                
                console.log("✅ Regular files response:", res.data);
                
                if (Array.isArray(res.data)) {
                    setFiles(res.data);
                } else {
                    setFiles([]);
                    console.warn('Received non-array data for files:', res.data);
                }
            } catch (err) {
                console.error('❌ Error fetching files:', err);
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
                console.log("⏳ Skipping chat files fetch: no user ID or invalid token");
                return;
            }

            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                console.log("🔄 Fetching chat files...");
                const res = await axios.get('http://localhost:3001/api/chat/files', {
                    headers: { 'auth-token': token }
                });
                
                console.log("✅ Chat files response:", res.data);
                
                if (Array.isArray(res.data)) {
                    setChatFiles(res.data);
                } else {
                    setChatFiles([]);
                }
            } catch (err) {
                console.error('❌ Error fetching chat files:', err);
                setChatFiles([]);
                
                if (err.response?.status === 401) {
                    setIsTokenValid(false);
                    toast.error("Authentication failed for chat files. Please log in again.");
                }
            }
        };

        fetchChatFiles();
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

        // Test token validity first
        const tokenValid = await testTokenValidity();
        if (!tokenValid) {
            toast.error('Authentication failed. Please log in again.');
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);

        const token = localStorage.getItem('token');
        console.log("🚀 Starting upload with token present:", !!token);
        console.log("📁 File info:", {
            name: selectedFile.name,
            size: selectedFile.size,
            type: selectedFile.type
        });

        const uploadPromise = axios.post('http://localhost:3001/collab_uploads', formData, {
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
                console.log("✅ Upload successful:", res.data);
                setFiles((prev) => [res.data, ...prev]);
                setSelectedFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                setUploadProgress(0);
                return `File "${truncateFileName(res.data.filename, 30)}" uploaded successfully!`;
            },
            error: (err) => {
                console.error('❌ Upload failed:', err);
                console.error('❌ Error response:', err.response?.data);
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

            const endpoint = isChat ? `http://localhost:3001/api/chat/files/${id}` : `http://localhost:3001/files/${id}`;

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
    const FileCard = ({ file, isChat = false }) => {
        const isOwner = file.uploadedById === currentUserId;
        const canDelete = canDeleteFile(file);
        
        return (
            <div
                className="group relative bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl 
                         rounded-3xl border border-white/20 p-6 shadow-2xl
                         transform hover:scale-105 hover:rotate-2 transition-all duration-700
                         hover:shadow-cyan-500/20 cursor-pointer perspective-1000"
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
                        <div className="flex items-center gap-2">
                            {/* Scope indicator */}
                            <div className={`w-3 h-3 rounded-full shadow-lg animate-pulse ${
                                file.scope === 'single' ? 'bg-blue-400 shadow-blue-400/50' :
                                file.scope === 'team' ? 'bg-green-400 shadow-green-400/50' :
                                file.scope === 'global' ? 'bg-purple-400 shadow-purple-400/50' : 
                                'bg-gray-400 shadow-gray-400/50'
                            }`}></div>
                            {isOwner && (
                                <div className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded-full">
                                    YOURS
                                </div>
                            )}
                            {isChat && (
                                <div className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
                                    CHAT
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <h3 className="text-white font-bold text-lg mb-3 break-words group-hover:text-cyan-300 transition-colors duration-300">
                        {truncateFileName(file.filename)}
                    </h3>
                    
                    <div className="space-y-2 text-sm text-white/70 mb-6">
                        <p>📤 <span className="text-cyan-300">{file.uploadedBy || 'N/A'}</span></p>
                        <p>📅 {formatUploadTime(file.createdAt)}</p>
                        <p>🗂 <span className="capitalize text-purple-300">{file.type}</span></p>
                        <p>🌐 <span className={`capitalize font-semibold ${
                            file.scope === 'single' ? 'text-blue-300' :
                            file.scope === 'team' ? 'text-green-300' :
                            file.scope === 'global' ? 'text-purple-300' : 'text-gray-300'
                        }`}>{file.scope}</span></p>
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
                        <a
                            href={file.fileUrl}
                            download={getDownloadFileName(file.fileUrl, file.filename)}
                            className="flex-1 text-center bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-2 px-3 rounded-xl text-xs font-medium
                                     hover:from-emerald-600 hover:to-teal-600 transform hover:scale-105 transition-all duration-300 shadow-lg"
                            onClick={() => toast.success('Download started!')}
                        >
                            ⬇️ Get
                        </a>
                        {canDelete && (
                            <button
                                onClick={() => handleDelete(file._id, isChat)}
                                className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white py-2 px-3 rounded-xl text-xs font-medium
                                         hover:from-red-600 hover:to-pink-600 transform hover:scale-105 transition-all duration-300 shadow-lg"
                            >
                                🗑️ Del
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Authentication status component
    const AuthStatus = () => (
        <div className={`mb-6 p-4 rounded-xl ${isTokenValid ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
            <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isTokenValid ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                <span className="text-white font-medium">
                    {isTokenValid ? 
                        `✅ Authenticated as ${currentUserName} (${currentUserRole})` : 
                        '❌ Authentication Required'
                    }
                </span>
                {!isTokenValid && (
                    <button 
                        onClick={validateAndDecodeToken}
                        className="ml-auto px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
                    >
                        Retry
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
            </div>

            <Toaster position="top-center" reverseOrder={false} />

            {/* ENHANCED HEADER with Role Information */}
            <div className="text-center mb-12 relative z-10">
                <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 text-transparent bg-clip-text drop-shadow-2xl transform hover:scale-105 transition-transform duration-500">
                    📁 {getRoleDisplayName()}
                    <div className="w-32 h-1 bg-gradient-to-r from-cyan-400 to-purple-400 mx-auto rounded-full shadow-lg shadow-cyan-400/50"></div>
                </h1>
                <p className="text-white/80 text-lg mb-4">{getRoleDescription()}</p>
                
                {/* Role Badge */}
                <div className="flex justify-center mb-4">
                    <span className={`px-6 py-2 rounded-full text-white font-semibold text-sm shadow-lg ${
                        currentUserRole === 'single' ? 'bg-blue-600' :
                        currentUserRole === 'team' ? 'bg-green-600' :
                        currentUserRole === 'global' ? 'bg-purple-600' : 'bg-gray-600'
                    }`}>
                        {currentUserRole.toUpperCase()} MODE
                    </span>
                </div>

                {/* Authentication Status */}
                <div className="max-w-2xl mx-auto">
                    <AuthStatus />
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="max-w-4xl mx-auto mb-8 relative z-10">
                <div className="flex justify-center">
                    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-2 rounded-2xl border border-white/20 shadow-2xl">
                        <button
                            onClick={() => setActiveTab('uploader')}
                            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                                activeTab === 'uploader'
                                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg'
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            📁 File Manager
                        </button>
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ml-2 ${
                                activeTab === 'chat'
                                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg'
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            💬 Chat Files
                        </button>
                    </div>
                </div>
            </div>

            {/* Upload Section - Only show in uploader tab and if authenticated */}
            {activeTab === 'uploader' && (
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
                                <span className="ml-2 text-sm text-gray-300">({currentUserRole})</span>
                            </p>
                        </div>

                        <div className="flex flex-col lg:flex-row gap-6 items-end">
                            <div className="flex-1">
                                <label className="block text-white/80 text-sm font-medium mb-3">
                                    Select File for {getRoleDisplayName()}
                                </label>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    disabled={!isTokenValid}
                                    className="w-full text-white bg-white/10 border border-white/30 rounded-2xl p-4 backdrop-blur-sm
                                            file:mr-4 file:py-2 file:px-6 file:rounded-full file:border-0
                                            file:text-sm file:font-semibold file:bg-gradient-to-r file:from-cyan-500 file:to-purple-500
                                            file:text-white file:shadow-lg hover:file:shadow-xl file:transition-all file:duration-300
                                            hover:bg-white/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                {!isTokenValid && (
                                    <p className="text-red-400 text-sm mt-2">Please log in to upload files</p>
                                )}
                            </div>
                            <button
                                onClick={handleUpload}
                                disabled={!selectedFile || uploadProgress > 0 || !currentUserId || !isTokenValid}
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
            )}

            {/* Filter Buttons */}
            <div className="max-w-4xl mx-auto mb-12 relative z-10">
                <div className="flex flex-wrap justify-center gap-4">
                    {fileTypeCategories.map((type) => (
                        <button
                            key={type.value}
                            onClick={() => activeTab === 'uploader' ? setCategory(type.value) : setChatCategory(type.value)}
                            className={`px-6 py-3 rounded-2xl font-semibold transform hover:scale-110 hover:rotate-3
                                     transition-all duration-300 shadow-lg relative overflow-hidden group
                                     ${(activeTab === 'uploader' ? category : chatCategory) === type.value
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
                        {activeTab === 'uploader' ? '📂 Available Files' : '💬 Chat Files'} ({activeTab === 'uploader' ? filteredFiles.length : filteredChatFiles.length})
                        <div className="text-sm text-white/60 mt-2">
                            {activeTab === 'uploader' ? (
                                <>
                                    {currentUserRole === 'single' && "Your personal files"}
                                    {currentUserRole === 'team' && `Team files${currentTeamId ? ` for ${currentTeamId}` : ''}`}
                                    {currentUserRole === 'global' && "Global community files"}
                                </>
                            ) : (
                                <>
                                    {currentUserRole === 'single' && "Files shared in your personal chats"}
                                    {currentUserRole === 'team' && `Files shared in team chats${currentTeamId ? ` for ${currentTeamId}` : ''}`}
                                    {currentUserRole === 'global' && "Files shared in global community chats"}
                                </>
                            )}
                        </div>
                    </h2>

                    {!isTokenValid ? (
                        <div className="text-center py-16">
                            <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-full flex items-center justify-center">
                                <span className="text-4xl">🔒</span>
                            </div>
                            <p className="text-white/60 text-xl">
                                Authentication Required
                            </p>
                            <p className="text-white/40 text-sm mt-2">
                                Please log in to access your files
                            </p>
                        </div>
                    ) : (activeTab === 'uploader' ? filteredFiles : filteredChatFiles).length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-white/10 to-white/5 rounded-full flex items-center justify-center">
                                <span className="text-4xl">{activeTab === 'uploader' ? '📭' : '💬'}</span>
                            </div>
                            <p className="text-white/60 text-xl">
                                No files found in this category
                            </p>
                            <p className="text-white/40 text-sm mt-2">
                                {activeTab === 'uploader' ? (
                                    <>
                                        {currentUserRole === 'single' && "Upload your first personal file"}
                                        {currentUserRole === 'team' && "Be the first to share with your team"}
                                        {currentUserRole === 'global' && "Start sharing with the community"}
                                    </>
                                ) : (
                                    <>
                                        {currentUserRole === 'single' && "Share your first file in chat"}
                                        {currentUserRole === 'team' && "Share files in team chats"}
                                        {currentUserRole === 'global' && "Share files in global chats"}
                                    </>
                                )}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {(activeTab === 'uploader' ? filteredFiles : filteredChatFiles).map((file, index) => (
                                <FileCard
                                    key={file._id || index}
                                    file={file}
                                    isChat={activeTab === 'chat'}
                                />
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

            <style>{`
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