import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

// RLS isolation tests (AGENTS.md rail 6). Requires a running local Supabase stack:
//   supabase start && supabase db reset
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/rls/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
