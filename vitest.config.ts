import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Discover *.test.ts across all workspace packages (Node env by default).
    include: ['packages/*/src/**/*.test.ts'],
    environment: 'node',
  },
});
