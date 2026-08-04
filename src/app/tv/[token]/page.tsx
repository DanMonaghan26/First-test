import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getFamilyMembers, getWeekBuckets } from "@/lib/family-events";
import { formatWeekRangeLabel, getWeekStart } from "@/lib/week";
import { TvAutoRefresh } from "@/components/TvAutoRefresh";

export const dynamic = "force-dynamic";

export default async function TvDisplayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const displayToken = await prisma.displayToken.findUnique({ where: { token } });
  if (!displayToken) {
    notFound();
  }

  const weekStart = getWeekStart(null);
  const [members, buckets] = await Promise.all([
    getFamilyMembers(),
    getWeekBuckets(weekStart),
  ]);

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-zinc-950 p-8 text-zinc-50">
      <TvAutoRefresh />
      <div className="flex items-baseline justify-between">
        <h1 className="text-4xl font-bold">Family Planner</h1>
        <p className="text-2xl text-zinc-400">
          {formatWeekRangeLabel(weekStart)}
        </p>
      </div>

      {members.length > 0 && (
        <div className="flex flex-wrap gap-6">
          {members.map((m) => (
            <span key={m.id} className="flex items-center gap-2 text-lg text-zinc-300">
              <span
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: m.color }}
              />
              {m.name}
            </span>
          ))}
        </div>
      )}

      <div className="grid flex-1 grid-cols-7 gap-4">
        {buckets.map((day) => (
          <div
            key={day.key}
            className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
          >
            <h2 className="text-xl font-semibold text-zinc-100">{day.label}</h2>
            <div className="flex flex-col gap-2 overflow-y-auto">
              {day.events.map((event) => (
                <div
                  key={event.id}
                  className={`rounded-lg border-l-4 px-3 py-2 ${
                    event.isReminder ? "bg-amber-950/60" : "bg-zinc-800"
                  }`}
                  style={{ borderColor: event.ownerColor }}
                >
                  <p className="break-words text-lg font-medium text-zinc-50">
                    {event.isReminder ? "📌 " : ""}
                    {event.title}
                  </p>
                  <p className="break-words text-sm text-zinc-400">
                    {event.isReminder
                      ? "Reminder"
                      : `${event.startTime}${event.endTime ? `–${event.endTime}` : ""}`}{" "}
                    · {event.ownerName}
                  </p>
                </div>
              ))}
              {day.events.length === 0 && (
                <p className="text-sm text-zinc-600">No events</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
