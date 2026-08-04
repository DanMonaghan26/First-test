import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeTodayVersion } from "@/lib/today-version";

export const dynamic = "force-dynamic";

// Polled by the TV kiosk page every few seconds so it can force a reload as
// soon as the displayed day's events (or the family member list) actually
// change, instead of waiting for the next timed refresh.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const displayToken = await prisma.displayToken.findUnique({ where: { token } });
  if (!displayToken) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const day = new URL(request.url).searchParams.get("day") ?? undefined;
  const version = await computeTodayVersion(day);
  return NextResponse.json({ version });
}
