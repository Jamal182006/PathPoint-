import authApi from '../api/authApi';
import applicationsApi from '../api/applicationsApi';
import adminApi from '../api/adminApi';
import systemApi from '../api/systemApi';
import { storageService } from './storageService';

let backendAvailable = false;
let checkPromise = null;

export const checkBackendStatus = async (force = false) => {
  if (!force && checkPromise) return checkPromise;

  checkPromise = (async () => {
    const health = await systemApi.checkHealth();
    backendAvailable = health.online;
    return backendAvailable;
  })();

  return checkPromise;
};

export const isBackendOnline = () => backendAvailable;

const persistAuthSession = (user, token, rememberMe = true) => {
  if (rememberMe) {
    localStorage.setItem('pathpoint_token', token);
    localStorage.setItem('pathpoint_user', JSON.stringify(user));
    sessionStorage.removeItem('pathpoint_token');
    sessionStorage.removeItem('pathpoint_user');
  } else {
    sessionStorage.setItem('pathpoint_token', token);
    sessionStorage.setItem('pathpoint_user', JSON.stringify(user));
    localStorage.removeItem('pathpoint_token');
    localStorage.removeItem('pathpoint_user');
  }
};

export const apiAdapter = {
  checkStatus: checkBackendStatus,
  isOnline: isBackendOnline,
  testEndpoint: systemApi.testEndpoint,

  // ==========================================
  // AUTHENTICATION
  // ==========================================
  login: async (email, password, rememberMe = true) => {
    const online = await checkBackendStatus(true);
    if (!online) {
      throw new Error('The server is unavailable. Start the backend and connect MongoDB before signing in.');
    }

    try {
      const res = await authApi.login({ email, password });
      if (res.data?.success && res.data.token) {
        persistAuthSession(res.data.user, res.data.token, rememberMe);
        return { user: res.data.user, token: res.data.token, source: 'backend' };
      }
      throw new Error(res.data?.message || 'Login failed');
    } catch (err) {
      if (err.response?.data?.message) {
        const error = new Error(err.response.data.message);
        error.lockoutSeconds = err.response.data.lockoutSeconds;
        throw error;
      }
      throw new Error('Unable to reach the authentication server. Please try again.');
    }
  },

  register: async ({ name, email, password, role = 'user', careerTrack = 'General' }, rememberMe = true) => {
    const online = await checkBackendStatus(true);
    if (!online) {
      throw new Error('The server is unavailable. Start the backend and connect MongoDB before creating an account.');
    }

    try {
      const res = await authApi.register({ name, email, password, role, careerTrack });
      if (res.data?.success && res.data.token) {
        persistAuthSession(res.data.user, res.data.token, rememberMe);
        return { user: res.data.user, token: res.data.token, source: 'backend' };
      }
      throw new Error(res.data?.message || 'Registration failed');
    } catch (err) {
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      throw new Error('Unable to reach the registration server. Please try again.');
    }
  },

  getMe: async () => {
    const online = await checkBackendStatus();
    if (online) {
      try {
        const res = await authApi.getMe();
        if (res.data?.success && res.data.user) {
          return res.data.user;
        }
      } catch (err) {
        console.warn('[Adapter] getMe failed against backend:', err.message);
        throw err;
      }
    }

    // If offline, check currently saved user in localStorage
    const saved =
      localStorage.getItem('pathpoint_user') ||
      sessionStorage.getItem('pathpoint_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  },

  forgotPassword: async (email) => {
    const online = await checkBackendStatus();
    if (online) {
      try {
        const res = await authApi.forgotPassword(email);
        return res.data;
      } catch (err) {
        if (err.response?.data?.message) {
          throw new Error(err.response.data.message);
        }
      }
    }
    return storageService.forgotPassword(email);
  },

  verifyResetCode: async (email, code) => {
    const online = await checkBackendStatus();
    if (!online) {
      throw new Error('The backend is unavailable. Please try again later.');
    }

    try {
      const res = await authApi.verifyResetCode(email, code);
      return res.data;
    } catch (err) {
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      throw new Error('Unable to verify the reset code.');
    }
  },

  resetPassword: async (email, code, newPassword) => {
    const online = await checkBackendStatus();
    if (!online) {
      throw new Error('The backend is unavailable. Please try again later.');
    }

    try {
      const res = await authApi.resetPassword(email, code, newPassword);
      return res.data;
    } catch (err) {
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      throw new Error('Unable to reset the password.');
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    const online = await checkBackendStatus();
    if (online) {
      const res = await authApi.changePassword({ currentPassword, newPassword });
      return res.data;
    }
    return { success: true, message: 'Password updated successfully (Local Demo Mode)' };
  },

  // ==========================================
  // APPLICATIONS
  // ==========================================
  getApplications: async (userId, filters = {}) => {
    const online = await checkBackendStatus();
    if (online) {
      try {
        const res = await applicationsApi.getAll(filters);
        if (res.data?.success) {
          return res.data.data;
        }
      } catch (err) {
        console.warn('[Adapter] Backend getApplications failed, falling back to storage:', err.message);
      }
    }
    return storageService.getApplications(userId, filters);
  },

  getApplicationById: async (id) => {
    const online = await checkBackendStatus();
    if (online) {
      try {
        const res = await applicationsApi.getById(id);
        if (res.data?.success) {
          return res.data.data;
        }
      } catch (err) {
        console.warn('[Adapter] Backend getApplicationById failed, falling back:', err.message);
      }
    }
    return storageService.getApplicationById(id);
  },

  createApplication: async (userId, data) => {
    const online = await checkBackendStatus();
    if (online) {
      try {
        const res = await applicationsApi.create(data);
        if (res.data?.success) {
          return res.data.data;
        }
      } catch (err) {
        console.warn('[Adapter] Backend create failed, falling back to local:', err.message);
      }
    }
    return storageService.createApplication(userId, data);
  },

  updateApplication: async (id, data) => {
    const online = await checkBackendStatus();
    if (online) {
      try {
        const res = await applicationsApi.update(id, data);
        if (res.data?.success) {
          return res.data.data;
        }
      } catch (err) {
        console.warn('[Adapter] Backend update failed, falling back to local:', err.message);
      }
    }
    return storageService.updateApplication(id, data);
  },

  updateStatus: async (id, status) => {
    const online = await checkBackendStatus();
    if (online) {
      try {
        const res = await applicationsApi.updateStatus(id, status);
        if (res.data?.success) {
          return res.data.data;
        }
      } catch (err) {
        console.warn('[Adapter] Backend status update failed, falling back to local:', err.message);
      }
    }
    return storageService.updateStatus(id, status);
  },

  deleteApplication: async (id) => {
    const online = await checkBackendStatus();
    if (online) {
      try {
        const res = await applicationsApi.delete(id);
        if (res.data?.success) {
          return true;
        }
      } catch (err) {
        console.warn('[Adapter] Backend delete failed, falling back to local:', err.message);
      }
    }
    return storageService.deleteApplication(id);
  },

  uploadResume: async (id, file) => {
    const online = await checkBackendStatus();
    if (online) {
      try {
        const formData = new FormData();
        formData.append('resume', file);
        formData.append('resumeVersion', file.name);
        const res = await applicationsApi.uploadResume(id, formData);
        if (res.data?.success) {
          return res.data.data;
        }
      } catch (err) {
        console.warn('[Adapter] Backend resume upload failed, falling back:', err.message);
      }
    }
    return storageService.uploadResume(id, { fileName: file.name, fileSize: file.size });
  },

  // ==========================================
  // ANALYTICS
  // ==========================================
  getAnalyticsSummary: async (userId) => {
    const online = await checkBackendStatus();
    if (online) {
      try {
        const res = await applicationsApi.getAll();
        // Or if analytics endpoint is available
        if (res.data?.success) {
          return storageService.getAnalyticsSummary(userId);
        }
      } catch (err) {
        console.warn('[Adapter] Backend analytics failed, falling back:', err.message);
      }
    }
    return storageService.getAnalyticsSummary(userId);
  },

  // ==========================================
  // ADMIN & COUNSELOR SUITE
  // ==========================================
  getAdminMetrics: async () => {
    const online = await checkBackendStatus();
    if (online) {
      try {
        const res = await adminApi.getAggregateMetrics();
        if (res.data?.success) {
          return res.data.data;
        }
      } catch (err) {
        console.warn('[Adapter] Backend admin metrics failed, falling back:', err.message);
      }
    }
    return storageService.getAdminMetrics();
  },

  getAdminUsers: async (params = {}) => {
    const online = await checkBackendStatus();
    if (online) {
      try {
        const res = await adminApi.getUsers(params);
        if (res.data?.success) {
          return res.data.data;
        }
      } catch (err) {
        console.warn('[Adapter] Backend admin users failed, falling back:', err.message);
      }
    }
    return storageService.getAdminUsers(params);
  },

  updateUserStatus: async (userId, status) => {
    const online = await checkBackendStatus();
    if (online) {
      try {
        const res = await adminApi.updateUserStatus(userId, status);
        if (res.data?.success) {
          return res.data;
        }
      } catch (err) {
        console.warn('[Adapter] Backend updateUserStatus failed, falling back:', err.message);
      }
    }
    return storageService.updateUserStatus(userId, status);
  },

  getUserApplications: async (userId) => {
    const online = await checkBackendStatus();
    if (online) {
      try {
        const res = await adminApi.getUserApplications(userId);
        if (res.data?.success) {
          return res.data.applications;
        }
      } catch (err) {
        console.warn('[Adapter] Backend getUserApplications failed, falling back:', err.message);
      }
    }
    return storageService.getUserApplications(userId);
  },
};

export default apiAdapter;
