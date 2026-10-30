import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const BACKEND_URL = 'http://127.0.0.1:8000'

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
      '/api': BACKEND_URL,
      '/dev': BACKEND_URL,
    },
  },
})
