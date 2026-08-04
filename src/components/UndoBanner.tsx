"use client";

import { undoLastEventBatch } from "@/lib/actions/undo-actions";

export function UndoBanner({ title, count }: { title: string; count: number }) {
  // count is the number of calendar entries in the batch — a single "add
  // event" or import can expand into several (multiple family members, a
  // multi-day range), so this can be larger than the number of items the
  // user actually typed/reviewed.
  const label =
    count > 1 ? `"${title}" and ${count - 1} other calendar ${count === 2 ? "entry" : "entries"}` : `"${title}"`;

  return (
    <form
      action={undoLastEventBatch}
      onSubmit={(e) => {
        if (!confirm(`Undo adding ${label}? This can't be undone.`)) {
          e.preventDefault();
        }
      }}
      className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm dark:border-amber-800 dark:bg-amber-950/40"
    >
      <span className="text-amber-800 dark:text-amber-200">
        Last added: {label}
      </span>
      <button
        type="submit"
        className="font-medium text-amber-900 hover:underline dark:text-amber-100"
      >
        Undo
      </button>
    </form>
  );
}
