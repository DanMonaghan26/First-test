"use client";

import { useRouter } from "next/navigation";

export function WeekPicker({
  weekStartKey,
  mineParam,
}: {
  weekStartKey: string;
  mineParam: string;
}) {
  const router = useRouter();

  return (
    <input
      type="date"
      defaultValue={weekStartKey}
      onChange={(e) => {
        if (!e.target.value) return;
        router.push(`/week?week=${e.target.value}${mineParam}`);
      }}
      aria-label="Jump to week commencing"
      title="Jump to week commencing"
      className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
    />
  );
}
