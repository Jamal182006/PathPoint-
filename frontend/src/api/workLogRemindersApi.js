import apiClient from './client';

export const workLogRemindersApi = {
  get: async () => (await apiClient.get('/work-log-reminders')).data,
  save: async (reminder) => (await apiClient.put('/work-log-reminders', reminder)).data,
};
