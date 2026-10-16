import axios from 'axios';
import { getBaseURL } from './client';

export const systemApi = {
  // Live Backend Health Ping
  checkHealth: async () => {
    const baseURL = getBaseURL();
    const healthURL = `${baseURL.replace(/\/api$/, '')}/api/health`;
    const start = performance.now();
    try {
      // Accept every HTTP status. Our own 503 (database briefly reconnecting)
      // still proves the API server is reachable; only a network/timeout
      // failure means the backend is truly unreachable. Gating sign-in on a
      // transient 5xx is what made login appear broken on serverless cold starts.
      const res = await axios.get(healthURL, { timeout: 3000, validateStatus: () => true });
      const latency = Math.round(performance.now() - start);
      const healthy = res.status === 200 && res.data?.status === 'healthy';
      return {
        online: healthy,
        reachable: true,
        healthy,
        status: res.status,
        latency,
        data: res.data,
        url: healthURL,
      };
    } catch (err) {
      return {
        online: false,
        reachable: false,
        healthy: false,
        status: null,
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
