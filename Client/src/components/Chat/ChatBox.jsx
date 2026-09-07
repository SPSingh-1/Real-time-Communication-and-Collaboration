import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { FaPaperclip, FaSmile, FaPlus, FaBars, FaFile, FaImage, FaMusic, FaComments } from "react-icons/fa";
import { FaAngleDown, FaStar, FaThumbtack } from "react-icons/fa6";
import Picker from "emoji-picker-react";
import dayjs from "dayjs";
import useAppContext from "../../context/useAppContext";
import { getFileViewUrl, getFileDownloadUrl } from "../../Utils/helpers";
//import AuthDebug from './AuthDebug';

const socket = io(`${import.meta.env.VITE_BACKEND_URL}`, {
  autoConnect: false,
});

const DEFAULT_LANGUAGES = [
  { language: 'en', name: 'English' },
  { language: 'hi', name: 'Hindi (हिंदी)' },
  { language: 'es', name: 'Spanish (Español)' },
  { language: 'fr', name: 'French (Français)' },
  { language: 'de', name: 'German (Deutsch)' },
  { language: 'zh', name: 'Chinese (中文)' },
  { language: 'ja', name: 'Japanese (日本語)' },
  { language: 'ar', name: 'Arabic (العربية)' },
  { language: 'ru', name: 'Russian (Русский)' },
  { language: 'pt', name: 'Portuguese (Português)' },
  { language: 'it', name: 'Italian (Italiano)' },
  { language: 'bn', name: 'Bengali (বাংলা)' },
  { language: 'ur', name: 'Urdu (اردو)' },
  { language: 'ta', name: 'Tamil (தமிழ்)' },
  { language: 'te', name: 'Telugu (తెలుగు)' },
  { language: 'mr', name: 'Marathi (मराठी)' },
];

