import "server-only";
import ical, { type CalendarResponse } from "node-ical";
import { prisma } from "@/lib/db";

const WINDOW_PAST_DAYS = 30;
const WINDOW_FUTURE_DAYS = 366;
const FETCH_TIMEOUT_MS = 20_000;

function normalizeUrl(url: string): string {
  if (url.startsWith("webcal://")) {
    return `https://${url.slice("webcal://".length)}`;
  }
  return url;
}

function partsInZone(date: Date, tz: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value])
  ) as Record<string, string>;
  if (parts.hour === "24") parts.hour = "00";
  return parts;
}

function dateKeyInZone(date: Date, tz: string): string {
  const p = partsInZone(date, tz);
  return `${p.year}-${p.month}-${p.day}`;
}

function timeInZone(date: Date, tz: string): string {
  const p = partsInZone(date, tz);
  return `${p.hour}:${p.minute}`;
}

export type SyncResult = { ok: boolean; count?: number; error?: string };

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Timed out fetching calendar")), ms);
    }),
  ]);
}

export async function syncCalendarSubscription(subscriptionId: string): Promise<SyncResult> {
  const subscription = await prisma.calendarSubscription.findUnique({
    where: { id: subscriptionId },
  });
  if (!subscription) {
    return { ok: false, error: "Subscription not found." };
  }

  try {
    const url = normalizeUrl(subscription.url);
    const parsed: CalendarResponse = await withTimeout(
      ical.async.fromURL(url),
      FETCH_TIMEOUT_MS
    );

    const now = new Date();
    const from = new Date(now.getTime() - WINDOW_PAST_DAYS * 24 * 60 * 60 * 1000);
    const to = new Date(now.getTime() + WINDOW_FUTURE_DAYS * 24 * 60 * 60 * 1000);

    const seenUids = new Set<string>();
    const upserts: Promise<unknown>[] = [];

    for (const component of Object.values(parsed)) {
      if (!component || component.type !== "VEVENT") continue;

      let instances;
      try {
        instances = ical.expandRecurringEvent(component, { from, to });
      } catch {
        continue;
      }

      for (const instance of instances) {
        if (instance.event.status === "CANCELLED") continue;

        const externalUid = `${instance.event.uid}::${instance.start.toISOString()}`;
        seenUids.add(externalUid);

        const tz = instance.start.tz || "UTC";
        const title = String(instance.summary ?? "").trim() || "Untitled event";
        const notes = instance.event.description
          ? String(instance.event.description).trim() || null
          : null;

        const dateStr = dateKeyInZone(instance.start, tz);
        const startTime = instance.isFullDay ? "00:00" : timeInZone(instance.start, tz);
        const endTime =
          !instance.isFullDay && instance.end ? timeInZone(instance.end, tz) : null;

        upserts.push(
          prisma.event.upsert({
            where: { subscriptionId_externalUid: { subscriptionId, externalUid } },
            update: {
              title,
              notes,
              date: new Date(`${dateStr}T12:00:00`),
              startTime,
              endTime,
            },
            create: {
              title,
              notes,
              date: new Date(`${dateStr}T12:00:00`),
              startTime,
              endTime,
              ownerId: subscription.ownerId,
              createdById: subscription.ownerId,
              subscriptionId,
              externalUid,
            },
          })
        );
      }
    }

    await Promise.all(upserts);

    // Only clean up stale occurrences if we actually saw something this
    // sync — an empty result is more likely a transient fetch hiccup than
    // a genuinely emptied feed, and we don't want to wipe out events on it.
    if (seenUids.size > 0) {
      await prisma.event.deleteMany({
        where: { subscriptionId, externalUid: { notIn: Array.from(seenUids) } },
      });
    }

    await prisma.calendarSubscription.update({
      where: { id: subscriptionId },
      data: { lastSyncedAt: new Date(), lastSyncStatus: "ok", lastSyncError: null },
    });

    return { ok: true, count: seenUids.size };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.calendarSubscription.update({
      where: { id: subscriptionId },
      data: {
        lastSyncedAt: new Date(),
        lastSyncStatus: "error",
        lastSyncError: message.slice(0, 500),
      },
    });
    return { ok: false, error: message };
  }
}

export async function syncAllSubscriptions(): Promise<{ total: number; ok: number; failed: number }> {
  const subscriptions = await prisma.calendarSubscription.findMany({ select: { id: true } });
  let ok = 0;
  let failed = 0;
  for (const sub of subscriptions) {
    const result = await syncCalendarSubscription(sub.id);
    if (result.ok) ok++;
    else failed++;
  }
  return { total: subscriptions.length, ok, failed };
}
