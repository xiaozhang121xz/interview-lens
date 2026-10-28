import { defineConfig } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  {
    ignores: [
      // Dependency directories
      'node_modules/',
      '.next/',
      '.next.old/',
      '.claude/',
      '.husky/',
      'out/',
      'build/',
      'dist/',

      // Production build files
      '*.tsbuildinfo',
      'next-env.d.ts',

      // Development templates and scripts
      '.az/dev/**',
      'scripts/',
      'test-results/',
      'playwright-report/',

      // Configuration files
      '*.config.js',
      '*.config.mjs',
      '*.config.ts',
      'prettier.config.js',
      '.prettierrc.*',
    ],
  },
  ...nextVitals,
  ...nextTs,
  prettierConfig,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/no-unescaped-entities': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
]);

export default eslintConfig;
