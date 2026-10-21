import type { Units } from "../types";

export function formatTemp(f: number, units: Units): string {
  return units === "metric" ? `${Math.round(((f - 32) * 5) / 9)}°` : `${Math.round(f)}°`;
}

export function formatTempUnit(units: Units): string {
  return units === "metric" ? "C" : "F";
}

export function formatWind(mph: number, units: Units): string {
  return units === "metric" ? `${Math.round(mph * 1.60934)} km/h` : `${Math.round(mph)} mph`;
}

export function formatPrecip(inches: number, units: Units): string {
  if (units === "metric") {
    const mm = inches * 25.4;
    return `${mm < 1 ? mm.toFixed(1) : Math.round(mm)} mm`;
  }
  return `${inches < 0.1 && inches > 0 ? inches.toFixed(2) : inches.toFixed(2)} in`;
}

export function formatTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export function formatHour(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric"
  }).format(date);
}

export function formatWeekday(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short"
  }).format(date);
}

export function formatWeekdayLong(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "short",
    day: "numeric"
  }).format(date);
}

export function compass(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const i = Math.round(deg / 22.5) % 16;
  return dirs[i] ?? "N";
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
