"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { createEvent } from "@/app/(dashboard)/week/actions";

type FamilyMember = { id: string; name: string; color: string };

export function AddEventButton({
  dateIso,
  dayLabel,
  currentUser,
  members,
}: {
  dateIso: string;
  dayLabel: string;
  currentUser: { id: string; role: "ADMIN" | "MEMBER" };
  members: FamilyMember[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createEvent(undefined, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setError(undefined);
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-300 py-2 text-sm font-medium text-zinc-500 hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
      >
        + Add event
      </button>

      {open && (
        <Modal title={`Add event – ${dayLabel}`} onClose={() => setOpen(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input type="hidden" name="date" value={dateIso} />

            {currentUser.role === "ADMIN" && members.length > 1 && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  For
                </label>
                <select
                  name="ownerId"
                  defaultValue={currentUser.id}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Title
              </label>
              <input
                name="title"
                required
                autoFocus
                placeholder="Football practice"
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
                className="rounded-lg border border-zinc-300 px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-indigo-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Adding..." : "Add event"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
