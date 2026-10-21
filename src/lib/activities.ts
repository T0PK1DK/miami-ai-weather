import { heatIndexF } from "./heat";
import { isThunderCode, isWetCode } from "./wmo";
import type { ActivityId, ActivityScore, HourPoint, Neighborhood, RiskLevel } from "../types";

const LABELS: Record<ActivityId, string> = {
  beach: "Beach",
  run: "Run / ride",
  commute: "Commute",
  patio: "Patio / dining",
  boat: "Boat / paddle",
  kids: "Kids outdoors"
};

export function scoreActivities(input: {
  place: Neighborhood;
  now: Date;
  hours: HourPoint[];
  waveFt: number | null;
  aqi: number | null;
}): ActivityScore[] {
  const horizon = input.hours.filter((h) => h.time.getTime() >= input.now.getTime() - 30 * 60 * 1000).slice(0, 16);
  const ids: ActivityId[] = ["beach", "run", "commute", "patio", "boat", "kids"];
  return ids.map((id) => scoreOne(id, input.place, horizon, input.waveFt, input.aqi));
}

function scoreOne(
  id: ActivityId,
  place: Neighborhood,
  hours: HourPoint[],
  waveFt: number | null,
  aqi: number | null
): ActivityScore {
  if (hours.length === 0) {
    return { id, label: LABELS[id], score: 50, level: "moderate", reasons: ["Need a forecast to score this."], bestWindow: null };
  }

  const hourScores = hours.map((h) => ({ hour: h, risk: hourRisk(id, place, h, waveFt, aqi) }));
  const near = hourScores.slice(0, 3);
  const avg = near.reduce((s, x) => s + x.risk.score, 0) / near.length;
  const reasons = unique(near.flatMap((x) => x.risk.reasons)).slice(0, 3);
  const window = bestWindow(hourScores);
  return {
    id,
    label: LABELS[id],
    score: Math.round(avg),
    level: levelFromScore(avg),
    reasons,
    bestWindow: window
  };
}

function hourRisk(
  id: ActivityId,
  place: Neighborhood,
  hour: HourPoint,
  waveFt: number | null,
  aqi: number | null
): { score: number; reasons: string[] } {
  const hi = heatIndexF(hour.tempF, hour.humidity);
  const reasons: string[] = [];
  let score = 8;

  if (isThunderCode(hour.weatherCode) || (hour.cape >= 1500 && hour.pop >= 40)) {
    score += 40;
    reasons.push("Lightning risk in this hour.");
  } else if (hour.pop >= 60 || hour.precipIn >= 0.15 || isWetCode(hour.weatherCode)) {
    score += 22;
    reasons.push("Rain is likely.");
  } else if (hour.pop >= 35) {
    score += 10;
    reasons.push("A shower could sneak through.");
  }

  if (id === "beach" || id === "boat" || id === "kids") {
    if (hour.uv >= 8) {
      score += 16;
      reasons.push("UV is harsh.");
    } else if (hour.uv >= 6) {
      score += 8;
    }
  }

  if (id === "run" || id === "kids" || id === "beach") {
    if (hi >= 105) {
      score += 28;
      reasons.push("Heat index is in the danger band.");
    } else if (hi >= 95) {
      score += 16;
      reasons.push("Heat will cut into stamina.");
    }
  }

  if (id === "commute") {
    if (hour.visibilityMi > 0 && hour.visibilityMi < 2) {
      score += 18;
      reasons.push("Visibility drops in this hour.");
    }
    if (hour.precipIn >= 0.25) {
      score += 12;
      reasons.push("Ponding can slow surface streets.");
    }
  }

  if (id === "boat") {
    if (hour.windMph >= 20 || hour.gustMph >= 28) {
      score += 24;
      reasons.push("Wind is too lively for a casual outing.");
    }
    if (waveFt !== null && waveFt >= 4) {
      score += 16;
      reasons.push("Seas are building.");
    }
  }

  if (id === "beach") {
    if (place.coast === "inland") {
      score += 6;
      reasons.push("This pin is inland — check the Atlantic beaches separately.");
    }
    if (hour.windMph >= 18 && place.coast === "atlantic") {
      score += 12;
      reasons.push("Fresh onshore flow can raise rip risk.");
    }
  }

  if (id === "patio" && hi >= 100) {
    score += 10;
    reasons.push("Shade and water if you sit outside.");
  }

  if (aqi !== null && aqi >= 101 && (id === "run" || id === "kids")) {
    score += 14;
    reasons.push("Air quality is unhealthy for sensitive groups.");
  }

  return { score: Math.min(100, score), reasons };
}

function bestWindow(
  hourScores: Array<{ hour: HourPoint; risk: { score: number; reasons: string[] } }>
): { start: Date; end: Date; reason: string } | null {
  let best: { start: Date; end: Date; reason: string; avg: number } | null = null;
  for (let i = 0; i < hourScores.length; i += 1) {
    const slice = hourScores.slice(i, i + 3).filter((item, idx, arr) => {
      if (idx === 0) return true;
      const prev = arr[idx - 1]!;
      return item.hour.time.getTime() - prev.hour.time.getTime() <= 90 * 60 * 1000;
    });
    if (slice.length < 2) continue;
    const avg = slice.reduce((s, x) => s + x.risk.score, 0) / slice.length;
    const start = slice[0]!.hour.time;
    const end = new Date(slice[slice.length - 1]!.hour.time.getTime() + 60 * 60 * 1000);
    if (!best || avg < best.avg) {
      best = { start, end, avg, reason: avg < 25 ? "Quietest stretch on the clock." : "Least-bad window in the next hours." };
    }
  }
  return best ? { start: best.start, end: best.end, reason: best.reason } : null;
}

function levelFromScore(score: number): RiskLevel {
  if (score >= 70) return "severe";
  if (score >= 45) return "high";
  if (score >= 25) return "moderate";
  return "low";
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}
