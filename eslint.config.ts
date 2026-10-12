import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    '**/dist/**',
    '**/node_modules/**',
    '**/.turbo/**',
    '**/.vitepress/cache/**',
    '**/test-results/**',
    '**/playwright-report/**',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
]);
