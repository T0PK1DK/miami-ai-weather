import { describe, expect, it } from "vitest";
import { buildBriefing } from "../src/lib/briefing";
import { findNeighborhood } from "../src/data/neighborhoods";
import type { HourPoint } from "../src/types";

function hour(partial: Partial<HourPoint> & { time: Date }): HourPoint {
  return {
    tempF: 88,
    feelsF: 94,
    humidity: 72,
    precipIn: 0,
    pop: 10,
    weatherCode: 1,
    windMph: 10,
    gustMph: 14,
    windDir: 90,
    uv: 8,
    cape: 200,
    visibilityMi: 8,
    cloud: 30,
    ...partial
  };
}

describe("buildBriefing", () => {
  it("leads with an official warning", () => {
    const now = new Date("2026-08-12T09:00:00-04:00");
    const brief = buildBriefing({
      place: findNeighborhood("brickell"),
      now,
      tempF: 89,
      feelsF: 98,
      humidity: 74,
      weatherCode: 2,
      windMph: 12,
      hours: [hour({ time: now })],
      alerts: [
        {
          id: "1",
          event: "Flood Warning",
          severity: "Severe",
          urgency: "Immediate",
          headline: "Flood Warning for Miami-Dade",
          instruction: "Move to higher ground.",
          ends: null
        }
      ],
      tides: [],
      storms: [],
      aqi: 42,
      waveFt: 1.2,
      uvNow: 4
    });
    expect(brief.headline).toMatch(/Flood Warning/);
    expect(brief.firedRules).toContain("alert-lead");
  });

  it("calls out afternoon sea-breeze storms", () => {
    const now = new Date("2026-07-08T09:00:00-04:00");
    const hours = [
      hour({ time: now, pop: 10 }),
      hour({ time: new Date("2026-07-08T15:00:00-04:00"), pop: 70, precipIn: 0.2, weatherCode: 95, cape: 2200 })
    ];
    const brief = buildBriefing({
      place: findNeighborhood("kendall"),
      now,
      tempF: 87,
      feelsF: 93,
      humidity: 68,
      weatherCode: 1,
      windMph: 8,
      hours,
      alerts: [],
      tides: [],
      storms: [],
      aqi: 38,
      waveFt: null,
      uvNow: 9
    });
    expect(brief.headline).toMatch(/after/i);
    expect(brief.firedRules).toContain("sea-breeze-storms");
    expect(brief.sections.some((s) => s.title === "Storm clock")).toBe(true);
  });

  it("never greets with a personal name", () => {
    const now = new Date("2026-10-21T18:10:00-04:00");
    const brief = buildBriefing({
      place: findNeighborhood("south-beach"),
      now,
      tempF: 82,
      feelsF: 86,
      humidity: 70,
      weatherCode: 2,
      windMph: 11,
      hours: [hour({ time: now, uv: 0 })],
      alerts: [],
      tides: [],
      storms: [],
      aqi: 30,
      waveFt: 2,
      uvNow: 0
    });
    expect(brief.greeting).toBe("Good evening");
    expect(`${brief.greeting} ${brief.headline} ${brief.summary}`).not.toMatch(/King|Leonard/i);
  });
});
