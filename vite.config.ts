import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/antsim/', // Base path for GitHub Pages
  server: {
    port: 5173,
    host: true
  },
  build: {
    // Improve production build
    minify: 'terser',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
})
