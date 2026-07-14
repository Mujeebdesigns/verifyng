import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Env must be set before any src module (env.ts validates on import)
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    // DB-backed tests share tables — run files sequentially to avoid interference
    fileParallelism: false,
    testTimeout: 15000,
  },
});
