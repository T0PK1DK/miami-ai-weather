import { formatHour } from "./format";

const WET_IN = 0.01;
const HORIZON_MS = 6 * 60 * 60 * 1000;

export type RainHour = {
  time: Date;
  precipIn: number;
  pop: number;
  wet: boolean;
};

export type RainClock = {
  rainingNow: boolean;
  nextStart: Date | null;
  nextEnd: Date | null;
  peakIn: number;
  hours: RainHour[];
  summary: string;
};

/**
 * Next-few-hours rain clock from the 15-minute Open-Meteo nowcast,
 * falling back to hourly amounts when the nowcast is empty or stale.
 */
export function rainClock(
  nowcast: Array<{ time: Date; precipIn: number }>,
  hours: Array<{ time: Date; precipIn: number; pop: number }>,
  now: Date,
  timeZone: string
): RainClock {
  const horizon = now.getTime() + HORIZON_MS;
  const minuteHours = foldNowcast(nowcast, now, horizon);
  const series = minuteHours.length > 0 ? minuteHours : foldHours(hours, now, horizon);
  const rainingNow = series[0]?.wet ?? false;
  const nextStart = series.find((h) => h.wet)?.time ?? null;
  const nextEnd = findEnd(series, rainingNow);
  const peakIn = series.reduce((m, h) => Math.max(m, h.precipIn), 0);

  return {
    rainingNow,
    nextStart,
    nextEnd,
    peakIn,
    hours: series,
    summary: summarize(series, rainingNow, nextStart, nextEnd, timeZone)
  };
}

function foldNowcast(
  points: Array<{ time: Date; precipIn: number }>,
  now: Date,
  horizon: number
): RainHour[] {
  const upcoming = points.filter((p) => p.time.getTime() >= now.getTime() - 10 * 60 * 1000 && p.time.getTime() <= horizon);
  if (upcoming.length === 0) return [];
  const buckets = new Map<number, { time: Date; precipIn: number }>();
  for (const p of upcoming) {
    const key = Math.floor(p.time.getTime() / 3_600_000);
    const prev = buckets.get(key);
    if (!prev) buckets.set(key, { time: p.time, precipIn: p.precipIn });
    else buckets.set(key, { time: prev.time, precipIn: prev.precipIn + p.precipIn });
  }
  return [...buckets.values()]
    .sort((a, b) => a.time.getTime() - b.time.getTime())
    .slice(0, 6)
    .map((b) => ({ time: b.time, precipIn: round3(b.precipIn), pop: b.precipIn >= WET_IN ? 80 : 10, wet: b.precipIn >= WET_IN }));
}

function foldHours(
  hours: Array<{ time: Date; precipIn: number; pop: number }>,
  now: Date,
  horizon: number
): RainHour[] {
  return hours
    .filter((h) => h.time.getTime() >= now.getTime() - 30 * 60 * 1000 && h.time.getTime() <= horizon)
    .slice(0, 6)
    .map((h) => ({
      time: h.time,
      precipIn: h.precipIn,
      pop: h.pop,
      wet: h.precipIn >= WET_IN || h.pop >= 50
    }));
}

function findEnd(series: RainHour[], rainingNow: boolean): Date | null {
  if (!rainingNow) {
    const start = series.findIndex((h) => h.wet);
    if (start < 0) return null;
    const dry = series.slice(start + 1).find((h) => !h.wet);
    return dry?.time ?? null;
  }
  return series.find((h) => !h.wet)?.time ?? null;
}

function summarize(
  series: RainHour[],
  rainingNow: boolean,
  nextStart: Date | null,
  nextEnd: Date | null,
  timeZone: string
): string {
  if (series.length === 0) return "No short-range rain timing in this snapshot.";
  if (!nextStart) {
    const last = series[series.length - 1]!;
    return `Dry through ${formatHour(last.time, timeZone)}.`;
  }
  if (rainingNow && nextEnd) {
    return `Rain is on now. It looks like it eases around ${formatHour(nextEnd, timeZone)}.`;
  }
  if (rainingNow) {
    return "Rain is on now and still on the clock for the next few hours.";
  }
  if (nextEnd) {
    return `Rain looks likely around ${formatHour(nextStart, timeZone)}, easing after ${formatHour(nextEnd, timeZone)}.`;
  }
  return `Rain looks likely around ${formatHour(nextStart, timeZone)}.`;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
