import { defineConfig, devices } from '@playwright/test';
import { assertSafeE2eBaseUrl } from './src/lib/e2e/guards';

const baseURL = assertSafeE2eBaseUrl(process.env.E2E_BASE_URL);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup-admin',
      testMatch: /auth\.admin\.setup\.ts/,
    },
    {
      name: 'setup-member',
      testMatch: /auth\.member\.setup\.ts/,
    },
    {
      name: 'public',
      testMatch: /public\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'admin',
      dependencies: ['setup-admin'],
      testMatch: /(?:responsive|websites|tasks|users|favorites|archive)\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/admin.json',
      },
    },
    {
      name: 'member',
      dependencies: ['setup-member'],
      testMatch: /permissions\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/member.json',
      },
    },
  ],
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : {
        command: 'npx next start -p 8082',
        url: `${baseURL}/login`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          PORT: '8082',
        },
      },
});
