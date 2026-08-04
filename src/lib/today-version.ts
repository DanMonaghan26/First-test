import { getFamilyMembers, getWeekBuckets } from "@/lib/family-events";
import { getWeekStart, dateKey } from "@/lib/week";

// A cheap, opaque fingerprint of a day (family members + that day's events)
// that changes whenever something a display cares about changes — including
// deletions, which a plain MAX(updatedAt) query would miss entirely.
// Defaults to today when no dayKey is given.
export async function computeTodayVersion(dayKey?: string): Promise<string> {
  const targetKey = dayKey || dateKey(new Date());
  const [members, buckets] = await Promise.all([
    getFamilyMembers(),
    getWeekBuckets(getWeekStart(targetKey)),
  ]);
  const day = buckets.find((b) => b.key === targetKey);

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
