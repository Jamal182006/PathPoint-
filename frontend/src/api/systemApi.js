import axios from 'axios';
import { getBaseURL } from './client';

export const systemApi = {
  // Live Backend Health Ping
  checkHealth: async () => {
    const baseURL = getBaseURL();
    const healthURL = `${baseURL.replace(/\/api$/, '')}/api/health`;
    const start = performance.now();
    try {
      const res = await axios.get(healthURL, { timeout: 3000 });
      const latency = Math.round(performance.now() - start);
      return {
        online: res.status === 200,
        latency,
        data: res.data,
        url: healthURL,
      };
    } catch (err) {
      return {
        online: false,
        latency: null,
        data: null,
        error: err.message,
        url: healthURL,
      };
    }
  },

  // Test custom API URL before saving
  testEndpoint: async (customUrl) => {
    const cleanUrl = customUrl.trim().replace(/\/+$/, '');
    const healthURL = `${cleanUrl.replace(/\/api$/, '')}/api/health`;
    const start = performance.now();
    try {
      const res = await axios.get(healthURL, { timeout: 3500 });
      const latency = Math.round(performance.now() - start);
      return {
        success: true,
        online: res.status === 200,
        latency,
        data: res.data,
      };
    } catch (err) {
      return {
        success: false,
        online: false,
        error: err.message,
      };
    }
  },
};

export default systemApi;
