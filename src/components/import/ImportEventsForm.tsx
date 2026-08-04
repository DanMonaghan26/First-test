"use client";

import { useActionState, useState } from "react";
import { extractEvents, saveImportedEvents, type ImportRow } from "@/lib/actions/import-actions";
import type { ExtractedEvent } from "@/lib/event-extraction";

type FamilyMember = { id: string; name: string; color: string };

type Row = ImportRow & { key: string };

const inputClass =
  "rounded-lg border border-zinc-300 px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-900";

function toRow(e: ExtractedEvent, key: string, defaultOwnerIds: string[]): Row {
  return {
    key,
    title: e.title,
    date: e.date,
    endDate: e.endDate,
    allDay: e.allDay,
    isReminder: false,
    startTime: e.startTime ?? "09:00",
    endTime: e.endTime,
    ownerIds: defaultOwnerIds,
  };
}

export function ImportEventsForm({
  currentUserId,
  isAdmin,
  members,
}: {
  currentUserId: string;
  isAdmin: boolean;
  members: FamilyMember[];
}) {
  const [extractState, extractAction, extracting] = useActionState(extractEvents, undefined);
  const [saveState, saveAction, saving] = useActionState(saveImportedEvents, undefined);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [bulkOwnerIds, setBulkOwnerIds] = useState<string[]>([currentUserId]);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  // Tracks which extractState/saveState result has already been applied to
  // `rows`, so each result is consumed exactly once (by reference) instead
  // of by comparing against `rows`'s null-ness — the latter flips back and
  // forth between the two actions and causes an infinite render loop.
  const [consumedExtractState, setConsumedExtractState] = useState(extractState);
  const [consumedSaveState, setConsumedSaveState] = useState(saveState);

  const showPicker = isAdmin && members.length > 1;

  function startReview(events: ExtractedEvent[]) {
    const defaults = showPicker ? [] : [currentUserId];
    setRows(events.map((e, i) => toRow(e, `${Date.now()}-${i}`, defaults)));
    setSavedCount(null);
  }

  if (extractState !== consumedExtractState) {
    setConsumedExtractState(extractState);
    if (extractState && "events" in extractState) {
      startReview(extractState.events);
    }
  }

  if (saveState !== consumedSaveState) {
    setConsumedSaveState(saveState);
    if (saveState && "count" in saveState) {
      setSavedCount(saveState.count);
      setRows(null);
    }
  }

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev?.map((r) => (r.key === key ? { ...r, ...patch } : r)) ?? null);
  }

  function toggleRowOwner(key: string, ownerId: string) {
    setRows(
      (prev) =>
        prev?.map((r) =>
          r.key === key
            ? {
                ...r,
                ownerIds: r.ownerIds.includes(ownerId)
                  ? r.ownerIds.filter((id) => id !== ownerId)
                  : [...r.ownerIds, ownerId],
              }
            : r
        ) ?? null
    );
  }

  function removeRow(key: string) {
    setRows((prev) => prev?.filter((r) => r.key !== key) ?? null);
  }

  function toggleBulkOwner(ownerId: string) {
    setBulkOwnerIds((prev) =>
      prev.includes(ownerId) ? prev.filter((id) => id !== ownerId) : [...prev, ownerId]
    );
  }

  function applyBulkToAll() {
    setRows((prev) => prev?.map((r) => ({ ...r, ownerIds: bulkOwnerIds })) ?? null);
  }

  function reset() {
    setRows(null);
    setSavedCount(null);
  }

  if (rows === null) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        {savedCount !== null && (
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            Added {savedCount} event{savedCount === 1 ? "" : "s"} to the calendar.
          </p>
        )}
        <form action={extractAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Paste a URL or the school&apos;s text
            </label>
            <textarea
              name="text"
              required
              rows={6}
              placeholder="Paste a webpage link (https://...) or copy-paste the text of a newsletter/letter here"
              className={`${inputClass} resize-y`}
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Claude will read it and pull out anything that looks like a dated event — inset
              days, trips, term dates, deadlines, etc. You&apos;ll get to review and edit
              everything before it&apos;s added.
            </p>
          </div>

          {extractState && "error" in extractState && (
            <p className="text-sm text-red-600">{extractState.error}</p>
          )}

          <button
            type="submit"
            disabled={extracting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {extracting ? "Reading…" : "Extract events"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-zinc-900 dark:text-zinc-50">
          Review {rows.length} extracted event{rows.length === 1 ? "" : "s"}
        </h2>
        <button
          type="button"
          onClick={reset}
          className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          Start over
        </button>
      </div>

      {showPicker && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">Add to:</span>
          {members.map((m) => (
            <label key={m.id} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={bulkOwnerIds.includes(m.id)}
                onChange={() => toggleBulkOwner(m.id)}
              />
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
              {m.name}
            </label>
          ))}
          <button
            type="button"
            onClick={applyBulkToAll}
            className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
          >
            Apply to all rows below
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.key} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex flex-wrap items-start gap-2">
              <input
                value={row.title}
                onChange={(e) => updateRow(row.key, { title: e.target.value })}
                className={`${inputClass} min-w-[10rem] flex-1`}
                placeholder="Title"
              />
              <input
                type="date"
                value={row.date}
                onChange={(e) => updateRow(row.key, { date: e.target.value })}
                className={inputClass}
              />
              <input
                type="date"
                value={row.endDate ?? ""}
                onChange={(e) => updateRow(row.key, { endDate: e.target.value || null })}
                title="End date (only for multi-day events)"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => removeRow(row.key)}
                className="rounded-lg border border-zinc-300 px-2 py-2 text-xs text-zinc-500 dark:border-zinc-700"
              >
                Remove
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={row.isReminder}
                  onChange={(e) => updateRow(row.key, { isReminder: e.target.checked })}
                />
                Reminder (top of the day, no specific time)
              </label>
              {!row.isReminder && (
                <label className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                  <input
                    type="checkbox"
                    checked={row.allDay}
                    onChange={(e) => updateRow(row.key, { allDay: e.target.checked })}
                  />
                  All day
                </label>
              )}
              {!row.isReminder && !row.allDay && (
                <>
                  <input
                    type="time"
                    value={row.startTime}
                    onChange={(e) => updateRow(row.key, { startTime: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    type="time"
                    value={row.endTime ?? ""}
                    onChange={(e) => updateRow(row.key, { endTime: e.target.value || null })}
                    className={inputClass}
                  />
                </>
              )}
            </div>

            {showPicker && (
              <div className="mt-2 flex flex-wrap gap-3">
                {members.map((m) => (
                  <label key={m.id} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={row.ownerIds.includes(m.id)}
                      onChange={() => toggleRowOwner(row.key, m.id)}
                    />
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                    {m.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <form action={saveAction}>
        <input type="hidden" name="rows" value={JSON.stringify(rows)} readOnly />

        {saveState && "error" in saveState && (
          <p className="mb-3 text-sm text-red-600">{saveState.error}</p>
        )}

        <button
          type="submit"
          disabled={saving || rows.length === 0}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Adding…" : `Add ${rows.length} event${rows.length === 1 ? "" : "s"}`}
        </button>
      </form>
    </div>
  );
}
