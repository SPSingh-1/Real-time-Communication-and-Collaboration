// src/components/VideoConference/InCallChatAndFiles.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MessageSquare, Paperclip, Send, X, FileText, Download, Eye, UploadCloud, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { getFileViewUrl, getFileDownloadUrl } from '../../Utils/helpers';

const InCallChatAndFiles = ({
  isOpen,
  onClose,
  socket,
  roomId,
  currentUser,
  meetingHost
}) => {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'files'
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [meetingFiles, setMeetingFiles] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const chatScrollRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, activeTab]);

  // Socket listener for in-call messages & file shares
  useEffect(() => {
    if (!socket) return;

    const handleInCallMessage = (msg) => {
      setMessages(prev => [...prev, msg]);
    };

    const handleInCallFileShared = ({ file, sender, createdAt }) => {
      setMeetingFiles(prev => [file, ...prev]);
      toast.success(`${sender?.name || 'A teammate'} shared a file: ${file.filename}`);
    };

    socket.on('in-call-message', handleInCallMessage);
    socket.on('in-call-file-shared', handleInCallFileShared);

    return () => {
      socket.off('in-call-message', handleInCallMessage);
      socket.off('in-call-file-shared', handleInCallFileShared);
    };
  }, [socket]);

  // Send text message
  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!inputText.trim() || !socket) return;

    const text = inputText.trim();
    setInputText('');

    socket.emit('in-call-message', {
      roomId,
      message: text,
      sender: {
        id: currentUser?._id || currentUser?.id,
        name: currentUser?.name || 'You',
        photo: currentUser?.photo
      }
    });
  };

  // Upload meeting file
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Authentication error. Please log in again.');
      return;
    }

    setUploadingFile(true);
    setUploadProgress(10);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('isFromMeeting', 'true');
    formData.append('meetingRoom', roomId || 'general-meeting');
    formData.append('meetingHost', meetingHost?.name || currentUser?.name || 'Host');

    try {
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/chat/upload`, formData, {
        headers: {
          'auth-token': token,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      });

      if (res.data) {
        setMeetingFiles(prev => [res.data, ...prev]);
        toast.success(`Uploaded: ${file.name}`);

        // Broadcast to everyone in call
        socket.emit('in-call-file-shared', {
          roomId,
          file: res.data,
          sender: {
            id: currentUser?._id || currentUser?.id,
            name: currentUser?.name || 'Host'
          }
        });
      }
    } catch (err) {
      console.error("Error uploading meeting file:", err);
      toast.error('Failed to upload file');
    } finally {
      setUploadingFile(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-0 bottom-16 sm:bottom-20 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-2xl border-l border-slate-800 shadow-2xl z-40 flex flex-col animate-slideLeft">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
        {/* Tab Switcher */}
        <div className="flex bg-slate-800/80 p-1 rounded-lg border border-slate-700">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'chat' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat ({messages.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'files' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>Files ({meetingFiles.length})</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab 1: In-Meeting Live Chat */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages Container */}
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>No messages yet in this meeting.</p>
                <p className="text-[11px] mt-1 text-slate-600">Send notes, links, and chat in real-time!</p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = (m.sender?.id || m.sender?._id) === (currentUser?._id || currentUser?.id);
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                      <span className="font-semibold text-slate-300">{isMe ? 'You' : m.sender?.name || 'Teammate'}</span>
                      <span>•</span>
                      <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div
                      className={`px-3.5 py-2 rounded-2xl text-xs max-w-[85%] break-words ${
                        isMe
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-slate-800 border border-slate-700 text-slate-100 rounded-tl-none'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Message Input Box */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type message to meeting participants..."
              className="flex-1 bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: In-Meeting File Upload & Shared Files */}
      {activeTab === 'files' && (
        <div className="flex-1 flex flex-col min-h-0 p-4">
          {/* Upload Button */}
          <div className="mb-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              id="meeting-file-input"
            />
            <label
              htmlFor="meeting-file-input"
              className={`w-full py-3 px-4 rounded-xl border border-dashed border-blue-500/50 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer transition ${
                uploadingFile ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>{uploadingFile ? `Uploading ${uploadProgress}%...` : 'Upload & Share File in Meeting'}</span>
            </label>
          </div>

          {/* Files List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
            {meetingFiles.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>No files shared in this meeting yet.</p>
                <p className="text-[11px] mt-1 text-slate-600">Upload documents, images, or PDFs to share with everyone!</p>
              </div>
            ) : (
              meetingFiles.map((file, idx) => (
                <div key={file._id || idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center flex-shrink-0 text-sm">
                      📄
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate max-w-[140px]">
                        {file.filename}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        By {file.uploadedBy || 'Teammate'}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <a
                      href={getFileViewUrl(file.fileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title="View file"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={getFileDownloadUrl(file.fileUrl)}
                      download={file.filename || 'download'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition"
                      title="Download file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InCallChatAndFiles;
