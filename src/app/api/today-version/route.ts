import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { computeTodayVersion } from "@/lib/today-version";

export const dynamic = "force-dynamic";

// Polled by the in-app Display mode view (a logged-in device's read-only
// today screen) so it force-reloads as soon as something changes, the same
// way the public TV kiosk link does.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const version = await computeTodayVersion();
  return NextResponse.json({ version });
}
