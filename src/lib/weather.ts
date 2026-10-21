import { parseWallClockInZone } from "./time";
import type { AlertItem, DayPoint, HourPoint, Neighborhood, RadarFrame, Snapshot, StormItem, TideEvent } from "../types";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
const MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";
const RAINVIEWER_URL = "https://api.rainviewer.com/public/weather-maps.json";
const TIDE_STATION = "8723214";

type Json = Record<string, unknown>;

export async function loadSnapshot(place: Neighborhood, now = new Date()): Promise<Snapshot> {
  const forecastQ = new URLSearchParams({
    latitude: String(place.lat),
    longitude: String(place.lon),
    timezone: "America/New_York",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    forecast_days: "10",
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation",
      "weather_code",
      "cloud_cover",
      "pressure_msl",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
      "is_day",
      "visibility"
    ].join(","),
    hourly: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation",
      "precipitation_probability",
      "weather_code",
      "wind_speed_10m",
      "wind_gusts_10m",
      "wind_direction_10m",
      "uv_index",
      "cape",
      "visibility",
      "cloud_cover"
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "apparent_temperature_max",
      "precipitation_sum",
      "precipitation_probability_max",
      "wind_speed_10m_max",
      "uv_index_max",
      "sunrise",
      "sunset"
    ].join(","),
    minutely_15: "precipitation"
  });

  const airQ = new URLSearchParams({
    latitude: String(place.lat),
    longitude: String(place.lon),
    timezone: "America/New_York",
    current: "us_aqi,pm2_5"
  });

  const marineQ = new URLSearchParams({
    latitude: String(place.lat),
    longitude: String(place.lon),
    timezone: "America/New_York",
    current: "wave_height"
  });

  const [forecast, air, marine, alerts, tides, storms, radar] = await Promise.allSettled([
    getJson(`${FORECAST_URL}?${forecastQ}`),
    getJson(`${AIR_URL}?${airQ}`),
    getJson(`${MARINE_URL}?${marineQ}`),
    fetchAlerts(place),
    fetchTides(now),
    fetchStorms(),
    fetchRadar()
  ]);

  if (forecast.status !== "fulfilled") {
    throw new Error("Forecast feed is down. Try again in a minute.");
  }

  const f = forecast.value;
  const current = asObj(f.current);
  const hourly = asObj(f.hourly);
  const daily = asObj(f.daily);
  const minute = asObj(f.minutely_15);
  const timezone = String(f.timezone ?? "America/New_York");
  const hours = zipHours(hourly, timezone);
  const days = zipDays(daily, timezone);

  return {
    fetchedAt: now,
    place,
    timezone,
    current: {
      time: parseWallClockInZone(current.time, timezone) ?? now,
      tempF: num(current.temperature_2m),
      feelsF: num(current.apparent_temperature),
      humidity: num(current.relative_humidity_2m),
      precipIn: num(current.precipitation),
      weatherCode: num(current.weather_code),
      windMph: num(current.wind_speed_10m),
      gustMph: num(current.wind_gusts_10m),
      windDir: num(current.wind_direction_10m),
      pressureMb: num(current.pressure_msl),
      cloud: num(current.cloud_cover),
      isDay: num(current.is_day) === 1,
      visibilityMi: metersToMiles(num(current.visibility))
    },
    hours,
    days,
    nowcast: zipNowcast(minute, timezone),
    alerts: alerts.status === "fulfilled" ? alerts.value : [],
    tides: tides.status === "fulfilled" ? tides.value : [],
    storms: storms.status === "fulfilled" ? storms.value : [],
    aqi: readOptional(air, (v) => {
      const n = num(asObj(v.current).us_aqi, NaN);
      return Number.isFinite(n) ? n : null;
    }),
    waveFt: readOptional(marine, (v) => {
      const n = num(asObj(v.current).wave_height, NaN);
      return Number.isFinite(n) ? metersToFeet(n) : null;
    }),
    radar: radar.status === "fulfilled" ? radar.value : { host: "", frames: [] },
    sources: {
      forecast: true,
      air: air.status === "fulfilled",
      marine: marine.status === "fulfilled",
      alerts: alerts.status === "fulfilled",
      tides: tides.status === "fulfilled",
      storms: storms.status === "fulfilled",
      radar: radar.status === "fulfilled" && radar.value.frames.length > 0
    }
  };
}

function readOptional<T>(result: PromiseSettledResult<Json>, map: (value: Json) => T | null): T | null {
  if (result.status !== "fulfilled") return null;
  return map(result.value);
}

async function getJson(url: string): Promise<Json> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return (await res.json()) as Json;
}

async function fetchAlerts(place: Neighborhood): Promise<AlertItem[]> {
  const urls = [
    `/api/nws/alerts/active?point=${place.lat},${place.lon}`,
    `https://api.weather.gov/alerts/active?point=${place.lat},${place.lon}`
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/geo+json" } });
      if (!res.ok) continue;
      const json = (await res.json()) as { features?: Array<{ id?: string; properties?: Json }> };
      return (json.features ?? []).map((f) => {
        const p = f.properties ?? {};
        return {
          id: String(f.id ?? p.id ?? crypto.randomUUID()),
          event: String(p.event ?? "Alert"),
          severity: String(p.severity ?? "Unknown"),
          urgency: String(p.urgency ?? "Unknown"),
          headline: String(p.headline ?? p.event ?? "Weather alert"),
          instruction: String(p.instruction ?? ""),
          ends: parseWallClockInZone(p.ends, "America/New_York") ?? parseWallClockInZone(p.expires, "America/New_York")
        };
      });
    } catch {
      continue;
    }
  }
  throw new Error("alerts unavailable");
}

