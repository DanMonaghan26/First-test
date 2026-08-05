"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { deleteEvent, updateEvent } from "@/app/(dashboard)/week/actions";
import type { EventWithOwner } from "@/lib/family-events";

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

type FamilyMember = { id: string; name: string; color: string };

export function EventEditModal({
  event,
  dayLabel,
  isAdmin,
  members,
  onClose,
}: {
  event: EventWithOwner;
  dayLabel: string;
  isAdmin: boolean;
  members: FamilyMember[];
  onClose: () => void;
}) {
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const [repeat, setRepeat] = useState(event.recurrenceType);
  const [isReminder, setIsReminder] = useState(event.isReminder);
  const [ownerIds, setOwnerIds] = useState(event.groupOwnerIds);
  const showOwnerPicker = isAdmin && members.length > 1;

  const canDeleteGroupAdmin = isAdmin && !!event.eventGroupId && event.eventGroupSize > 1;
  const canDeleteGroupMine = !isAdmin && !!event.eventGroupId && event.ownerGroupSize > 1;
  const ownerName = members.find((m) => m.id === event.ownerId)?.name ?? "this calendar";

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateEvent(undefined, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setError(undefined);
        onClose();
      }
    });
  }

  function handleDelete(scopeGroup: boolean) {
    const confirmMessage = scopeGroup
      ? canDeleteGroupAdmin
        ? `Delete "${event.title}" for everyone? This removes it from all ${event.eventGroupSize} calendars it's on.`
        : `Delete "${event.title}" from all ${event.ownerGroupSize} days you added it to?`
      : event.recurring
        ? `Delete "${event.title}"? This is a repeating event — deleting it removes every occurrence.`
        : `Delete "${event.title}"?`;
    if (!confirm(confirmMessage)) return;
    const formData = new FormData();
    formData.set("id", event.id);
    if (scopeGroup) formData.set("scope", "group");
    startTransition(async () => {
      await deleteEvent(formData);
      onClose();
    });
  }

  return (
    <Modal title={`Edit event – ${dayLabel}`} onClose={onClose}>
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={event.id} />
        <input type="hidden" name="date" value={event.anchorDate} />

        {event.recurring && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            This is a repeating event. Changes here apply to every occurrence.
          </p>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Title</label>
          <input name="title" required defaultValue={event.title} className={inputClass} />
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            name="isReminder"
            value="1"
            checked={isReminder}
            onChange={(e) => setIsReminder(e.target.checked)}
          />
          Reminder — show at the top of the day, no specific time
        </label>

        {!isReminder && (
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
                className={inputClass}
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
                className={inputClass}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Repeats</label>
          <select
            name="repeat"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value as typeof repeat)}
            className={inputClass}
          >
            <option value="NONE">Doesn&apos;t repeat</option>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly, same day</option>
            <option value="CUSTOM_DAYS">Certain days, every week</option>
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
                  <input
                    type="checkbox"
                    name="repeatDays"
                    value={d.value}
                    defaultChecked={event.recurrenceDays.includes(d.value)}
                  />
                  {d.label}
                </label>
              ))}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              This repeats every week on the days you pick, with no end date unless you set one
              below — for just one week, use &quot;Repeat until&quot; to stop it after this
              week.
            </p>
          </div>
        )}

        {(repeat === "DAILY" || repeat === "WEEKLY" || repeat === "CUSTOM_DAYS") && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Repeat until (optional)
            </label>
            <input
              type="date"
              name="repeatUntil"
              min={event.anchorDate}
              defaultValue={event.recurrenceEndDate ?? ""}
              className={inputClass}
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Leave blank to repeat forever, with no end date.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Notes (optional)
          </label>
          <textarea name="notes" rows={2} defaultValue={event.notes ?? ""} className={inputClass} />
        </div>

        {showOwnerPicker && (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              In whose calendars?
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
                    checked={ownerIds.includes(m.id)}
                    onChange={(e) => {
                      setOwnerIds((prev) =>
                        e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id)
                      );
                      setError(undefined);
                    }}
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
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Untick someone to remove this event from their calendar; tick someone new to add it
              to theirs — you don&apos;t need to delete and re-add it.
            </p>
          </div>
        )}

        {event.eventGroupId && event.eventGroupSize > 1 && (
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" name="applyToBatch" value="1" />
            Also apply the title/time/notes changes above to the other{" "}
            {event.eventGroupSize - 1} calendar
            {event.eventGroupSize - 1 === 1 ? "" : "s"} this is on
          </label>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-col gap-2">
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
              onClick={() => handleDelete(false)}
              disabled={pending}
              className="rounded-lg border border-red-300 px-4 py-3 text-base font-semibold text-red-600 disabled:opacity-60 dark:border-red-900"
            >
              {canDeleteGroupAdmin
                ? `Remove ${ownerName}`
                : canDeleteGroupMine
                  ? "Delete this one"
                  : "Delete"}
            </button>
          </div>
          {canDeleteGroupAdmin && (
            <button
              type="button"
              onClick={() => handleDelete(true)}
              disabled={pending}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 disabled:opacity-60 dark:border-red-900"
            >
              Delete for everyone ({event.eventGroupSize} calendars)
            </button>
          )}
          {canDeleteGroupMine && (
            <button
              type="button"
              onClick={() => handleDelete(true)}
              disabled={pending}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 disabled:opacity-60 dark:border-red-900"
            >
              Delete all {event.ownerGroupSize} of your occurrences
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
