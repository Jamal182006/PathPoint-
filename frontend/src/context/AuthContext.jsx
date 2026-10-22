import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { apiAdapter, checkBackendStatus, persistAuthSession } from '../services/apiAdapter';
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

  const refreshUser = useCallback(async () => {
    try {
      const storedToken =
        localStorage.getItem('pathpoint_token') ||
        sessionStorage.getItem('pathpoint_token');
      if (!storedToken) return null;
      const userData = await apiAdapter.getMe();
      if (userData) {
        setUser(userData);
        const storage = localStorage.getItem('pathpoint_token') ? localStorage : sessionStorage;
        storage.setItem('pathpoint_user', JSON.stringify(userData));
        return userData;
      }
    } catch (err) {
      // ignore transient errors
    }
    return null;
  }, []);

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
    try {
      localStorage.setItem('pathpoint_settings', JSON.stringify(settings));
    } catch {}
  }, [settings]);

  useEffect(() => {
    const initAuth = async () => {
      // Kick off the health probe without awaiting it: the first paint must not
      // block on a network round-trip. `backendOnline` updates when it lands.
      checkBackendStatus(true).then(setBackendOnline);

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
            // Keep the cached profile fresh so the session can survive a brief
            // backend outage without forcing a re-login.
            const storage = localStorage.getItem('pathpoint_token') ? localStorage : sessionStorage;
            storage.setItem('pathpoint_user', JSON.stringify(userData));
          } else {
            logout();
          }
        } catch (err) {
          const status = err?.response?.status;
          const authRejected = status === 401 || status === 403;

          // A transient network/backend failure (no HTTP response, a 5xx, or the
          // "backend unavailable" guard) must NOT sign the user out. Fall back to
          // the cached profile so the workspace keeps rendering; only a definitive
          // auth rejection or an expired token ends the session.
          if (!authRejected) {
            const cachedUser =
              localStorage.getItem('pathpoint_user') ||
              sessionStorage.getItem('pathpoint_user');
            if (cachedUser) {
              try {
                setUser(JSON.parse(cachedUser));
                setToken(storedToken);
                setLoading(false);
                return;
              } catch {
                // malformed cache -> fall through to logout
              }
            }
          }
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

    const onSessionExpired = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener('pathpoint:session-expired', onSessionExpired);
    return () => window.removeEventListener('pathpoint:session-expired', onSessionExpired);
  }, []);

  useEffect(() => {
    if (!token || !user) return undefined;
    if (user.role === 'provider') {
      const status = user?.businessVerification?.status;
      const intervalMs = status === 'approved' ? 120000 : 15000;
      let mounted = true;
      const poll = async () => {
        try {
          const userData = await apiAdapter.getMe();
          if (mounted && userData) {
            setUser(userData);
            const storage = localStorage.getItem('pathpoint_token') ? localStorage : sessionStorage;
            try { storage.setItem('pathpoint_user', JSON.stringify(userData)); } catch {}
          }
        } catch {}
      };
      poll();
      const id = setInterval(poll, intervalMs);
      return () => {
        mounted = false;
        clearInterval(id);
      };
    }
    if (user.role === 'user') {
      let mounted = true;
      const poll = async () => {
        try {
          const userData = await apiAdapter.getMe();
          if (mounted && userData) {
            setUser(userData);
            const storage = localStorage.getItem('pathpoint_token') ? localStorage : sessionStorage;
            try { storage.setItem('pathpoint_user', JSON.stringify(userData)); } catch {}
          }
        } catch {}
      };
      poll();
      const id = setInterval(poll, 60000);
      return () => {
        mounted = false;
        clearInterval(id);
      };
    }
    return undefined;
  }, [token, user?.role, user?.businessVerification?.status, user?.id]);

  useEffect(() => {
    if (!token || !user) return undefined;
    if (user.role === 'provider') {
      const status = user?.businessVerification?.status;
      const intervalMs = status === 'approved' ? 120000 : 15000;
      let mounted = true;
      const poll = async () => {
        try {
          const userData = await apiAdapter.getMe();
          if (mounted && userData) {
            setUser(userData);
            const storage = localStorage.getItem('pathpoint_token') ? localStorage : sessionStorage;
            try { storage.setItem('pathpoint_user', JSON.stringify(userData)); } catch {}
          }
        } catch {}
      };
      poll();
      const id = setInterval(poll, intervalMs);
      return () => {
        mounted = false;
        clearInterval(id);
      };
    }
    if (user.role === 'user') {
      let mounted = true;
      const poll = async () => {
        try {
          const userData = await apiAdapter.getMe();
          if (mounted && userData) {
            setUser(userData);
            const storage = localStorage.getItem('pathpoint_token') ? localStorage : sessionStorage;
            try { storage.setItem('pathpoint_user', JSON.stringify(userData)); } catch {}
          }
        } catch {}
      };
      poll();
      const id = setInterval(poll, 60000);
      return () => {
        mounted = false;
        clearInterval(id);
      };
    }
    return undefined;
  }, [token, user?.role, user?.businessVerification?.status, user?.id]);

  // Live verification polling for providers
  useEffect(() => {
    if (!token || !user) return undefined;
    if (user.role !== 'provider') return undefined;
    const status = user?.businessVerification?.status;
    const intervalMs = status === 'approved' ? 120000 : 15000;
    let mounted = true;
    const poll = async () => {
      try {
        const userData = await apiAdapter.getMe();
        if (mounted && userData) {
          setUser(userData);
          const storage = localStorage.getItem('pathpoint_token') ? localStorage : sessionStorage;
          storage.setItem('pathpoint_user', JSON.stringify(userData));
        }
      } catch {}
    };
    poll();
    const id = setInterval(poll, intervalMs);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [token, user?.role, user?.businessVerification?.status, user?.id]);

  // Live verification polling for providers and user profile refresh
  useEffect(() => {
    if (!token || !user) return undefined;
    if (user.role === 'provider') {
      const status = user?.businessVerification?.status;
      const intervalMs = status === 'approved' ? 120000 : 15000;
      let mounted = true;
      const poll = async () => {
        try {
          const userData = await apiAdapter.getMe();
          if (mounted && userData) {
            setUser(userData);
            const storage = localStorage.getItem('pathpoint_token') ? localStorage : sessionStorage;
            try { storage.setItem('pathpoint_user', JSON.stringify(userData)); } catch {}
          }
        } catch {}
      };
      poll();
      const id = setInterval(poll, intervalMs);
      return () => {
        mounted = false;
        clearInterval(id);
      };
    }
    if (user.role === 'user') {
      let mounted = true;
      const poll = async () => {
        try {
          const userData = await apiAdapter.getMe();
          if (mounted && userData) {
            setUser(userData);
            const storage = localStorage.getItem('pathpoint_token') ? localStorage : sessionStorage;
            try { storage.setItem('pathpoint_user', JSON.stringify(userData)); } catch {}
          }
        } catch {}
      };
      poll();
      const id = setInterval(poll, 60000);
      return () => {
        mounted = false;
        clearInterval(id);
      };
    }
    return undefined;
  }, [token, user?.role, user?.businessVerification?.status, user?.id]);

  // Live verification polling for providers
  useEffect(() => {
    if (!token || !user) return undefined;
    if (user.role === 'provider') {
      const status = user?.businessVerification?.status;
      const intervalMs = status === 'approved' ? 120000 : 15000;
      let mounted = true;
      const poll = async () => {
        try {
          const userData = await apiAdapter.getMe();
          if (mounted && userData) {
            setUser(userData);
            const storage = localStorage.getItem('pathpoint_token') ? localStorage : sessionStorage;
            try { storage.setItem('pathpoint_user', JSON.stringify(userData)); } catch {}
          }
        } catch {}
      };
      poll();
      const id = setInterval(poll, intervalMs);
      return () => {
        mounted = false;
        clearInterval(id);
      };
    }
    if (user.role === 'user') {
      let mounted = true;
      const poll = async () => {
        try {
          const userData = await apiAdapter.getMe();
          if (mounted && userData) {
            setUser(userData);
            const storage = localStorage.getItem('pathpoint_token') ? localStorage : sessionStorage;
            try { storage.setItem('pathpoint_user', JSON.stringify(userData)); } catch {}
          }
        } catch {}
      };
      poll();
      const id = setInterval(poll, 60000);
      return () => {
        mounted = false;
        clearInterval(id);
      };
    }
    return undefined;
  }, [token, user?.role, user?.businessVerification?.status, user?.id]);

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
    // Sign the new account in immediately so the user lands in their workspace
    // instead of being asked to re-enter the credentials they just chose.
    if (result?.user && result?.token) {
      persistAuthSession(result.user, result.token, rememberMe);
      setUser(result.user);
      setToken(result.token);
    }
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
      refreshUser,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
    }),
    [user, token, loading, backendOnline, apiUrl, settings, updateSettings, updateApiUrl, recheckBackend, login, requestLoginCode, verifyLoginCode, register, updateMyProfile, refreshUser, forgotPassword, verifyResetCode, resetPassword, changePassword, logout]
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
