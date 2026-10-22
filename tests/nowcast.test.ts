import { describe, expect, it } from "vitest";
import { dayRangeLayout, describeNowcast } from "../src/lib/nowcast";

describe("describeNowcast", () => {
  const tz = "America/New_York";
  const now = new Date("2026-10-21T14:00:00-04:00");

  it("says the next hour is dry when every step is below 0.01 in", () => {
    const line = describeNowcast(
      [
        { time: now, precipIn: 0 },
        { time: new Date("2026-10-21T14:15:00-04:00"), precipIn: 0 },
        { time: new Date("2026-10-21T14:30:00-04:00"), precipIn: 0.004 }
      ],
      now,
      tz
    );
    expect(line).toMatch(/dry/i);
  });

  it("calls out the first wet nowcast step", () => {
    const line = describeNowcast(
      [
        { time: now, precipIn: 0 },
        { time: new Date("2026-10-21T14:45:00-04:00"), precipIn: 0.12 }
      ],
      now,
      tz
    );
    expect(line).toMatch(/2\s*PM/);
    expect(line).toMatch(/0\.12/);
  });

  it("returns null when the feed is empty", () => {
    expect(describeNowcast([], now, tz)).toBeNull();
  });

  it("still sees rain three hours out instead of calling the next hour dry", () => {
    const line = describeNowcast(
      [
        { time: now, precipIn: 0 },
        { time: new Date("2026-10-21T17:00:00-04:00"), precipIn: 0.08 }
      ],
      now,
      tz
    );
    expect(line).toMatch(/5\s*PM/);
    expect(line).toMatch(/0\.08/);
  });
});

describe("dayRangeLayout", () => {
  it("aligns cooler days to the left of the week's span", () => {
    const layout = dayRangeLayout([
      { lowF: 70, highF: 78 },
      { lowF: 76, highF: 88 }
    ]);
    expect(layout[0]!.left).toBe(0);
    expect(layout[1]!.left).toBeGreaterThan(layout[0]!.left);
    expect(layout[0]!.width).toBeGreaterThan(0);
    expect(layout[1]!.left + layout[1]!.width).toBeLessThanOrEqual(100);
  });
});
