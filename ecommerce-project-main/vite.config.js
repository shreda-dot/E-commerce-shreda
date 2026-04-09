import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  build: {
    /**
     * Output directly into the backend's dist folder so the Express server
     * can serve it without any manual copy step.
     *
     * Render build command (run from repo root):
     *   cd ecommerce-project-main && npm install && npm run build
     *
     * Render start command:
     *   cd ecommerce-backend-ai-main && npm install && node server.js
     */
    outDir: '../ecommerce-backend-ai-main/dist',
    emptyOutDir: true,   // wipe stale assets before each build
    sourcemap: false,
  },

  // Must be '/' so asset paths resolve correctly when served from Express
  base: '/',

  // Dev-only proxy — not active during `vite build`, only during `vite` (dev server)
  server: {
    proxy: {
      '/api':    { target: 'http://localhost:3000', changeOrigin: true },
      '/images': { target: 'http://localhost:3000', changeOrigin: true },
      '/uploads':{ target: 'http://localhost:3000', changeOrigin: true },
    },
  },
})
