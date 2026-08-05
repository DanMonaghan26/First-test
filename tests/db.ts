import "dotenv/config";
import { Client } from "pg";

// Shared by global-setup (once, before the whole suite) and each spec
// file's own beforeAll, so tests stay isolated and rerunnable regardless
// of file execution order.
export async function resetDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL must point at a migrated test database to run the e2e suite.");
  }

  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(
      'TRUNCATE TABLE "Event", "CalendarSubscription", "DisplayToken", "User" RESTART IDENTITY CASCADE;'
    );
  } finally {
    await client.end();
  }
}
