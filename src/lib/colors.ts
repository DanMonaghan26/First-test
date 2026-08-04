export const RAINBOW_COLORS = [
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Yellow" },
  { value: "#22c55e", label: "Green" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#6366f1", label: "Indigo" },
  { value: "#a855f7", label: "Violet" },
] as const;

export function pickAvailableColor(usedColors: string[]): string {
  const available = RAINBOW_COLORS.filter((c) => !usedColors.includes(c.value));
  return (available[0] ?? RAINBOW_COLORS[0]).value;
}