const ChatBox = ({ onToggleChatSidebar }) => {
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
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [availableLanguages, setAvailableLanguages] = useState(DEFAULT_LANGUAGES);
  const [translating, setTranslating] = useState(false);
    const [languageSearchTerm, setLanguageSearchTerm] = useState('');

  // Reaction states
  const [showTriggerSmileyForMsgId, setShowTriggerSmileyForMsgId] = useState(null);
  const [showQuickReactionBarForMsgId, setShowQuickReactionBarForMsgId] = useState(null);
  const [fullPickerMessageId, setFullPickerMessageId] = useState(null);
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = useRef();
  const messagesEndRef = useRef();

  const quickReactions = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

  useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token || !user) {
    setConnectionStatus('error');
    return;
  }

  // Prevent multiple connections
  if (socket.connected) {
    socket.disconnect();
  }

  socket.connect();
  setConnectionStatus('connecting');
  
  socket.emit("init", token);

  const handleInitMessages = ({ userId, messages, role }) => {
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
  };

  const handleNewMessage = (newMsg) => {
    setMessages((prev) => [...prev, newMsg]);
  };

  const handleMessageDeleted = (id) => {
    setMessages((prev) => prev.filter((m) => m._id !== id));
    setPinnedMsgs((prev) => prev.filter((m) => m._id !== id));
    setStarredMsgs((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const handleMessageUpdated = (updated) => {
    setMessages((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
    setPinnedMsgs((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
  };

  const handleMessageReaction = ({ messageId, reactions }) => {
    setMessages((prev) =>
      prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
    );
    setPinnedMsgs((prev) =>
      prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
    );
  };

  const handleAuthError = (error) => {
    console.error("Auth error:", error);
    setConnectionStatus('error');
  };

  const handleMessageError = (error) => {
    console.error("Message error:", error);
  };

  // Remove all existing listeners first
  socket.off("initMessages");
  socket.off("message");
  socket.off("messageDeleted");
  socket.off("messageUpdated");
  socket.off("message-reaction");
  socket.off("authError");
  socket.off("messageError");

  // Add new listeners
  socket.on("initMessages", handleInitMessages);
  socket.on("message", handleNewMessage);
  socket.on("messageDeleted", handleMessageDeleted);
  socket.on("messageUpdated", handleMessageUpdated);
  socket.on("message-reaction", handleMessageReaction);
  socket.on("authError", handleAuthError);
  socket.on("messageError", handleMessageError);

  return () => {
    socket.off("initMessages", handleInitMessages);
    socket.off("message", handleNewMessage);
    socket.off("messageDeleted", handleMessageDeleted);
    socket.off("messageUpdated", handleMessageUpdated);
    socket.off("message-reaction", handleMessageReaction);
    socket.off("authError", handleAuthError);
    socket.off("messageError", handleMessageError);
    socket.disconnect();
  };
}, [user]);

// Fetch supported languages on component mount
useEffect(() => {
  fetchSupportedLanguages();
}, []);

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
        { class: 'attachment-menu', condition: showAttachmentMenu },
        { class: 'language-selector', condition: showLanguageSelector },
        { class: 'emoji-picker-container', condition: showEmojiPicker }
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
        setShowLanguageSelector(false);
        setShowEmojiPicker(false);
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
    showLanguageSelector,
    showEmojiPicker
  ]);

  const handleInputChange = (e) => {
    setMsg(e.target.value);
  };

  const sendMessage = async () => {
    if (!msg.trim() || connectionStatus !== 'connected' || isSending) {
      return;
    }

    setIsSending(true);
    let messageText = msg.trim();
    const replyToId = replyTo?._id || null;
    
    // Ensure full sentence is translated to target language before emitting if active
    if (selectedLanguage !== 'en') {
      try {
        const translated = await translateText(messageText, selectedLanguage);
        if (translated) {
          messageText = translated;
        }
      } catch (e) {
        console.error("Translation on send error:", e);
      }
    }

    // Clear input
    setMsg("");
    setReplyTo(null);
    
    try {
      socket.emit("message", { text: messageText, replyTo: replyToId });
    } finally {
      // Reset sending state after a short delay
      setTimeout(() => setIsSending(false), 500);
    }
  };

  // FIXED: Updated attachment handling
  const handleAttachClick = (type) => {
    console.log("ðŸ“Ž Attachment type selected:", type);
    
    const acceptMap = {
      document: ".pdf,.doc,.docx,.txt,.rtf,.xls,.xlsx,.ppt,.pptx",
      image: "image/*",
      audio: "audio/*",
      video: "video/*",
    };
    
    if (!fileInputRef.current) {
      console.error("âŒ File input ref not found");
      alert("File input not available. Please refresh the page.");
      return;
    }
    
    try {
      // Clear any previous value
      fileInputRef.current.value = '';
      
      // Set the accept attribute correctly
      fileInputRef.current.accept = acceptMap[type];
      console.log("ðŸ“‹ Set accept attribute to:", acceptMap[type]);
      
      // Close the attachment menu immediately
      setShowAttachmentMenu(false);
      
      // Trigger file selection
      fileInputRef.current.click();
      console.log("ðŸ–±ï¸ File input dialog opened");
      
    } catch (error) {
      console.error("âŒ Error in handleAttachClick:", error);
      alert("Error opening file selector. Please try again.");
    }
  };

  // FIXED: Enhanced file upload handling
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      console.log("âŒ No file selected");
      return;
    }

    console.log("ðŸ“ Chat file upload started:", {
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

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds the 5MB limit. Please select a file smaller than 5MB.");
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
      console.log("ðŸš€ Uploading to chat endpoint...");
      
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

      console.log("âœ… Chat file upload successful:", res.data);

      // Send file message via socket with enhanced data
      const fileName = file.name;
      const fileUrl = res.data.fileUrl;
      const fileType = res.data.type;
      const fileId = res.data._id;
      
      if (connectionStatus === 'connected') {
        socket.emit("message", { 
          text: `ðŸ“Ž Shared file: ${fileName}`,
          fileUrl: fileUrl,
          fileType: fileType,
          fileName: fileName,
          fileId: fileId,
          isFileMessage: true
        });
        console.log("ðŸ“¤ File message sent to chat");
      } else {
        console.error("âŒ Cannot send file message: Socket not connected");
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
      console.error("âŒ Chat file upload failed:", err);
      console.error("âŒ Error details:", {
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


  // Fetch supported languages from Google Translate API (or fallback)
  const fetchSupportedLanguages = async () => {
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY;
      if (apiKey) {
        const response = await fetch(
          `https://translation.googleapis.com/language/translate/v2/languages?key=${apiKey}&target=en`
        );
        const data = await response.json();
        if (data.data?.languages?.length) {
          setAvailableLanguages(data.data.languages);
          return;
        }
      }
      setAvailableLanguages(DEFAULT_LANGUAGES);
    } catch (error) {
      console.warn('Using default language list:', error);
      setAvailableLanguages(DEFAULT_LANGUAGES);
    }
  };

  // Translate text with Google multi-lingual API (supports English & Hinglish) or free MyMemory fallback
  const translateText = async (text, targetLanguage) => {
    if (!text || !text.trim() || targetLanguage === 'en') return text;
    
    setTranslating(true);
    try {
      // 1. Google Multi-Lingual API (Handles English, Hinglish, and all language auto-detection)
      const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(text)}`;
      const gtxRes = await fetch(gtxUrl);
      if (gtxRes.ok) {
        const gtxData = await gtxRes.json();
        if (gtxData && gtxData[0] && Array.isArray(gtxData[0])) {
          const translated = gtxData[0].map(item => item[0]).join('');
          if (translated) {
            setMsg(translated);
            return translated;
          }
        }
      }

      // 2. Google Translate API key (if configured)
      const apiKey = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY;
      if (apiKey) {
        const response = await fetch(
          `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              q: text,
              target: targetLanguage,
              format: 'text'
            })
          }
        );
        const data = await response.json();
        if (data.data?.translations?.[0]?.translatedText) {
          setMsg(data.data.translations[0].translatedText);
          return data.data.translations[0].translatedText;
        }
      }

      // 3. Free fallback translation via MyMemory API
      const fallbackRes = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|${targetLanguage}`
      );
      const fallbackData = await fallbackRes.json();
      if (fallbackData.responseData?.translatedText) {
        setMsg(fallbackData.responseData.translatedText);
        return fallbackData.responseData.translatedText;
      }
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setTranslating(false);
    }
    return text;
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
    <div className="flex flex-col flex-1 h-full bg-slate-950">
      {/* ENHANCED HEADER */}
      <div className="border-b border-slate-800 bg-slate-900 flex-shrink-0">
        <div className="py-3 sm:py-4 px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {onToggleChatSidebar && (
                <button
                  onClick={onToggleChatSidebar}
                  className="p-1.5 sm:p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex-shrink-0"
                  title="Switch Chat Type"
                >
                  <FaBars className="w-4 h-4" />
                </button>
              )}
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold text-white truncate">{getRoleDisplayName()}</h1>
                <p className="text-xs sm:text-sm text-slate-400 truncate">{getRoleDescription()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className={`h-2.5 w-2.5 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span className="text-xs text-slate-400 capitalize hidden sm:inline">{connectionStatus}</span>
            </div>
          </div>
          {messages.length > 0 && (
            <div className="text-xs text-slate-400 mt-2 flex flex-wrap gap-2">
              <span>{messages.length} message{messages.length !== 1 ? 's' : ''}</span>
              {pinnedMsgs.length > 0 && <span>• {pinnedMsgs.length} pinned</span>}
              {starredMsgs.size > 0 && <span>• {starredMsgs.size} starred</span>}
            </div>
          )}
        </div>
      </div>

      {/* MESSAGES AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {connectionStatus === 'connecting' && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-slate-400">Connecting to chat...</span>
          </div>
        )}

        {sortedMessages.length === 0 && connectionStatus === 'connected' && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <div className="text-5xl mb-3">💬</div>
            <h3 className="text-base font-semibold text-slate-200 mb-1">No messages yet</h3>
            <p className="text-xs text-slate-400 text-center max-w-sm">
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
              className={`relative group max-w-[85%] sm:max-w-[70%] flex ${
                isMine ? "justify-end ml-auto" : "justify-start mr-auto"
              } mb-6 min-w-0`}
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
                className={`relative px-4 py-3 rounded-2xl text-sm break-all [overflow-wrap:anywhere] transition-all duration-200 min-w-[120px] max-w-full shadow-md
                  ${isMine
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-slate-800 border border-slate-700 text-white rounded-bl-sm"
                  }`}
              >
                {/* REACTION TRIGGER ICON */}
                {showTriggerSmileyForMsgId === m._id &&
                  !showQuickReactionBarForMsgId &&
                  !fullPickerMessageId && (
                    <div
                      id={`smiley-trigger-${m._id}`}
                      className={`absolute z-20 p-1.5 rounded-full bg-slate-800 border border-slate-700 shadow-xl text-yellow-400 text-sm cursor-pointer hover:bg-slate-700 transition-all duration-150 -top-3.5 ${isMine ? "left-2" : "right-2"}`}
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
                    className={`absolute z-30 -top-11 ${isMine ? "right-0" : "left-0"} flex items-center gap-1.5 bg-slate-900 border border-slate-700 p-1.5 rounded-full shadow-2xl transition-all duration-200`}
                  >
                    {quickReactions.map((emoji, i) => (
                      <button
                        key={i}
                        className="p-1.5 text-lg rounded-full hover:bg-slate-800 transition-all duration-150 hover:scale-125"
                        onClick={() => handleReaction(m._id, emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                    <button
                      className="p-1.5 rounded-full hover:bg-slate-800 transition-all duration-150 text-slate-300 text-base flex items-center justify-center hover:scale-125"
                      onClick={() => setFullPickerMessageId(m._id)}
                    >
                      <FaPlus />
                    </button>
                  </div>
                )}

                {/* USER NAME & ROLE INDICATOR */}
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-slate-200">
                    {m.user?.name || "Unknown"}
                    {currentRole === 'global' && (
                      <span className="ml-2 px-2 py-0.5 bg-purple-900/60 border border-purple-700 text-purple-300 rounded-full text-[10px]">
                        GLOBAL
                      </span>
                    )}
                    {currentRole === 'team' && (
                      <span className="ml-2 px-2 py-0.5 bg-emerald-900/60 border border-emerald-700 text-emerald-300 rounded-full text-[10px]">
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
                  <div className="text-xs italic text-slate-300 mb-2 p-2 bg-black/20 rounded border-l-2 border-slate-500">
                    <span className="font-semibold text-slate-200">
                      {m.replyTo.user?.name || "Unknown"}:
                    </span>{" "}
                    <em className="text-slate-400">{m.replyTo?.text || "Unknown message"}</em>
                  </div>
                )}

                {/* MESSAGE CONTENT */}
                <div className="text-sm leading-relaxed break-all [overflow-wrap:anywhere] whitespace-pre-wrap">
                  {/* ENHANCED FILE HANDLING */}
                  {m.isFileMessage || m.fileUrl ? (
                    <div>
                      {m.text && <div className="mb-2 break-all [overflow-wrap:anywhere]">{m.text}</div>}
                      {m.fileUrl && (
                        <div className="mt-2">
                          {/* Image preview for image files */}
                          {m.fileType === 'image' && (
                            <div className="mb-2">
                              <img 
                                src={m.fileUrl} 
                                alt={m.fileName || "Image"} 
                                className="max-w-xs max-h-48 rounded-lg border border-slate-700 object-cover"
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
                          
                          {/* View and Download links for documents and files */}
                          <div className="flex items-center gap-2 mt-1">
                            <a
                              href={getFileViewUrl(m.fileUrl, m.fileName, m.fileType)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-blue-300 hover:text-white transition bg-slate-900/80 px-2.5 py-1.5 rounded-lg hover:bg-slate-900 border border-slate-700 text-xs font-medium"
                            >
                              <span>📄</span>
                              <span className="truncate max-w-[140px]">{m.fileName || "View Document"}</span>
                            </a>
                            <a
                              href={getFileDownloadUrl(m.fileUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={m.fileName || "download"}
                              className="inline-flex items-center gap-1 text-slate-300 hover:text-white transition bg-slate-800 hover:bg-slate-700 px-2 py-1.5 rounded-lg border border-slate-700 text-xs"
                              title="Download original file"
                            >
                              <span>⬇️</span>
                            </a>
                          </div>
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
                        {opt === 'pin' && isPinned && <span className="ml-2 text-yellow-400">ðŸ“Œ</span>}
                        {opt === 'star' && isStarred && <span className="ml-2 text-yellow-300">â­</span>}
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
          <div className="text-sm text-slate-300 mb-3 p-3 bg-slate-950 rounded-lg border border-slate-800">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-semibold text-blue-400">
                  Replying to {replyTo.user?.name || "Unknown"}:
                </span>
                <div className="text-slate-400 italic mt-1">{replyTo.text}</div>
              </div>
              <button
                className="text-slate-400 hover:text-white transition ml-3"
                onClick={() => setReplyTo(null)}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* TRANSLATION STATUS BANNER */}
        {selectedLanguage !== 'en' && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-blue-950/50 border border-blue-800/60 rounded-lg text-xs text-blue-300 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span>
                Auto-Translating (English/Hinglish) ➔ <strong className="text-white">{availableLanguages.find(l => l.language === selectedLanguage)?.name || selectedLanguage}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              {translating ? (
                <span className="text-[11px] text-blue-400 font-medium animate-pulse">Translating...</span>
              ) : (
                <button
                  type="button"
                  onClick={() => translateText(msg, selectedLanguage)}
                  className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-medium transition-colors"
                >
                  Translate Now
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedLanguage('en')}
                className="text-slate-400 hover:text-white text-xs px-1 hover:bg-slate-800 rounded"
                title="Reset to English"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* INPUT AND ACTION BAR */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {/* ATTACHMENT BUTTON */}
          <div className="relative">
            <button
              onClick={() => {
                setShowAttachmentMenu(!showAttachmentMenu);
                setShowLanguageSelector(false);
                setShowEmojiPicker(false);
              }}
              className="text-base sm:text-xl p-2 sm:p-2.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white flex-shrink-0"
              title="Attach File"
            >
              <FaPaperclip />
            </button>
            {showAttachmentMenu && (
              <div className="attachment-menu absolute bottom-full mb-2 left-0 z-50 bg-slate-900 border border-slate-800 shadow-xl rounded-xl p-2 flex flex-col space-y-1 w-44">
                <button
                  onClick={() => handleAttachClick("document")}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-slate-800 transition text-white text-xs text-left"
                >
                  <FaFile className="text-blue-400" />
                  <span>Document</span>
                </button>
                <button
                  onClick={() => handleAttachClick("image")}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-slate-800 transition text-white text-xs text-left"
                >
                  <FaImage className="text-emerald-400" />
                  <span>Photos & Videos</span>
                </button>
                <button
                  onClick={() => handleAttachClick("audio")}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-slate-800 transition text-white text-xs text-left"
                >
                  <FaMusic className="text-amber-400" />
                  <span>Audio</span>
                </button>
              </div>
            )}
          </div>

          {/* EMOJI BUTTON */}
          <button
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowAttachmentMenu(false);
              setShowLanguageSelector(false);
            }}
            className="text-base sm:text-xl p-2 sm:p-2.5 rounded-lg hover:bg-slate-800 transition-colors text-yellow-400 hover:text-yellow-300 flex-shrink-0"
            title="Emojis"
          >
            <FaSmile />
          </button>

          {/* LANGUAGE TRANSLATE BUTTON */}
          <div className="relative">
            <button
              onClick={() => {
                setShowLanguageSelector(!showLanguageSelector);
                setShowAttachmentMenu(false);
                setShowEmojiPicker(false);
              }}
              className="text-base sm:text-xl p-2 sm:p-2.5 rounded-lg hover:bg-slate-800 transition-colors text-blue-400 hover:text-blue-300 relative flex-shrink-0"
              title={`Translate to: ${availableLanguages.find(lang => lang.language === selectedLanguage)?.name || 'English'}`}
            >
              🌐
              {selectedLanguage !== 'en' && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  !
                </span>
              )}
            </button>
            {showLanguageSelector && (
              <div className="language-selector absolute bottom-full mb-2 left-0 z-50 bg-slate-900 border border-slate-800 shadow-xl rounded-xl overflow-hidden max-h-64 w-64">
                <div className="p-2 border-b border-slate-800 bg-slate-950">
                  <input
                    type="text"
                    placeholder="Search languages..."
                    className="w-full bg-slate-900 border border-slate-800 text-white placeholder-slate-500 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    value={languageSearchTerm}
                    onChange={(e) => setLanguageSearchTerm(e.target.value)}
                  />
                </div>
                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                  {availableLanguages
                    .filter(lang =>
                      languageSearchTerm === '' || 
                      lang.name?.toLowerCase().includes(languageSearchTerm.toLowerCase()) ||
                      lang.language?.toLowerCase().includes(languageSearchTerm.toLowerCase())
                    )
                    .map((lang) => (
                      <div
                        key={lang.language}
                        className={`cursor-pointer p-2.5 hover:bg-slate-800 transition text-white text-xs border-b border-slate-800/60 last:border-b-0 flex items-center justify-between ${
                          selectedLanguage === lang.language ? 'bg-blue-600/20 text-blue-400 font-semibold' : ''
                        }`}
                        onClick={() => {
                          setSelectedLanguage(lang.language);
                          if (msg.trim()) {
                            translateText(msg, lang.language);
                          }
                          setLanguageSearchTerm('');
                          setShowLanguageSelector(false);
                        }}
                      >
                        <span className="font-medium">{lang.name}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">{lang.language}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* MESSAGE INPUT */}
          <input
            type="text"
            value={msg}
            onChange={handleInputChange}
            className="flex-1 border border-slate-800 bg-slate-950 px-4 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-slate-500 text-xs sm:text-sm min-w-0"
            placeholder={`Type in English or Hinglish (${selectedLanguage !== 'en' ? availableLanguages.find(l => l.language === selectedLanguage)?.name || selectedLanguage : 'English'})...`}
            disabled={connectionStatus !== 'connected'}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />

          {/* SEND BUTTON */}
          <button
            onClick={sendMessage}
            disabled={!msg.trim() || connectionStatus !== 'connected' || isSending}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-xs sm:text-sm font-semibold flex-shrink-0"
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </div>

        {/* EMOJI PICKER */}
        {showEmojiPicker && (
          <div className="emoji-picker-container mt-3 rounded-xl overflow-hidden shadow-2xl border border-slate-800">
            <Picker
              onEmojiClick={onEmojiClick}
              emojiVersion="1.0"
              height={320}
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