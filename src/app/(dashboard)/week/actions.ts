"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import type { RecurrenceType } from "@/lib/family-events";

export type ActionState = { error?: string } | undefined;

const RECURRENCE_TYPES: RecurrenceType[] = ["NONE", "DAILY", "WEEKLY", "CUSTOM_DAYS"];

function parseDate(dateStr: string): Date {
  // Noon avoids any midnight/timezone boundary issues when the date is
  // later re-formatted for display.
  return new Date(`${dateStr}T12:00:00`);
}

async function resolveOwnerIds(
  formData: FormData,
  currentUser: { id: string; role: string }
): Promise<{ ownerIds: string[] } | { error: string }> {
  if (currentUser.role !== "ADMIN") {
    return { ownerIds: [currentUser.id] };
  }

  const requested = formData
    .getAll("ownerIds")
    .map((v) => String(v))
    .filter(Boolean);
  if (requested.length > 0) {
    return { ownerIds: requested };
  }

  // The owner checkboxes are only rendered when there's more than one
  // family member — if there are, an empty submission means the admin
  // really did submit with nobody ticked.
  const memberCount = await prisma.user.count();
  if (memberCount > 1) {
    return { error: "Please select at least one family member." };
  }
  return { ownerIds: [currentUser.id] };
}

function parseRecurrence(formData: FormData) {
  const raw = String(formData.get("repeat") ?? "NONE");
  const recurrenceType: RecurrenceType = RECURRENCE_TYPES.includes(raw as RecurrenceType)
    ? (raw as RecurrenceType)
    : "NONE";

  const recurrenceDays = formData
    .getAll("repeatDays")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);

  const repeatUntilRaw = String(formData.get("repeatUntil") ?? "").trim();
  const recurrenceEndDate = repeatUntilRaw ? parseDate(repeatUntilRaw) : null;

  return { recurrenceType, recurrenceDays, recurrenceEndDate };
}

export async function createEvent(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const isReminder = formData.get("isReminder") === "1";
  const startTime = isReminder ? "00:00" : String(formData.get("startTime") ?? "");
  const endTime = isReminder ? "" : String(formData.get("endTime") ?? "").trim();

  if (!title || !startTime) {
    return { error: "Please fill in a title and start time." };
  }

  const resolved = await resolveOwnerIds(formData, user);
  if ("error" in resolved) {
    return { error: resolved.error };
  }
  const { ownerIds } = resolved;

  const setDates = formData.getAll("dates").map((v) => String(v).trim()).filter(Boolean);
  // One createEvent call is always exactly one conceptual event, so batchId
  // (undo grouping) and eventGroupId (apply-to-all grouping) are the same
  // value here — they only diverge for the multi-event text importer.
  const batchId = randomUUID();
  const eventGroupId = batchId;

  if (setDates.length > 0) {
    await prisma.event.createMany({
      data: ownerIds.flatMap((ownerId) =>
        setDates.map((dateStr) => ({
          title,
          notes: notes || null,
          date: parseDate(dateStr),
          startTime,
          endTime: endTime || null,
          isReminder,
          ownerId,
          createdById: user.id,
          batchId,
          eventGroupId,
        }))
      ),
    });
    revalidatePath("/week");
    return undefined;
  }

  const date = String(formData.get("date") ?? "");
  if (!date) {
    return { error: "Please choose a date." };
  }

  const { recurrenceType, recurrenceDays, recurrenceEndDate } = parseRecurrence(formData);
  if (recurrenceType === "CUSTOM_DAYS" && recurrenceDays.length === 0) {
    return { error: "Pick at least one day of the week to repeat on." };
  }

  await prisma.event.createMany({
    data: ownerIds.map((ownerId) => ({
      title,
      notes: notes || null,
      date: parseDate(date),
      startTime,
      endTime: endTime || null,
      isReminder,
      ownerId,
      createdById: user.id,
      batchId,
      eventGroupId,
      recurrenceType,
      recurrenceDays,
      recurrenceEndDate,
    })),
  });

  revalidatePath("/week");
  return undefined;
}

