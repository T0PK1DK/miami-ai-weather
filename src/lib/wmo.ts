/** WMO WW codes as used by Open-Meteo. */
const LABELS: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight showers",
  81: "Moderate showers",
  82: "Violent showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  97: "Heavy thunderstorm",
  99: "Thunderstorm with heavy hail"
};

export function wmoLabel(code: number): string {
  return LABELS[code] ?? "Mixed conditions";
}

export function isWetCode(code: number): boolean {
  return code >= 51;
}

export function isThunderCode(code: number): boolean {
  return code >= 95;
}

export function weatherIcon(code: number, isDay: boolean): string {
  if (isThunderCode(code)) return "⚡";
  if (code >= 80) return "🌧️";
  if (code >= 71) return "❄️";
  if (code >= 61) return "🌧️";
  if (code >= 51) return "🌦️";
  if (code === 45 || code === 48) return "🌫️";
  if (code === 3) return "☁️";
  if (code === 2) return isDay ? "⛅" : "☁️";
  return isDay ? "☀️" : "🌙";
}

/** Visual sky mood for the Miami shell — presentation only. */
export function skyMood(code: number, isDay: boolean): "storm" | "rain" | "fog" | "day" | "night" {
  if (isThunderCode(code)) return "storm";
  if (isWetCode(code)) return "rain";
  if (code === 45 || code === 48) return "fog";
  return isDay ? "day" : "night";
}
