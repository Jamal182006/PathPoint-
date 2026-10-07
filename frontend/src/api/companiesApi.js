import apiClient from './client';

export const companiesApi = {
  getAll: (params) => apiClient.get('/companies', { params }),
  getById: (id) => apiClient.get(`/companies/${id}`),
  create: (payload) => apiClient.post('/providers/me/companies', payload),
  updateMine: (id, payload) => apiClient.put(`/providers/me/companies/${id}`, payload),
  archiveMine: (id) => apiClient.delete(`/providers/me/companies/${id}`),
  getMine: (params) => apiClient.get('/providers/me/companies', { params }),
  getMineById: (id) => apiClient.get(`/providers/me/companies/${id}`),
  getProviderApplications: (companyId, params) =>
    apiClient.get(`/providers/me/companies/${companyId}/applications`, { params }),
  apply: (companyId, formData, onUploadProgress) =>
    apiClient.post(`/companies/${companyId}/applications`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }),
  getMyApplications: (params) => apiClient.get('/companies/applications/mine', { params }),
  getMyApplication: (id) => apiClient.get(`/companies/applications/${id}`),
  updateApplicationStatus: (id, payload) =>
    apiClient.patch(`/companies/applications/${id}/status`, payload),
  getApplicationFile: (applicationId, fileId, inline = false) =>
    apiClient.get(`/companies/applications/${applicationId}/files/${fileId}`, {
      params: inline ? { inline: 'true' } : undefined,
      responseType: 'blob',
    }),
};

export default companiesApi;
