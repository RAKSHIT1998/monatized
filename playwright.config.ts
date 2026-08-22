import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  // Turbopack dev compiles each route on first hit, and this environment's filesystem
  // is slow (see Next's own "Slow filesystem detected" warning) — give cold navigations room.
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3002",
    trace: "retain-on-failure",
    navigationTimeout: 45_000,
  },
});
