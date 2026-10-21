import { scoreActivities } from "../lib/activities";
import { buildBriefing } from "../lib/briefing";
import { assessFlood } from "../lib/flood";
import {
  compass,
  escapeHtml,
  formatHour,
  formatPrecip,
  formatTemp,
  formatTempUnit,
  formatTime,
  formatWeekday,
  formatWeekdayLong,
  formatWind
} from "../lib/format";
import { heatCategory, heatIndexF } from "../lib/heat";
import { dayRangeLayout, describeNowcast } from "../lib/nowcast";
import { formatTimeLeft, staleAge } from "../lib/time";
import { uvCategory } from "../lib/uv";
import { currentUv } from "../lib/weather";
import { isWetCode, weatherIcon, wmoLabel } from "../lib/wmo";
import { isHurricaneSeason, nextKingTideWindow } from "../data/king-tides";
import { NEIGHBORHOODS } from "../data/neighborhoods";
import type { Snapshot, Units, ViewId } from "../types";

export const VIEWS: Array<{ id: ViewId; label: string }> = [
  { id: "now", label: "Now" },
  { id: "hourly", label: "Hourly" },
  { id: "daily", label: "Daily" },
  { id: "radar", label: "Radar" },
  { id: "beach", label: "Beach" },
  { id: "heat", label: "Heat" },
  { id: "flood", label: "Flood" },
  { id: "tropics", label: "Tropics" },
  { id: "play", label: "Play" }
];

export function renderApp(input: {
  snapshot: Snapshot | null;
  view: ViewId;
  units: Units;
  placeId: string;
  query: string;
  loading: boolean;
  error: string | null;
  fromCache: boolean;
  radarPlaying: boolean;
  clock?: Date;
}): string {
  const clock = input.clock ?? new Date();
  const placeOptions = NEIGHBORHOODS.filter((n) => {
    const q = input.query.trim().toLowerCase();
    if (!q) return true;
    return `${n.name} ${n.area} ${n.tags.join(" ")}`.toLowerCase().includes(q);
  });
  const snap = input.snapshot && input.snapshot.place.id === input.placeId ? input.snapshot : null;
  const stale = Boolean(snap && (input.fromCache || input.loading));

  return `
    <a class="skip" href="#main">Skip to briefing</a>
    <canvas id="rain" class="rain" aria-hidden="true"></canvas>
    <header class="top">
      <div class="brand">
        <p class="kicker">Miami AI Weather</p>
        <h1>South Florida, in plain language</h1>
      </div>
    </header>
    <div class="sticky-bar">
      <div class="controls">
        <label class="sr-only" for="place-search">Filter neighborhoods</label>
        <input id="place-search" class="search" type="search" autocomplete="off" placeholder="Filter places" value="${escapeHtml(input.query)}" />
        <label class="sr-only" for="place">Neighborhood</label>
        <select id="place">
          ${placeOptions
            .map(
              (n) =>
                `<option value="${n.id}" ${n.id === input.placeId ? "selected" : ""}>${escapeHtml(n.name)} · ${escapeHtml(n.area)}</option>`
            )
            .join("")}
        </select>
        <button type="button" id="units" class="ghost" aria-label="Toggle units">${input.units === "us" ? "°F" : "°C"}</button>
        <button type="button" id="refresh" class="ghost" aria-label="Reload conditions">Reload</button>
      </div>
      <nav class="chips" aria-label="Views">
        ${VIEWS.map(
          (v) =>
            `<button type="button" data-view="${v.id}" class="${v.id === input.view ? "on" : ""}" aria-current="${v.id === input.view ? "page" : "false"}">${v.label}</button>`
        ).join("")}
      </nav>
    </div>
    <main id="main">
      ${input.loading ? `<p class="banner">Pulling live Miami conditions…</p>` : ""}
      ${input.error ? `<p class="banner error">${escapeHtml(input.error)}</p>` : ""}
      ${
        snap && stale
          ? `<p class="banner stale" role="status">Showing the last saved snapshot for ${escapeHtml(snap.place.name)} · ${escapeHtml(staleAge(snap.fetchedAt, clock))}${input.loading ? ". Checking live feeds." : input.error ? ". Live feeds missed this pass." : "."}</p>`
          : ""
      }
      ${snap ? renderBody(snap, input.view, input.units, input.radarPlaying, clock) : emptyState(input.loading)}
    </main>
    <footer class="foot">
      <p>Forecast from <a href="https://open-meteo.com/">Open-Meteo</a>. Alerts from <a href="https://www.weather.gov/mfl/">NWS Miami</a>. Tides from <a href="https://tidesandcurrents.noaa.gov/">NOAA CO-OPS</a>. Radar from <a href="https://www.rainviewer.com/api.html">RainViewer</a>. Tropics from <a href="https://www.nhc.noaa.gov/">NHC</a>.</p>
      <p>This is a helper, not a warning service. For watches and warnings use NWS and NHC.</p>
    </footer>
  `;
}

