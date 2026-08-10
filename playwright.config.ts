import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://127.0.0.1:4173'
const isLive = Boolean(process.env.PLAYWRIGHT_BASE_URL)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.PLAYWRIGHT_WORKERS ? Number(process.env.PLAYWRIGHT_WORKERS) : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    ignoreHTTPSErrors: !isLive,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: isLive
    ? undefined
    : {
        command:
          process.env.PLAYWRIGHT_WEB_SERVER ??
          'openssl req -x509 -newkey rsa:2048 -keyout /tmp/gorfed-playwright-key.pem -out /tmp/gorfed-playwright-cert.pem -days 1 -nodes -subj "/CN=127.0.0.1" >/dev/null 2>&1 && npx serve dist -l 4173 --ssl-cert /tmp/gorfed-playwright-cert.pem --ssl-key /tmp/gorfed-playwright-key.pem',
        url: baseURL,
        ignoreHTTPSErrors: true,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
