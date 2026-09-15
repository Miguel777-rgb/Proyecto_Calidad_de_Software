import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Logica pura: sin navegador simulado. Si algo necesitara el DOM, no
    // deberia estar en este paquete, que tambien corre en la app movil.
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/**'],
      // Fuera quedan las pruebas y los archivos sin nada que ejecutar: los
      // tipos (desaparecen al compilar), los textos (un objeto literal) y el
      // indice que solo reexporta.
      exclude: [
        'src/**/*.test.ts',
        'src/pruebas/**',
        'src/api/index.ts',
        'src/api/tipos.ts',
        'src/i18n/textos.ts',
      ],
    },
  },
})
