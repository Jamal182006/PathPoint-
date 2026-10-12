import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { apiAdapter, checkBackendStatus } from '../services/apiAdapter';
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

  const logout = useCallback(() => {
    localStorage.removeItem('pathpoint_token');
    sessionStorage.removeItem('pathpoint_token');
    localStorage.removeItem('pathpoint_user');
    sessionStorage.removeItem('pathpoint_user');
    localStorage.removeItem('pathpoint_token_expires_at');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    localStorage.setItem('pathpoint_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const initAuth = async () => {
      // 1. Check live backend health
      const online = await checkBackendStatus(true);
      setBackendOnline(online);

      // Authenticate an active token with the backend; cached profile data is never authoritative.
      const storedToken =
        localStorage.getItem('pathpoint_token') ||
        sessionStorage.getItem('pathpoint_token');
      const storedExpiry = Number(localStorage.getItem('pathpoint_token_expires_at'));

      if (storedToken && storedExpiry && storedExpiry <= Date.now()) {
        logout();
      } else if (storedToken) {
        try {
          const userData = await apiAdapter.getMe();
          if (userData) {
            setUser(userData);
            setToken(storedToken);
          } else {
            logout();
          }
        } catch {
          logout();
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

  const login = useCallback(async (identifier, password = '', rememberMe = true) => {
    const result = await apiAdapter.login(identifier, password, rememberMe);
    setUser(result.user);
    setToken(result.token);
    return result;
  }, []);

  const requestLoginCode = useCallback(async (identifier, password = '', rememberMe = true) => {
    const result = await apiAdapter.requestLoginCode(identifier, password, rememberMe);
    if (result.token && result.user) {
      setUser(result.user);
      setToken(result.token);
    }
    return result;
  }, []);

  const verifyLoginCode = useCallback(async (identifier, password = '', code = '', rememberMe = true) => {
    const result = await apiAdapter.verifyLoginCode(identifier, password, code, rememberMe);
    setUser(result.user);
    setToken(result.token);
    return result;
  }, []);

  const register = useCallback(async (userData, rememberMe = true) => {
    const result = await apiAdapter.register(userData, rememberMe);
    setUser(null);
    setToken(null);
    localStorage.removeItem('pathpoint_token');
    sessionStorage.removeItem('pathpoint_token');
    localStorage.removeItem('pathpoint_user');
    sessionStorage.removeItem('pathpoint_user');
    localStorage.removeItem('pathpoint_token_expires_at');
    return result;
  }, []);

  const updateMyProfile = useCallback(async (profileData) => {
    const updated = await apiAdapter.updateMyProfile(profileData);
    setUser(updated);
    return updated;
  }, []);

  const forgotPassword = useCallback(async (identifier) => apiAdapter.forgotPassword(identifier), []);
  const verifyResetCode = useCallback(async (identifier, code) => apiAdapter.verifyResetCode(identifier, code), []);
  const resetPassword = useCallback(async (identifier, code, newPassword) => apiAdapter.resetPassword(identifier, code, newPassword), []);
  const changePassword = useCallback(async (curr, next) => apiAdapter.changePassword(curr, next), []);

  const recheckBackend = useCallback(async () => {
    const online = await checkBackendStatus(true);
    setBackendOnline(online);
    return online;
  }, []);

  const updateApiUrl = useCallback((newUrl) => {
    setBaseURL(newUrl);
    setApiUrlState(getBaseURL());
    return recheckBackend();
  }, [recheckBackend]);

  const updateSettings = useCallback((updates) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      backendOnline,
      apiUrl,
      settings,
      updateSettings,
      updateApiUrl,
      recheckBackend,
      login,
      requestLoginCode,
      verifyLoginCode,
      register,
      updateMyProfile,
      forgotPassword,
      verifyResetCode,
      resetPassword,
      changePassword,
      logout,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
    }),
    [user, token, loading, backendOnline, apiUrl, settings, updateSettings, updateApiUrl, recheckBackend, login, requestLoginCode, verifyLoginCode, register, updateMyProfile, forgotPassword, verifyResetCode, resetPassword, changePassword, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
