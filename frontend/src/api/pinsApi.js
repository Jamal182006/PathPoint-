import apiClient from './client';

export const pinsApi = {
  getAll: () => apiClient.get('/pins'),
  create: (payload) => apiClient.post('/pins', payload),
  remove: (itemType, itemId, applicationKind) => apiClient.delete(`/pins/${itemType}/${itemId}`, { params: applicationKind ? { applicationKind } : undefined }),
};

export default pinsApi;
