import { describe, expect, it } from "vitest";
import { formatTimeLeft, parseWallClockInZone, staleAge } from "../src/lib/time";

describe("parseWallClockInZone", () => {
  it("treats offset-free Open-Meteo stamps as Eastern, not the host zone", () => {
    const parsed = parseWallClockInZone("2026-10-21T08:00", "America/New_York");
    expect(parsed).toBeTruthy();
    expect(parsed!.toISOString()).toBe("2026-10-21T12:00:00.000Z");
    expect(
      parsed!.toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" })
    ).toMatch(/8/);
  });

  it("parses NOAA lst_ldt tide stamps with a space", () => {
    const parsed = parseWallClockInZone("2026-10-21 17:24", "America/New_York");
    expect(parsed?.toISOString()).toBe("2026-10-21T21:24:00.000Z");
  });

  it("keeps ISO stamps that already carry an offset", () => {
    const parsed = parseWallClockInZone("2026-10-21T20:00:00-04:00", "America/New_York");
    expect(parsed?.toISOString()).toBe("2026-10-22T00:00:00.000Z");
  });

  it("returns null for empty input", () => {
    expect(parseWallClockInZone("", "America/New_York")).toBeNull();
    expect(parseWallClockInZone(null, "America/New_York")).toBeNull();
  });
});

describe("formatTimeLeft and staleAge", () => {
  const now = new Date("2026-10-21T16:00:00-04:00");

  it("counts down alert expiration", () => {
    expect(formatTimeLeft(new Date("2026-10-21T16:18:00-04:00"), now)).toBe("18 min left");
    expect(formatTimeLeft(new Date("2026-10-21T18:00:00-04:00"), now)).toBe("2h left");
    expect(formatTimeLeft(new Date("2026-10-21T18:20:00-04:00"), now)).toBe("2h 20m left");
    expect(formatTimeLeft(new Date("2026-10-23T16:00:00-04:00"), now)).toBe("2 days left");
    expect(formatTimeLeft(new Date("2026-10-21T15:00:00-04:00"), now)).toBe("Expired");
  });

  it("labels snapshot age", () => {
    expect(staleAge(now, now)).toBe("just now");
    expect(staleAge(new Date(now.getTime() - 14 * 60_000), now)).toBe("14 min ago");
    expect(staleAge(new Date(now.getTime() - 2 * 3600_000), now)).toBe("2 hours ago");
    expect(staleAge(new Date(now.getTime() - 26 * 3600_000), now)).toBe("1 day ago");
  });
});
