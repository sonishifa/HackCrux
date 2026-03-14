import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_API_URL || 'http://localhost:8000';

  return {
    plugins: [react()],

    server: {
      // Always use port 5173 — prevents the 5174/5175 surprise
      port: 5173,
      strictPort: true, // Error loudly if port is taken instead of silently picking 5174

      // Proxy /api and /health to the backend.
      // This removes ALL hardcoded localhost:8000 references from components.
      // The frontend talks to its own origin; Vite forwards to the backend.
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/health': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
  };
});
