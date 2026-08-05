import type { DayBucket } from "@/lib/family-events";

export const DEFAULT_START_HOUR = 7;
export const DEFAULT_END_HOUR = 21;

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function formatHourLabel(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const period = h < 12 ? "am" : "pm";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour}${period}`;
}

export function computeHourRange(
  events: DayBucket["events"]
): { startHour: number; endHour: number } {
  let startHour = DEFAULT_START_HOUR;
  let endHour = DEFAULT_END_HOUR;
  for (const event of events) {
    if (event.isReminder) continue;
    const startH = Math.floor(timeToMinutes(event.startTime) / 60);
    if (startH < startHour) startHour = startH;
    const endMinutes = event.endTime
      ? timeToMinutes(event.endTime)
      : timeToMinutes(event.startTime) + 30;
    const endH = Math.ceil(endMinutes / 60);
    if (endH > endHour) endHour = endH;
  }
  return { startHour: Math.max(0, startHour), endHour: Math.min(24, endHour) };
}

// Position + size (in px, along the hour axis) for a timed event block —
// shared by DayTimeGrid (portrait: this becomes top/height) and TvDayGrid
// (landscape: this becomes left/width). Each caller applies its own
// axis-appropriate minimum size on top of sizePx.
export function computeEventLayout(
  event: { startTime: string; endTime: string | null },
  startHour: number,
  unitPxPerHour: number
): { offsetPx: number; sizePx: number } {
  const startMin = timeToMinutes(event.startTime) - startHour * 60;
  const durationMin = event.endTime
    ? Math.max(timeToMinutes(event.endTime) - timeToMinutes(event.startTime), 15)
    : 30;
  return {
    offsetPx: (startMin / 60) * unitPxPerHour,
    sizePx: (durationMin / 60) * unitPxPerHour,
  };
}

// Whether/where to draw the "current time" line along the hour axis, for
// whichever day is being shown.
export function computeNowLine(
  dayKey: string,
  startHour: number,
  endHour: number,
  unitPxPerHour: number
): { show: boolean; positionPx: number } {
  const now = new Date();
  const isToday = now.toISOString().slice(0, 10) === dayKey;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return {
    show: isToday && nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60,
    positionPx: ((nowMinutes - startHour * 60) / 60) * unitPxPerHour,
  };
}
