import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.', testMatch: '*.spec.ts', workers: 1, reporter: 'line',
  outputDir: '../../../.playwright-results/math',
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
