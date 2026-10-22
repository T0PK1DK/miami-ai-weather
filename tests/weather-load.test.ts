import { afterEach, describe, expect, it, vi } from "vitest";
import { findNeighborhood } from "../src/data/neighborhoods";
import { loadSnapshot } from "../src/lib/weather";

const southBeach = findNeighborhood("south-beach");

function jsonResponse(data: unknown, ok = true): Promise<Response> {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 503,
    json: async () => data
  } as Response);
}

function forecastFixture() {
  return {
    timezone: "America/New_York",
    current: {
      time: "2026-10-21T14:00",
      temperature_2m: 84,
      relative_humidity_2m: 70,
      apparent_temperature: 91,
      precipitation: 0,
      weather_code: 2,
      cloud_cover: 40,
      pressure_msl: 1014,
      wind_speed_10m: 12,
      wind_direction_10m: 90,
      wind_gusts_10m: 18,
      is_day: 1,
      visibility: 16093
    },
    hourly: {
      time: ["2026-10-21T14:00", "2026-10-21T15:00"],
      temperature_2m: [84, 85],
      relative_humidity_2m: [70, 68],
      apparent_temperature: [91, 92],
      precipitation: [0, 0.02],
      precipitation_probability: [20, 40],
      weather_code: [2, 80],
      wind_speed_10m: [12, 13],
      wind_gusts_10m: [18, 20],
      wind_direction_10m: [90, 100],
      uv_index: [8, 7],
      cape: [800, 1600],
      visibility: [16093, 12000],
      cloud_cover: [40, 70]
    },
    daily: {
      time: ["2026-10-21"],
      weather_code: [80],
      temperature_2m_max: [88],
      temperature_2m_min: [76],
      apparent_temperature_max: [96],
      precipitation_sum: [0.15],
      precipitation_probability_max: [50],
      wind_speed_10m_max: [16],
      uv_index_max: [9],
      sunrise: ["2026-10-21T07:24"],
      sunset: ["2026-10-21T18:48"]
    },
    minutely_15: {
      time: ["2026-10-21T14:00", "2026-10-21T14:15"],
      precipitation: [0, 0.04]
    }
  };
}

describe("loadSnapshot", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("parses the Open-Meteo shape and degrades when side feeds fail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("open-meteo.com/v1/forecast")) return jsonResponse(forecastFixture());
        if (url.includes("air-quality")) return jsonResponse({ current: { us_aqi: 41 } });
        if (url.includes("marine-api")) return jsonResponse({ current: { wave_height: 0.7 } });
        if (url.includes("alerts")) return jsonResponse({ status: "down" }, false);
        if (url.includes("tidesandcurrents")) {
          return jsonResponse({
            predictions: [{ t: "2026-10-21 17:24", v: "1.92", type: "H" }]
          });
        }
        if (url.includes("CurrentStorms")) return jsonResponse({ activeStorms: [] });
        if (url.includes("rainviewer.com")) {
          return jsonResponse({
            host: "https://tilecache.rainviewer.com",
            radar: { past: [{ time: 1771700000, path: "/v2/radar/abc" }], nowcast: [] }
          });
        }
        return jsonResponse({}, false);
      })
    );

    const snap = await loadSnapshot(southBeach, new Date("2026-10-21T14:05:00-04:00"));
    expect(snap.place.id).toBe("south-beach");
    expect(snap.current.tempF).toBe(84);
    expect(snap.current.time.toISOString()).toBe("2026-10-21T18:00:00.000Z");
    expect(snap.hours).toHaveLength(2);
    expect(snap.hours[1]?.pop).toBe(40);
    expect(snap.days[0]?.highF).toBe(88);
    expect(snap.nowcast[1]?.precipIn).toBe(0.04);
    expect(snap.aqi).toBe(41);
    expect(snap.waveFt).toBeGreaterThan(2);
    expect(snap.tides[0]?.heightFt).toBeCloseTo(1.92);
    expect(snap.tides[0]?.time.toISOString()).toBe("2026-10-21T21:24:00.000Z");
    expect(snap.radar.frames).toHaveLength(1);
    expect(snap.sources.forecast).toBe(true);
    expect(snap.sources.alerts).toBe(false);
    expect(snap.sources.tides).toBe(true);
    expect(snap.alerts).toEqual([]);
  });

  it("throws when the forecast feed is down", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({}, false))
    );
    await expect(loadSnapshot(southBeach)).rejects.toThrow(/Forecast feed is down/);
  });

  it("sends the NWS User-Agent on the alerts fallback", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("open-meteo.com/v1/forecast")) return jsonResponse(forecastFixture());
      if (url.includes("api.weather.gov/alerts")) {
        const headers = (init?.headers ?? {}) as Record<string, string>;
        expect(headers["User-Agent"]).toMatch(/miami-ai-weather/);
        return jsonResponse({
          features: [
            {
              id: "alert-1",
              properties: {
                event: "Rip Current Statement",
                severity: "Moderate",
                urgency: "Expected",
                headline: "Rip Current Statement for Atlantic beaches",
                ends: "2026-10-21T20:00:00-04:00"
              }
            }
          ]
        });
      }
      return jsonResponse({}, false);
    });
    vi.stubGlobal("fetch", fetchMock);

    const snap = await loadSnapshot(southBeach, new Date("2026-10-21T14:05:00-04:00"));
    expect(snap.alerts[0]?.event).toBe("Rip Current Statement");
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("api.weather.gov/alerts"))).toBe(true);
  });
});
