import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'global': 'globalThis',
    'process.env': {}
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/providers': { target: 'http://localhost:8000', changeOrigin: true },
      '/analytics': { target: 'http://localhost:8000', changeOrigin: true },
      '/jobs': { target: 'http://localhost:8000', changeOrigin: true },
      '/job': { target: 'http://localhost:8000', changeOrigin: true },
      '/hub': { target: 'http://localhost:8000', changeOrigin: true },
      '/orgs': { target: 'http://localhost:8000', changeOrigin: true },
      '/scheduler': { target: 'http://localhost:8000', changeOrigin: true },
      '/telemetry': { target: 'http://localhost:8000', changeOrigin: true },
      '/realtime': { target: 'http://localhost:8000', changeOrigin: true },
      '/provider': { target: 'http://localhost:8000', changeOrigin: true },
      '/network': { target: 'http://localhost:8000', changeOrigin: true },
      '/activity': { target: 'http://localhost:8000', changeOrigin: true },
      '/health': { target: 'http://localhost:8000', changeOrigin: true },
      '/models': { target: 'http://localhost:8000', changeOrigin: true },
      '/datasets': { target: 'http://localhost:8000', changeOrigin: true },
      '/spaces': { target: 'http://localhost:8000', changeOrigin: true },
      '/api-keys': { target: 'http://localhost:8000', changeOrigin: true },
      '/assistant': { target: 'http://localhost:8000', changeOrigin: true },
      '/agent': { target: 'http://localhost:8000', changeOrigin: true },
      '/wallet': { target: 'http://localhost:8000', changeOrigin: true },
      '/escrow': { target: 'http://localhost:8000', changeOrigin: true },
      '/roadmap': { target: 'http://localhost:8000', changeOrigin: true },
    }
  },
  build: {
    outDir: 'dist',
  }
})
