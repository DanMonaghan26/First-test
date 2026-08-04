import { getFamilyMembers, getWeekBuckets } from "@/lib/family-events";
import { getWeekStart, dateKey } from "@/lib/week";
import { TvAutoRefresh } from "@/components/TvAutoRefresh";
import { DayTimeGrid } from "@/components/DayTimeGrid";

export async function DisplayModeView({
  currentUser,
}: {
  currentUser: { id: string; role: "ADMIN" | "MEMBER" };
}) {
  const todayKey = dateKey(new Date());
  const [members, buckets] = await Promise.all([
    getFamilyMembers(),
    getWeekBuckets(getWeekStart(todayKey)),
  ]);
  const day = buckets.find((b) => b.key === todayKey);

  return (
    <div className="flex flex-col gap-4">
      <TvAutoRefresh />
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {day?.label ?? "Today"}
      </h1>

      {day ? (
        <DayTimeGrid day={day} members={members} currentUser={currentUser} readOnly />
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No data for today.</p>
      )}
    </div>
  );
}
