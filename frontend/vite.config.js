import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        // Group vendor libraries into stable, cacheable chunks. Without this,
        // Rollup emits one tiny file per shared lucide icon, which turns the
        // initial load into a long string of extra requests.
        manualChunks(id) {
          const path = id.replace(/\\/g, '/');
          if (!path.includes('node_modules')) return undefined;
          if (path.includes('lucide-react')) return 'vendor-icons';
          if (path.includes('framer-motion') || path.includes('/motion-dom/') || path.includes('/motion-utils/')) return 'vendor-motion';
          if (path.includes('leaflet')) return 'vendor-maps';
          if (path.includes('/react-dom/') || path.includes('/react/') || path.includes('/scheduler/')) return 'vendor-react';
          if (path.includes('react-router') || path.includes('@remix-run')) return 'vendor-router';
          if (path.includes('@hello-pangea/dnd')) return 'vendor-dnd';
          if (path.includes('axios')) return 'vendor-axios';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
