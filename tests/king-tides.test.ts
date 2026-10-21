import { describe, expect, it } from "vitest";
import { isHurricaneSeason, isKingTideWindow, nextKingTideWindow } from "../src/data/king-tides";
import { placeIdAfterFilter, searchNeighborhoods as searchPlaces } from "../src/data/neighborhoods";

describe("king tides and season", () => {
  it("marks the late-October 2026 window", () => {
    expect(isKingTideWindow(new Date("2026-10-26T12:00:00-04:00"))).toBe(true);
    expect(isKingTideWindow(new Date("2026-01-05T12:00:00-05:00"))).toBe(false);
  });

  it("finds the next published window", () => {
    const next = nextKingTideWindow(new Date("2026-10-21T00:00:00-04:00"));
    expect(next?.start).toBe("2026-10-24");
  });

  it("opens Atlantic hurricane season from June through November", () => {
    expect(isHurricaneSeason(new Date("2026-06-01T12:00:00-04:00"))).toBe(true);
    expect(isHurricaneSeason(new Date("2026-11-30T12:00:00-05:00"))).toBe(true);
    expect(isHurricaneSeason(new Date("2026-12-01T12:00:00-05:00"))).toBe(false);
  });
});

describe("neighborhood search", () => {
  it("filters without requiring an exact name", () => {
    expect(searchPlaces("beach").some((n) => n.id === "south-beach")).toBe(true);
    expect(searchPlaces("xyz-nope")).toHaveLength(0);
  });

  it("switches the pin when the current place is filtered out", () => {
    expect(placeIdAfterFilter("kendall", "south-beach")).toBe("kendall");
    expect(placeIdAfterFilter("beach", "south-beach")).toBe("south-beach");
    expect(placeIdAfterFilter("xyz-nope", "doral")).toBe("doral");
  });
});
