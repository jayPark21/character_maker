import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Adaptive base path handling:
  // - Vercel & Local: Default to '/' for root deployment
  // - GitHub Pages: Only explicitly set via environment variable if needed
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Proxy only for local dev (Vercel handles this in prod)
        changeOrigin: true,
      }
    }
  }
})
