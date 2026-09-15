import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
// defineConfig se toma de vitest/config, no de vite: es la que conoce el
// bloque `test` de la configuracion.
import { defineConfig } from 'vitest/config'

// Lo generado no debe vigilarse: cada archivo nuevo recarga las paginas
// abiertas. El informe HTML de cobertura (unos 60 archivos) dejaba a las E2E
// esperando una pagina que no paraba de recargarse.
const NO_VIGILAR = [
  '**/.pnpm-store/**',
  '**/dist/**',
  '**/coverage/**',
  '**/playwright-report/**',
  '**/test-results/**',
  '**/capturas/**',
]

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Vite responde 403 a los hosts que no conoce. Dentro de Docker las
    // pruebas E2E piden http://web:5173, asi que hay que permitirlo.
    allowedHosts: ['web', 'localhost'],
    // Con el codigo montado desde Windows o macOS, el contenedor no recibe
    // avisos de cambios en los archivos y Vite sigue sirviendo la version
    // anterior. compose.yml activa el sondeo solo dentro de Docker.
    //
    // El sondeo revisa cada archivo vigilado en cada vuelta, asi que hay que
    // excluir lo generado: el almacen de pnpm que crea el contenedor de E2E
    // (unos 15 000 archivos) dejaba a Vite tardando mas de 30 s en servir la
    // pagina.
    watch:
      process.env.VITE_WATCH_POLLING === 'true'
        ? { usePolling: true, interval: 300, ignored: NO_VIGILAR }
        : { ignored: NO_VIGILAR },
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
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/**'],
      // Solo se excluye la infraestructura de pruebas; el resto cuenta.
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test-setup.ts', 'src/test-utils.tsx', 'src/test-mocks/**'],
    },
  },
})
