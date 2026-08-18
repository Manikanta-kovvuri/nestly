import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Tailwind CSS v4 Vite plugin — no tailwind.config.ts needed
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // @/ maps to src/ — used by shadcn/ui component imports
      '@': resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Proxy API calls to the NestJS backend during development
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
