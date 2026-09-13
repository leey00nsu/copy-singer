import { defineConfig } from "playwright/test";
export default defineConfig({
  testDir: ".",
  testMatch: "journeys.spec.mjs",
  workers: 1,
  retries: 0,
  timeout: 90000,
  expect: { timeout: 20000 },
  outputDir: `${process.env.E2E_OUTPUT}/test-results`,
  forbidOnly: true,
  reporter: [["list"], ["json", { outputFile: `${process.env.E2E_OUTPUT}/results.json` }]],
  use: {
    baseURL: process.env.E2E_BASE_URL,
    headless: true,
    actionTimeout: 15000,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
});
