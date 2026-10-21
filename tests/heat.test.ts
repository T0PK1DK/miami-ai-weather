import { describe, expect, it } from "vitest";
import { heatCategory, heatIndexF } from "../src/lib/heat";

describe("heatIndexF", () => {
  it("stays close to air temperature in dry mild air", () => {
    expect(heatIndexF(70, 40)).toBeGreaterThan(68);
    expect(heatIndexF(70, 40)).toBeLessThan(76);
  });

  it("uses the Rothfusz branch for classic Miami heat", () => {
    const hi = heatIndexF(92, 70);
    expect(hi).toBeGreaterThan(100);
    expect(hi).toBeLessThan(115);
    expect(heatCategory(hi).level).toMatch(/caution|danger/);
  });

  it("applies the low-humidity adjustment", () => {
    const humid = heatIndexF(96, 70);
    const dry = heatIndexF(96, 10);
    expect(dry).toBeLessThan(humid);
  });

  it("applies the very-humid low-90s adjustment", () => {
    const sticky = heatIndexF(84, 90);
    const drier = heatIndexF(84, 70);
    expect(sticky).toBeGreaterThan(drier);
  });

  it("labels extreme danger above 130", () => {
    expect(heatCategory(131).level).toBe("extreme-danger");
  });
});
