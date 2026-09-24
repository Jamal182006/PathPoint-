import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiAdapter, checkBackendStatus } from '../services/apiAdapter';
import { storageService } from '../services/storageService';
import { getBaseURL, setBaseURL } from '../api/client';

const AuthContext = createContext(null);

const defaultSettings = {
  theme: 'light',
  accent: 'indigo',
  compactMode: false,
  notifications: true,
  showWelcomeBanner: true,
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    return (
      localStorage.getItem('pathpoint_token') ||
      sessionStorage.getItem('pathpoint_token') ||
      null
    );
  });
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [backendOnline, setBackendOnline] = useState(false);
  const [apiUrl, setApiUrlState] = useState(() => getBaseURL());
  const [settings, setSettings] = useState(() => {
    try {
      const savedSettings = localStorage.getItem('pathpoint_settings');
      return savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    localStorage.setItem('pathpoint_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const initAuth = async () => {
      const storedUser =
        localStorage.getItem('pathpoint_user') ||
        sessionStorage.getItem('pathpoint_user');
      // 1. Check live backend health
      const online = await checkBackendStatus(true);
      setBackendOnline(online);

      // 2. Load cached users list for directory
      setAllUsers(storageService.getUsers());

      // 3. Authenticate active token if present
      const storedToken =
        localStorage.getItem('pathpoint_token') ||
        sessionStorage.getItem('pathpoint_token');

      if (storedToken) {
        try {
          const userData = await apiAdapter.getMe();
          if (userData) {
            setUser(userData);
            setToken(storedToken);
          } else {
            logout();
          }
        } catch (error) {
          // Keep the remembered session during temporary API outages.
          if (error.response?.status === 401) {
            logout();
          } else if (storedUser) {
            try {
              setUser(JSON.parse(storedUser));
              setToken(storedToken);
            } catch {
              logout();
            }
          } else {
            logout();
          }
        }
      } else {
        // Enforce authentic state: No automatic demo login
        setUser(null);
        setToken(null);
      }

      setLoading(false);
    };

    initAuth();

    // Listen for 401 session expired event
    const onSessionExpired = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener('pathpoint:session-expired', onSessionExpired);
    return () => window.removeEventListener('pathpoint:session-expired', onSessionExpired);
  }, []);

  // Standard Candidate / User Login
  const login = async (email, password = '', rememberMe = true) => {
    const result = await apiAdapter.login(email, password, rememberMe);
    setUser(result.user);
    setToken(result.token);
    return result;
  };

  // Candidate Registration
  const register = async (userData, rememberMe = true) => {
    const result = await apiAdapter.register(userData, rememberMe);
    setUser(result.user);
    setToken(result.token);
    setAllUsers(storageService.getUsers());
    return result;
  };

  // Switch demo user (accessible in development/testing mode)
  const switchUser = (userId) => {
    storageService.setCurrentUser(userId);
    const users = storageService.getUsers();
    const found = users.find((u) => u.id === userId);
    if (found) {
      setUser(found);
      const mockToken = `mock-jwt-token-${found.id}-${Date.now()}`;
      localStorage.setItem('pathpoint_token', mockToken);
      localStorage.setItem('pathpoint_user', JSON.stringify(found));
      setToken(mockToken);
    }
  };

  // Password Recovery
  const forgotPassword = async (email) => {
    return apiAdapter.forgotPassword(email);
  };

  const verifyResetCode = async (email, code) => {
    return apiAdapter.verifyResetCode(email, code);
  };

  const resetPassword = async (email, code, newPassword) => {
    return apiAdapter.resetPassword(email, code, newPassword);
  };

  // Password Change
  const changePassword = async (curr, next) => {
    return apiAdapter.changePassword(curr, next);
  };

  // Clean Logout
  const logout = () => {
    localStorage.removeItem('pathpoint_token');
    sessionStorage.removeItem('pathpoint_token');
    localStorage.removeItem('pathpoint_user');
    sessionStorage.removeItem('pathpoint_user');
    setToken(null);
    setUser(null);
  };

  // Reset demo datasets
  const resetAllData = () => {
    storageService.resetToDemoData();
  };

  // Recheck backend health
  const recheckBackend = async () => {
    const online = await checkBackendStatus(true);
    setBackendOnline(online);
    return online;
  };

  // Configure custom backend URL
  const updateApiUrl = (newUrl) => {
    setBaseURL(newUrl);
    setApiUrlState(getBaseURL());
    return recheckBackend();
  };

  const updateSettings = (updates) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        allUsers,
        loading,
        backendOnline,
        apiUrl,
        settings,
        updateSettings,
        updateApiUrl,
        recheckBackend,
        switchUser,
        login,
        register,
        forgotPassword,
        verifyResetCode,
        resetPassword,
        changePassword,
        logout,
        resetAllData,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
