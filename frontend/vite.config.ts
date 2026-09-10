/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Vite responde 403 a los hosts que no conoce. Dentro de Docker las
    // pruebas E2E piden http://web:5173, asi que hay que permitirlo.
    allowedHosts: ['web', 'localhost'],
    // Dentro de Docker, `api` es el nombre del servicio en compose.yml.
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET ?? 'http://api:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    // e2e/ lo ejecuta Playwright, no Vitest.
    exclude: ['node_modules/**', 'e2e/**', 'dist/**'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/**'],
    },
  },
})
