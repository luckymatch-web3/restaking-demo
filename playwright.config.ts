import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: ["**/._*"],
  timeout: 30_000,
  expect: {
    timeout: 8_000
  },
  use: {
    baseURL: "http://127.0.0.1:5188",
    trace: "retain-on-failure",
    video: "retain-on-failure"
  },
  webServer: [
    {
      command: "npm run dev:api",
      url: "http://127.0.0.1:8787/api/health",
      reuseExistingServer: true,
      timeout: 60_000
    },
    {
      command:
        "VITE_RESTAKE_VAULT_ADDRESS=0x1111111111111111111111111111111111111111 npm run dev:web -- --host 127.0.0.1 --port 5188",
      url: "http://127.0.0.1:5188",
      reuseExistingServer: true,
      timeout: 60_000
    }
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" }
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], channel: "chrome" }
    }
  ]
});
