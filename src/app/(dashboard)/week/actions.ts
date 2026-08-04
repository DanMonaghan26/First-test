"use server";

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

async function resolveOwnerId(
  formData: FormData,
  currentUser: { id: string; role: string }
): Promise<string> {
  const requestedOwnerId = formData.get("ownerId");
  if (currentUser.role === "ADMIN" && typeof requestedOwnerId === "string" && requestedOwnerId) {
    return requestedOwnerId;
  }
  return currentUser.id;
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
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "").trim();

  if (!title || !startTime) {
    return { error: "Please fill in a title and start time." };
  }

  const ownerId = await resolveOwnerId(formData, user);
  if (ownerId !== user.id && user.role !== "ADMIN") {
    return { error: "You can only add events to your own calendar." };
  }

  const setDates = formData.getAll("dates").map((v) => String(v).trim()).filter(Boolean);

  if (setDates.length > 0) {
    await prisma.event.createMany({
      data: setDates.map((dateStr) => ({
        title,
        notes: notes || null,
        date: parseDate(dateStr),
        startTime,
        endTime: endTime || null,
        ownerId,
        createdById: user.id,
      })),
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

  await prisma.event.create({
    data: {
      title,
      notes: notes || null,
      date: parseDate(date),
      startTime,
      endTime: endTime || null,
      ownerId,
      createdById: user.id,
      recurrenceType,
      recurrenceDays,
      recurrenceEndDate,
    },
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
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "").trim();

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

  await prisma.event.update({
    where: { id },
    data: {
      title,
      notes: notes || null,
      date: parseDate(date),
      startTime,
      endTime: endTime || null,
      recurrenceType,
      recurrenceDays,
      recurrenceEndDate,
    },
  });

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

  await prisma.event.delete({ where: { id } });
  revalidatePath("/week");
}
