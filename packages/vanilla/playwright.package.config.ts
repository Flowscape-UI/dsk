import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/distribution',
  forbidOnly: Boolean(process.env.CI),
  workers: 1,
  reporter: 'list',
  use: {
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    launchOptions: process.env.DSK_TEST_EXECUTABLE
      ? { executablePath: process.env.DSK_TEST_EXECUTABLE }
      : undefined,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
