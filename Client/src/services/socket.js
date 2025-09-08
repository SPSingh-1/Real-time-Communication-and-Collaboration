// src/socket.js
import { io } from "socket.io-client";

// Grab token (after login it should be stored in localStorage)
const token = localStorage.getItem("token");

export const socket = io(`${import.meta.env.VITE_BACKEND_URL}`, {
  auth: { token } // 👈 Send JWT to backend
});

// Optional: handle connection errors (invalid token, etc.)
socket.on("connect_error", (err) => {
  console.error("❌ Socket connection error:", err.message);
});
