import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { FaPaperclip, FaSmile, FaPlus } from "react-icons/fa";
import { FaAngleDown, FaStar, FaThumbtack } from "react-icons/fa6";
import Picker from "emoji-picker-react";
import dayjs from "dayjs";
import useAppContext from "../../context/useAppContext";
import AuthDebug from './AuthDebug';

const socket = io(`${import.meta.env.VITE_BACKEND_URL}`, {
  autoConnect: false,
});

const ChatBox = () => {
  const { user } = useAppContext();
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState("");
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const [selectedMsgIdForOptions, setSelectedMsgIdForOptions] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [userId, setUserId] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [starredMsgs, setStarredMsgs] = useState(new Set());
  const [pinnedMsgs, setPinnedMsgs] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [currentRole, setCurrentRole] = useState('single');

  // Reaction states
  const [showTriggerSmileyForMsgId, setShowTriggerSmileyForMsgId] = useState(null);
  const [showQuickReactionBarForMsgId, setShowQuickReactionBarForMsgId] = useState(null);
  const [fullPickerMessageId, setFullPickerMessageId] = useState(null);

  const fileInputRef = useRef();
  const messagesEndRef = useRef();

  const quickReactions = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !user) {
      setConnectionStatus('error');
      return;
    }

    socket.connect();
    setConnectionStatus('connecting');
    
    socket.emit("init", token);

    socket.on("initMessages", ({ userId, messages, role }) => {
      setUserId(userId);
      setMessages(messages || []);
      setCurrentRole(role || 'single');
      setConnectionStatus('connected');

      const initialStarred = new Set();
      const initialPinned = [];
      messages?.forEach((m) => {
        if (m.isStarred) initialStarred.add(m._id);
        if (m.isPinned) initialPinned.push(m);
      });
      setStarredMsgs(initialStarred);
      setPinnedMsgs(initialPinned);
    });

    socket.on("authError", (error) => {
      console.error("Auth error:", error);
      setConnectionStatus('error');
    });

    socket.on("messageError", (error) => {
      console.error("Message error:", error);
    });

    socket.on("message", (newMsg) => {
      setMessages((prev) => [...prev, newMsg]);
    });

    socket.on("messageDeleted", (id) => {
      setMessages((prev) => prev.filter((m) => m._id !== id));
      setPinnedMsgs((prev) => prev.filter((m) => m._id !== id));
      setStarredMsgs((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    });

    socket.on("messageUpdated", (updated) => {
      setMessages((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
      setPinnedMsgs((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
    });

    socket.on("message-reaction", ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
      );
      setPinnedMsgs((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
      );
    });

    return () => {
      socket.off("initMessages");
      socket.off("message");
      socket.off("messageDeleted");
      socket.off("messageUpdated");
      socket.off("message-reaction");
      socket.off("authError");
      socket.off("messageError");
      socket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pinnedMsgs]);

  // Universal click-outside logic
  useEffect(() => {
    const handleClickOutside = (event) => {
      let clickedInsideAControlledElement = false;

      const controlledElements = [
        { id: `smiley-trigger-${showTriggerSmileyForMsgId}`, condition: showTriggerSmileyForMsgId !== null },
        { id: `reaction-menu-${showQuickReactionBarForMsgId}`, condition: showQuickReactionBarForMsgId !== null },
        { id: `full-picker-${fullPickerMessageId}`, condition: fullPickerMessageId !== null },
        { id: `options-menu-${selectedMsgIdForOptions}`, condition: selectedMsgIdForOptions !== null },
        { id: `options-button-${selectedMsgIdForOptions}`, condition: selectedMsgIdForOptions !== null },
        { class: 'attachment-menu', condition: showAttachmentMenu }
      ];

      for (const element of controlledElements) {
        if (element.condition) {
          let domElement;
          if (element.id) {
            domElement = document.getElementById(element.id);
          } else if (element.class) {
            domElement = document.querySelector(`.${element.class}`);
          }
          
          if (domElement && domElement.contains(event.target)) {
            clickedInsideAControlledElement = true;
            break;
          }
        }
      }

      if (!clickedInsideAControlledElement) {
        setShowTriggerSmileyForMsgId(null);
        setShowQuickReactionBarForMsgId(null);
        setFullPickerMessageId(null);
        setSelectedMsgIdForOptions(null);
        setShowAttachmentMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [
    showTriggerSmileyForMsgId,
    showQuickReactionBarForMsgId,
    fullPickerMessageId,
    selectedMsgIdForOptions,
    showAttachmentMenu,
  ]);

  const sendMessage = () => {
    if (msg.trim() && connectionStatus === 'connected') {
      socket.emit("message", { text: msg, replyTo: replyTo?._id || null });
      setMsg("");
      setReplyTo(null);
    }
  };

  // FIXED: Updated attachment handling
  const handleAttachClick = (type) => {
    console.log("📎 Attachment type selected:", type);
    
    const acceptMap = {
      document: ".pdf,.doc,.docx,.txt,.rtf,.xls,.xlsx,.ppt,.pptx",
      image: "image/*",
      audio: "audio/*",
      video: "video/*",
    };
    
    if (!fileInputRef.current) {
      console.error("❌ File input ref not found");
      alert("File input not available. Please refresh the page.");
      return;
    }
    
    try {
      // Clear any previous value
      fileInputRef.current.value = '';
      
      // Set the accept attribute correctly
      fileInputRef.current.accept = acceptMap[type];
      console.log("📋 Set accept attribute to:", acceptMap[type]);
      
      // Close the attachment menu immediately
      setShowAttachmentMenu(false);
      
      // Trigger file selection
      fileInputRef.current.click();
      console.log("🖱️ File input dialog opened");
      
    } catch (error) {
      console.error("❌ Error in handleAttachClick:", error);
      alert("Error opening file selector. Please try again.");
    }
  };

  // FIXED: Enhanced file upload handling
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      console.log("❌ No file selected");
      return;
    }

    console.log("📁 Chat file upload started:", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      user: user?.name,
      role: currentRole
    });

    // Validate authentication
    const token = localStorage.getItem("token");
    if (!token || !user) {
      alert("Please log in to upload files");
      return;
    }

    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      alert("File size exceeds 50MB limit");
      // Clear the input
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    // Set preview for images and audio
    const reader = new FileReader();
    if (file.type.startsWith("image/")) {
      reader.onload = () => {
        setPreviewUrl(reader.result);
        setPreviewType("image");
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith("audio/")) {
      reader.onload = () => {
        setPreviewUrl(reader.result);
        setPreviewType("audio");
      };
      reader.readAsDataURL(file);
    }

    try {
      console.log("🚀 Uploading to chat endpoint...");
      
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/chat/upload`, formData, {
        headers: { 
          "auth-token": token,
          "Content-Type": "multipart/form-data"
        },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
          console.log(`Upload progress: ${percent}%`);
        },
      });

      console.log("✅ Chat file upload successful:", res.data);

      // Send file message via socket with enhanced data
      const fileName = file.name;
      const fileUrl = res.data.fileUrl;
      const fileType = res.data.type;
      const fileId = res.data._id;
      
      if (connectionStatus === 'connected') {
        socket.emit("message", { 
          text: `📎 Shared file: ${fileName}`,
          fileUrl: fileUrl,
          fileType: fileType,
          fileName: fileName,
          fileId: fileId,
          isFileMessage: true
        });
        console.log("📤 File message sent to chat");
      } else {
        console.error("❌ Cannot send file message: Socket not connected");
        alert("File uploaded but couldn't send to chat. Please refresh and try again.");
      }

      // Reset states
      setUploadProgress(0);
      setPreviewUrl(null);
      setPreviewType(null);
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (err) {
      console.error("❌ Chat file upload failed:", err);
      console.error("❌ Error details:", {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      
      setUploadProgress(0);
      setPreviewUrl(null);
      setPreviewType(null);
      
      // Enhanced error handling
      let errorMessage = "Upload failed";
      if (err.response?.status === 401) {
        errorMessage = "Authentication failed. Please log in again.";
      } else if (err.response?.status === 400) {
        errorMessage = err.response.data?.error || "Invalid file or size too large";
      } else if (err.response?.status === 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (err.code === 'NETWORK_ERROR') {
        errorMessage = "Network error. Please check your connection.";
      } else {
        errorMessage = err.response?.data?.error || err.message || "Upload failed";
      }
      
      alert(`Chat upload failed: ${errorMessage}`);
      
      // Clear file input on error
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleOptionClick = (option, msg) => {
    if (option === "copy") {
      navigator.clipboard.writeText(msg.text);
    } else if (option === "delete") {
      socket.emit("deleteMessage", msg._id);
    } else if (option === "edit") {
      const newText = prompt("Edit message:", msg.text);
      if (newText && newText.trim()) {
        socket.emit("editMessage", { id: msg._id, text: newText });
      }
    } else if (option === "reply") {
      setReplyTo(msg);
    } else if (option === "pin") {
      setPinnedMsgs((prev) => {
        const isAlreadyPinned = prev.some(p => p._id === msg._id);
        if (isAlreadyPinned) {
          return prev.filter(p => p._id !== msg._id);
        } else {
          return [msg, ...prev];
        }
      });
    } else if (option === "star") {
      setStarredMsgs((prev) => {
        const newSet = new Set(prev);
        newSet.has(msg._id) ? newSet.delete(msg._id) : newSet.add(msg._id);
        return newSet;
      });
    }
    setSelectedMsgIdForOptions(null);
  };

  const onEmojiClick = (emojiData) => {
    setMsg((prev) => prev + emojiData.emoji);
  };

  const getReactionCounts = (reactions) => {
    if (!reactions || !Array.isArray(reactions)) return {};
    const counts = {};
    reactions.forEach((r) => {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    });
    return counts;
  };

  const handleReaction = (messageId, emoji) => {
    if (userId && connectionStatus === 'connected') {
      socket.emit("react-to-message", { messageId, emoji, userId });
    } else {
      console.error("Cannot react: User ID unavailable or not connected");
    }
    setFullPickerMessageId(null);
    setShowQuickReactionBarForMsgId(null);
  };

  const getRoleDisplayName = () => {
    switch (currentRole) {
      case 'single': return 'Personal Chat';
      case 'team': return `Team Chat${user?.teamId ? ` (${user.teamId})` : ''}`;
      case 'global': return 'Global Community';
      default: return 'Chat';
    }
  };

  const getRoleDescription = () => {
    switch (currentRole) {
      case 'single': return 'Your private messages';
      case 'team': return 'Messages within your team';
      case 'global': return 'Messages from the global community';
      default: return '';
    }
  };

  const sortedMessages = [
    ...pinnedMsgs,
    ...messages.filter((m) => !pinnedMsgs.some((p) => p._id === m._id)),
  ];

  if (connectionStatus === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white">
        <div className="text-xl mb-4">Connection Error</div>
        <div className="text-gray-400">Please check your authentication and try again</div>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Reload
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full bg-gradient-to-br from-gray-900 to-gray-800">
      <AuthDebug />
      {/* ENHANCED HEADER */}
      <div className="border-b border-gray-700 bg-gradient-to-r from-blue-900/50 to-purple-900/50 backdrop-blur-sm">
        <div className="py-4 px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">{getRoleDisplayName()}</h1>
              <p className="text-sm text-gray-300">{getRoleDescription()}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span className="text-xs text-gray-400 capitalize">{connectionStatus}</span>
            </div>
          </div>
          {messages.length > 0 && (
            <div className="text-xs text-gray-400 mt-2">
              {messages.length} message{messages.length !== 1 ? 's' : ''}
              {pinnedMsgs.length > 0 && ` • ${pinnedMsgs.length} pinned`}
              {starredMsgs.size > 0 && ` • ${starredMsgs.size} starred`}
            </div>
          )}
        </div>
      </div>

      {/* MESSAGES AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
        {connectionStatus === 'connecting' && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-400">Connecting to chat...</span>
          </div>
        )}

        {sortedMessages.length === 0 && connectionStatus === 'connected' && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
            <p className="text-sm text-center">
              {currentRole === 'single' && "Start your personal conversation"}
              {currentRole === 'team' && "Be the first to message your team"}
              {currentRole === 'global' && "Join the global conversation"}
            </p>
          </div>
        )}

        {sortedMessages.map((m) => {
          const isMine = m.user?._id === userId;
          const options = isMine
            ? ["reply", "edit", "delete", "copy", "pin", "star"]
            : ["reply", "copy", "pin", "star"];
          const reactionCounts = getReactionCounts(m.reactions);
          const isPinned = pinnedMsgs.some((p) => p._id === m._id);
          const isStarred = starredMsgs.has(m._id);

          return (
            <div
              key={m._id}
              id={`message-container-${m._id}`}
              className={`relative group max-w-[85%] flex ${
                isMine ? "justify-end ml-auto" : "justify-start mr-auto"
              } mb-6`}
              onMouseEnter={() => {
                if (
                  showQuickReactionBarForMsgId !== m._id &&
                  fullPickerMessageId !== m._id
                ) {
                  setShowTriggerSmileyForMsgId(m._id);
                }
              }}
              onMouseLeave={() => {
                if (
                  showQuickReactionBarForMsgId !== m._id &&
                  fullPickerMessageId !== m._id
                ) {
                  setShowTriggerSmileyForMsgId(null);
                }
              }}
            >
              {/* MESSAGE BUBBLE */}
              <div
                className={`relative px-4 py-3 rounded-2xl text-sm break-words transition-all duration-200 min-w-[120px] shadow-lg
                  ${isMine
                    ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white border-r-4 border-blue-400 rounded-br-md"
                    : "bg-gradient-to-br from-gray-700 to-gray-800 text-white border-l-4 border-purple-500 rounded-bl-md"
                  }`}
              >
                {/* REACTION TRIGGER ICON */}
                {showTriggerSmileyForMsgId === m._id &&
                  !showQuickReactionBarForMsgId &&
                  !fullPickerMessageId && (
                    <div
                      id={`smiley-trigger-${m._id}`}
                      className={`absolute z-20 p-2 rounded-full bg-gray-800 shadow-xl text-yellow-400 text-lg cursor-pointer hover:bg-gray-700 transition-all duration-200 hover:scale-110
                        ${isMine ? "left-[-45px]" : "right-[-45px]"} top-1/2 -translate-y-1/2`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowQuickReactionBarForMsgId(m._id);
                        setShowTriggerSmileyForMsgId(null);
                      }}
                    >
                      <FaSmile />
                    </div>
                  )}

                {/* QUICK REACTION BAR */}
                {showQuickReactionBarForMsgId === m._id && (
                  <div
                    id={`reaction-menu-${m._id}`}
                    className={`absolute z-30 flex gap-2 bg-gray-800 p-2 rounded-full shadow-2xl transition-all duration-200 border border-gray-600
                      ${isMine ? "left-[-280px]" : "right-[-280px]"} top-1/2 -translate-y-1/2`}
                  >
                    {quickReactions.map((emoji, i) => (
                      <button
                        key={i}
                        className="p-2 text-xl rounded-full hover:bg-gray-600 transition-all duration-150 hover:scale-125"
                        onClick={() => handleReaction(m._id, emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                    <button
                      className="p-2 rounded-full hover:bg-gray-600 transition-all duration-150 text-white text-lg flex items-center justify-center hover:scale-125"
                      onClick={() => setFullPickerMessageId(m._id)}
                    >
                      <FaPlus />
                    </button>
                  </div>
                )}

                {/* USER NAME & ROLE INDICATOR */}
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-gray-200">
                    {m.user?.name || "Unknown"}
                    {currentRole === 'global' && (
                      <span className="ml-2 px-2 py-0.5 bg-purple-600 text-white rounded-full text-[10px]">
                        GLOBAL
                      </span>
                    )}
                    {currentRole === 'team' && (
                      <span className="ml-2 px-2 py-0.5 bg-green-600 text-white rounded-full text-[10px]">
                        TEAM
                      </span>
                    )}
                  </div>
                  {(isPinned || isStarred) && (
                    <div className="flex gap-1">
                      {isPinned && <FaThumbtack className="text-yellow-400 text-xs" />}
                      {isStarred && <FaStar className="text-yellow-300 text-xs" />}
                    </div>
                  )}
                </div>

                {/* REPLY CONTEXT */}
                {m.replyTo && (
                  <div className="text-xs italic text-gray-300 mb-2 p-2 bg-black/20 rounded border-l-2 border-gray-500">
                    <span className="font-semibold text-gray-200">
                      {m.replyTo.user?.name || "Unknown"}:
                    </span>{" "}
                    <em className="text-gray-400">{m.replyTo?.text || "Unknown message"}</em>
                  </div>
                )}

                {/* MESSAGE CONTENT */}
                <div className="text-base leading-relaxed">
                  {/* ENHANCED FILE HANDLING */}
                  {m.isFileMessage || m.fileUrl ? (
                    <div>
                      {m.text && <div className="mb-2">{m.text}</div>}
                      {m.fileUrl && (
                        <div className="mt-2">
                          {/* Image preview for image files */}
                          {m.fileType === 'image' && (
                            <div className="mb-2">
                              <img 
                                src={m.fileUrl} 
                                alt={m.fileName || "Image"} 
                                className="max-w-xs max-h-48 rounded-lg border border-gray-600 object-cover"
                                loading="lazy"
                              />
                            </div>
                          )}
                          
                          {/* Audio player for audio files */}
                          {m.fileType === 'audio' && (
                            <div className="mb-2">
                              <audio controls className="w-full max-w-xs">
                                <source src={m.fileUrl} />
                                Your browser does not support the audio element.
                              </audio>
                            </div>
                          )}
                          
                          {/* Video player for video files */}
                          {m.fileType === 'video' && (
                            <div className="mb-2">
                              <video controls className="w-full max-w-xs max-h-48 rounded-lg">
                                <source src={m.fileUrl} />
                                Your browser does not support the video element.
                              </video>
                            </div>
                          )}
                          
                          {/* Download link for all files */}
                          <a
                            href={m.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 underline text-blue-200 hover:text-blue-100 transition bg-black/20 px-3 py-2 rounded-lg hover:bg-black/30"
                          >
                            <span>📎</span>
                            <span>{m.fileName || "Download File"}</span>
                            <span className="text-xs text-gray-300">({m.fileType || "file"})</span>
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    m.text
                  )}
                </div>

                {/* TIMESTAMP */}
                <div className="text-[10px] text-gray-400 text-right mt-2">
                  {dayjs(m.createdAt).format("MMM DD, h:mm A")}
                  {m.updatedAt && m.updatedAt !== m.createdAt && (
                    <span className="ml-1 text-orange-400">(edited)</span>
                  )}
                </div>

                {/* REACTION BADGES */}
                {Object.keys(reactionCounts).length > 0 && (
                  <div
                    className={`absolute -bottom-4 ${
                      isMine ? "left-0" : "right-0"
                    } flex gap-1 flex-wrap`}
                  >
                    {Object.entries(reactionCounts).map(([emoji, count]) => (
                      <span
                        key={emoji}
                        className="bg-gray-800/90 backdrop-blur-sm text-white px-2 py-1 rounded-full text-sm shadow-lg cursor-pointer hover:scale-110 transition-all duration-200 border border-gray-600"
                        onClick={() => handleReaction(m._id, emoji)}
                      >
                        {emoji}
                        {count > 1 && (
                          <span className="ml-1 text-xs text-gray-300">{count}</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                {/* MESSAGE OPTIONS BUTTON */}
                <div
                  id={`options-button-${m._id}`}
                  className={`absolute top-2 ${
                    isMine ? "left-2" : "right-2"
                  } cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200`}
                  onClick={() =>
                    setSelectedMsgIdForOptions(
                      m._id === selectedMsgIdForOptions ? null : m._id
                    )
                  }
                >
                  <div className="p-1 rounded-full bg-black/20 hover:bg-black/40 transition">
                    <FaAngleDown className="text-xs text-gray-300" />
                  </div>
                </div>

                {/* MESSAGE OPTIONS DROPDOWN */}
                {selectedMsgIdForOptions === m._id && (
                  <div
                    id={`options-menu-${m._id}`}
                    className={`absolute z-40 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl text-sm top-8 min-w-[120px]
                      ${isMine ? "left-0" : "right-0"}`}
                  >
                    {options.map((opt) => (
                      <div
                        key={opt}
                        className="px-4 py-2 hover:bg-gray-700 cursor-pointer transition text-white first:rounded-t-lg last:rounded-b-lg"
                        onClick={() => handleOptionClick(opt, m)}
                      >
                        <span className="capitalize">{opt}</span>
                        {opt === 'pin' && isPinned && <span className="ml-2 text-yellow-400">📌</span>}
                        {opt === 'star' && isStarred && <span className="ml-2 text-yellow-300">⭐</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* FULL EMOJI PICKER */}
              {fullPickerMessageId === m._id && (
                <div
                  id={`full-picker-${m._id}`}
                  className={`absolute z-50 ${
                    isMine ? "left-0" : "right-0"
                  } bottom-12 shadow-2xl rounded-lg overflow-hidden`}
                >
                  <Picker
                    onEmojiClick={(emojiData) =>
                      handleReaction(m._id, emojiData.emoji)
                    }
                    height={350}
                    width={300}
                    emojiVersion="1.0"
                    theme="dark"
                  />
                </div>
              )}
            </div>
          );
        })}

        {uploadProgress > 0 && (
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
            <div className="text-xs text-gray-400 mt-1 text-center">
              Uploading... {uploadProgress}%
            </div>
          </div>
        )}

        {previewUrl && previewType === "image" && (
          <div className="mt-2 flex justify-center">
            <img
              src={previewUrl}
              alt="preview"
              className="max-w-xs rounded-lg shadow-lg border border-gray-600"
            />
          </div>
        )}

        {previewUrl && previewType === "audio" && (
          <div className="mt-2 flex justify-center">
            <audio controls className="rounded-lg">
              <source src={previewUrl} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ENHANCED INPUT BAR */}
      <div className="border-t border-gray-700 p-4 bg-gradient-to-r from-gray-800/90 to-gray-900/90 backdrop-blur-sm">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* REPLY PREVIEW */}
        {replyTo && (
          <div className="text-sm text-gray-300 mb-3 p-3 bg-gray-800/50 rounded-lg border border-gray-600">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-semibold text-blue-400">
                  Replying to {replyTo.user?.name || "Unknown"}:
                </span>
                <div className="text-gray-400 italic mt-1">{replyTo.text}</div>
              </div>
              <button
                className="text-gray-400 hover:text-white transition ml-3"
                onClick={() => setReplyTo(null)}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* ATTACHMENT BUTTON */}
          <div className="relative">
            <button
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              className="text-xl p-3 rounded-full hover:bg-gray-700 transition-all duration-200 text-blue-400 hover:text-blue-300 hover:scale-110"
            >
              <FaPaperclip />
            </button>
            {showAttachmentMenu && (
              <div className="attachment-menu absolute bottom-full mb-2 left-0 z-50 bg-gray-800 border border-gray-600 shadow-2xl rounded-lg overflow-hidden">
                {[
                  { type: "document", label: "📄 Document", desc: "PDF, DOC, TXT, Excel" },
                  { type: "image", label: "🖼️ Photo", desc: "JPG, PNG, GIF" },
                  { type: "audio", label: "🎧 Audio", desc: "MP3, WAV" },
                  { type: "video", label: "🎥 Video", desc: "MP4, MOV" },
                ].map((item) => (
                  <div
                    key={item.type}
                    className="cursor-pointer p-3 hover:bg-gray-700 transition text-white min-w-[180px] border-b border-gray-700 last:border-b-0"
                    onClick={() => handleAttachClick(item.type)}
                  >
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-gray-400">{item.desc}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* EMOJI BUTTON */}
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-xl p-3 rounded-full hover:bg-gray-700 transition-all duration-200 text-yellow-400 hover:text-yellow-300 hover:scale-110"
          >
            <FaSmile />
          </button>

          {/* MESSAGE INPUT */}
          <input
            type="text"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            className="flex-1 border border-gray-600 bg-gray-800/50 backdrop-blur-sm p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400 transition-all duration-200"
            placeholder={`Type a message to ${getRoleDisplayName().toLowerCase()}...`}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={connectionStatus !== 'connected'}
          />

          {/* SEND BUTTON */}
          <button
            onClick={sendMessage}
            disabled={!msg.trim() || connectionStatus !== 'connected'}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-105"
          >
            Send
          </button>
        </div>

        {/* EMOJI PICKER */}
        {showEmojiPicker && (
          <div className="mt-3 rounded-lg overflow-hidden shadow-2xl">
            <Picker
              onEmojiClick={onEmojiClick}
              emojiVersion="1.0"
              height={350}
              width="100%"
              theme="dark"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatBox;