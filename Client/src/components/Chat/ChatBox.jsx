import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { FaPaperclip, FaSmile, FaPlus } from "react-icons/fa";
import { FaAngleDown, FaStar, FaThumbtack } from "react-icons/fa6";
import Picker from "emoji-picker-react";
import dayjs from "dayjs";

const socket = io("http://localhost:3001");

const ChatBox = () => {
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState("");
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const [selectedMsgIdForOptions, setSelectedMsgIdForOptions] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [userId, setUserId] = useState(null); // This state holds the current user's ID
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // For general emoji input in chat bar
  const [starredMsgs, setStarredMsgs] = useState(new Set());
  const [pinnedMsgs, setPinnedMsgs] = useState([]);

  // --- STATES FOR REACTION MENU & PICKER CONTROL ---
  // Controls the single smiley icon that appears on message hover
  const [showTriggerSmileyForMsgId, setShowTriggerSmileyForMsgId] =
    useState(null);
  // Controls the 6 quick reaction emojis + '+' bar
  const [showQuickReactionBarForMsgId, setShowQuickReactionBarForMsgId] =
    useState(null);
  // Controls the full emoji picker (only when '+' is clicked)
  const [fullPickerMessageId, setFullPickerMessageId] = useState(null);

  const fileInputRef = useRef();
  const messagesEndRef = useRef();

  const quickReactions = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) socket.emit("init", token);

    socket.on("initMessages", ({ userId, messages }) => {
      setUserId(userId); // Set the userId here from the backend
      setMessages(messages);
      // Re-initialize starredMsgs and pinnedMsgs from fetched messages if needed
      const initialStarred = new Set();
      const initialPinned = [];
      messages.forEach((m) => {
        // Assuming message objects might have isStarred/isPinned properties from backend
        // You might need to adjust this based on your actual backend message structure
        if (m.isStarred) initialStarred.add(m._id);
        if (m.isPinned) initialPinned.push(m);
      });
      setStarredMsgs(initialStarred);
      setPinnedMsgs(initialPinned);
    });

    socket.on("message", (newMsg) => setMessages((prev) => [...prev, newMsg]));
    socket.on("messageDeleted", (id) =>
      setMessages((prev) => prev.filter((m) => m._id !== id))
    );
    socket.on("messageUpdated", (updated) =>
      setMessages((prev) =>
        prev.map((m) => (m._id === updated._id ? updated : m))
      )
    );

    socket.on("message-reaction", ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
      );
    });

    return () => {
      socket.off("initMessages");
      socket.off("message");
      socket.off("messageDeleted");
      socket.off("messageUpdated");
      socket.off("message-reaction");
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pinnedMsgs]);

  // --- REFINED Universal Click-Outside Closing Logic ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      let clickedInsideAControlledElement = false;

      // Check if click is inside the single smiley trigger
      if (showTriggerSmileyForMsgId !== null) {
        const triggerSmileyElement = document.getElementById(
          `smiley-trigger-${showTriggerSmileyForMsgId}`
        );
        if (
          triggerSmileyElement &&
          triggerSmileyElement.contains(event.target)
        ) {
          clickedInsideAControlledElement = true;
        }
      }

      // Check if click is inside the Quick Reaction Bar
      if (showQuickReactionBarForMsgId !== null) {
        const quickReactionBarElement = document.getElementById(
          `reaction-menu-${showQuickReactionBarForMsgId}`
        );
        if (
          quickReactionBarElement &&
          quickReactionBarElement.contains(event.target)
        ) {
          clickedInsideAControlledElement = true;
        }
      }

      // Check if click is inside the Full Emoji Picker
      if (fullPickerMessageId !== null) {
        const fullPickerElement = document.getElementById(
          `full-picker-${fullPickerMessageId}`
        );
        if (fullPickerElement && fullPickerElement.contains(event.target)) {
          clickedInsideAControlledElement = true;
        }
      }

      // Check if click is inside the Message Options Dropdown or its trigger (angle down button)
      if (selectedMsgIdForOptions !== null) {
        const optionsDropdownElement = document.getElementById(
          `options-menu-${selectedMsgIdForOptions}`
        );
        const optionsButton = document.getElementById(
          `options-button-${selectedMsgIdForOptions}`
        );
        if (
          (optionsDropdownElement &&
            optionsDropdownElement.contains(event.target)) ||
          (optionsButton && optionsButton.contains(event.target))
        ) {
          clickedInsideAControlledElement = true;
        }
      }

      // If the click was NOT inside any of the currently open controlled elements, close them all
      if (!clickedInsideAControlledElement) {
        setShowTriggerSmileyForMsgId(null);
        setShowQuickReactionBarForMsgId(null);
        setFullPickerMessageId(null);
        setSelectedMsgIdForOptions(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [
    showTriggerSmileyForMsgId,
    showQuickReactionBarForMsgId,
    fullPickerMessageId,
    selectedMsgIdForOptions,
  ]);

  const sendMessage = () => {
    if (msg.trim()) {
      socket.emit("message", { text: msg, replyTo: replyTo?._id || null });
      setMsg("");
      setReplyTo(null);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

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
      const res = await axios.post("http://localhost:3001/upload", formData, {
        headers: { "auth-token": localStorage.getItem("token") },
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded * 100) / e.total);
          setUploadProgress(percent);
        },
      });

      socket.emit("message", {
        text: `Shared file: ${res.data.fileUrl}`,
      });

      setUploadProgress(0);
      setPreviewUrl(null);
      setPreviewType(null);
    } catch (err) {
      console.error("Upload failed:", err.message);
      setUploadProgress(0);
    }
  };

  const handleAttachClick = (type) => {
    const acceptMap = {
      document: ".pdf,.doc,.docx,.txt",
      image: "image/*",
      audio: "audio/*",
      video: "video/*",
    };

    fileInputRef.current.setAttribute("accept", acceptMap[type]);
    fileInputRef.current.click();
    setShowAttachmentMenu(false);
  };

  const handleOptionClick = (option, msg) => {
    if (option === "copy") {
      navigator.clipboard.writeText(msg.text);
    } else if (option === "delete") {
      socket.emit("deleteMessage", msg._id);
    } else if (option === "edit") {
      const newText = prompt("Edit message:", msg.text);
      if (newText) {
        socket.emit("editMessage", { id: msg._id, text: newText });
      }
    } else if (option === "reply") {
      setReplyTo(msg);
    } else if (option === "pin") {
      setPinnedMsgs((prev) => [
        msg,
        ...prev.filter((pinnedMsg) => pinnedMsg._id !== msg._id),
      ]);
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
    if (!reactions) return {};
    const counts = {};
    if (Array.isArray(reactions)) {
      // Ensure reactions is an array
      reactions.forEach((r) => {
        counts[r.emoji] = (counts[r.emoji] || 0) + 1;
      });
    }
    return counts;
  };

  const handleReaction = (messageId, emoji) => {
    // Crucial change: Pass userId to the backend
    if (userId) {
      // Ensure userId is available
      socket.emit("react-to-message", { messageId, emoji, userId });
    } else {
      console.error("User ID is not available for reaction.");
      // Optionally, provide user feedback that reaction failed (e.g., a toast notification)
    }
    setFullPickerMessageId(null); // Close full picker after selection
    setShowQuickReactionBarForMsgId(null); // Close quick reaction bar after selection
  };

  const sortedMessages = [
    ...pinnedMsgs,
    ...messages.filter((m) => !pinnedMsgs.some((p) => p._id === m._id)),
  ];

  return (
    <>

      <div className="flex flex-col flex-1 h-full">
        {/* HEADER */}
        <div className="border-b py-3 text-center font-bold text-xl">
          Group Chats
        </div>

        {/* Messages should scroll */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {sortedMessages.map((m) => {
            const isMine = m.user?._id === userId;
            const options = isMine
              ? ["reply", "edit", "delete", "copy", "pin", "star"]
              : ["reply", "copy", "pin", "star"];
            const reactionCounts = getReactionCounts(m.reactions);

            return (
              <div
                key={m._id}
                id={`message-container-${m._id}`}
                className={`relative group max-w-[100%] flex ${
                  isMine ? "justify-end" : "justify-start"
                }`} // This parent aligns the whole message block (including bubble and icons)
                onMouseEnter={() => {
                  // Only show smiley trigger if no other reaction/picker is active for this message
                  if (
                    showQuickReactionBarForMsgId !== m._id &&
                    fullPickerMessageId !== m._id
                  ) {
                    setShowTriggerSmileyForMsgId(m._id);
                  }
                }}
                onMouseLeave={() => {
                  // Hide smiley trigger if no other reaction/picker is active for this message
                  if (
                    showQuickReactionBarForMsgId !== m._id &&
                    fullPickerMessageId !== m._id
                  ) {
                    setShowTriggerSmileyForMsgId(null);
                  }
                }}
              >
                {/* Message Bubble (now the relative container for the icons) */}
                <div
                  className={`relative px-4 py-2 rounded-xl text-sm break-words transition-all duration-200 min-w-[100px] justify-end items-end
                                ${
                                  isMine
                                    ? "bg-blue-800 text-white font-[500] border-r-4 border-green-700 rounded-br-none"
                                    : "bg-gray-600 text-white font-[500] border-l-4 border-l-pink-700  rounded-bl-none"
                                }`}
                >
                  {/* Single Smiley Trigger Icon - NOW CHILD OF MESSAGE BUBBLE */}
                  {showTriggerSmileyForMsgId === m._id &&
                    !showQuickReactionBarForMsgId &&
                    !fullPickerMessageId && (
                      <div
                        id={`smiley-trigger-${m._id}`}
                        className={`absolute z-20 p-1 rounded-full bg-gray-700 shadow-lg text-white text-lg cursor-pointer
                                                ${
                                                  isMine
                                                    ? "left-[-35px]"
                                                    : "right-[-35px]"
                                                } top-1/2 -translate-y-1/2`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowQuickReactionBarForMsgId(m._id);
                          setShowTriggerSmileyForMsgId(null);
                        }}
                      >
                        <FaSmile />
                      </div>
                    )}

                  {/* The Quick Reaction Bar (emojis + plus icon) - NOW CHILD OF MESSAGE BUBBLE */}
                  {showQuickReactionBarForMsgId === m._id && (
                    <div
                      id={`reaction-menu-${m._id}`}
                      className={`absolute z-20 flex gap-1 bg-gray-700 p-1 rounded-full shadow-lg transition-all duration-100 ease-in-out
                                                ${
                                                  isMine
                                                    ? "left-[-270px]"
                                                    : "right-[-270px]"
                                                } top-1/2 -translate-y-1/2`}
                    >
                      {quickReactions.map((emoji, i) => (
                        <button
                          key={i}
                          className="p-1 text-xl rounded-full hover:bg-gray-600 transition"
                          onClick={() => handleReaction(m._id, emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                      <button
                        className="p-1 rounded-full hover:bg-gray-600 transition text-white text-lg flex items-center justify-center"
                        onClick={() => setFullPickerMessageId(m._id)}
                      >
                        <FaPlus />
                      </button>
                    </div>
                  )}

                  <div className="text-xs text-gray-900 text-[14px] font-[600] mb-1">
                    {m.user?.name || "Unknown"}
                  </div>

                  {m.replyTo && (
                    <div className="text-xs italic text-gray-200 mb-1 border-b-1 border-gray-900">
                      <span className="font-semibold text-gray-900 text-[13px]">
                        {m.replyTo.user?.name || "Unknown"}:
                      </span>{" "}
                      <em>{m.replyTo?.text || "Unknown message"}</em>
                    </div>
                  )}

                  <div>
                    {m.text.startsWith("Shared file:") ? (
                      <a
                        href={m.text.replace("Shared file: ", "")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-white"
                      >
                        {m.text.replace("Shared file: ", "").split("/").pop()}
                      </a>
                    ) : (
                      m.text
                    )}
                  </div>

                  <div className="text-[10px] text-gray-300 text-right mt-1 flex flex-wrap justify-end gap-1 items-center">
                    {pinnedMsgs.some((p) => p._id === m._id) && (
                      <FaThumbtack className="text-yellow-400" />
                    )}
                    {starredMsgs.has(m._id) && (
                      <FaStar className="text-yellow-300" />
                    )}
                    {dayjs(m.createdAt).format("h:mm A")}
                  </div>

                  {/* Reaction badges (these stay, appearing below the message bubble) */}
                  {Object.keys(reactionCounts).length > 0 && (
                    <div
                      className={`absolute -bottom-3 ${
                        isMine ? "left-0" : "right-0"
                      } flex gap-1`}
                    >
                      {Object.entries(reactionCounts).map(([emoji, count]) => (
                        <span
                          key={emoji}
                          className="bg-none text-gray-800 px-2 py-0.5 rounded-full text-[20px] shadow cursor-pointer hover:scale-105"
                          onClick={() => {
                            // Toggle the specific emoji reaction when clicking on its badge
                            handleReaction(m._id, emoji);
                            setShowQuickReactionBarForMsgId(null); // Close quick reaction bar
                            setFullPickerMessageId(null); // Close full picker
                          }}
                        >
                          {emoji}{" "}
                          {count > 1 && (
                            <span className="text-xs">{count}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Message Options (Angle Down) */}
                  <div
                    id={`options-button-${m._id}`}
                    className={`absolute top-1 ${
                      isMine ? "right-1" : "right-1"
                    } cursor-pointer hidden group-hover:block`}
                    onClick={() =>
                      setSelectedMsgIdForOptions(
                        m._id === selectedMsgIdForOptions ? null : m._id
                      )
                    }
                  >
                    <span className="text-xs text-gray-900">
                      <FaAngleDown />
                    </span>
                  </div>

                  {/* Message Options Dropdown */}
                  {selectedMsgIdForOptions === m._id && (
                    <div
                      id={`options-menu-${m._id}`}
                      className={`absolute z-20 bg-gray-800 text-white font-[500] border rounded shadow-md text-sm top-6 ${
                        isMine ? "left-[-75px]" : "right-[-68px]"
                      }`}
                    >
                      {options.map((opt) => (
                        <div
                          key={opt}
                          className="px-4 py-2 hover:bg-gray-950 cursor-pointer transition"
                          onClick={() => handleOptionClick(opt, m)}
                        >
                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Full Emoji Picker (remains relative to the main message-container) */}
                {fullPickerMessageId === m._id && (
                  <div
                    id={`full-picker-${m._id}`}
                    className={`absolute z-30 ${
                      isMine ? "left-0" : "right-0"
                    } bottom-10`}
                  >
                    <Picker
                      onEmojiClick={(emojiData) =>
                        handleReaction(m._id, emojiData.emoji)
                      }
                      height={350}
                      width={280}
                      emojiVersion="1.0"
                    />
                  </div>
                )}
              </div>
            );
          })}

          {uploadProgress > 0 && (
            <div className="w-full bg-gray-300 rounded h-2">
              <div
                className="bg-blue-600 h-2 rounded"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}

          {previewUrl && previewType === "image" && (
            <div className="mt-2">
              <img
                src={previewUrl}
                alt="preview"
                className="max-w-xs rounded shadow"
              />
            </div>
          )}

          {previewUrl && previewType === "audio" && (
            <div className="mt-2">
              <audio controls>
                <source src={previewUrl} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT BAR */}
        <div className="border-t p-3 bg-gray-200 sticky bottom-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

            {replyTo && (
                <div className="text-sm text-black mb-1">
                <span className="font-semibold text-bold text-[14px]">
                    {replyTo.user?.name || "Unknown"}:
                </span>{" "}
                <em>{replyTo.text}</em>
                <button
                    className="ml-2 text-black"
                    onClick={() => setReplyTo(null)}
                >
                    ×
                </button>
                </div>
            )}
            <div className="flex items-center gap-2">
                 {/* Attachment Button */}
              <div className="relative">
                <button
                  onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                  className="text-xl px-3 py-2 rounded hover:bg-gray-200 transition text-[#280fe6] hover:text-gray-600"
                >
                  <FaPaperclip />
                </button>
                {showAttachmentMenu && (
                  <div className="absolute bottom-full mb-2 left-1 z-30 bg-white border shadow-lg rounded-lg p-2 w-52">
                    {[
                      { type: "document", label: "📄 Document" },
                      { type: "image", label: "🖼️ Photo" },
                      { type: "audio", label: "🎧 Audio" },
                      { type: "video", label: "🎥 Video" },
                    ].map((item) => (
                      <div
                        key={item.type}
                        className="cursor-pointer p-2 hover:bg-gray-100 rounded transition"
                        onClick={() => handleAttachClick(item.type)}
                      >
                        {item.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

                {/* Emoji Button */}
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-xl px-3 py-2 rounded hover:bg-gray-200 transition text-[#280fe6] hover:text-gray-600"
              >
                <FaSmile />
              </button>

                {/* Message Input */}
              <input
                type="text"
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                className="flex-1 border border-gray-800 p-2 rounded focus:outline-none focus:ring-2 focus:ring-gray-400 text-[#010a01]"
                placeholder="Type a message"
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />

              {/* Send Button */}
              <button
                onClick={sendMessage}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
              >
                Send
              </button>
            </div>

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="mt-2">
                <Picker
                  onEmojiClick={onEmojiClick}
                  emojiVersion="1.0"
                  height={350}
                  width="100%"
                />
              </div>
            )}
        </div>
      </div>
    </>
  );
};

export default ChatBox;
