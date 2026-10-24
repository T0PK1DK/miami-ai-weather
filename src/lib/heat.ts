/**
 * NWS heat index (Rothfusz regression) with Steadman fallback.
 * Slower than a linear "feels like" blend, but it is the published NWS method
 * and handles the low-RH and high-RH adjustment branches.
 * https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml
 */
export function heatIndexF(tempF: number, relativeHumidity: number): number {
  const t = tempF;
  const rh = clamp(relativeHumidity, 0, 100);
  const simple = 0.5 * (t + 61 + (t - 68) * 1.2 + rh * 0.094);
  const blended = (simple + t) / 2;
  if (blended < 80) return round1(blended);

  let hi =
    -42.379 +
    2.04901523 * t +
    10.14333127 * rh -
    0.22475541 * t * rh -
    0.00683783 * t * t -
    0.05481717 * rh * rh +
    0.00122874 * t * t * rh +
    0.00085282 * t * rh * rh -
    0.00000199 * t * t * rh * rh;

  if (rh < 13 && t >= 80 && t <= 112) {
    hi -= ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(t - 95)) / 17);
  } else if (rh > 85 && t >= 80 && t <= 87) {
    hi += ((rh - 85) / 10) * ((87 - t) / 5);
  }
  return round1(hi);
}

export type HeatHour = {
  time: Date;
  heatIndexF: number;
  category: ReturnType<typeof heatCategory>;
};

export function upcomingHeat(
  hours: Array<{ time: Date; tempF: number; humidity: number }>,
  now: Date,
  count = 8
): HeatHour[] {
  return hours
    .filter((h) => h.time.getTime() >= now.getTime() - 30 * 60 * 1000)
    .slice(0, count)
    .map((h) => {
      const hi = heatIndexF(h.tempF, h.humidity);
      return { time: h.time, heatIndexF: hi, category: heatCategory(hi) };
    });
}

export function peakUpcomingHeat(hours: HeatHour[]): HeatHour | null {
  return hours.reduce<HeatHour | null>((best, h) => {
    if (!best) return h;
    return h.heatIndexF > best.heatIndexF ? h : best;
  }, null);
}

export function heatCategory(indexF: number): {
  level: "caution" | "extreme-caution" | "danger" | "extreme-danger" | "comfortable";
  label: string;
} {
  if (indexF >= 130) return { level: "extreme-danger", label: "Extreme danger" };
  if (indexF >= 105) return { level: "danger", label: "Danger" };
  if (indexF >= 90) return { level: "extreme-caution", label: "Extreme caution" };
  if (indexF >= 80) return { level: "caution", label: "Caution" };
  return { level: "comfortable", label: "Comfortable" };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
