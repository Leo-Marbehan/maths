import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: { globals: globals.node },
  },
  { files: ['**/*.js'], languageOptions: { sourceType: 'script' } },
  tseslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  tseslint.configs.strict,
  tseslint.configs.strictTypeChecked,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowNumber: true,
        },
      ],
    },
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
]);
