"use client";

import { useState } from "react";
import { EventEditModal } from "@/components/EventEditModal";
import type { EventWithOwner } from "@/lib/family-events";

type FamilyMember = { id: string; name: string; color: string };

export function EventPill({
  event,
  dayLabel,
  canEdit,
  variant = "list",
  isAdmin = false,
  members = [],
}: {
  event: EventWithOwner;
  dayLabel: string;
  canEdit: boolean;
  variant?: "list" | "grid" | "tv";
  isAdmin?: boolean;
  members?: FamilyMember[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "grid" ? (
        <button
          type="button"
          onClick={() => canEdit && setOpen(true)}
          className="h-full w-full overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-left"
          style={{
            borderColor: event.ownerColor,
            backgroundColor: `${event.ownerColor}22`,
          }}
        >
          <span className="line-clamp-2 text-[10px] font-medium text-zinc-900 dark:text-zinc-50">
            {event.isReminder ? "📌 " : event.recurring ? "↻ " : ""}
            {event.title}
          </span>
        </button>
      ) : variant === "tv" ? (
        <button
          type="button"
          onClick={() => canEdit && setOpen(true)}
          className="h-full w-full overflow-hidden rounded-lg border-l-4 px-3 py-2 text-left"
          style={{
            borderColor: event.ownerColor,
            backgroundColor: `${event.ownerColor}22`,
          }}
        >
          <span className="line-clamp-2 text-base font-medium text-zinc-900 dark:text-zinc-50">
            {event.isReminder ? "📌 " : event.recurring ? "↻ " : ""}
            {event.title}
          </span>
          {!event.isReminder && (
            <span className="block text-sm text-zinc-600 dark:text-zinc-400">
              {event.startTime}
              {event.endTime ? `–${event.endTime}` : ""}
            </span>
          )}
        </button>
      ) : (
        <button
          id={`event-${event.id}`}
          type="button"
          onClick={() => canEdit && setOpen(true)}
          className={`flex w-full items-start gap-2 rounded-lg border px-2.5 py-1.5 text-left text-sm shadow-sm transition-shadow ${
            event.isReminder
              ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40"
              : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          }`}
        >
          <span
            className="mt-1 h-2 w-2 flex-shrink-0 rounded-full"
            style={{ backgroundColor: event.ownerColor }}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 overflow-hidden">
            <span className="block break-words text-[6px] font-medium text-zinc-900 dark:text-zinc-50">
              {event.isReminder ? "📌 " : event.recurring ? "↻ " : ""}
              {event.title}
            </span>
            <span className="block break-words text-[6px] text-zinc-500 dark:text-zinc-400">
              {event.isReminder
                ? "Reminder"
                : `${event.startTime}${event.endTime ? `–${event.endTime}` : ""}`}
            </span>
          </span>
        </button>
      )}

      {open && canEdit && (
        <EventEditModal
          event={event}
          dayLabel={dayLabel}
          isAdmin={isAdmin}
          members={members}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
