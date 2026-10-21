import { isHurricaneSeason, isKingTideWindow, nextKingTideWindow } from "../data/king-tides";
import { scoreActivities } from "./activities";
import { assessFlood } from "./flood";
import { heatCategory, heatIndexF } from "./heat";
import { uvCategory } from "./uv";
import { isThunderCode, wmoLabel } from "./wmo";
import type { AlertItem, Briefing, HourPoint, Neighborhood, StormItem, TideEvent } from "../types";

export type BriefingInput = {
  place: Neighborhood;
  now: Date;
  timeZone?: string;
  tempF: number;
  feelsF: number;
  humidity: number;
  weatherCode: number;
  windMph: number;
  hours: HourPoint[];
  alerts: AlertItem[];
  tides: TideEvent[];
  storms: StormItem[];
  aqi: number | null;
  waveFt: number | null;
  uvNow: number;
};

export function buildBriefing(input: BriefingInput): Briefing {
  const tz = input.timeZone ?? "America/New_York";
  const hour = localHour(input.now, tz);
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const hi = heatIndexF(input.tempF, input.humidity);
  const heat = heatCategory(hi);
  const uv = uvCategory(input.uvNow);
  const nextHours = upcoming(input.hours, input.now, 18);
  const stormHours = nextHours.filter(
    (h) => h.pop >= 40 || h.precipIn >= 0.05 || isThunderCode(h.weatherCode) || h.cape >= 1500
  );
  const afternoonStorms = stormHours.filter((h) => {
    const lh = localHour(h.time, tz);
    return lh >= 12 && lh <= 19;
  });
  const next6precip = nextHours.slice(0, 6).reduce((s, h) => s + h.precipIn, 0);
  const thunderLikely = stormHours.some((h) => isThunderCode(h.weatherCode) || h.cape >= 1800);
  const flood = assessFlood({
    place: input.place,
    now: input.now,
    timeZone: tz,
    next6hPrecipIn: next6precip,
    thunderLikely,
    tides: input.tides
  });
  const activities = scoreActivities({
    place: input.place,
    now: input.now,
    hours: input.hours,
    waveFt: input.waveFt,
    aqi: input.aqi
  });
  const king = isKingTideWindow(input.now, tz);
  const nextKing = nextKingTideWindow(input.now, tz);
  const season = isHurricaneSeason(input.now, tz);
  const fired: string[] = [];
  const sections: Array<{ title: string; body: string }> = [];
  const actions: string[] = [];

  const severe = input.alerts.filter((a) => /warning|emergency/i.test(a.event) || /extreme|severe/i.test(a.severity));
  if (severe.length) {
    fired.push("alert-lead");
    sections.push({
      title: "Official alert",
      body: `${severe[0]!.event}. ${severe[0]!.headline || "Follow NWS Miami guidance until it expires."}`
    });
    actions.push("Treat the National Weather Service alert as the source of truth.");
  }

  let headline: string;
  if (severe.length) {
    headline = `${severe[0]!.event} is in effect for the Miami area.`;
  } else if (thunderLikely && afternoonStorms.length) {
    fired.push("sea-breeze-storms");
    const start = afternoonStorms[0]!;
    headline = `${wmoLabel(input.weatherCode)} now. Storms look most likely after ${formatHour(start.time, tz)}.`;
  } else if (heat.level === "danger" || heat.level === "extreme-danger") {
    fired.push("heat-lead");
    headline = `Heat index near ${Math.round(hi)}° in ${input.place.name}. Pace outdoor time.`;
  } else if (king && flood.level !== "low") {
    fired.push("tide-lead");
    headline = `King-tide window plus ${wmoLabel(input.weatherCode).toLowerCase()} — watch low streets near high tide.`;
  } else {
    fired.push("fair-lead");
    headline = `${Math.round(input.tempF)}° and ${wmoLabel(input.weatherCode).toLowerCase()} in ${input.place.name}.`;
  }

  const summaryParts = [
    `Air is ${Math.round(input.tempF)}° (feels ${Math.round(Math.max(input.feelsF, hi))}°) with ${Math.round(input.humidity)}% humidity.`,
    stormHours.length
      ? `Rain chances cluster around ${listHours(stormHours.slice(0, 3), tz)}.`
      : "No strong rain signal in the next several hours.",
    heat.level === "comfortable" ? "Heat is manageable." : `${heat.label} on the heat index.`
  ];

  if (stormHours.length) {
    fired.push("precip-timing");
    sections.push({
      title: "Storm clock",
      body: afternoonStorms.length
        ? `The typical South Florida sea-breeze pattern is in play: quieter this morning, then towers after lunch. Highest chances ${listHours(afternoonStorms.slice(0, 4), tz)}. A pulse storm can still drop a street-flooding core in 20 minutes.`
        : `Showers are on the map ${listHours(stormHours.slice(0, 4), tz)}. Coverage looks more scattered than a washout.`
    });
    actions.push("If thunder is close, get off open water and out from under isolated trees.");
  }

  if (heat.level !== "comfortable") {
    fired.push("heat-section");
    sections.push({
      title: "Heat",
      body: `Rothfusz heat index is ${Math.round(hi)}° (${heat.label.toLowerCase()}). Drink water before you feel thirsty, and treat parked cars as ovens.`
    });
    if (hi >= 100) actions.push("Move workouts before 9 a.m. or after sunset.");
  }

  if (input.uvNow >= 6) {
    fired.push("uv");
    sections.push({
      title: "Sun",
      body: `UV is ${uv.label.toLowerCase()} (${input.uvNow.toFixed(0)}). ${uv.advice}`
    });
  }

  if (input.place.coast !== "inland" || activities.find((a) => a.id === "beach")) {
    fired.push("marine");
    const ripHint =
      input.place.coast === "atlantic" && input.windMph >= 15
        ? "Fresh onshore flow can set up rip currents. Swim near a lifeguard and skip the unguarded gaps."
        : "Check the NWS Miami beach forecast before you commit to an unguarded stretch.";
    sections.push({
      title: "Beach and bay",
      body: `${ripHint}${input.waveFt !== null ? ` Seas near the pin are about ${input.waveFt.toFixed(1)} ft.` : ""}`
    });
  }

  if (flood.level !== "low" || king) {
    fired.push("flood");
    const upcomingKing = !king && nextKing ? ` Next published window is ${nextKing.start} to ${nextKing.end}.` : "";
    sections.push({
      title: "Water in the streets",
      body: `${flood.reasons[0] ?? "Watch the usual dips."}${king ? " King tides can flood without rain." : ""}${upcomingKing}`
    });
    if (flood.level === "high" || flood.level === "severe") {
      actions.push("Move cars off the lowest block before the next high tide.");
    }
  }

  if (season) {
    fired.push("tropics");
    const stormLine = input.storms.length
      ? `NHC is following ${input.storms.map((s) => `${s.classification} ${s.name}`).join(", ")}.`
      : "No named Atlantic storms are loaded in the latest NHC list.";
    sections.push({
      title: "Tropics",
      body: `Atlantic hurricane season is open. ${stormLine} This helper is not a warning service — use NHC and NWS Miami for watches.`
    });
  }

  const outdoor = activities.find((a) => a.id === "run") ?? activities[0]!;
  if (outdoor.bestWindow) {
    fired.push("window");
    sections.push({
      title: "Best outdoor window",
      body: `${formatHour(outdoor.bestWindow.start, tz)}–${formatHour(outdoor.bestWindow.end, tz)}. ${outdoor.bestWindow.reason}`
    });
  }

  if (input.aqi !== null && input.aqi >= 101) {
    fired.push("aqi");
    sections.push({
      title: "Air",
      body: `US AQI is ${Math.round(input.aqi)}. Sensitive groups should shorten hard outdoor efforts.`
    });
  }

  const windows = activities
    .filter((a) => a.bestWindow)
    .slice(0, 3)
    .map((a) => ({
      label: a.label,
      start: a.bestWindow!.start,
      end: a.bestWindow!.end,
      reason: a.reasons[0] ?? a.bestWindow!.reason
    }));

  if (actions.length === 0) actions.push("Keep a bottle of water in the bag. Miami heat stacks quietly.");

  return {
    greeting,
    headline,
    summary: summaryParts.join(" "),
    sections,
    actions: unique(actions).slice(0, 4),
    windows,
    firedRules: fired
  };
}

function upcoming(hours: HourPoint[], now: Date, count: number): HourPoint[] {
  return hours.filter((h) => h.time.getTime() >= now.getTime() - 20 * 60 * 1000).slice(0, count);
}

function localHour(date: Date, timeZone: string): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(date)
  );
}

function formatHour(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric" }).format(date);
}

function listHours(hours: HourPoint[], timeZone: string): string {
  return hours.map((h) => formatHour(h.time, timeZone)).join(", ");
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}
