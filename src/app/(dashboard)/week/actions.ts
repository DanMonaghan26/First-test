"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export type ActionState = { error?: string } | undefined;

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

export async function createEvent(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "").trim();

  if (!title || !date || !startTime) {
    return { error: "Please fill in a title, date, and start time." };
  }

  const ownerId = await resolveOwnerId(formData, user);
  if (ownerId !== user.id && user.role !== "ADMIN") {
    return { error: "You can only add events to your own calendar." };
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

  await prisma.event.update({
    where: { id },
    data: {
      title,
      notes: notes || null,
      date: parseDate(date),
      startTime,
      endTime: endTime || null,
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
