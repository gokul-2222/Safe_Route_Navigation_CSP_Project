import { defineConfig } from 'vite';

export default defineConfig({
  root: './',
  server: {
    port: 5173,
    proxy: {
      '/api/v1': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
