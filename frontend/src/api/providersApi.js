import apiClient from './client';

export const providersApi = {
  getAll: () => apiClient.get('/providers'),
  updateMine: (businessProfile) => apiClient.put('/providers/me', businessProfile),
  submitVerificationDocument: (businessDocument) =>
    apiClient.post('/providers/me/verification-document', { businessDocument }),
};

export default providersApi;