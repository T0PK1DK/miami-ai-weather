import L from "leaflet";
import { DEFAULT_PLACE_ID, findNeighborhood, placeIdAfterFilter, searchNeighborhoods } from "./data/neighborhoods";
import { escapeHtml } from "./lib/format";
import { RainField } from "./lib/particles";
import { clampFrame } from "./lib/radar";
import { isWetCode } from "./lib/wmo";
import { loadSnapshot } from "./lib/weather";
import { renderApp } from "./ui/render";
import type { Snapshot, Units, ViewId } from "./types";

const PLACE_KEY = "miami-weather-place";
const UNITS_KEY = "miami-weather-units";
const VIEWS: ViewId[] = ["now", "hourly", "daily", "radar", "beach", "heat", "flood", "tropics", "play"];

type State = {
  placeId: string;
  view: ViewId;
  units: Units;
  query: string;
  loading: boolean;
  error: string | null;
  snapshot: Snapshot | null;
  radarPlaying: boolean;
  radarFrame: number;
};

export class WeatherApp {
  private root: HTMLElement;
  private rain: RainField | null = null;
  private map: L.Map | null = null;
  private radarLayer: L.TileLayer | null = null;
  private radarTimer = 0;
  private loadToken = 0;
  private state: State = {
    placeId: readStored(PLACE_KEY, DEFAULT_PLACE_ID),
    view: "now",
    units: readStored(UNITS_KEY, "us") === "metric" ? "metric" : "us",
    query: "",
    loading: true,
    error: null,
    snapshot: null,
    radarPlaying: true,
    radarFrame: 0
  };

  constructor(root: HTMLElement) {
    this.root = root;
  }

  start(): void {
    this.paint();
    void this.refresh();
    window.addEventListener("resize", () => this.rain?.resize());
  }

  private paint(): void {
    const rainCanvas = this.root.querySelector("#rain");
    this.root.innerHTML = renderApp(this.state);
    this.bind();
    this.mountRain(rainCanvas);
    if (this.state.view === "radar") this.mountRadar();
  }

