import axios from 'axios';

// Resolve API base URL dynamically (supports custom user override from UI)
export const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    const customURL = localStorage.getItem('pathpoint_api_url');
    if (customURL && customURL.trim()) {
      return customURL.trim().replace(/\/+$/, '');
    }
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
};

export const setBaseURL = (newUrl) => {
  if (newUrl && newUrl.trim()) {
    localStorage.setItem('pathpoint_api_url', newUrl.trim());
  } else {
    localStorage.removeItem('pathpoint_api_url');
  }
  apiClient.defaults.baseURL = getBaseURL();
};

export const apiClient = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 8000,
});

// Update baseURL before each request in case it was modified
apiClient.interceptors.request.use(
  (config) => {
    config.baseURL = getBaseURL();
    const token =
      localStorage.getItem('pathpoint_token') ||
      sessionStorage.getItem('pathpoint_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept 401 Unauthorized & expired sessions
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAdminRoute = window.location.pathname.startsWith('/admin');
      
      localStorage.removeItem('pathpoint_token');
      sessionStorage.removeItem('pathpoint_token');
      localStorage.removeItem('pathpoint_user');

      // Dispatch custom event for UI components to react gracefully
      window.dispatchEvent(
        new CustomEvent('pathpoint:session-expired', {
          detail: { isAdmin: isAdminRoute },
        })
      );

      const isAuthPage =
        window.location.pathname.startsWith('/login') ||
        window.location.pathname.startsWith('/register') ||
        false;

      if (!isAuthPage) {
        window.location.href = '/login?session_expired=1';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