function emptyState(loading: boolean): string {
  if (loading) return `<section class="card"><p>Loading the first pin…</p></section>`;
  return `<section class="card"><p>No snapshot yet. Pick a neighborhood and refresh.</p></section>`;
}

function renderBody(snap: Snapshot, view: ViewId, units: Units, radarPlaying: boolean, clock: Date): string {
  const alerts = snap.alerts.length
    ? `<section class="alerts">${snap.alerts
        .slice(0, 4)
        .map((a) => {
          const left = a.ends ? formatTimeLeft(a.ends, clock) : "";
          return `<article class="alert">
            <strong>${escapeHtml(a.event)}</strong>
            <p>${escapeHtml(a.headline)}</p>
            ${left ? `<p class="muted">${escapeHtml(left)}</p>` : ""}
          </article>`;
        })
        .join("")}</section>`
    : "";

  const body =
    view === "hourly"
      ? hourlyView(snap, units)
      : view === "daily"
        ? dailyView(snap, units)
        : view === "radar"
          ? radarView(snap, radarPlaying)
          : view === "beach"
            ? beachView(snap, units)
            : view === "heat"
              ? heatView(snap, units)
              : view === "flood"
                ? floodView(snap, units)
                : view === "tropics"
                  ? tropicsView(snap)
                  : view === "play"
                    ? playView(snap)
                    : nowView(snap, units);

  return `${alerts}${body}`;
}

function nowView(snap: Snapshot, units: Units): string {
  const uv = currentUv(snap.hours, snap.current.time);
  const hi = heatIndexF(snap.current.tempF, snap.current.humidity);
  const brief = buildBriefing({
    place: snap.place,
    now: snap.current.time,
    timeZone: snap.timezone,
    tempF: snap.current.tempF,
    feelsF: snap.current.feelsF,
    humidity: snap.current.humidity,
    weatherCode: snap.current.weatherCode,
    windMph: snap.current.windMph,
    hours: snap.hours,
    alerts: snap.alerts,
    tides: snap.tides,
    storms: snap.storms,
    aqi: snap.aqi,
    waveFt: snap.waveFt,
    uvNow: uv
  });
  const icon = weatherIcon(snap.current.weatherCode, snap.current.isDay);
  const hours = snap.hours.filter((h) => h.time >= new Date(snap.current.time.getTime() - 30 * 60 * 1000)).slice(0, 14);
  const nowcast = describeNowcast(snap.nowcast, snap.current.time, snap.timezone);

  return `
    <section class="hero card">
      <p class="place">${escapeHtml(snap.place.name)} · ${escapeHtml(snap.place.area)}</p>
      <p class="greeting">${escapeHtml(brief.greeting)}</p>
      <div class="temp-row">
        <p class="temp">${formatTemp(snap.current.tempF, units)}<span>${formatTempUnit(units)}</span></p>
        <p class="icon" aria-hidden="true">${icon}</p>
      </div>
      <p class="lead">${escapeHtml(brief.headline)}</p>
      <p class="muted">${escapeHtml(wmoLabel(snap.current.weatherCode))} · Feels ${formatTemp(Math.max(snap.current.feelsF, hi), units)} · Heat index ${formatTemp(hi, units)}</p>
      ${nowcast ? `<p class="nowcast">${escapeHtml(nowcast)}</p>` : ""}
    </section>
    <section class="strip" aria-label="Next hours">
      ${hours
        .map(
          (h) => `<article>
            <span>${escapeHtml(formatHour(h.time, snap.timezone))}</span>
            <em class="wx" aria-hidden="true">${weatherIcon(h.weatherCode, true)}</em>
            <strong>${formatTemp(h.tempF, units)}</strong>
            <em>${h.pop}%</em>
          </article>`
        )
        .join("")}
    </section>
    <section class="grid">
      ${stat("Humidity", `${Math.round(snap.current.humidity)}%`)}
      ${stat("Wind", `${formatWind(snap.current.windMph, units)} ${compass(snap.current.windDir)}`)}
      ${stat("Gusts", formatWind(snap.current.gustMph, units))}
      ${stat("UV", uv.toFixed(0))}
      ${stat("AQI", snap.aqi === null ? "—" : String(Math.round(snap.aqi)))}
      ${stat("Pressure", `${Math.round(snap.current.pressureMb)} mb`)}
    </section>
    <section class="card brief">
      <h2>AI briefing</h2>
      <p>${escapeHtml(brief.summary)}</p>
      ${brief.sections
        .map((s) => `<article><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.body)}</p></article>`)
        .join("")}
      <ul>${brief.actions.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ul>
      <details>
        <summary>Why this brief</summary>
        <p>Rules that fired: ${escapeHtml(brief.firedRules.join(", ") || "none")}. The engine is deterministic so it can be tested. It is not a large language model.</p>
      </details>
    </section>
    ${sourceRow(snap)}
  `;
}

