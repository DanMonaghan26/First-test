"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { createEvent } from "@/app/(dashboard)/week/actions";

type FamilyMember = { id: string; name: string; color: string };

const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

const inputClass =
  "rounded-lg border border-zinc-300 px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-900";

export function AddEventButton({
  dateIso,
  dayLabel,
  currentUser,
  members,
  defaultOwnerId,
  compact,
}: {
  dateIso: string;
  dayLabel: string;
  currentUser: { id: string; role: "ADMIN" | "MEMBER" };
  members: FamilyMember[];
  defaultOwnerId?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const [repeat, setRepeat] = useState("NONE");
  const [dateRows, setDateRows] = useState([{ id: "row-0", defaultValue: dateIso }]);

  function addDateRow() {
    setDateRows((rows) => [...rows, { id: `row-${rows.length}-${Date.now()}`, defaultValue: "" }]);
  }

  function removeDateRow(id: string) {
    setDateRows((rows) => (rows.length > 1 ? rows.filter((r) => r.id !== id) : rows));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (currentUser.role === "ADMIN" && members.length > 1) {
      const selected = formData.getAll("ownerIds");
      if (selected.length === 0) {
        setError("Please select at least one family member.");
        return;
      }
    }

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
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Add event"
          className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-dashed border-zinc-300 text-xs text-zinc-500 hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
        >
          +
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-300 py-2 text-sm font-medium text-zinc-500 hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
        >
          + Add event
        </button>
      )}

      {open && (
        <Modal title={`Add event – ${dayLabel}`} onClose={() => setOpen(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {repeat !== "SET_DATES" && <input type="hidden" name="date" value={dateIso} />}

            {currentUser.role === "ADMIN" && members.length > 1 && (
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  For
                </span>
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => (
                    <label
                      key={m.id}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm dark:border-zinc-700"
                    >
                      <input
                        type="checkbox"
                        name="ownerIds"
                        value={m.id}
                        defaultChecked={m.id === (defaultOwnerId ?? currentUser.id)}
                        onChange={() => setError(undefined)}
                      />
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: m.color }}
                        aria-hidden="true"
                      />
                      {m.name}
                    </label>
                  ))}
                </div>
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
                className={inputClass}
              />
            </div>

            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Start
                </label>
                <input type="time" name="startTime" required className={inputClass} />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  End (optional)
                </label>
                <input type="time" name="endTime" className={inputClass} />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Repeats
              </label>
              <select
                name="repeat"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
                className={inputClass}
              >
                <option value="NONE">Doesn&apos;t repeat</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly, same day</option>
                <option value="CUSTOM_DAYS">Certain days of the week</option>
                <option value="SET_DATES">Multiple set dates</option>
              </select>
            </div>

            {repeat === "CUSTOM_DAYS" && (
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Which days?
                </span>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((d) => (
                    <label
                      key={d.value}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm dark:border-zinc-700"
                    >
                      <input type="checkbox" name="repeatDays" value={d.value} />
                      {d.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {(repeat === "DAILY" || repeat === "WEEKLY" || repeat === "CUSTOM_DAYS") && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Repeat until (optional)
                </label>
                <input type="date" name="repeatUntil" min={dateIso} className={inputClass} />
              </div>
            )}

            {repeat === "SET_DATES" && (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Dates
                </span>
                {dateRows.map((row) => (
                  <div key={row.id} className="flex gap-2">
                    <input
                      type="date"
                      name="dates"
                      required
                      defaultValue={row.defaultValue}
                      className={`flex-1 ${inputClass}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeDateRow(row.id)}
                      disabled={dateRows.length === 1}
                      className="rounded-lg border border-zinc-300 px-3 text-sm text-zinc-600 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addDateRow}
                  className="self-start text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  + Add another date
                </button>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Notes (optional)
              </label>
              <textarea name="notes" rows={2} className={inputClass} />
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
