import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { fsdRule } from './tooling/fsd-rule.js';

export default defineConfig([
  globalIgnores(['dist', 'node_modules']),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: { globals: globals.browser },
    plugins: { architecture: { rules: { fsd: fsdRule } } },
    rules: { 'architecture/fsd': 'error' },
  },
  {
    files: ['*.{js,ts}', 'tooling/**/*.js'],
    languageOptions: { globals: globals.node },
  },
]);