function hourlyView(snap: Snapshot, units: Units): string {
  const hours = snap.hours.filter((h) => h.time >= new Date(snap.current.time.getTime() - 30 * 60 * 1000)).slice(0, 36);
  return `
    <section class="card">
      <h2>Hourly</h2>
      <p class="muted">Ensemble precipitation probability, not a single-model coin flip.</p>
      <div class="table">
        ${hours
          .map(
            (h) => `<div class="row hour-row">
              <span class="when">${escapeHtml(formatWeekday(h.time, snap.timezone))} ${escapeHtml(formatTime(h.time, snap.timezone))}</span>
              <span class="wx">${weatherIcon(h.weatherCode, true)} ${formatTemp(h.tempF, units)}</span>
              <span class="pop">${h.pop}% · ${formatPrecip(h.precipIn, units)}</span>
              <span class="wind">${formatWind(h.windMph, units)}</span>
            </div>`
          )
          .join("")}
      </div>
    </section>
  `;
}

function dailyView(snap: Snapshot, units: Units): string {
  const ranges = dayRangeLayout(snap.days);
  return `
    <section class="card">
      <h2>10-day</h2>
      <div class="table">
        ${snap.days
          .map((d, i) => {
            const range = ranges[i] ?? { left: 0, width: 40 };
            return `<div class="row day-row">
              <span class="when">${escapeHtml(formatWeekdayLong(d.date, snap.timezone))}</span>
              <span class="wx">${weatherIcon(d.weatherCode, true)} ${escapeHtml(wmoLabel(d.weatherCode))}</span>
              <span class="range">
                <span class="lo">${formatTemp(d.lowF, units)}</span>
                <span class="bar"><i style="margin-left:${range.left}%;width:${range.width}%"></i></span>
                <span class="hi">${formatTemp(d.highF, units)}</span>
              </span>
              <span class="pop">${d.pop}% · UV ${d.uvMax.toFixed(0)}</span>
            </div>`;
          })
          .join("")}
      </div>
    </section>
  `;
}

function radarView(snap: Snapshot, playing: boolean): string {
  return `
    <section class="card radar-card">
      <div class="radar-head">
        <h2>Live radar</h2>
        <button type="button" id="radar-toggle" class="ghost">${playing ? "Pause" : "Play"}</button>
      </div>
      <p class="muted" id="radar-stamp">${snap.radar.frames.length ? "RainViewer mosaic over South Florida" : "Radar frames did not load. The rest of the briefing still stands."}</p>
      <div id="radar-map" role="img" aria-label="Animated radar map of South Florida"></div>
    </section>
  `;
}

function beachView(snap: Snapshot, units: Units): string {
  const uv = currentUv(snap.hours, snap.current.time);
  const uvInfo = uvCategory(uv);
  const rip =
    snap.place.coast === "atlantic" && snap.current.windMph >= 15
      ? "Onshore flow can raise rip-current risk. Swim near a lifeguard."
      : snap.place.coast === "inland"
        ? "This pin is inland. Open the South Beach or Hollywood pin for Atlantic beaches."
        : "Bay water is usually flatter than the Atlantic, but storms still end a paddle.";
  return `
    <section class="card">
      <h2>Beach desk</h2>
      <p>${escapeHtml(rip)}</p>
      <div class="grid">
        ${stat("UV", `${uv.toFixed(0)} · ${uvInfo.label}`)}
        ${stat("Wind", formatWind(snap.current.windMph, units))}
        ${stat("Seas", snap.waveFt === null ? "—" : `${snap.waveFt.toFixed(1)} ft`)}
        ${stat("Water story", isWetCode(snap.current.weatherCode) ? "Raining on the sand" : "Dry for now")}
      </div>
      <p class="muted">${escapeHtml(uvInfo.advice)}</p>
      <p><a href="https://www.weather.gov/mfl/beach">NWS Miami beach forecast</a></p>
    </section>
  `;
}

