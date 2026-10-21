import { isKingTideWindow } from "../data/king-tides";
import type { FloodAssessment, Neighborhood, TideEvent } from "../types";

const MINOR_COASTAL_FLOOD_FT = 1.8;

export function assessFlood(input: {
  place: Neighborhood;
  now: Date;
  timeZone?: string;
  next6hPrecipIn: number;
  thunderLikely: boolean;
  tides: TideEvent[];
}): FloodAssessment {
  const timeZone = input.timeZone ?? "America/New_York";
  const kingTide = isKingTideWindow(input.now, timeZone);
  const nextHigh =
    input.tides
      .filter((t) => t.type === "H" && t.time.getTime() >= input.now.getTime() - 30 * 60 * 1000)
      .sort((a, b) => a.time.getTime() - b.time.getTime())[0] ?? null;

  let score = 0;
  const reasons: string[] = [];

  if (input.place.flood === "high") {
    score += 22;
    reasons.push(`${input.place.name} sits in a high sunny-day flood corridor.`);
  } else if (input.place.flood === "moderate") {
    score += 10;
    reasons.push("Neighborhood drainage can back up in a heavy cell.");
  }

  if (input.place.coast !== "inland") {
    score += 8;
    reasons.push("Bay or Atlantic water can push into streets near high tide.");
  }

  if (kingTide) {
    score += 24;
    reasons.push("A published king-tide window is active. Saltwater can rise with a clear sky.");
  }

  if (nextHigh && nextHigh.heightFt >= MINOR_COASTAL_FLOOD_FT) {
    score += 18;
    reasons.push(`Next high tide is ${nextHigh.heightFt.toFixed(1)} ft, near minor flood levels.`);
  } else if (nextHigh && nextHigh.heightFt >= 1.4) {
    score += 8;
    reasons.push(`Next high tide is ${nextHigh.heightFt.toFixed(1)} ft.`);
  }

  if (input.next6hPrecipIn >= 1) {
    score += 28;
    reasons.push("More than an inch of rain is possible in the next six hours.");
  } else if (input.next6hPrecipIn >= 0.4) {
    score += 16;
    reasons.push("A soaking pulse is on the clock. Streets can pond faster than drains clear.");
  } else if (input.next6hPrecipIn >= 0.15) {
    score += 8;
    reasons.push("A lighter rain band can still flood dips if it stalls.");
  }

  if (input.thunderLikely && input.next6hPrecipIn >= 0.1) {
    score += 10;
    reasons.push("Thunderstorm cores dump rain in a tight footprint.");
  }

  if (kingTide && input.next6hPrecipIn >= 0.2) {
    score += 12;
    reasons.push("Tide plus rain is the South Florida compound-flood stack.");
  }

  const level = score >= 70 ? "severe" : score >= 45 ? "high" : score >= 25 ? "moderate" : "low";
  if (reasons.length === 0) reasons.push("No strong flood signal in the next tide and rain cycle.");

  return { level, score: Math.min(100, score), reasons, nextHigh, kingTide };
}