export async function updateEvent(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const isReminder = formData.get("isReminder") === "1";
  const startTime = isReminder ? "00:00" : String(formData.get("startTime") ?? "");
  const endTime = isReminder ? "" : String(formData.get("endTime") ?? "").trim();

  if (!id || !title || !date || !startTime) {
    return { error: "Please fill in a title, date, and start time." };
  }

  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) {
    return { error: "Event not found." };
  }
  if (existing.ownerId !== user.id && user.role !== "ADMIN") {
    return { error: "You can only edit your own events." };
  }

  const { recurrenceType, recurrenceDays, recurrenceEndDate } = parseRecurrence(formData);
  if (recurrenceType === "CUSTOM_DAYS" && recurrenceDays.length === 0) {
    return { error: "Pick at least one day of the week to repeat on." };
  }

  const sharedFields = {
    title,
    notes: notes || null,
    startTime,
    endTime: endTime || null,
    isReminder,
    recurrenceType,
    recurrenceDays,
    recurrenceEndDate,
  };

  await prisma.event.update({
    where: { id },
    data: { ...sharedFields, date: parseDate(date) },
  });

  if (user.role === "ADMIN" && formData.has("ownerIds")) {
    // Admins can change which family members' calendars this event is in,
    // as well as edit its shared fields — reconciled against the group's
    // current membership (siblings keep their own date; new members get one
    // row per date already present in the group).
    const desiredOwnerIds = formData
      .getAll("ownerIds")
      .map((v) => String(v))
      .filter(Boolean);
    if (desiredOwnerIds.length === 0) {
      return { error: "Please select at least one family member." };
    }

    const siblings = existing.eventGroupId
      ? await prisma.event.findMany({ where: { eventGroupId: existing.eventGroupId } })
      : [existing];
    const currentOwnerIds = new Set(siblings.map((s) => s.ownerId));
    const distinctDates = Array.from(
      new Set(siblings.map((s) => s.date.toISOString().slice(0, 10)))
    );

    // Ownership is a whole-group membership question: removing someone
    // drops every row they had in this group — including the row just
    // edited, if that's the one being removed — and adding someone creates
    // a row for them on every date already in the group.
    const toRemoveIds = siblings.filter((s) => !desiredOwnerIds.includes(s.ownerId)).map((s) => s.id);
    const toUpdateIds = siblings
      .filter((s) => s.id !== id && !toRemoveIds.includes(s.id))
      .map((s) => s.id);
    const toAddOwnerIds = desiredOwnerIds.filter((oid) => !currentOwnerIds.has(oid));

    if (toRemoveIds.length > 0) {
      await prisma.event.deleteMany({ where: { id: { in: toRemoveIds } } });
    }
    if (toUpdateIds.length > 0) {
      await prisma.event.updateMany({ where: { id: { in: toUpdateIds } }, data: sharedFields });
    }
    if (toAddOwnerIds.length > 0) {
      // A legacy row with no eventGroupId yet becomes the head of a new
      // group as soon as it needs to be shared with anyone else.
      const eventGroupId = existing.eventGroupId ?? randomUUID();
      if (!existing.eventGroupId && !toRemoveIds.includes(id)) {
        await prisma.event.update({ where: { id }, data: { eventGroupId } });
      }
      await prisma.event.createMany({
        data: toAddOwnerIds.flatMap((ownerId) =>
          distinctDates.map((dateStr) => ({
            ...sharedFields,
            date: parseDate(dateStr),
            ownerId,
            createdById: user.id,
            eventGroupId,
          }))
        ),
      });
    }
  } else {
    const applyToBatch = formData.get("applyToBatch") === "1";
    if (applyToBatch && existing.eventGroupId) {
      // Members can only bulk-edit their own sibling rows (e.g. their own
      // event repeated across several set dates) — not other people's.
      await prisma.event.updateMany({
        where: { eventGroupId: existing.eventGroupId, id: { not: id }, ownerId: user.id },
        data: sharedFields,
      });
    }
  }

  revalidatePath("/week");
  return undefined;
}

export async function deleteEvent(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) return;
  if (existing.ownerId !== user.id && user.role !== "ADMIN") return;

  const scope = String(formData.get("scope") ?? "");
  if (scope === "group" && existing.eventGroupId && user.role === "ADMIN") {
    await prisma.event.deleteMany({ where: { eventGroupId: existing.eventGroupId } });
  } else {
    await prisma.event.delete({ where: { id } });
  }
  revalidatePath("/week");
}
