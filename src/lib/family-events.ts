import "server-only";
import { addDays, isAfter, isBefore, isSameDay, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { dateKey, formatDayLabel, getWeekDays, getWeekStart } from "@/lib/week";

export type RecurrenceType = "NONE" | "DAILY" | "WEEKLY" | "CUSTOM_DAYS";

export type EventWithOwner = {
  id: string;
  title: string;
  notes: string | null;
  startTime: string;
  endTime: string | null;
  isReminder: boolean;
  ownerId: string;
  ownerName: string;
  ownerColor: string;
  recurring: boolean;
  anchorDate: string;
  recurrenceType: RecurrenceType;
  recurrenceDays: number[];
  recurrenceEndDate: string | null;
  // Sibling rows of this same event — created by expanding it across family
  // members and/or a date range — share an eventGroupId. eventGroupSize is
  // how many rows are in that group (including this one) — 1 if it wasn't
  // expanded. groupOwnerIds is the distinct set of owners currently in the
  // group (a group can span several dates for the same owner, so this can
  // be shorter than eventGroupSize).
  eventGroupId: string | null;
  eventGroupSize: number;
  groupOwnerIds: string[];
};

export type DayBucket = {
  date: Date;
  key: string;
  label: string;
  events: EventWithOwner[];
};

type RecurrenceRule = {
  date: Date;
  recurrenceType: RecurrenceType;
  recurrenceDays: number[];
  recurrenceEndDate: Date | null;
};

function eventOccursOn(event: RecurrenceRule, target: Date): boolean {
  const anchor = startOfDay(event.date);
  const day = startOfDay(target);

  if (isBefore(day, anchor)) return false;
  if (event.recurrenceEndDate && isAfter(day, startOfDay(event.recurrenceEndDate))) {
    return false;
  }

  switch (event.recurrenceType) {
    case "NONE":
      return isSameDay(day, anchor);
    case "DAILY":
      return true;
    case "WEEKLY":
      return day.getDay() === anchor.getDay();
    case "CUSTOM_DAYS":
      return event.recurrenceDays.includes(day.getDay());
  }
}

export type SearchResult = {
  id: string;
  title: string;
  ownerName: string;
  ownerColor: string;
  dateLabel: string;
  weekStartIso: string;
  startTime: string;
  isReminder: boolean;
  recurring: boolean;
};

export async function searchEvents(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const events = await prisma.event.findMany({
    where: { title: { contains: trimmed, mode: "insensitive" } },
    orderBy: { date: "asc" },
    take: 20,
    include: { owner: { select: { name: true, color: true } } },
  });

  return events.map((event) => ({
    id: event.id,
    title: event.title,
    ownerName: event.owner.name,
    ownerColor: event.owner.color,
    dateLabel: formatDayLabel(event.date),
    weekStartIso: dateKey(getWeekStart(dateKey(event.date))),
    startTime: event.startTime,
    isReminder: event.isReminder,
    recurring: event.recurrenceType !== "NONE",
  }));
}

export async function getFamilyMembers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, color: true, role: true, photoUrl: true },
  });
}

export type UndoableBatch = { batchId: string | null; eventId: string; title: string; count: number };

// The current user's most recently created event(s), excluding anything
// pulled in by a calendar subscription sync — only events they created
// themselves (manually or via the text importer) are undoable.
export async function getLastUndoableBatch(userId: string): Promise<UndoableBatch | null> {
  const last = await prisma.event.findFirst({
    where: { createdById: userId, subscriptionId: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, batchId: true, title: true },
  });
  if (!last) return null;

  if (!last.batchId) {
    return { batchId: null, eventId: last.id, title: last.title, count: 1 };
  }

  const count = await prisma.event.count({
    where: { batchId: last.batchId, createdById: userId },
  });
  return { batchId: last.batchId, eventId: last.id, title: last.title, count };
}

export async function getWeekBuckets(weekStart: Date): Promise<DayBucket[]> {
  const days = getWeekDays(weekStart);
  const rangeEnd = addDays(weekStart, 7);

  const events = await prisma.event.findMany({
    where: {
      OR: [
        { recurrenceType: "NONE", date: { gte: days[0], lt: rangeEnd } },
        {
          AND: [
            { recurrenceType: { not: "NONE" } },
            { date: { lt: rangeEnd } },
            { OR: [{ recurrenceEndDate: null }, { recurrenceEndDate: { gte: days[0] } }] },
          ],
        },
      ],
    },
    orderBy: { startTime: "asc" },
    include: { owner: { select: { id: true, name: true, color: true } } },
  });

  const eventGroupIds = Array.from(
    new Set(events.map((e) => e.eventGroupId).filter((id): id is string => Boolean(id)))
  );
  const groupRows =
    eventGroupIds.length > 0
      ? await prisma.event.findMany({
          where: { eventGroupId: { in: eventGroupIds } },
          select: { eventGroupId: true, ownerId: true },
        })
      : [];
  const sizeByEventGroupId = new Map<string, number>();
  const ownerIdsByEventGroupId = new Map<string, string[]>();
  for (const row of groupRows) {
    const gid = row.eventGroupId as string;
    sizeByEventGroupId.set(gid, (sizeByEventGroupId.get(gid) ?? 0) + 1);
    const owners = ownerIdsByEventGroupId.get(gid) ?? [];
    if (!owners.includes(row.ownerId)) owners.push(row.ownerId);
    ownerIdsByEventGroupId.set(gid, owners);
  }

  const buckets: DayBucket[] = days.map((date) => ({
    date,
    key: dateKey(date),
    label: formatDayLabel(date),
    events: [],
  }));

  for (const event of events) {
    for (const bucket of buckets) {
      if (!eventOccursOn(event, bucket.date)) continue;
      bucket.events.push({
        id: event.id,
        title: event.title,
        notes: event.notes,
        startTime: event.startTime,
        endTime: event.endTime,
        isReminder: event.isReminder,
        ownerId: event.owner.id,
        ownerName: event.owner.name,
        ownerColor: event.owner.color,
        eventGroupId: event.eventGroupId,
        eventGroupSize: event.eventGroupId ? (sizeByEventGroupId.get(event.eventGroupId) ?? 1) : 1,
        groupOwnerIds: event.eventGroupId
          ? (ownerIdsByEventGroupId.get(event.eventGroupId) ?? [event.owner.id])
          : [event.owner.id],
        recurring: event.recurrenceType !== "NONE",
        anchorDate: dateKey(event.date),
        recurrenceType: event.recurrenceType as RecurrenceType,
        recurrenceDays: event.recurrenceDays,
        recurrenceEndDate: event.recurrenceEndDate ? dateKey(event.recurrenceEndDate) : null,
      });
    }
  }

  return buckets;
}