async function fetchTides(now: Date): Promise<TideEvent[]> {
  const begin = new Date(now.getTime() - 6 * 3600 * 1000);
  const end = new Date(now.getTime() + 36 * 3600 * 1000);
  const q = new URLSearchParams({
    begin_date: compactStamp(begin),
    end_date: compactStamp(end),
    station: TIDE_STATION,
    product: "predictions",
    datum: "MLLW",
    time_zone: "lst_ldt",
    interval: "hilo",
    units: "english",
    format: "json"
  });
  const json = await getJson(`https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?${q}`);
  const preds = Array.isArray(json.predictions) ? json.predictions : [];
  return preds.map((row) => {
    const r = asObj(row);
    return {
      time: parseWallClockInZone(r.t, "America/New_York") ?? now,
      heightFt: num(r.v),
      type: String(r.type) === "L" ? "L" : "H"
    };
  });
}

async function fetchStorms(): Promise<StormItem[]> {
  const urls = ["/api/nhc/CurrentStorms.json", "https://www.nhc.noaa.gov/CurrentStorms.json"];
  for (const url of urls) {
    try {
      const json = await getJson(url);
      const active = Array.isArray(json.activeStorms) ? json.activeStorms : [];
      return active.map((row) => {
        const r = asObj(row);
        return {
          id: String(r.id ?? r.binNumber ?? r.name ?? crypto.randomUUID()),
          name: String(r.name ?? "Unnamed"),
          classification: String(r.classification ?? r.intensity ?? "Disturbance"),
          basin: String(r.basin ?? "")
        };
      });
    } catch {
      continue;
    }
  }
  throw new Error("storms unavailable");
}

async function fetchRadar(): Promise<{ host: string; frames: RadarFrame[] }> {
  const json = await getJson(RAINVIEWER_URL);
  const host = String(json.host ?? "https://tilecache.rainviewer.com");
  const radar = asObj(json.radar);
  const past = Array.isArray(radar.past) ? radar.past : [];
  const nowcast = Array.isArray(radar.nowcast) ? radar.nowcast : [];
  const frames = [...past, ...nowcast]
    .map((row) => {
      const r = asObj(row);
      return {
        time: new Date(num(r.time) * 1000),
        path: String(r.path ?? "")
      };
    })
    .filter((f) => f.path);
  return { host, frames };
}

function zipHours(hourly: Json, timeZone: string): HourPoint[] {
  const times = asNumOrStrArray(hourly.time);
  return times.map((t, i) => ({
    time: parseWallClockInZone(t, timeZone) ?? new Date(),
    tempF: at(hourly.temperature_2m, i),
    feelsF: at(hourly.apparent_temperature, i),
    humidity: at(hourly.relative_humidity_2m, i),
    precipIn: at(hourly.precipitation, i),
    pop: at(hourly.precipitation_probability, i),
    weatherCode: at(hourly.weather_code, i),
    windMph: at(hourly.wind_speed_10m, i),
    gustMph: at(hourly.wind_gusts_10m, i),
    windDir: at(hourly.wind_direction_10m, i),
    uv: at(hourly.uv_index, i),
    cape: at(hourly.cape, i),
    visibilityMi: metersToMiles(at(hourly.visibility, i)),
    cloud: at(hourly.cloud_cover, i)
  }));
}

function zipDays(daily: Json, timeZone: string): DayPoint[] {
  const times = asNumOrStrArray(daily.time);
  return times.map((t, i) => ({
    date: parseWallClockInZone(t, timeZone) ?? new Date(),
    highF: at(daily.temperature_2m_max, i),
    lowF: at(daily.temperature_2m_min, i),
    feelsMaxF: at(daily.apparent_temperature_max, i),
    precipIn: at(daily.precipitation_sum, i),
    pop: at(daily.precipitation_probability_max, i),
    weatherCode: at(daily.weather_code, i),
    uvMax: at(daily.uv_index_max, i),
    windMaxMph: at(daily.wind_speed_10m_max, i),
    sunrise: parseWallClockInZone(asNumOrStrArray(daily.sunrise)[i], timeZone) ?? new Date(),
    sunset: parseWallClockInZone(asNumOrStrArray(daily.sunset)[i], timeZone) ?? new Date()
  }));
}

function zipNowcast(minute: Json, timeZone: string): Array<{ time: Date; precipIn: number }> {
  const times = asNumOrStrArray(minute.time);
  return times.map((t, i) => ({
    time: parseWallClockInZone(t, timeZone) ?? new Date(),
    precipIn: at(minute.precipitation, i)
  }));
}

function asObj(value: unknown): Json {
  return value && typeof value === "object" ? (value as Json) : {};
}

function asNumOrStrArray(value: unknown): Array<string | number> {
  return Array.isArray(value) ? (value as Array<string | number>) : [];
}

function at(value: unknown, index: number): number {
  if (!Array.isArray(value)) return 0;
  return num(value[index]);
}

function num(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function metersToMiles(m: number): number {
  return m > 0 ? m / 1609.344 : 0;
}

function metersToFeet(m: number): number {
  return m * 3.28084;
}

function compactStamp(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${pick("year")}${pick("month")}${pick("day")} ${pick("hour")}:${pick("minute")}`;
}

export function currentUv(hours: HourPoint[], now: Date): number {
  const match = hours.find((h) => Math.abs(h.time.getTime() - now.getTime()) < 90 * 60 * 1000);
  return match?.uv ?? hours[0]?.uv ?? 0;
}
