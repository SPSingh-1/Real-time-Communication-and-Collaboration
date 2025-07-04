import React, { createContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AppContext = createContext();

const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);

  const login = (userData) => setUser(userData);
    const logout = () => {
    localStorage.removeItem('token');      // 🧹 Clear token
    setUser(null);                         // ⛔ Clear user info
    navigate('/login');                    // 🔁 Redirect to login
  };
  const addNotification = (message) => {
    setNotifications((prev) => [...prev, message]);
  };

  return (
    <AppContext.Provider value={{ user, login, logout, notifications, addNotification }}>
      {children}
    </AppContext.Provider>
  );
};

export { AppContext };
export default AppProvider;
