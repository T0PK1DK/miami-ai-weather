import { describe, expect, it } from "vitest";
import { assessFlood } from "../src/lib/flood";
import { findNeighborhood } from "../src/data/neighborhoods";

describe("assessFlood", () => {
  const southBeach = findNeighborhood("south-beach");
  const doral = findNeighborhood("doral");

  it("raises risk on a coastal king-tide plus rain stack", () => {
    const during = assessFlood({
      place: southBeach,
      now: new Date("2026-10-26T16:00:00-04:00"),
      next6hPrecipIn: 0.6,
      thunderLikely: true,
      tides: [{ time: new Date("2026-10-26T17:30:00-04:00"), heightFt: 2.1, type: "H" }]
    });
    const quiet = assessFlood({
      place: doral,
      now: new Date("2026-01-12T10:00:00-05:00"),
      next6hPrecipIn: 0,
      thunderLikely: false,
      tides: []
    });
    expect(during.score).toBeGreaterThan(quiet.score);
    expect(during.kingTide).toBe(true);
    expect(["high", "severe"]).toContain(during.level);
    expect(quiet.level).toBe("low");
  });

  it("treats inland Doral as less flood-sensitive than South Beach", () => {
    const now = new Date("2026-07-01T15:00:00-04:00");
    const beach = assessFlood({
      place: southBeach,
      now,
      next6hPrecipIn: 0.2,
      thunderLikely: false,
      tides: []
    });
    const inland = assessFlood({
      place: doral,
      now,
      next6hPrecipIn: 0.2,
      thunderLikely: false,
      tides: []
    });
    expect(beach.score).toBeGreaterThan(inland.score);
  });
});
