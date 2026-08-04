"use client";

import { EventPill } from "@/components/EventPill";
import { AddEventButton } from "@/components/AddEventButton";
import type { DayBucket } from "@/lib/family-events";

const HOUR_HEIGHT = 56; // px per hour
const COLUMN_WIDTH = 128; // px per member column
const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 21;

type Member = { id: string; name: string; color: string };

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

function formatHourLabel(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const period = h < 12 ? "am" : "pm";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour}${period}`;
}

function computeRange(events: DayBucket["events"]): { startHour: number; endHour: number } {
  let startHour = DEFAULT_START_HOUR;
  let endHour = DEFAULT_END_HOUR;
  for (const event of events) {
    const startH = Math.floor(timeToMinutes(event.startTime) / 60);
    if (startH < startHour) startHour = startH;
    const endMinutes = event.endTime
      ? timeToMinutes(event.endTime)
      : timeToMinutes(event.startTime) + 30;
    const endH = Math.ceil(endMinutes / 60);
    if (endH > endHour) endHour = endH;
  }
  return { startHour: Math.max(0, startHour), endHour: Math.min(24, endHour) };
}

export function DayTimeGrid({
  day,
  members,
  currentUser,
}: {
  day: DayBucket;
  members: Member[];
  currentUser: { id: string; role: "ADMIN" | "MEMBER" };
}) {
  const { startHour, endHour } = computeRange(day.events);
  const totalHours = endHour - startHour;
  const totalHeight = totalHours * HOUR_HEIGHT;
  const hours = Array.from({ length: totalHours + 1 }, (_, i) => startHour + i);

  const now = new Date();
  const isToday = now.toISOString().slice(0, 10) === day.key;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTop = ((nowMinutes - startHour * 60) / 60) * HOUR_HEIGHT;
  const showNowLine = isToday && nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60;

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="inline-flex min-w-full flex-col">
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          <div className="w-12 flex-shrink-0" />
          {members.map((member) => {
            const canAdd = currentUser.role === "ADMIN" || member.id === currentUser.id;
            return (
              <div
                key={member.id}
                style={{ width: COLUMN_WIDTH }}
                className="flex flex-shrink-0 items-center justify-between gap-1 border-l border-zinc-200 px-2 py-2 dark:border-zinc-800"
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: member.color }}
                  />
                  <span className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {member.name}
                  </span>
                </div>
                {canAdd && (
                  <AddEventButton
                    dateIso={day.key}
                    dayLabel={day.label}
                    currentUser={currentUser}
                    members={members}
                    defaultOwnerId={member.id}
                    compact
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex">
          <div className="relative w-12 flex-shrink-0" style={{ height: totalHeight }}>
            {hours.map((hour) => (
              <span
                key={hour}
                className="absolute right-1 -translate-y-1/2 text-[10px] text-zinc-400 dark:text-zinc-600"
                style={{ top: (hour - startHour) * HOUR_HEIGHT }}
              >
                {formatHourLabel(hour)}
              </span>
            ))}
          </div>

          {members.map((member) => {
            const memberEvents = day.events.filter((e) => e.ownerId === member.id);
            const canEdit = (ownerId: string) =>
              currentUser.role === "ADMIN" || ownerId === currentUser.id;

            return (
              <div
                key={member.id}
                style={{ width: COLUMN_WIDTH, height: totalHeight }}
                className="relative flex-shrink-0 border-l border-zinc-200 dark:border-zinc-800"
              >
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 border-t border-zinc-100 dark:border-zinc-900"
                    style={{ top: (hour - startHour) * HOUR_HEIGHT }}
                  />
                ))}

                {showNowLine && (
                  <div
                    className="absolute left-0 right-0 z-10 border-t-2 border-red-500"
                    style={{ top: nowTop }}
                  />
                )}

                {memberEvents.map((event) => {
                  const startMin = timeToMinutes(event.startTime) - startHour * 60;
                  const durationMin = event.endTime
                    ? Math.max(timeToMinutes(event.endTime) - timeToMinutes(event.startTime), 15)
                    : 30;
                  const top = (startMin / 60) * HOUR_HEIGHT;
                  const height = Math.max((durationMin / 60) * HOUR_HEIGHT, 28);

                  return (
                    <div
                      key={event.id}
                      className="absolute left-0.5 right-0.5"
                      style={{ top, height }}
                    >
                      <EventPill
                        event={event}
                        dayLabel={day.label}
                        canEdit={canEdit(event.ownerId)}
                        variant="grid"
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
