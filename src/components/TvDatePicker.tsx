"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addMonths, format, getDay, getDaysInMonth, startOfMonth } from "date-fns";

// Native <input type="date"> doesn't reliably open/respond on a TV browser
// driven by a remote-control pointer — the cursor hovers it but nothing
// happens. This is a fully custom on-screen calendar instead, built from
// plain buttons so it behaves the same as the rest of the kiosk's controls.
const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function buildMonthGrid(monthStart: Date): (Date | null)[] {
  const firstWeekday = (getDay(monthStart) + 6) % 7; // Monday = 0
  const daysInMonth = getDaysInMonth(monthStart);
  const cells: (Date | null)[] = Array(firstWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    // Noon avoids any midnight/timezone boundary issues when formatted back
    // into a date key.
    cells.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), day, 12));
  }
  return cells;
}

export function TvDatePicker({
  token,
  selectedDayKey,
  todayKey,
}: {
  token: string;
  selectedDayKey: string;
  todayKey: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(new Date(`${selectedDayKey}T12:00:00`))
  );

  function openPicker() {
    setViewMonth(startOfMonth(new Date(`${selectedDayKey}T12:00:00`)));
    setOpen(true);
  }

  function pick(date: Date) {
    // pinned=1 opts this out of the kiosk's 30-second auto-revert-to-today
    // — picking a date here is a deliberate choice to look at that day, not
    // a quick tap like the prev/next arrows.
    router.push(`/tv/${token}?day=${format(date, "yyyy-MM-dd")}&pinned=1`);
    setOpen(false);
  }

  const cells = buildMonthGrid(viewMonth);
  const monthLabel = format(viewMonth, "MMMM yyyy");
  const selectedLabel = format(new Date(`${selectedDayKey}T12:00:00`), "d MMM");

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        aria-label="Pick a date"
        className="fixed right-4 top-4 z-20 flex h-14 items-center gap-2 rounded-full bg-zinc-900/10 px-4 text-lg font-medium text-zinc-600 transition-colors hover:bg-zinc-900/20 dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/20"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="8" y1="3" x2="8" y2="7" />
          <line x1="16" y1="3" x2="16" y2="7" />
        </svg>
        {selectedLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/50"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-[460px] rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonths(m, -1))}
                aria-label="Previous month"
                className="flex h-11 w-11 items-center justify-center rounded-full text-2xl text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                ‹
              </button>
              <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {monthLabel}
              </span>
              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
                aria-label="Next month"
                className="flex h-11 w-11 items-center justify-center rounded-full text-2xl text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                ›
              </button>
            </div>

            <div className="mt-4 grid grid-cols-7 text-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {WEEKDAY_LABELS.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-y-1">
              {cells.map((date, i) => {
                if (!date) return <span key={`blank-${i}`} />;
                const key = format(date, "yyyy-MM-dd");
                const isSelected = key === selectedDayKey;
                const isToday = key === todayKey;
                return (
                  <div key={key} className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => pick(date)}
                      data-testid="tv-calendar-day"
                      data-date={key}
                      aria-label={format(date, "d MMMM yyyy")}
                      className={`flex h-11 w-11 items-center justify-center rounded-full text-base transition-colors ${
                        isSelected
                          ? "bg-indigo-600 font-semibold text-white"
                          : isToday
                            ? "font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950"
                            : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  router.push(`/tv/${token}`);
                  setOpen(false);
                }}
                className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
