import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getFamilyMembers, getWeekBuckets } from "@/lib/family-events";
import {
  formatWeekRangeLabel,
  getWeekStart,
  shiftWeek,
  shiftDay,
  dateKey,
} from "@/lib/week";
import { AddEventButton } from "@/components/AddEventButton";
import { EventPill } from "@/components/EventPill";
import { DayTimeGrid } from "@/components/DayTimeGrid";
import { HighlightTarget } from "@/components/HighlightTarget";
import { DayPicker } from "@/components/DayPicker";

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{
    week?: string;
    mine?: string;
    view?: string;
    highlight?: string;
    day?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const showMineOnly = params.mine === "1";
  const showTodayOnly = params.view === "today";
  const mineParam = showMineOnly ? "&mine=1" : "";

  const weekStart = getWeekStart(params.week ?? null);
  const actualTodayKey = dateKey(new Date());
  const selectedDayKey = showTodayOnly ? params.day || actualTodayKey : actualTodayKey;
  const dayViewWeekStart = getWeekStart(selectedDayKey);

  const [members, fetchedBuckets] = await Promise.all([
    getFamilyMembers(),
    getWeekBuckets(showTodayOnly ? dayViewWeekStart : weekStart),
  ]);

  const buckets = showTodayOnly
    ? fetchedBuckets.filter((b) => b.key === selectedDayKey)
    : fetchedBuckets;

  const prevWeekIso = dateKey(shiftWeek(weekStart, -1));
  const nextWeekIso = dateKey(shiftWeek(weekStart, 1));
  const todayIso = dateKey(getWeekStart(null));
  const prevDayIso = dateKey(shiftDay(selectedDayKey, -1));
  const nextDayIso = dateKey(shiftDay(selectedDayKey, 1));

  const headingLabel = showTodayOnly
    ? selectedDayKey === actualTodayKey
      ? `Today – ${buckets[0]?.label ?? ""}`
      : buckets[0]?.label ?? ""
    : formatWeekRangeLabel(weekStart);

  return (
    <div className="flex flex-col gap-6">
      <HighlightTarget eventId={params.highlight} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {headingLabel}
          </h1>
          {showTodayOnly ? (
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
              <Link
                href={`/week?view=today&day=${prevDayIso}${mineParam}`}
                className="text-indigo-600 hover:underline dark:text-indigo-400"
              >
                ← Previous day
              </Link>
              <Link
                href={`/week?view=today&day=${actualTodayKey}${mineParam}`}
                className="text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Today
              </Link>
              <Link
                href={`/week?view=today&day=${nextDayIso}${mineParam}`}
                className="text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Next day →
              </Link>
              <DayPicker dayKey={selectedDayKey} mineParam={mineParam} />
              <Link
                href={`/week?week=${dateKey(dayViewWeekStart)}${mineParam}`}
                className="text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Week view
              </Link>
            </div>
          ) : (
            <div className="mt-1 flex flex-wrap gap-3 text-sm">
              <Link
                href={`/week?week=${prevWeekIso}${mineParam}`}
                className="text-indigo-600 hover:underline dark:text-indigo-400"
              >
                ← Previous week
              </Link>
              <Link
                href={`/week?week=${todayIso}${mineParam}`}
                className="text-indigo-600 hover:underline dark:text-indigo-400"
              >
                This week
              </Link>
              <Link
                href={`/week?view=today&day=${actualTodayKey}${mineParam}`}
                className="text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Today only
              </Link>
              <Link
                href={`/week?week=${nextWeekIso}${mineParam}`}
                className="text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Next week →
              </Link>
            </div>
          )}
        </div>

        <div className="flex overflow-hidden rounded-lg border border-zinc-300 text-sm dark:border-zinc-700">
          <Link
            href={
              showTodayOnly
                ? `/week?view=today&day=${selectedDayKey}`
                : `/week?week=${dateKey(weekStart)}`
            }
            className={`px-3 py-1.5 font-medium ${
              !showMineOnly
                ? "bg-indigo-600 text-white"
                : "bg-white text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400"
            }`}
          >
            Everyone
          </Link>
          <Link
            href={
              showTodayOnly
                ? `/week?view=today&day=${selectedDayKey}&mine=1`
                : `/week?week=${dateKey(weekStart)}&mine=1`
            }
            className={`px-3 py-1.5 font-medium ${
              showMineOnly
                ? "bg-indigo-600 text-white"
                : "bg-white text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400"
            }`}
          >
            Just me
          </Link>
        </div>
      </div>

      {members.length > 1 && !showTodayOnly && (
        <div className="flex flex-wrap gap-3">
          {members.map((m) => (
            <span
              key={m.id}
              className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: m.color }}
              />
              {m.name}
            </span>
          ))}
        </div>
      )}

      {showTodayOnly ? (
        buckets[0] ? (
          <DayTimeGrid
            day={buckets[0]}
            members={showMineOnly ? members.filter((m) => m.id === user.id) : members}
            currentUser={{ id: user.id, role: user.role }}
          />
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No data for this day.</p>
        )
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
          {buckets.map((day) => {
            const dayEvents = showMineOnly
              ? day.events.filter((e) => e.ownerId === user.id)
              : day.events;

            return (
              <div
                key={day.key}
                className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/40"
              >
                <Link
                  href={`/week?view=today&day=${day.key}${mineParam}`}
                  className="text-sm font-semibold text-zinc-700 hover:text-indigo-600 hover:underline dark:text-zinc-300 dark:hover:text-indigo-400"
                >
                  {day.label}
                </Link>
                <div className="flex flex-col gap-2">
                  {dayEvents.map((event) => (
                    <EventPill
                      key={event.id}
                      event={event}
                      dayLabel={day.label}
                      canEdit={user.role === "ADMIN" || event.ownerId === user.id}
                    />
                  ))}
                  {dayEvents.length === 0 && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-600">
                      No events
                    </p>
                  )}
                </div>
                <AddEventButton
                  dateIso={day.key}
                  dayLabel={day.label}
                  currentUser={{ id: user.id, role: user.role }}
                  members={members}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
