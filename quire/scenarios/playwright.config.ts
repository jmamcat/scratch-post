import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

// Features are generated from the Markdown specs by playbook/bin/spec-scenarios.py.
const testDir = defineBddConfig({
  features: '.features/*.feature',
  steps: ['support/world.ts', 'steps/*.ts'],
  outputDir: '.features-gen',
  // An undefined step fails its scenario when it runs; it is never skipped.
  missingSteps: 'fail-on-run',
});

export default defineConfig({
  testDir,
  timeout: 60_000,
  expect: { timeout: 5_000 },
  workers: process.env.CI ? 2 : 3,
  // @deploy scenarios build and run containers; they run only through `pnpm scenarios:deploy`.
  ...(process.env.QUIRE_DEPLOY ? { grep: /@deploy/ } : { grepInvert: /@deploy/ }),
  reporter: [['list']],
  use: {
    launchOptions: process.env.PLAYWRIGHT_BROWSERS_PATH ? {} : { executablePath: '/opt/pw-browsers/chromium' },
    trace: 'retain-on-failure',
  },
});
