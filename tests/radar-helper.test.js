import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const html = readFileSync(new URL("../public/radar-helper.html", import.meta.url), "utf8");

function mockCtx() {
  const grad = { addColorStop() {} };
  const ctx = {
    canvas: { width: 256, height: 256 },
    setTransform() {},
    resetTransform() {},
    clearRect() {},
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    ellipse() {},
    rect() {},
    fill() {},
    stroke() {},
    clip() {},
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    scale() {},
    drawImage() {},
    fillText() {},
    strokeText() {},
    measureText: (t) => ({ width: String(t).length * 6 }),
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    createConicGradient: () => grad,
    createPattern: () => ({}),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
    putImageData() {},
    setLineDash() {},
  };
  return ctx;
}

function loadHelper(search = "?offline=1") {
  const dom = new JSDOM(html, {
    url: `https://example.test/${search}`,
    pretendToBeVisual: true,
    runScripts: "dangerously",
    beforeParse(window) {
      window.requestAnimationFrame = () => 0;
      window.cancelAnimationFrame = () => {};
      window.matchMedia = (q) => ({
        matches: /reduce/.test(q) ? false : false,
        media: q,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
      });
      window.HTMLCanvasElement.prototype.getContext = function getContext(type) {
        if (type && String(type).startsWith("2d")) return mockCtx();
        return mockCtx();
      };
      window.fetch = async () => {
        throw new Error("network should stay off in helper tests");
      };
    },
  });
  return dom.window;
}

describe("radar helper page", () => {
  it("boots offline and exposes NardWeather", () => {
    const { NardWeather, document } = loadHelper();
    expect(NardWeather).toBeTruthy();
    expect(NardWeather.test.live()).toBe(false);
    expect(NardWeather.get().temp_f).toBe(82);
    expect(NardWeather.get().precip_in_hr).toBe(1.2);
    expect(document.getElementById("temp").textContent).toBe("82°");
    expect(document.getElementById("foot").textContent).toMatch(/Radar modeled/);
    expect(document.getElementById("foot").textContent).toMatch(/Oct 17 snapshot/);
  });

  it("accepts a flat set() and Nard's nested get_weather shape", () => {
    const { NardWeather, document } = loadHelper();
    NardWeather.set({
      location: "Key Biscayne, FL",
      temp_f: 88,
      feels_like_f: 95,
      humidity_pct: 70,
      wind_mph: 12,
      wind_dir_deg: 90,
      precip_in_hr: 0,
      conditions: "clear",
    });
    expect(NardWeather.get().temp_f).toBe(88);
    expect(NardWeather.get().conditions).toBe("Clear");
    expect(document.getElementById("temp").textContent).toBe("88°");
    expect(document.getElementById("placeName").textContent).toBe("Key Biscayne");

    NardWeather.set({
      location: "Homestead, FL",
      now: { temp_f: 79, feels_like_f: 80, humidity_pct: 90, wind_mph: 6, precip_in: 0.05, precip_window_min: 15 },
      wind_dir_deg: 180,
    });
    expect(NardWeather.get().temp_f).toBe(79);
    expect(NardWeather.get().precip_in_hr).toBeCloseTo(0.2, 5); // 0.05 in / 15 min → hourly
    expect(NardWeather.get().wind_dir_deg).toBe(180);
    expect(document.getElementById("placeName").textContent).toBe("Homestead");
  });

  it("switches layers through NardWeather.mode", () => {
    const { NardWeather, document } = loadHelper();
    NardWeather.mode("geo");
    expect(document.querySelector('.mode[data-m="geo"]').getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelector('.mode[data-m="radar"]').getAttribute("aria-pressed")).toBe("false");
    NardWeather.mode("wind");
    expect(document.querySelector('.mode[data-m="wind"]').getAttribute("aria-pressed")).toBe("true");
    expect(document.getElementById("legT").textContent).toMatch(/Wind/);
  });
});

describe("radar helper math", () => {
  const { NardWeather } = loadHelper();
  const T = NardWeather.test;

  it("uses Marshall–Palmer Z = 200 R^1.6", () => {
    expect(T.rateToDbz(1.2)).toBeCloseTo(47, 0);
    expect(T.dbzToRate(T.rateToDbz(1.2))).toBeCloseTo(1.2, 5);
    expect(T.dbzToRate(14)).toBe(0);
    expect(T.rateToDbz(0)).toBe(0);
  });

  it("bins rain rate the way the insight copy does", () => {
    expect(T.rateCat(0)).toBe("none");
    expect(T.rateCat(0.05)).toBe("light");
    expect(T.rateCat(0.2)).toBe("moderate");
    expect(T.rateCat(0.5)).toBe("heavy");
    expect(T.rateCat(1.2)).toBe("very heavy");
    expect(T.rateCat(2.5)).toBe("intense");
  });

  it("names compass octants and snaps the wrap at north", () => {
    expect(T.dirName(0)).toBe("N");
    expect(T.dirName(326)).toBe("NW");
    expect(T.dirName(90)).toBe("E");
    expect(T.dirName(359)).toBe("N");
  });

  it("keeps Web-Mercator tile math invertible over Miami", () => {
    const lat = 25.7743, lon = -80.1937, z = 9;
    const x = T.tileX(lon, z), y = T.tileY(lat, z);
    expect(T.tileLon(x, z)).toBeCloseTo(lon, 8);
    expect(T.tileLat(y, z)).toBeCloseTo(lat, 8);
    expect(T.ll(...T.km(lat, lon))[0]).toBeCloseTo(lat, 8);
    expect(T.ll(...T.km(lat, lon))[1]).toBeCloseTo(lon, 8);
  });

  it("uses real frames in the past and advects the latest frame ahead", () => {
    expect(T.radarFrame(-12).f).toBe("-m10m");
    expect(T.radarFrame(-50).f).toBe("-m50m");
    expect(T.radarFrame(0).f).toBe("");
    expect(T.radarFrame(0).fade).toBe(1);
    const ahead = T.radarFrame(60);
    expect(ahead.f).toBe("");
    expect(ahead.shift[0]).not.toBe(0);
    expect(ahead.fade).toBeCloseTo(1 - 60 / 260, 5);
  });

  it("converts strike distance to a thunder delay at 343 m/s", () => {
    expect(T.thunderSec(16)).toBe(47);
    expect(T.thunderSec(1.609)).toBe(5);
  });

  it("drops non-radar colours in the NWS cube", () => {
    expect(T.cubeDbz(0, 0, 0, 0)).toBe(0);
    expect(T.cubeDbz(4, 233, 231, 255)).toBeGreaterThan(0);
  });
});
