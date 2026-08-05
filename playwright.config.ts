import { defineConfig, devices } from "@playwright/test";

// Regression coverage for the trickiest logic in the app — event-group
// ownership editing/deleting, recurrence, and the TV kiosk's day
// navigation/reminders layout — the kinds of bugs that got caught by hand
// during development and could easily come back unnoticed.
//
// Prerequisites to run locally:
//   1. DATABASE_URL points at a Postgres database with migrations applied
//      (`npx prisma migrate deploy`) — globalSetup truncates its tables
//      before each run, so use a throwaway/test database, never production.
//   2. `npm run test:e2e` — starts `next dev` on port 3100 and runs the
//      suite against it (set PW_BASE_URL to point at an already-running
//      server instead, e.g. in CI after `npm run build && npm start`).
export default defineConfig({
  testDir: "./tests",
  globalSetup: "./tests/global-setup.ts",
  fullyParallel: false, // tests share one database and drive real sign-in flows
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PW_BASE_URL ?? "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // This environment ships a pre-installed browser that may not match
        // the exact version @playwright/test expects to auto-download — use
        // it directly instead of fetching a new one.
        launchOptions: { executablePath: "/opt/pw-browsers/chromium" },
      },
    },
  ],
  webServer: process.env.PW_BASE_URL
    ? undefined
    : {
        command: "npx next dev -p 3100",
        url: "http://localhost:3100",
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
