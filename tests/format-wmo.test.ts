import { describe, expect, it } from "vitest";
import { compass, escapeHtml, formatPrecip, formatTemp, formatWind } from "../src/lib/format";
import { isThunderCode, isWetCode, wmoLabel } from "../src/lib/wmo";
import { uvCategory } from "../src/lib/uv";
import { clampFrame, radarTileUrl } from "../src/lib/radar";
import { currentUv } from "../src/lib/weather";

describe("formatters", () => {
  it("converts units without rounding traps", () => {
    expect(formatTemp(86, "metric")).toBe("30°");
    expect(formatTemp(86, "us")).toBe("86°");
    expect(formatWind(10, "metric")).toBe("16 km/h");
    expect(formatPrecip(0.25, "metric")).toBe("6 mm");
    expect(compass(90)).toBe("E");
    expect(escapeHtml('<x & "y">')).toBe("&lt;x &amp; &quot;y&quot;&gt;");
  });
});

describe("WMO and UV", () => {
  it("maps thunderstorm codes", () => {
    expect(wmoLabel(95)).toBe("Thunderstorm");
    expect(isThunderCode(95)).toBe(true);
    expect(isWetCode(61)).toBe(true);
    expect(isWetCode(2)).toBe(false);
    expect(uvCategory(11).level).toBe("extreme");
    expect(uvCategory(1).level).toBe("low");
  });
});

describe("radar helpers", () => {
  it("builds a RainViewer tile URL and wraps frames", () => {
    expect(radarTileUrl("https://tilecache.rainviewer.com", "/v2/radar/abc", 8, 72, 110)).toBe(
      "https://tilecache.rainviewer.com/v2/radar/abc/256/8/72/110/2/1_1.png"
    );
    expect(clampFrame(5, 4)).toBe(1);
    expect(clampFrame(-1, 4)).toBe(3);
  });
});

describe("currentUv", () => {
  it("picks the hour nearest to now", () => {
    const now = new Date("2026-05-01T15:10:00Z");
    const uv = currentUv(
      [
        { time: new Date("2026-05-01T13:00:00Z"), uv: 3 } as never,
        { time: new Date("2026-05-01T15:00:00Z"), uv: 9 } as never
      ],
      now
    );
    expect(uv).toBe(9);
  });
});
