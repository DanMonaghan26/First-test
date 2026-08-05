"use client";

import { useState, useTransition } from "react";
import { backfillEventGroups } from "@/app/(dashboard)/admin/actions";

export function BackfillEventGroupsButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | undefined>();

  function handleClick() {
    startTransition(async () => {
      const { fixed } = await backfillEventGroups();
      setResult(
        fixed === 0
          ? "Nothing to fix — all events already support it."
          : `Fixed ${fixed} event${fixed === 1 ? "" : "s"}.`
      );
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        {pending ? "Fixing..." : "Fix older imported/added events"}
      </button>
      {result && <span className="text-sm text-zinc-500 dark:text-zinc-400">{result}</span>}
    </div>
  );
}
