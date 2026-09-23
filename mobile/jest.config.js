/**
 * Pruebas unitarias de la app con jest-expo.
 *
 * lucide-react-native publica su version para React Native como .mjs, que la
 * transformacion de jest-expo no procesa; en las pruebas se usa su version
 * CommonJS, identica en contenido.
 */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/pruebas/preparar.ts'],
  moduleNameMapper: {
    '^lucide-react-native$': require.resolve('lucide-react-native'),
  },
  // Con pnpm los paquetes viven bajo node_modules/.pnpm; la lista incluye los
  // que se publican sin compilar y Jest debe transformar.
  transformIgnorePatterns: [
    'node_modules/(?!(.pnpm|(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg|standard-navigation))',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/.maestro/'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', 'app.config.ts', '!src/**/*.test.{ts,tsx}'],
  coverageReporters: ['text', 'html', 'json-summary'],
  // En Windows cada proceso de Jest carga React Native entero: con mas de dos
  // el equipo se queda sin memoria.
  maxWorkers: 2,
}
