import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/generate-apk': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        secure: false,
      }
    },
  },
  css: {
    modules: {
      localsConvention: 'camelCaseOnly'
    }
  }
});
