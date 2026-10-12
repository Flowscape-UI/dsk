import { defineConfig } from '@playwright/test';

const firefox = process.env.DSK_TEST_BROWSER === 'firefox';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5183',
    browserName: firefox ? 'firefox' : 'chromium',
    // Exercise Pointer Lock and profile zoom with the full browser in CI.
    channel: firefox
      ? undefined
      : process.platform === 'win32'
        ? 'msedge'
        : 'chromium',
    launchOptions: process.env.DSK_TEST_EXECUTABLE
      ? { executablePath: process.env.DSK_TEST_EXECUTABLE }
      : undefined,
    viewport: { width: 1280, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command:
      'pnpm --filter @dsk/playground exec vite --host 127.0.0.1 --port 5183 --strictPort',
    url: 'http://127.0.0.1:5183',
    reuseExistingServer: false,
  },
});
