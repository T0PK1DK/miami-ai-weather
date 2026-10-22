import { isHurricaneSeason } from "../data/king-tides";

export type SeasonPhase = "off" | "early" | "peak" | "late";

export type SeasonStatus = {
  open: boolean;
  phase: SeasonPhase;
  label: string;
  daysLeft: number | null;
  note: string;
};

/** NHC climatology: peak is mid-August through mid-October. */
const PEAK_START = { month: 8, day: 15 };
const PEAK_END = { month: 10, day: 15 };

export function hurricaneSeasonStatus(date: Date, timeZone = "America/New_York"): SeasonStatus {
  const open = isHurricaneSeason(date, timeZone);
  const parts = localParts(date, timeZone);
  const md = parts.month * 100 + parts.day;

  if (!open) {
    return {
      open: false,
      phase: "off",
      label: "Atlantic hurricane season is closed",
      daysLeft: null,
      note: "The Atlantic season runs June 1–November 30. NHC is still the source of truth if a rare off-season system forms."
    };
  }

  const daysLeft = daysUntil(parts, { month: 11, day: 30 }, timeZone);
  if (md < PEAK_START.month * 100 + PEAK_START.day) {
    return {
      open: true,
      phase: "early",
      label: "Early Atlantic hurricane season",
      daysLeft,
      note: "Season is open. Peak climatology usually arrives after mid-August."
    };
  }
  if (md <= PEAK_END.month * 100 + PEAK_END.day) {
    return {
      open: true,
      phase: "peak",
      label: "Peak Atlantic hurricane season",
      daysLeft,
      note: "Mid-August to mid-October is the climatological peak. Named storms and NWS Miami alerts stay at the top."
    };
  }
  return {
    open: true,
    phase: "late",
    label: "Late Atlantic hurricane season",
    daysLeft,
    note: "Past the mid-October peak, but the basin stays open through November 30. Keep an eye on NHC."
  };
}

function localParts(date: Date, timeZone: string): { year: number; month: number; day: number } {
  const bag = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric"
  }).formatToParts(date);
  const pick = (type: string) => Number(bag.find((p) => p.type === type)?.value ?? 0);
  return { year: pick("year"), month: pick("month"), day: pick("day") };
}

function daysUntil(
  from: { year: number; month: number; day: number },
  target: { month: number; day: number },
  timeZone: string
): number {
  const start = Date.UTC(from.year, from.month - 1, from.day);
  const end = Date.UTC(from.year, target.month - 1, target.day);
  void timeZone;
  return Math.max(0, Math.round((end - start) / 86_400_000));
}
