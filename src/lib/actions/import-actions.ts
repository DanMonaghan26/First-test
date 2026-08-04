"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { extractEventsFromInput, type ExtractedEvent } from "@/lib/event-extraction";

export type ExtractState =
  | { error: string }
  | { events: ExtractedEvent[] }
  | undefined;

export async function extractEvents(
  _prevState: ExtractState,
  formData: FormData
): Promise<ExtractState> {
  await requireUser();

  const input = String(formData.get("text") ?? "").trim();
  if (!input) {
    return { error: "Paste some text or a URL first." };
  }

  const result = await extractEventsFromInput(input);
  if (!result.ok) {
    return { error: result.error };
  }
  return { events: result.events };
}

export type ImportRow = {
  title: string;
  date: string; // YYYY-MM-DD
  endDate: string | null;
  allDay: boolean;
  startTime: string;
  endTime: string | null;
  ownerIds: string[];
};

function datesInRange(start: string, end: string | null): string[] {
  if (!end || end === start) return [start];
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
    return [start];
  }

  const dates: string[] = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export type SaveState = { error: string } | { count: number } | undefined;

export async function saveImportedEvents(
  _prevState: SaveState,
  formData: FormData
): Promise<SaveState> {
  let rows: ImportRow[];
  try {
    rows = JSON.parse(String(formData.get("rows") ?? "[]"));
  } catch {
    return { error: "Something went wrong reading those events — please try again." };
  }

  const result = await createImportedEvents(rows);
  if (!result.ok) {
    return { error: result.error };
  }
  return { count: result.count };
}

async function createImportedEvents(
  rows: ImportRow[]
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const user = await requireUser();

  const cleanRows = rows.filter(
    (r) => r.title.trim() && /^\d{4}-\d{2}-\d{2}$/.test(r.date) && r.ownerIds.length > 0
  );
  if (cleanRows.length === 0) {
    return {
      ok: false,
      error: "Nothing to add — each event needs a title, date, and at least one calendar selected.",
    };
  }

  if (user.role !== "ADMIN") {
    const onlySelf = cleanRows.every((r) => r.ownerIds.every((id) => id === user.id));
    if (!onlySelf) {
      return { ok: false, error: "You can only add events to your own calendar." };
    }
  }

  const batchId = randomUUID();
  const data = cleanRows.flatMap((row) =>
    datesInRange(row.date, row.endDate).flatMap((dateStr) =>
      row.ownerIds.map((ownerId) => ({
        title: row.title.trim(),
        date: new Date(`${dateStr}T12:00:00`),
        startTime: row.allDay ? "00:00" : row.startTime || "00:00",
        endTime: row.allDay ? null : row.endTime || null,
        ownerId,
        createdById: user.id,
        batchId,
      }))
    )
  );

  await prisma.event.createMany({ data });

  revalidatePath("/week");
  // Report the number of reviewed rows the user added, not the number of
  // underlying database rows (a single row expands to one per day for a
  // date range, and one per selected family member).
  return { ok: true, count: cleanRows.length };
}
