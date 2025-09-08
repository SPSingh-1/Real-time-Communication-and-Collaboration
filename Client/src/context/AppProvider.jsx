// src/context/AppProvider.jsx
import React, { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const AppContext = createContext();

const AppProvider = ({ children }) => {
  const [user, _setUser] = useState(null); // internal state
  const [notifications, setNotifications] = useState([]);
  const [teams, setTeams] = useState([]);
  const [globals, setGlobals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const navigate = useNavigate();

  // ✅ Wrapper around setUser that also updates localStorage
  const setUser = (newUser) => {
    if (newUser) {
      _setUser(newUser);
      if (newUser.token) {
        localStorage.setItem("token", newUser.token);
      }
      localStorage.setItem("user", JSON.stringify(newUser));
    } else {
      _setUser(null);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  };

  // ✅ Check authentication on app load
  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("token");
      const storedUserData = localStorage.getItem("user");

      if (!token || !storedUserData) {
        setLoading(false);
        setAuthChecked(true);
        return;
      }

      const parsedUser = JSON.parse(storedUserData);
      setUser({ ...parsedUser, token });
      setTeams(parsedUser?.teams || []);
      setGlobals(parsedUser?.globals || []);
    } catch (error) {
      console.error("Auth check failed:", error);
      setUser(null);
      setTeams([]);
      setGlobals([]);
    } finally {
      setLoading(false);
      setAuthChecked(true);
    }
  };

  const login = async (userData) => {
    try {
      console.log("Login function called with:", userData.name, userData.role);

      setUser(userData);
      setTeams(userData?.teams || []);
      setGlobals(userData?.globals || []);

      return true;
    } catch (error) {
      console.error("Login context error:", error);
      return false;
    }
  };

  const logout = () => {
    setUser(null); // clears localStorage + state
    setTeams([]);
    setGlobals([]);
    setNotifications([]);
    navigate("/login");
  };

  const addNotification = (message) => {
    const notification = {
      id: Date.now(),
      message,
      timestamp: new Date(),
      read: false,
    };
    setNotifications((prev) => [notification, ...prev]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications((prev) =>
        prev.filter((n) => n.id !== notification.id)
      );
    }, 5000);
  };

  const markNotificationAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // ✅ Refresh token periodically
  useEffect(() => {
    if (!user?.token) return;

    const handleTokenRefresh = async () => {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/auth/refresh`,
          {},
          {
            headers: { "auth-token": user.token },
          }
        );

        if (response.data.success) {
          const updatedUser = response.data.user;
          setUser(updatedUser); // auto-sync localStorage
        }
      } catch (error) {
        console.error("Token refresh failed:", error);
        setUser(null);
        setTeams([]);
        setGlobals([]);
        setNotifications([]);
        navigate("/login");
      }
    };

    const refreshInterval = setInterval(handleTokenRefresh, 30 * 60 * 1000); // 30 minutes
    return () => clearInterval(refreshInterval);
  }, [user?.token, navigate]);

  const contextValue = {
    user,
    setUser, // ✅ now auto-syncs with localStorage
    login,
    logout,
    notifications,
    addNotification,
    markNotificationAsRead,
    clearAllNotifications,
    role: user?.role || null,
    teams,
    globals,
    loading,
    authChecked,
    isAuthenticated: !!user,
    checkAuth,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export { AppContext };
export default AppProvider;
