import { defineConfig, devices } from '@playwright/test';

// Uses a preinstalled Chromium when CHROMIUM_PATH is set (CI images without downloads).
const executablePath = process.env.CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath,
          args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream'],
        },
      },
    },
  ],
});
