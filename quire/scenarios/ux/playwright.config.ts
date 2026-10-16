// The UX runner (`pnpm -C quire ux`, `pnpm -C quire ux:approve`): one test per theme and colour
// scheme, each on its own cloud server with the demo seed, then a report test that writes
// report.md and checks the ratchet against baseline.json.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 30 * 60_000,
  workers: Number(process.env.QUIRE_UX_WORKERS ?? 3),
  fullyParallel: true,
  globalSetup: './setup.ts',
  reporter: [['list']],
  use: {
    launchOptions: process.env.PLAYWRIGHT_BROWSERS_PATH ? {} : { executablePath: '/opt/pw-browsers/chromium' },
    deviceScaleFactor: 1,
    locale: 'en-US',
    timezoneId: 'UTC',
  },
  projects: [
    { name: 'score', testMatch: /score\.ux\.ts$/ },
    { name: 'report', testMatch: /report\.ux\.ts$/, dependencies: ['score'] },
  ],
});
