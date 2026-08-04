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
