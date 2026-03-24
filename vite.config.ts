import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.glb'],
  server: {
    port: 5173,
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },
})
