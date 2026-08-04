import { getFamilyMembers, getWeekBuckets } from "@/lib/family-events";
import { getWeekStart, dateKey } from "@/lib/week";

// A cheap, opaque fingerprint of "today" (family members + today's events)
// that changes whenever something a display cares about changes — including
// deletions, which a plain MAX(updatedAt) query would miss entirely.
export async function computeTodayVersion(): Promise<string> {
  const todayKey = dateKey(new Date());
  const [members, buckets] = await Promise.all([
    getFamilyMembers(),
    getWeekBuckets(getWeekStart(todayKey)),
  ]);
  const day = buckets.find((b) => b.key === todayKey);

  return [
    members.map((m) => `${m.id}:${m.name}:${m.color}`).join(","),
    (day?.events ?? [])
      .map(
        (e) =>
          `${e.id}:${e.title}:${e.startTime}:${e.endTime ?? ""}:${e.isReminder}:${e.ownerId}:${e.notes ?? ""}`
      )
      .sort()
      .join(","),
  ].join("|");
}
