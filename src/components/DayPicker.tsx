"use client";

import { useRouter } from "next/navigation";

export function DayPicker({
  dayKey,
  mineParam,
}: {
  dayKey: string;
  mineParam: string;
}) {
  const router = useRouter();

  return (
    <input
      type="date"
      defaultValue={dayKey}
      onChange={(e) => {
        if (!e.target.value) return;
        router.push(`/week?day=${e.target.value}&view=today${mineParam}`);
      }}
      aria-label="Go to date"
      className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
    />
  );
}
