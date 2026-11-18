import { defineConfig, devices } from '@playwright/test'

// End-to-end tests run against the production build inside Cloudflare's local runtime (`vite preview`),
// which serves files the way Cloudflare will. Set CHROME_PATH to use an installed Chrome instead of
// Playwright's own browser download.
export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:3000',
    reducedMotion: 'reduce',
    launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
  },
  webServer: {
    command: 'bun run build && bun run preview --port 3000 --strictPort',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
