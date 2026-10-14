import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const hasBackend = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'server-only': fileURLToPath(new URL('./tests/stubs/empty.ts', import.meta.url)),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts', ...(hasBackend ? ['tests/integration/**/*.test.ts'] : [])],
    testTimeout: 30_000,
  },
});
