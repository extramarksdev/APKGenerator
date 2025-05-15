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
      '/generate-apk': 'http://localhost:5173',
    },
  },
  css: {
    modules: {
      localsConvention: 'camelCaseOnly'
    }
  }
});
