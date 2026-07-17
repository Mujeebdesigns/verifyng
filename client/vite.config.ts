import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: '../',
  build: {
    // The Spline 3D runtime (AuthVisualPanel, desktop-only auth pages) is
    // already lazy-loaded and code-split into its own chunks, which is the
    // fix this warning normally asks for — its vendor chunks (physics,
    // gaussian-splat-compression, etc.) are just inherently large. Raised
    // just above that known case so an accidental bloat of the main app
    // bundle would still warn.
    chunkSizeWarningLimit: 2100,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
})
