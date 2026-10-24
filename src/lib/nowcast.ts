import { formatHour } from "./format";

export function describeNowcast(
  points: Array<{ time: Date; precipIn: number }>,
  now: Date,
  timeZone: string
): string | null {
  const upcoming = points
    .filter((p) => p.time.getTime() >= now.getTime() - 10 * 60 * 1000)
    .slice(0, 24);
  if (upcoming.length === 0) return null;

  const wet = upcoming.filter((p) => p.precipIn >= 0.01);
  if (wet.length === 0) {
    return "The 15-minute nowcast stays dry for the next few hours.";
  }

  const first = wet[0]!;
  const soon = first.time.getTime() - now.getTime() <= 20 * 60 * 1000;
  const amount = first.precipIn.toFixed(2);
  if (soon) {
    return `Rain is already on the 15-minute nowcast (${amount} in this step).`;
  }
  return `Rain shows on the nowcast around ${formatHour(first.time, timeZone)} (${amount} in).`;
}

export function dayRangeLayout(days: Array<{ lowF: number; highF: number }>): Array<{ left: number; width: number }> {
  if (days.length === 0) return [];
  const minLow = Math.min(...days.map((d) => d.lowF));
  const maxHigh = Math.max(...days.map((d) => d.highF));
  const span = Math.max(1, maxHigh - minLow);
  return days.map((d) => {
    const left = ((d.lowF - minLow) / span) * 100;
    const width = Math.max(10, ((d.highF - d.lowF) / span) * 100);
    return { left: Math.min(90, left), width: Math.min(100 - left, width) };
  });
}
