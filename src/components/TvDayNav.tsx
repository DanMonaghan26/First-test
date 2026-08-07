"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TvDatePicker } from "@/components/TvDatePicker";

// A quick peek at another day via the arrows (e.g. checking tomorrow on the
// way past) snaps back to today on its own after a bit — nobody has to
// remember to reset it, and it won't get stuck showing the wrong day.
// Deliberately picking a date from the calendar opts out of this (see
// `pinned`) — that's a considered choice to look at a specific day, not a
// quick tap, and shouldn't get yanked away after 30 seconds.
const AUTO_REVERT_MS = 30_000;

const NAV_BUTTON_CLASS =
  "flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-zinc-900/10 text-2xl text-zinc-500 transition-colors hover:bg-zinc-900/20 hover:text-zinc-800 dark:bg-white/10 dark:text-zinc-400 dark:hover:bg-white/20 dark:hover:text-zinc-100";

export function TvDayNav({
  token,
  selectedDayKey,
  todayKey,
  prevDayIso,
  nextDayIso,
  pinned,
}: {
  token: string;
  selectedDayKey: string;
  todayKey: string;
  prevDayIso: string;
  nextDayIso: string;
  pinned: boolean;
}) {
  const router = useRouter();
  const isToday = selectedDayKey === todayKey;

  useEffect(() => {
    if (isToday || pinned) return;
    const id = setTimeout(() => router.push(`/tv/${token}`), AUTO_REVERT_MS);
    return () => clearTimeout(id);
  }, [isToday, pinned, token, router]);

  // Everything the remote's cursor needs for day navigation lives in one
  // corner, so hopping between "previous day" and "pick a date" (say) is a
  // short nudge, not a trip across the whole screen.
  return (
    <div className="fixed right-4 top-4 z-20 flex items-center gap-2">
      <Link href={`/tv/${token}?day=${prevDayIso}`} aria-label="Previous day" className={NAV_BUTTON_CLASS}>
        ‹
      </Link>
      <Link href={`/tv/${token}?day=${nextDayIso}`} aria-label="Next day" className={NAV_BUTTON_CLASS}>
        ›
      </Link>
      <TvDatePicker token={token} selectedDayKey={selectedDayKey} todayKey={todayKey} />
      {!isToday && (
        <Link
          href={`/tv/${token}`}
          className="flex h-14 flex-shrink-0 items-center rounded-full bg-indigo-600 px-4 text-base font-medium text-white shadow-lg hover:bg-indigo-500"
        >
          Today
        </Link>
      )}
    </div>
  );
}