function heatView(snap: Snapshot, units: Units): string {
  const hi = heatIndexF(snap.current.tempF, snap.current.humidity);
  const cat = heatCategory(hi);
  const slice = snap.hours.slice(0, 18);
  const peak = slice.reduce<(typeof slice)[number] | null>((best, h) => {
    if (!best) return h;
    return heatIndexF(h.tempF, h.humidity) > heatIndexF(best.tempF, best.humidity) ? h : best;
  }, null);
  return `
    <section class="card">
      <h2>Heat desk</h2>
      <p class="lead">${formatTemp(hi, units)} heat index · ${escapeHtml(cat.label)}</p>
      <p>Uses the NWS Rothfusz regression, including the dry-air and very-humid adjustment branches. That is slower than a linear blend and closer to what Miami forecast offices publish.</p>
      <div class="grid">
        ${stat("Air", formatTemp(snap.current.tempF, units))}
        ${stat("Humidity", `${Math.round(snap.current.humidity)}%`)}
        ${stat("Feels like", formatTemp(snap.current.feelsF, units))}
        ${stat("Peak HI soon", peak ? `${formatTemp(heatIndexF(peak.tempF, peak.humidity), units)} at ${escapeHtml(formatHour(peak.time, snap.timezone))}` : "—")}
      </div>
    </section>
  `;
}

function floodView(snap: Snapshot, units: Units): string {
  const next6 = snap.hours
    .filter((h) => h.time >= snap.current.time)
    .slice(0, 6)
    .reduce((s, h) => s + h.precipIn, 0);
  const flood = assessFlood({
    place: snap.place,
    now: snap.current.time,
    timeZone: snap.timezone,
    next6hPrecipIn: next6,
    thunderLikely: snap.hours.some((h) => h.weatherCode >= 95),
    tides: snap.tides
  });
  const nextKing = nextKingTideWindow(snap.current.time, snap.timezone);
  return `
    <section class="card">
      <h2>Flood and tide desk</h2>
      <p class="lead">${escapeHtml(flood.level)} flood signal (${flood.score}/100)</p>
      <ul>${flood.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>
      <div class="table tide-table">
        ${snap.tides
          .slice(0, 8)
          .map(
            (t) => `<div class="row tide-row">
              <span>${t.type === "H" ? "High" : "Low"}</span>
              <span>${escapeHtml(formatTime(t.time, snap.timezone))}</span>
              <span>${t.heightFt.toFixed(2)} ft MLLW</span>
            </div>`
          )
          .join("")}
      </div>
      <p class="muted">Virginia Key NOAA station. Next 6-hour rain ${formatPrecip(next6, units)}. ${
        nextKing ? `Published king-tide window ${nextKing.start} to ${nextKing.end}.` : ""
      }</p>
    </section>
  `;
}

function tropicsView(snap: Snapshot): string {
  const open = isHurricaneSeason(snap.current.time, snap.timezone);
  return `
    <section class="card">
      <h2>Tropics desk</h2>
      <p>${open ? "Atlantic hurricane season is open (June 1–November 30)." : "Atlantic hurricane season is closed."}</p>
      ${
        snap.storms.length
          ? `<ul>${snap.storms.map((s) => `<li>${escapeHtml(s.classification)} ${escapeHtml(s.name)}</li>`).join("")}</ul>`
          : "<p>No named storms in the latest NHC active list.</p>"
      }
      <p><a href="https://www.nhc.noaa.gov/">National Hurricane Center</a> · <a href="https://www.weather.gov/mfl/">NWS Miami</a></p>
    </section>
  `;
}

function playView(snap: Snapshot): string {
  const acts = scoreActivities({
    place: snap.place,
    now: snap.current.time,
    hours: snap.hours,
    waveFt: snap.waveFt,
    aqi: snap.aqi
  });
  return `
    <section class="card">
      <h2>When to go out</h2>
      <p class="muted">Each activity is scored hour-by-hour on heat, lightning, rain, UV, wind, and air. The engine prefers the quieter window even if that means waiting.</p>
      <div class="acts">
        ${acts
          .map(
            (a) => `<article>
              <header><strong>${escapeHtml(a.label)}</strong><em class="${a.level}">${a.level}</em></header>
              <p>${escapeHtml(a.reasons[0] ?? "Looks open.")}</p>
              <p class="muted">${
                a.bestWindow
                  ? `Best: ${escapeHtml(formatHour(a.bestWindow.start, snap.timezone))}–${escapeHtml(formatHour(a.bestWindow.end, snap.timezone))}`
                  : "No clear window"
              }</p>
            </article>`
          )
          .join("")}
      </div>
    </section>
  `;
}

function stat(label: string, value: string): string {
  return `<article class="stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
}

function sourceRow(snap: Snapshot): string {
  const bits = Object.entries(snap.sources)
    .map(([k, ok]) => `${k}${ok ? "" : " (offline)"}`)
    .join(" · ");
  return `<p class="muted sources">Feeds: ${escapeHtml(bits)}. Updated ${escapeHtml(formatTime(snap.fetchedAt, snap.timezone))}.</p>`;
}
