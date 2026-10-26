import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.', testMatch: '*.spec.ts', workers: 1, reporter: 'line',
  outputDir: '../../../.playwright-results/math-ui',
  use: { baseURL: 'http://127.0.0.1:8988', browserName: 'chromium' },
  webServer: { command: 'PW_MATH_PORT=8988 pnpm exec vite --config test-support/vite.config.ts', url: 'http://127.0.0.1:8988', timeout: 60_000, reuseExistingServer: false },
});
