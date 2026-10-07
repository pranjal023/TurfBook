import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Browser calls /api/... on :5173, Vite forwards it to Express on :5000
    proxy: { '/api': 'http://localhost:5000' },
  },
});