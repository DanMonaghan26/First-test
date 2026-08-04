import "server-only";
import { addDays, isAfter, isBefore, isSameDay, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { dateKey, formatDayLabel, getWeekDays } from "@/lib/week";

export type RecurrenceType = "NONE" | "DAILY" | "WEEKLY" | "CUSTOM_DAYS";

export type EventWithOwner = {
  id: string;
  title: string;
  notes: string | null;
  startTime: string;
  endTime: string | null;
  ownerId: string;
  ownerName: string;
  ownerColor: string;
  recurring: boolean;
  anchorDate: string;
  recurrenceType: RecurrenceType;
  recurrenceDays: number[];
  recurrenceEndDate: string | null;
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

export async function getFamilyMembers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, color: true, role: true },
  });
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
        ownerId: event.owner.id,
        ownerName: event.owner.name,
        ownerColor: event.owner.color,
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
