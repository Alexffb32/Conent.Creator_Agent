import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const executablePath = process.env.CHROMIUM_PATH || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL, locale: 'pt-PT', timezoneId: 'Europe/Lisbon', trace: 'retain-on-failure', launchOptions: { executablePath } },
  // Contra o deploy: E2E_BASE_URL=https://....vercel.app. Sem isso, arranca a app localmente.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: 'pnpm build && pnpm start', url: baseURL, reuseExistingServer: true, timeout: 300_000 },
});
