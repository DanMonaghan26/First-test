import { getFamilyMembers, getMinimalEventsForDay } from "@/lib/family-events";
import { dateKey } from "@/lib/week";

// A cheap, opaque fingerprint of a day (family members + that day's events)
// that changes whenever something a display cares about changes — including
// deletions, which a plain MAX(updatedAt) query would miss entirely. Uses
// getMinimalEventsForDay rather than the full getWeekBuckets — this runs on
// every live-refresh poll (every few seconds, from potentially several
// always-on kiosk/display devices), so it only fetches the one day and the
// handful of fields the fingerprint actually uses, skipping the week-wide
// fetch and eventGroupId size/owner lookups that getWeekBuckets does for
// rendering. Defaults to today when no dayKey is given.
export async function computeTodayVersion(dayKey?: string): Promise<string> {
  const targetKey = dayKey || dateKey(new Date());
  const [members, events] = await Promise.all([
    getFamilyMembers(),
    getMinimalEventsForDay(targetKey),
  ]);

  return [
    members.map((m) => `${m.id}:${m.name}:${m.color}:${m.photoUrl ?? ""}`).join(","),
    events
      .map(
        (e) =>
          `${e.id}:${e.title}:${e.startTime}:${e.endTime ?? ""}:${e.isReminder}:${e.ownerId}:${e.notes ?? ""}`
      )
      .sort()
      .join(","),
  ].join("|");
}
