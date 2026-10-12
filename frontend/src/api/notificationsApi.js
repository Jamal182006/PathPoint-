import apiClient from './client';

export const notificationsApi = {
  list: async () => (await apiClient.get('/notifications')).data,
  markRead: async (id) => (await apiClient.patch(`/notifications/${id}/read`)).data,
  markAllRead: async () => (await apiClient.patch('/notifications/read-all')).data,
};
