import { describe, expect, it } from "vitest";
import { scoreActivities } from "../src/lib/activities";
import { findNeighborhood } from "../src/data/neighborhoods";
import type { HourPoint } from "../src/types";

function hour(overrides: Partial<HourPoint> = {}): HourPoint {
  return {
    time: new Date("2026-07-02T08:00:00-04:00"),
    tempF: 78,
    feelsF: 80,
    humidity: 60,
    precipIn: 0,
    pop: 5,
    weatherCode: 0,
    windMph: 6,
    gustMph: 8,
    windDir: 80,
    uv: 3,
    cape: 100,
    visibilityMi: 10,
    cloud: 10,
    ...overrides
  };
}

describe("scoreActivities", () => {
  it("prefers a cool dry morning over a thundery afternoon", () => {
    const hours = [
      hour(),
      hour({ time: new Date("2026-07-02T09:00:00-04:00") }),
      hour({
        time: new Date("2026-07-02T16:00:00-04:00"),
        tempF: 93,
        humidity: 75,
        pop: 80,
        precipIn: 0.3,
        weatherCode: 95,
        cape: 2400,
        uv: 10
      })
    ];
    const scores = scoreActivities({
      place: findNeighborhood("coconut-grove"),
      now: hours[0]!.time,
      hours,
      waveFt: 1,
      aqi: 40
    });
    const run = scores.find((s) => s.id === "run");
    expect(run?.bestWindow).toBeTruthy();
    expect(run!.bestWindow!.start.getTime()).toBe(hours[0]!.time.getTime());
    expect(run!.level).not.toBe("severe");
  });

  it("flags a windy Atlantic beach for rip risk", () => {
    const hours = [
      hour({
        time: new Date("2026-03-04T11:00:00-05:00"),
        windMph: 22,
        gustMph: 30,
        uv: 8,
        tempF: 82,
        humidity: 55
      })
    ];
    const scores = scoreActivities({
      place: findNeighborhood("south-beach"),
      now: hours[0]!.time,
      hours,
      waveFt: 5,
      aqi: 35
    });
    const beach = scores.find((s) => s.id === "beach");
    expect(beach?.reasons.join(" ")).toMatch(/rip|Wind|UV|Seas/i);
  });
});
