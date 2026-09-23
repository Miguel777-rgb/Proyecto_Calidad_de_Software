// Configuracion de Expo (reglas de React, React Native y hooks) sobre ESLint 9.
const { defineConfig } = require('eslint/config')
const expo = require('eslint-config-expo/flat')

module.exports = defineConfig([
  expo,
  { ignores: ['android/*', 'dist/*', 'coverage/*', '.expo/*', 'expo-env.d.ts'] },
])
