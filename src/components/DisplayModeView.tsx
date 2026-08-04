import { getFamilyMembers, getWeekBuckets } from "@/lib/family-events";
import { getWeekStart, dateKey } from "@/lib/week";
import { TvAutoRefresh } from "@/components/TvAutoRefresh";

export async function DisplayModeView() {
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

      <div className="flex flex-col gap-3">
        {members.map((member) => {
          const memberEvents = (day?.events ?? []).filter((e) => e.ownerId === member.id);
          return (
            <div
              key={member.id}
              className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="h-3 w-3 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: member.color }}
                />
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {member.name}
                </span>
              </div>

              {memberEvents.length === 0 ? (
                <p className="text-sm text-zinc-400 dark:text-zinc-600">No events</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {memberEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`rounded-lg border-l-4 px-3 py-2 ${
                        event.isReminder
                          ? "bg-amber-50 dark:bg-amber-950/40"
                          : "bg-zinc-50 dark:bg-zinc-900"
                      }`}
                      style={{ borderColor: member.color }}
                    >
                      <p className="break-words font-medium text-zinc-900 dark:text-zinc-50">
                        {event.isReminder ? "📌 " : ""}
                        {event.title}
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {event.isReminder
                          ? "Reminder"
                          : `${event.startTime}${event.endTime ? `–${event.endTime}` : ""}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
