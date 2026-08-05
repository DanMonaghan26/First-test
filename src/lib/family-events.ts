import "server-only";
import { addDays, isAfter, isBefore, isSameDay, startOfDay, subDays } from "date-fns";
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
  // be shorter than eventGroupSize). ownerGroupSize is how many of those
  // rows belong to this row's own owner specifically — lets a non-admin
  // bulk-delete just their own occurrences of a shared/multi-date event
  // without touching anyone else's copies.
  eventGroupId: string | null;
  eventGroupSize: number;
  groupOwnerIds: string[];
  ownerGroupSize: number;
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
    where: { title: { contains: trimmed, mode: "insensitive" }, deletedAt: null },
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

export type MinimalDayEvent = {
  id: string;
  title: string;
  startTime: string;
  endTime: string | null;
  isReminder: boolean;
  ownerId: string;
  notes: string | null;
};

// A cheap version of getWeekBuckets for a single day, for callers (like the
// TV/display live-refresh check) that only need to know whether that day's
// events changed — not the full week, not eventGroupId sizes/owners, and no
// owner join.
export async function getMinimalEventsForDay(dayKey: string): Promise<MinimalDayEvent[]> {
  const dayStart = startOfDay(new Date(`${dayKey}T12:00:00`));
  const dayEnd = addDays(dayStart, 1);

  const events = await prisma.event.findMany({
    where: {
      deletedAt: null,
      OR: [
        { recurrenceType: "NONE", date: { gte: dayStart, lt: dayEnd } },
        {
          AND: [
            { recurrenceType: { not: "NONE" } },
            { date: { lt: dayEnd } },
            { OR: [{ recurrenceEndDate: null }, { recurrenceEndDate: { gte: dayStart } }] },
          ],
        },
      ],
    },
    select: {
      id: true,
      title: true,
      startTime: true,
      endTime: true,
      isReminder: true,
      ownerId: true,
      notes: true,
      date: true,
      recurrenceType: true,
      recurrenceDays: true,
      recurrenceEndDate: true,
    },
  });

  return events.filter((e) => eventOccursOn(e, dayStart)).map((e) => ({
    id: e.id,
    title: e.title,
    startTime: e.startTime,
    endTime: e.endTime,
    isReminder: e.isReminder,
    ownerId: e.ownerId,
    notes: e.notes,
  }));
}

export type UndoableAction =
  | { kind: "add"; title: string; count: number }
  | { kind: "delete"; title: string; count: number };

// The current user's most recent undoable action — whichever of "the last
// thing they added" or "the last thing they deleted" happened more
// recently. Subscription-synced events are excluded from the add side
// (never manually created); a soft-deleted row is excluded from the add
// side too, since there's nothing left there to undo an add of — only the
// delete side applies to it.
export async function getLastUndoableAction(userId: string): Promise<UndoableAction | null> {
  const [lastAdded, lastDeleted] = await Promise.all([
    prisma.event.findFirst({
      where: { createdById: userId, subscriptionId: null, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { batchId: true, title: true, createdAt: true },
    }),
    prisma.event.findFirst({
      where: { deletedById: userId, deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      select: { deleteBatchId: true, title: true, deletedAt: true },
    }),
  ]);

  const addTime = lastAdded?.createdAt.getTime() ?? -1;
  const deleteTime = lastDeleted?.deletedAt?.getTime() ?? -1;

  if (lastDeleted && deleteTime > addTime) {
    const count = await prisma.event.count({
      where: { deleteBatchId: lastDeleted.deleteBatchId, deletedById: userId },
    });
    return { kind: "delete", title: lastDeleted.title, count };
  }

  if (lastAdded) {
    const count = lastAdded.batchId
      ? await prisma.event.count({
          where: { batchId: lastAdded.batchId, createdById: userId, deletedAt: null },
        })
      : 1;
    return { kind: "add", title: lastAdded.title, count };
  }

  return null;
}

const DELETE_RETENTION_DAYS = 7;

// Permanently removes soft-deleted rows past their retention window — run
// daily via a cron route, not on the request path. Deliberately generous
// (a week) since noticing you need something back can take a few days on
// a family calendar, and until purged it costs nothing but disk.
export async function purgeOldDeletedEvents(): Promise<{ purged: number }> {
  const cutoff = subDays(new Date(), DELETE_RETENTION_DAYS);
  const result = await prisma.event.deleteMany({
    where: { deletedAt: { lt: cutoff } },
  });
  return { purged: result.count };
}

export async function getWeekBuckets(weekStart: Date): Promise<DayBucket[]> {
  const days = getWeekDays(weekStart);
  const rangeEnd = addDays(weekStart, 7);

  const events = await prisma.event.findMany({
    where: {
      deletedAt: null,
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
          where: { eventGroupId: { in: eventGroupIds }, deletedAt: null },
          select: { eventGroupId: true, ownerId: true },
        })
      : [];
  const sizeByEventGroupId = new Map<string, number>();
  const ownerIdsByEventGroupId = new Map<string, string[]>();
  const sizeByGroupOwner = new Map<string, number>();
  for (const row of groupRows) {
    const gid = row.eventGroupId as string;
    sizeByEventGroupId.set(gid, (sizeByEventGroupId.get(gid) ?? 0) + 1);
    const owners = ownerIdsByEventGroupId.get(gid) ?? [];
    if (!owners.includes(row.ownerId)) owners.push(row.ownerId);
    ownerIdsByEventGroupId.set(gid, owners);
    const ownerKey = `${gid}::${row.ownerId}`;
    sizeByGroupOwner.set(ownerKey, (sizeByGroupOwner.get(ownerKey) ?? 0) + 1);
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
        ownerGroupSize: event.eventGroupId
          ? (sizeByGroupOwner.get(`${event.eventGroupId}::${event.owner.id}`) ?? 1)
          : 1,
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
