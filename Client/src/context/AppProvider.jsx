// src/context/AppProvider.jsx
import React, { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const AppContext = createContext();

const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [teams, setTeams] = useState([]);
  const [globals, setGlobals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const navigate = useNavigate();

  // Check authentication on app load
  useEffect(() => {
    checkAuth();
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
    console.error('Auth check failed:', error);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  } finally {
    setLoading(false);
    setAuthChecked(true);
  }
};

  const login = async (userData) => {
    try {
      console.log('Login function called with:', userData.name, userData.role);
      
      setUser(userData);
      setTeams(userData?.teams || []);
      setGlobals(userData?.globals || []);
      
      if (userData?.token) {
        console.log('Storing token in localStorage');
        localStorage.setItem("token", userData.token);
        localStorage.setItem("user", JSON.stringify(userData));
      } else {
        console.error('No token provided in userData');
      }
      
      return true;
    } catch (error) {
      console.error('Login context error:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
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
      read: false
    };
    setNotifications((prev) => [notification, ...prev]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const markNotificationAsRead = (id) => {
    setNotifications((prev) => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Refresh token periodically
  useEffect(() => {
    if (!user?.token) return;

    const handleTokenRefresh = async () => {
      try {
        const response = await axios.post('http://localhost:3001/api/auth/refresh', {}, {
          headers: { 'auth-token': user.token }
        });

        if (response.data.success) {
          const updatedUser = response.data.user;
          setUser(updatedUser);
          localStorage.setItem("token", updatedUser.token);
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        // Clear auth data instead of calling logout to avoid dependency
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setTeams([]);
        setGlobals([]);
        setNotifications([]);
        navigate("/login");
      }
    };

    const refreshInterval = setInterval(handleTokenRefresh, 30 * 60 * 1000); // 30 minutes
    return () => clearInterval(refreshInterval);
  }, [user?.token, navigate]); // Include navigate as it's used in the effect

  const contextValue = {
    user,
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
    checkAuth
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export { AppContext };
export default AppProvider;