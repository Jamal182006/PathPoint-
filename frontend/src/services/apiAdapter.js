import authApi from '../api/authApi';
import applicationsApi from '../api/applicationsApi';
import adminApi from '../api/adminApi';
import providersApi from '../api/providersApi';
import companiesApi from '../api/companiesApi';
import jobsApi from '../api/jobsApi';
import workLogsApi from '../api/workLogsApi';
import pinsApi from '../api/pinsApi';
import systemApi from '../api/systemApi';

let backendAvailable = false;
let checkPromise = null;
let lastBackendCheckAt = 0;
const HEALTH_CHECK_TTL_MS = 10000;

export const checkBackendStatus = async (force = false) => {
  const now = Date.now();

  if (!force && checkPromise) {
    return checkPromise;
  }

  if (!force && now - lastBackendCheckAt < HEALTH_CHECK_TTL_MS && typeof backendAvailable === 'boolean') {
    return backendAvailable;
  }

  checkPromise = (async () => {
    try {
      const health = await systemApi.checkHealth();
      // "Available" means the API server answered at all -- a 503 (database
      // briefly reconnecting) is still reachable, so it must not block sign-in.
      backendAvailable = Boolean(health?.reachable ?? health?.online);
      return backendAvailable;
    } catch {
      backendAvailable = false;
      return false;
    } finally {
      lastBackendCheckAt = Date.now();
      checkPromise = null;
    }
  })();

  return checkPromise;
};

export const isBackendOnline = () => backendAvailable;

export const persistAuthSession = (user, token, rememberMe = true) => {
  if (rememberMe) {
    localStorage.setItem('pathpoint_token', token);
    localStorage.setItem('pathpoint_user', JSON.stringify(user));
    sessionStorage.removeItem('pathpoint_token');
    sessionStorage.removeItem('pathpoint_user');
    localStorage.setItem('pathpoint_token_expires_at', String(Date.now() + 30 * 24 * 60 * 60 * 1000));
  } else {
    sessionStorage.setItem('pathpoint_token', token);
    sessionStorage.setItem('pathpoint_user', JSON.stringify(user));
    localStorage.removeItem('pathpoint_token');
    localStorage.removeItem('pathpoint_user');
    localStorage.removeItem('pathpoint_token_expires_at');
  }
};

const getTrustedDeviceToken = () => {
  let deviceToken = localStorage.getItem('pathpoint_trusted_device');
  if (!deviceToken) {
    deviceToken = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('pathpoint_trusted_device', deviceToken);
  }
  return deviceToken;
};

const persistTrustedDevice = (token) => {
  if (token) localStorage.setItem('pathpoint_trusted_device', token);
};

const withApiErrorMessage = async (request) => {
  try {
    return await request;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'The request failed. Please try again.');
  }
};

const normalizeApplication = (application) => application
  ? {
      ...application,
      _id: application._id || application.id,
      interviewDates: (application.interviewDates || []).map((entry) => entry?.date || entry),
    }
  : application;

