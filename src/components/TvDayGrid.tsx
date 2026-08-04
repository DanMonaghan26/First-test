"use client";

import { useEffect, useRef, useState } from "react";
import { EventPill } from "@/components/EventPill";
import type { DayBucket } from "@/lib/family-events";
import { computeHourRange, formatHourLabel, timeToMinutes } from "@/lib/day-time-grid";

const ROW_HEIGHT = 96; // px per member row
const NAME_COL_WIDTH = 200; // px for the member name column
const MIN_HOUR_WIDTH = 70; // px per hour, below which times get hard to tap/read
const MAX_HOUR_WIDTH = 140; // px per hour, above which a short day looks too spread out
const DEFAULT_HOUR_WIDTH = 120; // used for one frame before the container is first measured

type Member = { id: string; name: string; color: string };

// Landscape layout for a widescreen TV: family members run down the side as
// rows, hours run across the top as columns — the reverse of DayTimeGrid,
// which is built for a tall phone/tablet screen instead. The hour column
// width is computed from the actual screen width so the grid always fits
// without horizontal scrolling, whatever the day's hour range or the TV's
// resolution.
export function TvDayGrid({ day, members }: { day: DayBucket; members: Member[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setContainerWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { startHour, endHour } = computeHourRange(day.events);
  const totalHours = endHour - startHour;
  const hourWidth = containerWidth
    ? Math.min(
        MAX_HOUR_WIDTH,
        Math.max(MIN_HOUR_WIDTH, Math.floor((containerWidth - NAME_COL_WIDTH) / totalHours))
      )
    : DEFAULT_HOUR_WIDTH;
  const totalWidth = totalHours * hourWidth;
  const hours = Array.from({ length: totalHours + 1 }, (_, i) => startHour + i);

  const now = new Date();
  const isToday = now.toISOString().slice(0, 10) === day.key;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowLeft = ((nowMinutes - startHour * 60) / 60) * hourWidth;
  const showNowLine = isToday && nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60;

  const reminders = day.events.filter((e) => e.isReminder);

  return (
    <div
      ref={containerRef}
      className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800"
    >
      <div className="flex flex-col">
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          <div style={{ width: NAME_COL_WIDTH }} className="flex-shrink-0" />
          <div className="relative overflow-hidden" style={{ width: totalWidth, height: 44 }}>
            {hours.map((hour, i) => {
              const edgeClass =
                i === 0 ? "" : i === hours.length - 1 ? "-translate-x-full" : "-translate-x-1/2";
              return (
                <span
                  key={hour}
                  className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-base text-zinc-400 dark:text-zinc-600 ${edgeClass}`}
                  style={{ left: (hour - startHour) * hourWidth }}
                >
                  {formatHourLabel(hour)}
                </span>
              );
            })}
          </div>
        </div>

        {reminders.length > 0 && (
          <div className="flex border-b border-zinc-200 dark:border-zinc-800">
            <div style={{ width: NAME_COL_WIDTH }} className="flex-shrink-0" />
            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
              {reminders.map((event) => (
                <div key={event.id} className="h-16 w-56">
                  <EventPill event={event} dayLabel={day.label} canEdit={false} variant="tv" />
                </div>
              ))}
            </div>
          </div>
        )}

        {members.map((member) => {
          const memberEvents = day.events.filter(
            (e) => e.ownerId === member.id && !e.isReminder
          );

          return (
            <div key={member.id} className="flex border-b border-zinc-200 dark:border-zinc-800">
              <div
                style={{ width: NAME_COL_WIDTH }}
                className="flex flex-shrink-0 items-center gap-2 px-3 py-2"
              >
                <span
                  className="h-4 w-4 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: member.color }}
                />
                <span className="truncate text-xl font-medium text-zinc-800 dark:text-zinc-200">
                  {member.name}
                </span>
              </div>

              <div className="relative flex-shrink-0" style={{ width: totalWidth, height: ROW_HEIGHT }}>
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="absolute top-0 bottom-0 border-l border-zinc-100 dark:border-zinc-900"
                    style={{ left: (hour - startHour) * hourWidth }}
                  />
                ))}

                {showNowLine && (
                  <div
                    className="absolute top-0 bottom-0 z-10 border-l-2 border-red-500"
                    style={{ left: nowLeft }}
                  />
                )}

                {memberEvents.map((event) => {
                  const startMin = timeToMinutes(event.startTime) - startHour * 60;
                  const durationMin = event.endTime
                    ? Math.max(timeToMinutes(event.endTime) - timeToMinutes(event.startTime), 15)
                    : 30;
                  const left = (startMin / 60) * hourWidth;
                  const width = Math.max((durationMin / 60) * hourWidth, 90);

                  return (
                    <div key={event.id} className="absolute top-2 bottom-2" style={{ left, width }}>
                      <EventPill event={event} dayLabel={day.label} canEdit={false} variant="tv" />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
