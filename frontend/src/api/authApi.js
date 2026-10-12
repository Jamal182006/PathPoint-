import apiClient from './client';

export const authApi = {
  // Candidate / User Login
  login: (credentials) => apiClient.post('/auth/login', credentials),

  // Email verification code step before login completion
  requestLoginCode: (credentials) => apiClient.post('/auth/request-login-code', credentials),
  verifyLoginCode: (payload) => apiClient.post('/auth/verify-login-code', payload),

  // Candidate Registration
  register: (userData) => apiClient.post('/auth/register', userData),
  checkUsernameAvailability: (username) => apiClient.get('/auth/username-availability', { params: { username } }),

  // Get current user profile by token
  getMe: () => apiClient.get('/auth/me'),
  updateProfile: (payload) => apiClient.put('/auth/profile', payload),
  getMyResume: (inline = false) => apiClient.get('/auth/profile/resume', { params: inline ? { inline: 'true' } : undefined, responseType: 'blob' }),
  uploadMyResume: (formData) => apiClient.put('/auth/profile/resume', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteMyResume: () => apiClient.delete('/auth/profile/resume'),
  getProfileCustomization: () => apiClient.get('/v1/profile'),
  updateProfileCustomization: (payload) => apiClient.patch('/v1/profile/customize', payload),

  // Password reset request
  forgotPassword: (identifier) => apiClient.post('/auth/forgot-password', { identifier }),

  // Verify reset code sent to email
  verifyResetCode: (identifier, code) => apiClient.post('/auth/verify-reset-code', { identifier, code }),

  // Apply the new password after the code has been verified
  resetPassword: (identifier, code, newPassword) =>
    apiClient.post('/auth/reset-password', { identifier, code, newPassword }),

  // Change password
  changePassword: (passwordData) => apiClient.put('/auth/password', passwordData),

  // Logout (optional backend session revocation)
  logout: () => apiClient.post('/auth/logout').catch(() => {}),
};

export default authApi;
