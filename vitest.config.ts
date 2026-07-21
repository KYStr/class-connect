import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    // RLS tests need a running Supabase stack — run them via `pnpm test:rls` (separate config).
    include: ['tests/unit/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
