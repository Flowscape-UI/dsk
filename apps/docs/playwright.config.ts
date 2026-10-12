import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5184',
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    launchOptions: process.env.DSK_TEST_EXECUTABLE
      ? { executablePath: process.env.DSK_TEST_EXECUTABLE }
      : undefined,
    viewport: { width: 1440, height: 1100 },
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command:
      'pnpm exec vitepress preview --host 127.0.0.1 --port 5184 --strictPort',
    url: 'http://127.0.0.1:5184',
    reuseExistingServer: false,
  },
});
