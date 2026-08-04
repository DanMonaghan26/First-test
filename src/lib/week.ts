import { addDays, addWeeks, format, parseISO, startOfWeek } from "date-fns";

export const WEEK_STARTS_ON = 1; // Monday

export function getWeekStart(dateStr?: string | null): Date {
  const base = dateStr ? parseISO(dateStr) : new Date();
  return startOfWeek(base, { weekStartsOn: WEEK_STARTS_ON });
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function shiftWeek(weekStart: Date, delta: number): Date {
  return addWeeks(weekStart, delta);
}

export function shiftDay(dateStr: string, delta: number): Date {
  return addDays(parseISO(dateStr), delta);
}

export function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function formatDayLabel(date: Date): string {
  return format(date, "EEE d MMM");
}

export function formatWeekRangeLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  return `${format(weekStart, "d MMM")} – ${format(end, "d MMM yyyy")}`;
}
