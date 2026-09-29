import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'packages/**/*.test.ts',
      'templates/**/*.test.ts',
      'games/**/src/**/*.test.ts',
      'tools/**/*.test.ts',
      'tools/**/*.test.mjs',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
    environment: 'node',
    passWithNoTests: true,
  },
});
