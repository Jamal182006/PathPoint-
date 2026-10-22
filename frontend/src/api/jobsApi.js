import apiClient from './client';

export const jobsApi = {
  getAll: (params) => apiClient.get('/jobs', { params }),
  getById: (id) => apiClient.get(`/jobs/${id}`),
  getProviderListings: (params) => apiClient.get('/jobs/provider/listings', { params }),
  create: (companyId, payload) => apiClient.post(`/jobs/provider/companies/${companyId}/listings`, payload),
  getProviderListing: (id) => apiClient.get(`/jobs/provider/listings/${id}`),
  update: (id, payload) => apiClient.put(`/jobs/provider/listings/${id}`, payload),
  updateStatus: (id, status) => apiClient.patch(`/jobs/provider/listings/${id}/status`, { status }),
  archive: (id) => apiClient.delete(`/jobs/provider/listings/${id}`),
  getApplicants: (id) => apiClient.get(`/jobs/provider/listings/${id}/applications`),
  getApplicationsOverview: () => apiClient.get('/jobs/provider/applications'),
  getApplicationDraft: (id) => apiClient.get(`/jobs/${id}/applications/draft`),
  saveApplicationDraft: (id, formData) => apiClient.put(`/jobs/${id}/applications/draft`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  apply: (id, formData, onUploadProgress) => apiClient.post(`/jobs/${id}/applications`, formData, { headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress }),
  getMyApplications: () => apiClient.get('/jobs/applications/mine'),
  getMyApplication: (id) => apiClient.get(`/jobs/applications/${id}`),
  updateApplication: (id, payload) => apiClient.patch(`/jobs/applications/${id}/status`, payload),
  getApplicationFile: (applicationId, responseId, inline = false) => apiClient.get(`/jobs/applications/${applicationId}/responses/${responseId}/file`, { params: inline ? { inline: 'true' } : undefined, responseType: 'blob' }),
  getApplicationResume: (applicationId, inline = false) => apiClient.get(`/jobs/applications/${applicationId}/resume`, { params: inline ? { inline: 'true' } : undefined, responseType: 'blob' }),
};

export default jobsApi;
