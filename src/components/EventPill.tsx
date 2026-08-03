"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { deleteEvent, updateEvent } from "@/app/(dashboard)/week/actions";
import type { EventWithOwner } from "@/lib/family-events";

export function EventPill({
  event,
  dateIso,
  dayLabel,
  canEdit,
  showOwnerName,
}: {
  event: EventWithOwner;
  dateIso: string;
  dayLabel: string;
  canEdit: boolean;
  showOwnerName: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateEvent(undefined, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setError(undefined);
        setOpen(false);
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${event.title}"?`)) return;
    const formData = new FormData();
    formData.set("id", event.id);
    startTransition(async () => {
      await deleteEvent(formData);
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => canEdit && setOpen(true)}
        className="flex w-full items-start gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-left text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <span
          className="mt-1 h-2 w-2 flex-shrink-0 rounded-full"
          style={{ backgroundColor: event.ownerColor }}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-zinc-900 dark:text-zinc-50">
            {event.title}
          </span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
            {event.startTime}
            {event.endTime ? `–${event.endTime}` : ""}
            {showOwnerName ? ` · ${event.ownerName}` : ""}
          </span>
        </span>
      </button>

      {open && canEdit && (
        <Modal title={`Edit event – ${dayLabel}`} onClose={() => setOpen(false)}>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={event.id} />
            <input type="hidden" name="date" value={dateIso} />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Title
              </label>
              <input
                name="title"
                required
                defaultValue={event.title}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Start
                </label>
                <input
                  type="time"
                  name="startTime"
                  required
                  defaultValue={event.startTime}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  End (optional)
                </label>
                <input
                  type="time"
                  name="endTime"
                  defaultValue={event.endTime ?? ""}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Notes (optional)
              </label>
              <textarea
                name="notes"
                rows={2}
                defaultValue={event.notes ?? ""}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={pending}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
              >
                {pending ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="rounded-lg border border-red-300 px-4 py-3 text-base font-semibold text-red-600 disabled:opacity-60 dark:border-red-900"
              >
                Delete
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
