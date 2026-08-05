import { resetDb } from "./db";

// Runs once before the whole suite, as a safety net for stray data left
// over from an interrupted previous run — each spec file also resets in
// its own beforeAll so tests stay isolated regardless of file order.
export default async function globalSetup() {
  await resetDb();
}
