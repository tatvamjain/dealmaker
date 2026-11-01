import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// changeOrigin: false keeps the browser's Host header (localhost:5173) when forwarding.
// The backend builds PayPal's return URL from it, so after paying, PayPal sends the
// shopper back to this frontend's /order-complete page instead of to the backend.
const BACKEND = { target: 'http://127.0.0.1:8000', changeOrigin: false }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // "@/components/..." means "src/components/..." (shadcn expects this alias)
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // The browser talks only to Vite (same origin), and Vite forwards these
    // paths to FastAPI, so we never need CORS during development.
    proxy: {
      '/api': BACKEND,
      '/dev': BACKEND,
    },
  },
})
