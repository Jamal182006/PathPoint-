import apiClient from './client';

export const adminApi = {
  // Aggregate cohort benchmarks & KPI distribution
  getAggregateMetrics: () => apiClient.get('/admin/aggregate-metrics'),

  // Seeker Directory / User Management
  getUsers: (params) => apiClient.get('/admin/users', { params }),

  // Update user status (active / suspended)
  updateUserStatus: (id, status) =>
    apiClient.patch(`/admin/users/${id}/status`, { status }),

  // Counselor Review: Inspect an individual seeker's applications portfolio
  getUserApplications: (id) => apiClient.get(`/admin/users/${id}/applications`),
};

export default adminApi;
