import "server-only";
import { addDays } from "date-fns";
import { prisma } from "@/lib/db";
import { dateKey, formatDayLabel, getWeekDays } from "@/lib/week";

export type EventWithOwner = {
  id: string;
  title: string;
  notes: string | null;
  startTime: string;
  endTime: string | null;
  ownerId: string;
  ownerName: string;
  ownerColor: string;
};

export type DayBucket = {
  date: Date;
  key: string;
  label: string;
  events: EventWithOwner[];
};

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
    where: { date: { gte: days[0], lt: rangeEnd } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    include: { owner: { select: { id: true, name: true, color: true } } },
  });

  const buckets: DayBucket[] = days.map((date) => ({
    date,
    key: dateKey(date),
    label: formatDayLabel(date),
    events: [],
  }));

  const bucketByKey = new Map(buckets.map((b) => [b.key, b]));

  for (const event of events) {
    const key = dateKey(event.date);
    const bucket = bucketByKey.get(key);
    if (!bucket) continue;
    bucket.events.push({
      id: event.id,
      title: event.title,
      notes: event.notes,
      startTime: event.startTime,
      endTime: event.endTime,
      ownerId: event.owner.id,
      ownerName: event.owner.name,
      ownerColor: event.owner.color,
    });
  }

  return buckets;
}
