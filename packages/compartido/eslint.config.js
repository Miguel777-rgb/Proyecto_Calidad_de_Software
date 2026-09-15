import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,js}'],
    // Solo lo que existe a la vez en el navegador y en React Native.
    languageOptions: { ecmaVersion: 2022, globals: globals['shared-node-browser'] },
  },
)
