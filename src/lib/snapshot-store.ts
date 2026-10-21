import type { Neighborhood, Snapshot } from "../types";

export const SNAPSHOT_KEY_PREFIX = "miami-weather-snap:";

export function snapshotStorageKey(placeId: string): string {
  return `${SNAPSHOT_KEY_PREFIX}${placeId}`;
}

export function snapshotToJSON(snapshot: Snapshot): string {
  return JSON.stringify(snapshot);
}

export function snapshotFromJSON(raw: string): Snapshot | null {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!isRecord(value) || !isRecord(value.place) || !isRecord(value.current) || !isRecord(value.radar)) {
      return null;
    }
    const place = value.place as unknown as Neighborhood;
    if (typeof place.id !== "string" || typeof place.lat !== "number") return null;

    return {
      fetchedAt: asDate(value.fetchedAt) ?? new Date(0),
      place,
      timezone: String(value.timezone ?? "America/New_York"),
      current: {
        time: asDate(value.current.time) ?? new Date(0),
        tempF: num(value.current.tempF),
        feelsF: num(value.current.feelsF),
        humidity: num(value.current.humidity),
        precipIn: num(value.current.precipIn),
        weatherCode: num(value.current.weatherCode),
        windMph: num(value.current.windMph),
        gustMph: num(value.current.gustMph),
        windDir: num(value.current.windDir),
        pressureMb: num(value.current.pressureMb),
        cloud: num(value.current.cloud),
        isDay: Boolean(value.current.isDay),
        visibilityMi: num(value.current.visibilityMi)
      },
      hours: asArray(value.hours).map(reviveHour),
      days: asArray(value.days).map(reviveDay),
      nowcast: asArray(value.nowcast).map((row) => ({
        time: asDate(row.time) ?? new Date(0),
        precipIn: num(row.precipIn)
      })),
      alerts: asArray(value.alerts).map((row) => ({
        id: String(row.id ?? ""),
        event: String(row.event ?? "Alert"),
        severity: String(row.severity ?? ""),
        urgency: String(row.urgency ?? ""),
        headline: String(row.headline ?? ""),
        instruction: String(row.instruction ?? ""),
        ends: asDate(row.ends)
      })),
      tides: asArray(value.tides).map((row) => ({
        time: asDate(row.time) ?? new Date(0),
        heightFt: num(row.heightFt),
        type: String(row.type) === "L" ? "L" : "H"
      })),
      storms: asArray(value.storms).map((row) => ({
        id: String(row.id ?? ""),
        name: String(row.name ?? "Unnamed"),
        classification: String(row.classification ?? ""),
        basin: String(row.basin ?? "")
      })),
      aqi: value.aqi === null || value.aqi === undefined ? null : num(value.aqi),
      waveFt: value.waveFt === null || value.waveFt === undefined ? null : num(value.waveFt),
      radar: {
        host: String(isRecord(value.radar) ? value.radar.host : ""),
        frames: asArray(isRecord(value.radar) ? value.radar.frames : []).map((row) => ({
          time: asDate(row.time) ?? new Date(0),
          path: String(row.path ?? "")
        }))
      },
      sources: {
        forecast: Boolean(isRecord(value.sources) && value.sources.forecast),
        air: Boolean(isRecord(value.sources) && value.sources.air),
        marine: Boolean(isRecord(value.sources) && value.sources.marine),
        alerts: Boolean(isRecord(value.sources) && value.sources.alerts),
        tides: Boolean(isRecord(value.sources) && value.sources.tides),
        storms: Boolean(isRecord(value.sources) && value.sources.storms),
        radar: Boolean(isRecord(value.sources) && value.sources.radar)
      }
    };
  } catch {
    return null;
  }
}

export function readStoredSnapshot(placeId: string): Snapshot | null {
  try {
    const raw = localStorage.getItem(snapshotStorageKey(placeId));
    return raw ? snapshotFromJSON(raw) : null;
  } catch {
    return null;
  }
}

export function writeStoredSnapshot(snapshot: Snapshot): void {
  try {
    localStorage.setItem(snapshotStorageKey(snapshot.place.id), snapshotToJSON(snapshot));
  } catch {
    // Quota or private mode — live data still works without the cache.
  }
}

function reviveHour(row: Record<string, unknown>) {
  return {
    time: asDate(row.time) ?? new Date(0),
    tempF: num(row.tempF),
    feelsF: num(row.feelsF),
    humidity: num(row.humidity),
    precipIn: num(row.precipIn),
    pop: num(row.pop),
    weatherCode: num(row.weatherCode),
    windMph: num(row.windMph),
    gustMph: num(row.gustMph),
    windDir: num(row.windDir),
    uv: num(row.uv),
    cape: num(row.cape),
    visibilityMi: num(row.visibilityMi),
    cloud: num(row.cloud)
  };
}

function reviveDay(row: Record<string, unknown>) {
  return {
    date: asDate(row.date) ?? new Date(0),
    highF: num(row.highF),
    lowF: num(row.lowF),
    feelsMaxF: num(row.feelsMaxF),
    precipIn: num(row.precipIn),
    pop: num(row.pop),
    weatherCode: num(row.weatherCode),
    uvMax: num(row.uvMax),
    windMaxMph: num(row.windMaxMph),
    sunrise: asDate(row.sunrise) ?? new Date(0),
    sunset: asDate(row.sunset) ?? new Date(0)
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function asDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

function num(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}
