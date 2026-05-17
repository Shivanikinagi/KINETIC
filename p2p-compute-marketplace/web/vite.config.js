import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/health': 'http://localhost:8000',
      '/providers': 'http://localhost:8000',
      '/analytics': 'http://localhost:8000',
      '/jobs': 'http://localhost:8000',
      '/job': 'http://localhost:8000',
      '/hub': 'http://localhost:8000',
      '/orgs': 'http://localhost:8000',
      '/scheduler': 'http://localhost:8000',
      '/telemetry': 'http://localhost:8000',
      '/realtime': 'http://localhost:8000',
      '/provider': 'http://localhost:8000',
      '/agent': 'http://localhost:3001',
    }
  },
  define: {
    'global': 'globalThis',
    'process.env': {}
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: './index.html',
        explore: './explore.html',
        dashboard: './dashboard.html',
        provide: './provide.html',
      }
    }
  }
});
