import apiClient from './client';

export const authApi = {
  // Candidate / User Login
  login: (credentials) => apiClient.post('/auth/login', credentials),

  // Candidate Registration
  register: (userData) => apiClient.post('/auth/register', userData),

  // Get current user profile by token
  getMe: () => apiClient.get('/auth/me'),

  // Password reset request
  forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }),

  // Verify reset code sent to email
  verifyResetCode: (email, code) => apiClient.post('/auth/verify-reset-code', { email, code }),

  // Apply the new password after the code has been verified
  resetPassword: (email, code, newPassword) =>
    apiClient.post('/auth/reset-password', { email, code, newPassword }),

  // Change password
  changePassword: (passwordData) => apiClient.put('/auth/password', passwordData),

  // Logout (optional backend session revocation)
  logout: () => apiClient.post('/auth/logout').catch(() => {}),
};

export default authApi;
