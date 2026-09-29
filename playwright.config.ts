import { existsSync, readdirSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// One project + preview server per game that has an e2e/ folder. Ports start at 4173.
const games = existsSync('games') ? readdirSync('games').filter((slug) => existsSync(`games/${slug}/e2e`)) : [];

export default defineConfig({
  testDir: 'games',
  testMatch: '*/e2e/**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Pixel 7'],
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    trace: 'retain-on-failure',
  },
  projects: games.map((slug, i) => ({
    name: slug,
    testMatch: `${slug}/e2e/**/*.spec.ts`,
    use: { baseURL: `http://localhost:${4173 + i}` },
  })),
  webServer: games.map((slug, i) => ({
    command: `npm run preview -w games/${slug} -- --port ${4173 + i} --strictPort`,
    url: `http://localhost:${4173 + i}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  })),
});
