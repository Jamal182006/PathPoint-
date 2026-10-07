import apiClient from './client';

export const workLogsApi = {
  getAll: (params) => apiClient.get('/work-logs', { params }),
  get: (id) => apiClient.get(`/work-logs/${id}`),
  create: (payload) => apiClient.post('/work-logs', payload),
  update: (id, payload) => apiClient.put(`/work-logs/${id}`, payload),
  delete: (id) => apiClient.delete(`/work-logs/${id}`),
};

export default workLogsApi;
