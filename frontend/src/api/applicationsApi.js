import apiClient from './client';

export const applicationsApi = {
  // Fetch user's applications with status or search filter
  getAll: (params) => apiClient.get('/applications', { params }),

  // Fetch single application by ID
  getById: (id) => apiClient.get(`/applications/${id}`),

  // Create new application
  create: (data) => apiClient.post('/applications', data),

  // Update existing application
  update: (id, data) => apiClient.put(`/applications/${id}`, data),

  // Update application status (Drag & Drop kanban)
  updateStatus: (id, status) => apiClient.patch(`/applications/${id}/status`, { status }),

  // Delete application
  delete: (id) => apiClient.delete(`/applications/${id}`),

  // Upload resume document (multipart/form-data)
  uploadResume: (id, formData) =>
    apiClient.post(`/applications/${id}/resume`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export default applicationsApi;
