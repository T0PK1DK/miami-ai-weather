import { describe, expect, it } from "vitest";
import { isHurricaneSeason } from "../src/data/king-tides";
import { hurricaneSeasonStatus } from "../src/lib/season";

describe("hurricaneSeasonStatus", () => {
  it("marks early, peak, late, and closed phases without changing the open window", () => {
    const early = hurricaneSeasonStatus(new Date("2026-06-01T12:00:00-04:00"));
    const peak = hurricaneSeasonStatus(new Date("2026-09-10T12:00:00-04:00"));
    const late = hurricaneSeasonStatus(new Date("2026-10-22T12:00:00-04:00"));
    const closed = hurricaneSeasonStatus(new Date("2026-12-01T12:00:00-05:00"));

    expect(early.phase).toBe("early");
    expect(peak.phase).toBe("peak");
    expect(late.phase).toBe("late");
    expect(closed.phase).toBe("off");
    expect(early.open).toBe(true);
    expect(peak.open).toBe(true);
    expect(late.open).toBe(true);
    expect(closed.open).toBe(false);
    expect(isHurricaneSeason(new Date("2026-06-01T12:00:00-04:00"))).toBe(early.open);
    expect(isHurricaneSeason(new Date("2026-12-01T12:00:00-05:00"))).toBe(closed.open);
  });

  it("counts calendar days left in an open season", () => {
    const late = hurricaneSeasonStatus(new Date("2026-10-22T12:00:00-04:00"));
    const last = hurricaneSeasonStatus(new Date("2026-11-30T12:00:00-05:00"));
    expect(late.daysLeft).toBe(39);
    expect(last.daysLeft).toBe(0);
    expect(last.open).toBe(true);
  });
});
