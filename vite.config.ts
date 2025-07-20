import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Check if SSL certificates exist for local HTTPS development
const keyPath = path.resolve(__dirname, 'localhost-key.pem')
const certPath = path.resolve(__dirname, 'localhost.pem')
const hasSSLCerts = fs.existsSync(keyPath) && fs.existsSync(certPath)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    ...(hasSSLCerts && {
      https: {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      },
    }),
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-alert-dialog', '@radix-ui/react-slot'],
        },
      },
    },
  },
})