  private bind(): void {
    this.root.querySelector("#place")?.addEventListener("change", (event) => {
      const id = (event.target as HTMLSelectElement).value;
      this.state.placeId = id;
      localStorage.setItem(PLACE_KEY, id);
      void this.refresh();
    });
    this.root.querySelector("#place-search")?.addEventListener("input", (event) => {
      this.state.query = (event.target as HTMLInputElement).value;
      this.syncPlaceOptions();
    });
    this.root.querySelector("#units")?.addEventListener("click", () => {
      this.state.units = this.state.units === "us" ? "metric" : "us";
      localStorage.setItem(UNITS_KEY, this.state.units);
      this.paint();
    });
    this.root.querySelector("#refresh")?.addEventListener("click", () => {
      void this.refresh();
    });
    this.root.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const view = btn.dataset.view;
        if (view && isView(view)) {
          this.teardownRadar();
          this.state.view = view;
          this.paint();
        }
      });
    });
    this.root.querySelector("#radar-toggle")?.addEventListener("click", () => {
      this.state.radarPlaying = !this.state.radarPlaying;
      this.syncRadarPlayback();
      const btn = this.root.querySelector("#radar-toggle");
      if (btn) btn.textContent = this.state.radarPlaying ? "Pause" : "Play";
    });
  }

  private syncPlaceOptions(): void {
    const select = this.root.querySelector("#place") as HTMLSelectElement | null;
    if (!select) return;
    const matches = searchNeighborhoods(this.state.query);
    select.innerHTML = matches
      .map((n) => `<option value="${n.id}">${escapeHtml(n.name)} · ${escapeHtml(n.area)}</option>`)
      .join("");
    const nextId = placeIdAfterFilter(this.state.query, this.state.placeId);
    if (matches.length === 0) return;
    select.value = nextId;
    if (nextId !== this.state.placeId) {
      this.state.placeId = nextId;
      localStorage.setItem(PLACE_KEY, nextId);
      void this.refresh();
    }
  }

  private async refresh(): Promise<void> {
    const token = ++this.loadToken;
    this.state.loading = true;
    this.state.error = null;
    this.paint();
    try {
      const snap = await loadSnapshot(findNeighborhood(this.state.placeId));
      if (token !== this.loadToken) return;
      this.state.snapshot = snap;
      this.state.loading = false;
      this.state.radarFrame = Math.max(0, snap.radar.frames.length - 1);
      this.paint();
    } catch (error) {
      if (token !== this.loadToken) return;
      this.state.loading = false;
      this.state.error = error instanceof Error ? error.message : "Could not load weather.";
      this.paint();
    }
  }

  private mountRain(previous: Element | null): void {
    const canvas = this.root.querySelector("#rain") as HTMLCanvasElement | null;
    if (!canvas) return;
    if (previous instanceof HTMLCanvasElement && previous.parentElement) {
      previous.remove();
    }
    this.rain?.stop();
    this.rain = new RainField(canvas);
    const snap = this.state.snapshot;
    this.rain.setWeather({
      precipInPerHour: snap?.current.precipIn ?? 0,
      windMph: snap?.current.windMph ?? 8,
      windDir: snap?.current.windDir ?? 90,
      isWet: snap ? isWetCode(snap.current.weatherCode) : false
    });
    this.rain.start();
  }

  private mountRadar(): void {
    const el = this.root.querySelector("#radar-map");
    const snap = this.state.snapshot;
    if (!(el instanceof HTMLElement) || !snap) return;
    this.map = L.map(el, { zoomControl: true, attributionControl: true, minZoom: 5, maxZoom: 11 }).setView(
      [snap.place.lat, snap.place.lon],
      8
    );
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics",
      maxZoom: 11
    }).addTo(this.map);
    L.circleMarker([snap.place.lat, snap.place.lon], {
      radius: 7,
      color: "#fb7185",
      fillColor: "#fb7185",
      fillOpacity: 0.9,
      weight: 2
    })
      .addTo(this.map)
      .bindTooltip(snap.place.name);
    this.applyRadarFrame();
    this.syncRadarPlayback();
    requestAnimationFrame(() => this.map?.invalidateSize());
  }

  private applyRadarFrame(): void {
    const snap = this.state.snapshot;
    if (!this.map || !snap || snap.radar.frames.length === 0) return;
    const frame = snap.radar.frames[clampFrame(this.state.radarFrame, snap.radar.frames.length)];
    if (!frame) return;
    if (this.radarLayer) this.map.removeLayer(this.radarLayer);
    this.radarLayer = L.tileLayer(`${snap.radar.host.replace(/\/$/, "")}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`, {
      opacity: 0.72,
      zIndex: 4,
      maxNativeZoom: 7,
      maxZoom: 11,
      minZoom: 3
    }).addTo(this.map);
    const stamp = this.root.querySelector("#radar-stamp");
    if (stamp) stamp.textContent = `Radar ${frame.time.toLocaleTimeString("en-US", { timeZone: snap.timezone })}`;
  }

  private syncRadarPlayback(): void {
    window.clearInterval(this.radarTimer);
    if (!this.state.radarPlaying) return;
    this.radarTimer = window.setInterval(() => {
      const n = this.state.snapshot?.radar.frames.length ?? 0;
      if (n === 0) return;
      this.state.radarFrame = clampFrame(this.state.radarFrame + 1, n);
      this.applyRadarFrame();
    }, 700);
  }

  private teardownRadar(): void {
    window.clearInterval(this.radarTimer);
    this.map?.remove();
    this.map = null;
    this.radarLayer = null;
  }
}

function isView(value: string): value is ViewId {
  return VIEWS.includes(value as ViewId);
}

function readStored(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
