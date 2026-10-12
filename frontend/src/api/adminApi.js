import apiClient from './client';

export const adminApi = {
  // Aggregate cohort benchmarks & KPI distribution
  getAggregateMetrics: () => apiClient.get('/admin/aggregate-metrics'),
  getActivityLog: (params) => apiClient.get('/admin/activity-log', { params }),

  // Seeker Directory / User Management
  getUsers: (params) => apiClient.get('/admin/users', { params }),
  getProviderVerificationDocument: (id) =>
    apiClient.get(`/admin/providers/${id}/verification-document`, { responseType: 'blob' }),
  reviewProviderVerification: (id, status, rejectionReason) =>
    apiClient.patch(`/admin/providers/${id}/verification`, { status, rejectionReason }),
  getCompanies: (params) => apiClient.get('/admin/companies', { params }),
  reviewCompany: (id, status, rejectionReason) =>
    apiClient.patch(`/admin/companies/${id}/review`, { status, rejectionReason }),
  archiveCompany: (id) => apiClient.delete(`/admin/companies/${id}`),
  getJobs: (params) => apiClient.get('/admin/jobs', { params }),
  getApplications: (params) => apiClient.get('/admin/applications', { params }),
  deleteApplication: (type, id) => apiClient.delete(`/admin/applications/${type}/${id}`),
  reviewJob: (id, reviewStatus, reviewReason) =>
    apiClient.patch(`/admin/jobs/${id}/review`, { reviewStatus, reviewReason }),
  archiveJob: (id) => apiClient.delete(`/admin/jobs/${id}`),
  archiveUser: (id, archived) => apiClient.patch(`/admin/users/${id}/archive`, { archived }),

  // Update user status (active / suspended)
  updateUserStatus: (id, status) =>
    apiClient.patch(`/admin/users/${id}/status`, { status }),

  // Counselor Review: Inspect an individual seeker's applications portfolio
  getUserApplications: (id) => apiClient.get(`/admin/users/${id}/applications`),
};

export default adminApi;