export const apiAdapter = {
  checkStatus: checkBackendStatus,
  isOnline: isBackendOnline,
  testEndpoint: systemApi.testEndpoint,

  // ==========================================
  // AUTHENTICATION
  // ==========================================
  login: async (identifier, password, rememberMe = true) => {
    const online = await checkBackendStatus(true);
    if (!online) {
      throw new Error('The server is unavailable. Start the backend and connect MongoDB before signing in.');
    }

    try {
      const res = await authApi.login({ identifier, password, rememberMe, deviceToken: getTrustedDeviceToken() });
      if (res.data?.success && res.data.token) {
        persistAuthSession(res.data.user, res.data.token, rememberMe);
        return { user: res.data.user, token: res.data.token, source: 'backend' };
      }
      if (res.data?.success && res.data.requiresCode) {
        return { ...res.data, rememberMe, source: 'backend' };
      }
      throw new Error(res.data?.message || 'Login failed');
    } catch (err) {
      if (err.response?.data?.message) {
        const error = new Error(err.response.data.message);
        error.lockoutSeconds = err.response.data.lockoutSeconds;
        throw error;
      }
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        throw new Error('Connection timed out while contacting authentication server. Please try again.');
      }
      if (err.message && err.message !== 'Login failed') {
        throw err;
      }
      throw new Error('Unable to reach the authentication server. Please try again.');
    }
  },

  requestLoginCode: async (identifier, password, rememberMe = true) => {
    const online = await checkBackendStatus(true);
    if (!online) {
      throw new Error('The server is unavailable. Start the backend and connect MongoDB before signing in.');
    }

    try {
      const res = await authApi.requestLoginCode({ identifier, password, rememberMe, deviceToken: getTrustedDeviceToken() });
      if (res.data?.success) {
        persistTrustedDevice(res.data.trustedDeviceToken);
        if (res.data.token && res.data.user) {
          persistAuthSession(res.data.user, res.data.token, rememberMe);
          return {
            ...res.data,
            user: res.data.user,
            token: res.data.token,
            source: 'backend',
          };
        }
        return {
          ...res.data,
          rememberMe,
          source: 'backend',
        };
      }
      throw new Error(res.data?.message || 'Unable to send login verification code');
    } catch (err) {
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        throw new Error('Connection timed out while sending verification code. Please try again.');
      }
      if (err.message && err.message !== 'Unable to send login verification code') {
        throw err;
      }
      throw new Error('Unable to reach the authentication server. Please try again.');
    }
  },

  verifyLoginCode: async (identifier, password, code, rememberMe = true) => {
    const online = await checkBackendStatus(true);
    if (!online) {
      throw new Error('The server is unavailable. Start the backend and connect MongoDB before signing in.');
    }

    try {
      const deviceToken = getTrustedDeviceToken();
      const res = await authApi.verifyLoginCode({ identifier, password, code, rememberMe, deviceToken });
      if (res.data?.success && res.data.token) {
        persistTrustedDevice(res.data.trustedDeviceToken || deviceToken);
        persistAuthSession(res.data.user, res.data.token, rememberMe);
        return { user: res.data.user, token: res.data.token, source: 'backend' };
      }
      throw new Error(res.data?.message || 'Login verification failed');
    } catch (err) {
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        throw new Error('Connection timed out while verifying the code. Please try again.');
      }
      if (err.message && err.message !== 'Login verification failed') {
        throw err;
      }
      throw new Error('Unable to verify the login code. Please try again.');
    }
  },

  register: async (userData, rememberMe = true) => {
    const online = await checkBackendStatus(true);
    if (!online) {
      throw new Error('The server is unavailable. Start the backend and connect MongoDB before creating an account.');
    }

    try {
      const res = await authApi.register(userData);
      if (res.data?.success && res.data.user) {
        return { user: res.data.user, token: res.data.token || null, source: 'backend' };
      }
      throw new Error(res.data?.message || 'Registration failed');
    } catch (err) {
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      throw new Error('Unable to reach the registration server. Please try again.');
    }
  },

  checkUsernameAvailability: async (username) => {
    try {
      const res = await authApi.checkUsernameAvailability(username);
      return res.data;
    } catch (err) {
      if (err.response?.data?.message) throw new Error(err.response.data.message);
      throw new Error('Unable to check username availability.');
    }
  },

  getMe: async () => {
    const online = await checkBackendStatus();
    if (!online) throw new Error('The backend is unavailable. Your session could not be verified.');
    try {
      const res = await authApi.getMe();
      if (res.data?.success && res.data.user) return res.data.user;
      throw new Error(res.data?.message || 'Unable to verify your session.');
    } catch (err) {
      console.warn('[Adapter] getMe failed against backend:', err.message);
      throw err;
    }
  },

  updateMyProfile: async (profile) => {
    const res = await withApiErrorMessage(authApi.updateProfile(profile));
    if (!res.data?.success || !res.data.user) throw new Error(res.data?.message || 'Profile update failed');
    const serialized = JSON.stringify(res.data.user);
    if (localStorage.getItem('pathpoint_token')) localStorage.setItem('pathpoint_user', serialized);
    else sessionStorage.setItem('pathpoint_user', serialized);
    return res.data.user;
  },

  getProfileCustomization: async () => {
    const online = await checkBackendStatus();
    if (!online) throw new Error('The backend is unavailable. Profile settings require a database connection.');
    const res = await withApiErrorMessage(authApi.getProfileCustomization());
    return res.data?.data || res.data;
  },

  updateProfileCustomization: async (payload) => {
    const online = await checkBackendStatus();
    if (!online) throw new Error('The backend is unavailable. Profile settings require a database connection.');
    const res = await withApiErrorMessage(authApi.updateProfileCustomization(payload));
    return res.data?.data || res.data;
  },

  getMyResume: async (inline = false) => {
    const online = await checkBackendStatus();
    if (!online) throw new Error('The backend is unavailable. Resume downloads require a database connection.');
    const res = await withApiErrorMessage(authApi.getMyResume(inline));
    return res.data;
  },

  uploadMyResume: async (fileOrFormData) => {
    const online = await checkBackendStatus();
    if (!online) throw new Error('The backend is unavailable. Resume uploads require a database connection.');
    let formData = fileOrFormData;
    if (!(fileOrFormData instanceof FormData)) {
      formData = new FormData();
      formData.append('resume', fileOrFormData);
    }
    const res = await withApiErrorMessage(authApi.uploadMyResume(formData));
    return res.data;
  },

  deleteMyResume: async () => {
    const online = await checkBackendStatus();
    if (!online) throw new Error('The backend is unavailable. Resume deletion requires a database connection.');
    const res = await withApiErrorMessage(authApi.deleteMyResume());
    return res.data;
  },


  forgotPassword: async (identifier) => {
    const online = await checkBackendStatus(true);
    if (!online) {
      throw new Error('The backend is unavailable. Please try again later.');
    }

    try {
      const res = await authApi.forgotPassword(identifier);
      return res.data;
    } catch (err) {
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      throw new Error('Unable to send the password reset code.');
    }
  },

  verifyResetCode: async (identifier, code) => {
    const online = await checkBackendStatus(true);
    if (!online) {
      throw new Error('The backend is unavailable. Please try again later.');
    }

    try {
      const res = await authApi.verifyResetCode(identifier, code);
      return res.data;
    } catch (err) {
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      throw new Error('Unable to verify the reset code.');
    }
  },

  resetPassword: async (identifier, code, newPassword) => {
    const online = await checkBackendStatus(true);
    if (!online) {
      throw new Error('The backend is unavailable. Please try again later.');
    }

    try {
      const res = await authApi.resetPassword(identifier, code, newPassword);
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
    if (!online) throw new Error('The backend is unavailable. Password changes require a database connection.');
    const res = await authApi.changePassword({ currentPassword, newPassword });
    return res.data;
  },

  // ==========================================
  // APPLICATIONS
  // ==========================================
  getApplicationSubmissions: async (params = {}) => {
    const online = await checkBackendStatus(true);
    if (!online) throw new Error('The backend is unavailable. Applications require a database connection.');
    const res = await withApiErrorMessage(applicationsApi.getSubmissions(params));
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load applications');
    return res.data;
  },

  updateApplicationSubmission: async (kind, id, payload) => {
    const res = await withApiErrorMessage(applicationsApi.updateSubmission(kind, id, payload));
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to update application');
    return res.data.data;
  },

  deleteApplicationSubmission: async (kind, id) => {
    const res = await withApiErrorMessage(applicationsApi.deleteSubmission(kind, id));
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to delete application');
    return true;
  },

  importApplications: async (applications, replace = false) => {
    const res = await withApiErrorMessage(applicationsApi.importAll({ applications, replace }));
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to import applications');
    return res.data.data;
  },

  getPinnedItems: async () => {
    const res = await withApiErrorMessage(pinsApi.getAll());
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load tracked items');
    return res.data.data || [];
  },

  pinItem: async (payload) => {
    const res = await withApiErrorMessage(pinsApi.create(payload));
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to track item');
    return res.data.data;
  },

  unpinItem: async ({ itemType, itemId, applicationKind }) => {
    const res = await withApiErrorMessage(pinsApi.remove(itemType, itemId, applicationKind));
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to untrack item');
    return true;
  },

  getApplications: async (userId, filters = {}) => {
    const online = await checkBackendStatus(true);
    if (!online) throw new Error('The backend is unavailable. Applications require a database connection.');
    try {
      const res = await applicationsApi.getAll(filters);
      if (res.data?.success) {
        return res.data.data.map(normalizeApplication);
      }
      throw new Error(res.data?.message || 'Failed to load applications');
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || 'Failed to load applications');
    }
  },

  getApplicationById: async (id) => {
    const online = await checkBackendStatus(true);
    if (!online) throw new Error('The backend is unavailable. Applications require a database connection.');
    try {
      const res = await applicationsApi.getById(id);
      if (res.data?.success) {
        return normalizeApplication(res.data.data);
      }
      throw new Error(res.data?.message || 'Failed to load application');
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || 'Failed to load application');
    }
  },

  createApplication: async (userId, data) => {
    const online = await checkBackendStatus(true);
    if (!online) throw new Error('The backend is unavailable. Applications require a database connection.');
    try {
      const res = await applicationsApi.create(data);
      if (res.data?.success) {
        return normalizeApplication(res.data.data);
      }
      throw new Error(res.data?.message || 'Failed to create application');
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || 'Failed to create application');
    }
  },

  updateApplication: async (id, data) => {
    const online = await checkBackendStatus(true);
    if (!online) throw new Error('The backend is unavailable. Applications require a database connection.');
    try {
      const res = await applicationsApi.update(id, data);
      if (res.data?.success) {
        return normalizeApplication(res.data.data);
      }
      throw new Error(res.data?.message || 'Failed to update application');
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || 'Failed to update application');
    }
  },

  updateStatus: async (id, status) => {
    const online = await checkBackendStatus(true);
    if (!online) throw new Error('The backend is unavailable. Applications require a database connection.');
    try {
      const res = await applicationsApi.updateStatus(id, status);
      if (res.data?.success) {
        return normalizeApplication(res.data.data);
      }
      throw new Error(res.data?.message || 'Failed to update application status');
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || 'Failed to update application status');
    }
  },

  deleteApplication: async (id) => {
    const online = await checkBackendStatus(true);
    if (!online) throw new Error('The backend is unavailable. Applications require a database connection.');
    try {
      const res = await applicationsApi.delete(id);
      if (res.data?.success) {
        return true;
      }
      throw new Error(res.data?.message || 'Failed to delete application');
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || 'Failed to delete application');
    }
  },

  uploadResume: async (id, file) => {
    const online = await checkBackendStatus(true);
    if (!online) throw new Error('The backend is unavailable. Resume uploads require a database connection.');
    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('resumeVersion', file.name);
      const res = await applicationsApi.uploadResume(id, formData);
      if (res.data?.success) {
        return res.data.data;
      }
      throw new Error(res.data?.message || 'Failed to upload resume');
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || 'Failed to upload resume');
    }
  },

  // ==========================================
  // ADMIN & COUNSELOR SUITE
  // ==========================================
  getAdminMetrics: async () => {
    const online = await checkBackendStatus(true);
    if (!online) throw new Error('The backend is unavailable. Admin metrics require a database connection.');
    const res = await withApiErrorMessage(adminApi.getAggregateMetrics());
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load admin metrics');
    return res.data.data;
  },

  getAdminUsers: async (params = {}) => {
    const online = await checkBackendStatus(true);
    if (!online) throw new Error('The backend is unavailable. User management requires a database connection.');
    const res = await withApiErrorMessage(adminApi.getUsers(params));
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load users');
    return res.data.data;
  },

  getAdminUsersPage: async (params = {}) => {
    const online = await checkBackendStatus(true);
    if (!online) throw new Error('The backend is unavailable. Connect to the server to manage users.');
    const res = await withApiErrorMessage(adminApi.getUsers(params));
    return res.data;
  },

  getAdminApplications: async (params = {}) => {
    const res = await withApiErrorMessage(adminApi.getApplications(params));
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load applications');
    return res.data;
  },

  deleteAdminApplication: async (type, applicationId) => {
    const res = await withApiErrorMessage(adminApi.deleteApplication(type, applicationId));
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to delete application');
    return res.data;
  },

  getJobs: async (params = {}) => {
    const res = await withApiErrorMessage(jobsApi.getAll(params));
    return res.data?.success ? res.data.data : [];
  },

  getJob: async (jobId) => {
    const res = await withApiErrorMessage(jobsApi.getById(jobId));
    return res.data?.data;
  },

  getProviderJobs: async (params = {}) => {
    const res = await withApiErrorMessage(jobsApi.getProviderListings(params));
    return res.data?.data || [];
  },

  createJob: async (companyId, payload) => {
    const res = await withApiErrorMessage(jobsApi.create(companyId, payload));
    return res.data?.data;
  },

  getProviderJob: async (jobId) => {
    const res = await withApiErrorMessage(jobsApi.getProviderListing(jobId));
    return res.data?.data;
  },

  updateProviderJob: async (jobId, payload) => {
    const res = await withApiErrorMessage(jobsApi.update(jobId, payload));
    return res.data?.data;
  },

  updateProviderJobStatus: async (jobId, status) => {
    const res = await withApiErrorMessage(jobsApi.updateStatus(jobId, status));
    return res.data?.data;
  },

  archiveProviderJob: async (jobId) => {
    const res = await withApiErrorMessage(jobsApi.archive(jobId));
    return res.data;
  },

  getProviderJobApplicants: async (jobId) => {
    const res = await withApiErrorMessage(jobsApi.getApplicants(jobId));
    return res.data?.data || [];
  },

  submitJobApplication: async (jobId, formData, onUploadProgress) => {
    const res = await withApiErrorMessage(jobsApi.apply(jobId, formData, onUploadProgress));
    return res.data?.data;
  },

  getMyJobApplications: async () => {
    const res = await withApiErrorMessage(jobsApi.getMyApplications());
    return res.data?.data || [];
  },

  getMyJobApplication: async (applicationId) => {
    const res = await withApiErrorMessage(jobsApi.getMyApplication(applicationId));
    return res.data?.data;
  },

  updateJobApplication: async (applicationId, payload) => {
    const res = await withApiErrorMessage(jobsApi.updateApplication(applicationId, payload));
    return res.data?.data;
  },

  getJobApplicationFile: async (applicationId, responseId, inline = false) => {
    const res = await withApiErrorMessage(jobsApi.getApplicationFile(applicationId, responseId, inline));
    return res.data;
  },

  getWorkLogs: async (params = {}) => {
    const res = await withApiErrorMessage(workLogsApi.getAll(params));
    return res.data;
  },

  getWorkLog: async (id) => {
    const res = await withApiErrorMessage(workLogsApi.get(id));
    return res.data?.data;
  },

  createWorkLog: async (payload) => {
    const res = await withApiErrorMessage(workLogsApi.create(payload));
    return res.data?.data;
  },

  updateWorkLog: async (id, payload) => {
    const res = await withApiErrorMessage(workLogsApi.update(id, payload));
    return res.data?.data;
  },

  deleteWorkLog: async (id) => {
    const res = await withApiErrorMessage(workLogsApi.delete(id));
    return res.data;
  },

  getAdminProviders: async (params = {}) => {
    const res = await withApiErrorMessage(adminApi.getUsers({ ...params, role: 'provider' }));
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load providers');
    return res.data?.success ? res.data.data : [];
  },

  getProviderVerificationDocument: async (providerId) => {
    const res = await withApiErrorMessage(adminApi.getProviderVerificationDocument(providerId));
    return res.data;
  },

  reviewProviderVerification: async (providerId, status, rejectionReason = '') => {
    const res = await withApiErrorMessage(adminApi.reviewProviderVerification(providerId, status, rejectionReason));
    return res.data;
  },

  submitProviderVerificationDocument: async (file) => {
    if (!file || file.size > 5 * 1024 * 1024) {
      throw new Error('Choose a verification document that is 5 MB or smaller.');
    }
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(new Error('Unable to read the selected document.'));
      reader.readAsDataURL(file);
    });
    const res = await providersApi.submitVerificationDocument({
      fileName: file.name,
      mimeType: file.type,
      data,
    });
    return res.data?.data;
  },

  updateUserStatus: async (userId, status) => {
    const online = await checkBackendStatus(true);
    if (!online) throw new Error('The backend is unavailable. User management requires a database connection.');
    const res = await withApiErrorMessage(adminApi.updateUserStatus(userId, status));
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to update user status');
    return res.data;
  },

  archiveAdminUser: async (userId, archived) => {
    const online = await checkBackendStatus(true);
    if (!online) throw new Error('The backend is unavailable. Connect to the server to manage accounts.');
    const res = await withApiErrorMessage(adminApi.archiveUser(userId, archived));
    return res.data;
  },

  getUserApplications: async (userId) => {
    const online = await checkBackendStatus(true);
    if (!online) throw new Error('The backend is unavailable. Portfolio review requires a database connection.');
    const res = await withApiErrorMessage(adminApi.getUserApplications(userId));
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load user applications');
    return res.data.applications;
  },

  getProviders: async () => {
    const online = await checkBackendStatus();
    if (!online) return [];

    try {
      const res = await providersApi.getAll();
      return res.data?.success ? res.data.data : [];
    } catch (err) {
      console.warn('[Adapter] Provider directory request failed:', err.message);
      return [];
    }
  },

  getCompanies: async (params = {}) => {
    const res = await withApiErrorMessage(companiesApi.getAll(params));
    return res.data?.success ? res.data.data : [];
  },

  getCompany: async (companyId) => {
    const res = await withApiErrorMessage(companiesApi.getById(companyId));
    if (!res.data?.success) throw new Error(res.data?.message || 'Company not found');
    return res.data.data;
  },

  getMyCompanies: async (params = {}) => {
    const res = await withApiErrorMessage(companiesApi.getMine(params));
    return res.data?.success ? res.data.data : [];
  },

  createCompany: async (payload) => {
    const res = await withApiErrorMessage(companiesApi.create(payload));
    if (!res.data?.success) throw new Error(res.data?.message || 'Company creation failed');
    return res.data.data;
  },

  getMyCompany: async (companyId) => {
    const res = await withApiErrorMessage(companiesApi.getMineById(companyId));
    if (!res.data?.success) throw new Error(res.data?.message || 'Company not found');
    return res.data.data;
  },

  updateMyCompany: async (companyId, payload) => {
    const res = await withApiErrorMessage(companiesApi.updateMine(companyId, payload));
    if (!res.data?.success) throw new Error(res.data?.message || 'Company update failed');
    return res.data.data;
  },

  archiveMyCompany: async (companyId) => {
    const res = await withApiErrorMessage(companiesApi.archiveMine(companyId));
    if (!res.data?.success) throw new Error(res.data?.message || 'Company archive failed');
    return res.data;
  },

  getProviderCompanyApplications: async (companyId, params = {}) => {
    const res = await withApiErrorMessage(companiesApi.getProviderApplications(companyId, params));
    return res.data?.success ? res.data.data : [];
  },

  submitCompanyApplication: async (companyId, formData, onUploadProgress) => {
    const res = await withApiErrorMessage(companiesApi.apply(companyId, formData, onUploadProgress));
    if (!res.data?.success) throw new Error(res.data?.message || 'Application submission failed');
    return res.data.data;
  },

  getMyCompanyApplications: async (params = {}) => {
    const res = await withApiErrorMessage(companiesApi.getMyApplications(params));
    return res.data?.success ? res.data.data : [];
  },

  getMyCompanyApplication: async (applicationId) => {
    const res = await withApiErrorMessage(companiesApi.getMyApplication(applicationId));
    if (!res.data?.success) throw new Error(res.data?.message || 'Application not found');
    return res.data.data;
  },

  updateCompanyApplicationStatus: async (applicationId, payload) => {
    const res = await withApiErrorMessage(companiesApi.updateApplicationStatus(applicationId, payload));
    if (!res.data?.success) throw new Error(res.data?.message || 'Application status update failed');
    return res.data.data;
  },

  getCompanyApplicationFile: async (applicationId, fileId, inline = false) => {
    const res = await withApiErrorMessage(companiesApi.getApplicationFile(applicationId, fileId, inline));
    return res.data;
  },

  updateBusinessProfile: async (businessProfile) => {
    const online = await checkBackendStatus();
    if (!online) throw new Error('The server is unavailable. Connect to the backend to update your listing.');

    try {
      const res = await providersApi.updateMine(businessProfile);
      if (res.data?.success) return { ...res.data.data, verification: res.data.verification };
      throw new Error(res.data?.message || 'Failed to update business profile');
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || 'Failed to update business profile');
    }
  },
};

export default apiAdapter;
