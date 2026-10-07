import apiClient from './client';

export const analyticsApi = {
  getSummary: () => apiClient.get('/analytics/summary'),
};

export default analyticsApi;