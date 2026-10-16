import { defineConfig } from '@playwright/test';

const port = 8799;

export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    launchOptions: process.env.PLAYWRIGHT_BROWSERS_PATH ? {} : { executablePath: '/opt/pw-browsers/chromium' },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `rm -rf .e2e-data && QUIRE_DATA_DIR=.e2e-data QUIRE_PORT=${port} QUIRE_DEVICE=e2e-server pnpm --filter @quire/server start`,
    cwd: '..',
    url: `http://127.0.0.1:${port}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
