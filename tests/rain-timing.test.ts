import { describe, expect, it } from "vitest";
import { rainClock } from "../src/lib/rain-timing";

const tz = "America/New_York";
const now = new Date("2026-10-21T14:00:00-04:00");

describe("rainClock", () => {
  it("says the next hours are dry when the nowcast stays below 0.01 in", () => {
    const clock = rainClock(
      [
        { time: now, precipIn: 0 },
        { time: new Date("2026-10-21T14:15:00-04:00"), precipIn: 0.004 },
        { time: new Date("2026-10-21T15:00:00-04:00"), precipIn: 0 }
      ],
      [],
      now,
      tz
    );
    expect(clock.rainingNow).toBe(false);
    expect(clock.nextStart).toBeNull();
    expect(clock.summary).toMatch(/Dry through/i);
  });

  it("times a later pulse from the 15-minute nowcast", () => {
    const clock = rainClock(
      [
        { time: now, precipIn: 0 },
        { time: new Date("2026-10-21T16:00:00-04:00"), precipIn: 0.12 },
        { time: new Date("2026-10-21T17:00:00-04:00"), precipIn: 0 }
      ],
      [],
      now,
      tz
    );
    expect(clock.rainingNow).toBe(false);
    expect(clock.nextStart?.toISOString()).toBe("2026-10-21T20:00:00.000Z");
    expect(clock.summary).toMatch(/4\s*PM/);
    expect(clock.summary).toMatch(/easing after 5\s*PM/);
  });

  it("falls back to hourly amounts when the nowcast is empty", () => {
    const clock = rainClock(
      [],
      [
        { time: now, precipIn: 0.2, pop: 70 },
        { time: new Date("2026-10-21T16:00:00-04:00"), precipIn: 0, pop: 10 }
      ],
      now,
      tz
    );
    expect(clock.rainingNow).toBe(true);
    expect(clock.summary).toMatch(/on now/i);
    expect(clock.summary).toMatch(/4\s*PM/);
  });

  it("explains a cached snapshot with no short-range points", () => {
    expect(rainClock([], [], now, tz).summary).toMatch(/No short-range rain timing/);
  });
});
