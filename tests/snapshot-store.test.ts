import { describe, expect, it } from "vitest";
import { findNeighborhood } from "../src/data/neighborhoods";
import { snapshotFromJSON, snapshotToJSON } from "../src/lib/snapshot-store";
import { renderApp } from "../src/ui/render";
import type { Snapshot } from "../src/types";

function sampleSnapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  const fetchedAt = new Date("2026-10-21T11:40:00-04:00");
  return {
    fetchedAt,
    place: findNeighborhood("south-beach"),
    timezone: "America/New_York",
    current: {
      time: fetchedAt,
      tempF: 84,
      feelsF: 90,
      humidity: 68,
      precipIn: 0,
      weatherCode: 2,
      windMph: 12,
      gustMph: 16,
      windDir: 90,
      pressureMb: 1014,
      cloud: 40,
      isDay: true,
      visibilityMi: 8
    },
    hours: [],
    days: [],
    nowcast: [],
    alerts: [
      {
        id: "alert-1",
        event: "Rip Current Statement",
        severity: "Moderate",
        urgency: "Expected",
        headline: "Rip Current Statement for Atlantic beaches",
        instruction: "Swim near a lifeguard.",
        ends: new Date("2026-10-21T20:00:00-04:00")
      }
    ],
    tides: [{ time: new Date("2026-10-21T17:24:00-04:00"), heightFt: 1.9, type: "H" }],
    storms: [],
    aqi: 38,
    waveFt: 2.1,
    radar: { host: "https://tilecache.rainviewer.com", frames: [] },
    sources: {
      forecast: true,
      air: true,
      marine: true,
      alerts: true,
      tides: true,
      storms: false,
      radar: false
    },
    ...overrides
  };
}

describe("snapshot store", () => {
  it("round-trips dates and keeps the selected place", () => {
    const original = sampleSnapshot();
    const revived = snapshotFromJSON(snapshotToJSON(original));
    expect(revived?.place.id).toBe("south-beach");
    expect(revived?.fetchedAt.toISOString()).toBe(original.fetchedAt.toISOString());
    expect(revived?.alerts[0]?.ends?.toISOString()).toBe(original.alerts[0]!.ends!.toISOString());
    expect(revived?.tides[0]?.heightFt).toBe(1.9);
    expect(revived?.sources.forecast).toBe(true);
  });

  it("rejects junk JSON", () => {
    expect(snapshotFromJSON("{not-json")).toBeNull();
    expect(snapshotFromJSON("{}")).toBeNull();
  });
});

describe("offline snapshot UI", () => {
  it("shows a stale banner and alert countdown from a cached snapshot", () => {
    const html = renderApp({
      snapshot: sampleSnapshot(),
      view: "now",
      units: "us",
      placeId: "south-beach",
      query: "",
      loading: false,
      error: "Forecast feed is down. Try again in a minute.",
      fromCache: true,
      radarPlaying: false,
      clock: new Date("2026-10-21T16:00:00-04:00")
    });
    expect(html).toMatch(/last saved snapshot/);
    expect(html).toMatch(/South Beach/);
    expect(html).toMatch(/Forecast feed is down/);
    expect(html).toMatch(/Rip Current Statement/);
    expect(html).toMatch(/4h left/);
    expect(html).not.toMatch(/King|Leonard/i);
  });

  it("keeps rain, heat, and season clocks on a cached snapshot", () => {
    const html = renderApp({
      snapshot: sampleSnapshot({
        current: {
          time: new Date("2026-10-21T14:00:00-04:00"),
          tempF: 84,
          feelsF: 90,
          humidity: 68,
          precipIn: 0,
          weatherCode: 2,
          windMph: 12,
          gustMph: 16,
          windDir: 90,
          pressureMb: 1014,
          cloud: 40,
          isDay: true,
          visibilityMi: 8
        },
        hours: [
          {
            time: new Date("2026-10-21T14:00:00-04:00"),
            tempF: 84,
            feelsF: 90,
            humidity: 68,
            precipIn: 0,
            pop: 10,
            weatherCode: 2,
            windMph: 12,
            gustMph: 16,
            windDir: 90,
            uv: 6,
            cape: 400,
            visibilityMi: 8,
            cloud: 40
          },
          {
            time: new Date("2026-10-21T16:00:00-04:00"),
            tempF: 83,
            feelsF: 88,
            humidity: 70,
            precipIn: 0.1,
            pop: 60,
            weatherCode: 80,
            windMph: 14,
            gustMph: 18,
            windDir: 100,
            uv: 4,
            cape: 1200,
            visibilityMi: 6,
            cloud: 70
          }
        ],
        nowcast: [
          { time: new Date("2026-10-21T14:00:00-04:00"), precipIn: 0 },
          { time: new Date("2026-10-21T16:00:00-04:00"), precipIn: 0.1 }
        ],
        storms: []
      }),
      view: "now",
      units: "us",
      placeId: "south-beach",
      query: "",
      loading: false,
      error: "Forecast feed is down. Try again in a minute.",
      fromCache: true,
      radarPlaying: false,
      clock: new Date("2026-10-21T16:00:00-04:00")
    });
    expect(html).toMatch(/last saved snapshot/);
    expect(html).toMatch(/Rain next few hours/);
    expect(html).toMatch(/Heat index next few hours/);
    expect(html).toMatch(/Late Atlantic hurricane season/);
    expect(html).toMatch(/4\s*PM/);

    const tropics = renderApp({
      snapshot: sampleSnapshot({
        current: {
          ...sampleSnapshot().current,
          time: new Date("2026-10-22T11:00:00-04:00")
        }
      }),
      view: "tropics",
      units: "us",
      placeId: "south-beach",
      query: "",
      loading: false,
      error: null,
      fromCache: true,
      radarPlaying: false,
      clock: new Date("2026-10-22T11:00:00-04:00")
    });
    expect(tropics).toMatch(/Late Atlantic hurricane season/);
    expect(tropics).toMatch(/39 day/);
    expect(tropics).toMatch(/No named storms/);
  });

  it("paints the Miami hero with high and low from the snapshot", () => {
    const html = renderApp({
      snapshot: sampleSnapshot({
        days: [
          {
            date: new Date("2026-10-21T00:00:00-04:00"),
            highF: 88,
            lowF: 76,
            feelsMaxF: 96,
            precipIn: 0.1,
            pop: 40,
            weatherCode: 2,
            uvMax: 8,
            windMaxMph: 14,
            sunrise: new Date("2026-10-21T07:24:00-04:00"),
            sunset: new Date("2026-10-21T18:48:00-04:00")
          }
        ]
      }),
      view: "now",
      units: "us",
      placeId: "south-beach",
      query: "",
      loading: false,
      error: null,
      fromCache: false,
      radarPlaying: false,
      clock: new Date("2026-10-21T16:00:00-04:00")
    });
    expect(html).toMatch(/Biscayne to the Glades/);
    expect(html).toMatch(/data-sky="day"/);
    expect(html).toMatch(/H 88°/);
    expect(html).toMatch(/L 76°/);
  });

  it("does not show another place's cached snapshot", () => {
    const html = renderApp({
      snapshot: sampleSnapshot(),
      view: "now",
      units: "us",
      placeId: "kendall",
      query: "",
      loading: true,
      error: null,
      fromCache: true,
      radarPlaying: false,
      clock: new Date("2026-10-21T16:00:00-04:00")
    });
    expect(html).not.toMatch(/last saved snapshot/);
    expect(html).toMatch(/Loading the first pin/);
  });
});
