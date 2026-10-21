/** Miami Beach / Miami-Dade published 2026 king-tide windows. Inclusive local dates. */
export const KING_TIDE_WINDOWS_2026: Array<{ start: string; end: string; peak?: string }> = [
  { start: "2026-08-11", end: "2026-08-14" },
  { start: "2026-09-08", end: "2026-09-15" },
  { start: "2026-09-24", end: "2026-09-30" },
  { start: "2026-10-07", end: "2026-10-13", peak: "2026-10-10" },
  { start: "2026-10-24", end: "2026-10-30", peak: "2026-10-26" },
  { start: "2026-11-06", end: "2026-11-09" },
  { start: "2026-11-22", end: "2026-11-29" },
  { start: "2026-12-22", end: "2026-12-27" }
];

export function localDateKey(date: Date, timeZone = "America/New_York"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function isKingTideWindow(date: Date, timeZone = "America/New_York"): boolean {
  const key = localDateKey(date, timeZone);
  return KING_TIDE_WINDOWS_2026.some((w) => key >= w.start && key <= w.end);
}

export function nextKingTideWindow(
  date: Date,
  timeZone = "America/New_York"
): { start: string; end: string; peak?: string } | null {
  const key = localDateKey(date, timeZone);
  return KING_TIDE_WINDOWS_2026.find((w) => w.end >= key) ?? null;
}

export const ATLANTIC_HURRICANE_SEASON = { startMonth: 6, startDay: 1, endMonth: 11, endDay: 30 };

export function isHurricaneSeason(date: Date, timeZone = "America/New_York"): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "numeric",
    day: "numeric"
  }).formatToParts(date);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  if (month > 6 && month < 11) return true;
  if (month === 6) return day >= 1;
  if (month === 11) return day <= 30;
  return false;
}
