import apiClient from './client';

export const applicationsApi = {
  getSubmissions: (params) => apiClient.get('/applications/submissions', { params }),
  updateSubmission: (kind, id, payload) => apiClient.patch(`/applications/submissions/${kind}/${id}`, payload),
  deleteSubmission: (kind, id) => apiClient.delete(`/applications/submissions/${kind}/${id}`),
  importAll: (payload) => apiClient.post('/applications/import', payload),

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
