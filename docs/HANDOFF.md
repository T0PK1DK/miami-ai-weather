# Handoff prompt

Copy everything below the line into a new Claude / Cursor session.

---

You are continuing **miami-ai-weather**, a mobile-first South Florida weather helper. Repo: `https://github.com/T0PK1DK/miami-ai-weather`.

## What already exists

A Vite + TypeScript SPA (no React). Entry: `src/main.ts` → `WeatherApp` in `src/app.ts` → `renderApp` in `src/ui/render.ts`.

Domain logic is pure and tested:

- `src/lib/heat.ts` — NWS Rothfusz heat index with Steadman fallback
- `src/lib/briefing.ts` — deterministic briefing (not an LLM)
- `src/lib/flood.ts` — compound flood score
- `src/lib/activities.ts` — hour-scanned activity windows
- `src/lib/weather.ts` — Open-Meteo + NWS + NOAA tides + RainViewer + NHC via `Promise.allSettled`
- `src/lib/time.ts` — offset-free feed stamps parsed as `America/New_York`, plus stale/countdown labels
- `src/lib/snapshot-store.ts` — last good `Snapshot` per neighborhood in `localStorage`
- `src/lib/nowcast.ts` — 15-minute rain line and 10-day range-bar layout
- `src/data/neighborhoods.ts` and `src/data/king-tides.ts`

Standalone radar helper (Claude): `public/radar-helper.html` — one file, no libraries. Served at `/radar-helper.html`. Tests: `tests/radar-helper.test.js`.

Docs: `README.md`, `docs/RESEARCH.md`. Tests: `tests/*.{test.ts,test.js}`. CI: `.github/workflows/ci.yml`.

Constraints that still apply: **do not deploy**. **No personal names** in UI or docs. **No passcode / PIN gate**. Borrow ideas only — no copied assets.

## How to run

```bash
npm install
npm test
npm run dev
```

`vite.config.ts` proxies `/api/nws` → `https://api.weather.gov` and `/api/nhc` → `https://www.nhc.noaa.gov` for local CORS. Production static hosting must rely on those APIs’ own CORS; NHC may fail and the UI already degrades. The last good snapshot still paints when that happens.

## Next useful work (pick one lever)

1. **Alerts geofence** — NWS zone/county filters for Miami-Dade / Broward / Monroe instead of a single point. Expiration countdown is already on the alert cards.
2. **Tide chart** — sparkline from CO-OPS interval predictions, not just hi/lo, and flag when the next high crosses the NWS minor coastal flood threshold.
3. **Radar layers** — Vite desk already has Esri satellite + RainViewer rain. A simple in-desk legend is still open. The full-screen helper at `public/radar-helper.html` already has NEXRAD decode, GOES-East, wind, and a dBZ legend. Do not replace that file with a build step.
4. **Spanish copy** — NWS Miami publishes En Español. Add a language toggle with the same briefing rules, no LLM.
5. ~~**Offline last snapshot**~~ — done. Last good `Snapshot` is stored per place; stale-time shows on reload and when feeds fail.
6. ~~**More tests**~~ — done. `tests/weather-load.test.ts` fixtures `loadSnapshot` with mocked `fetch`.

## Invariants

- Briefing must stay deterministic and list `firedRules`.
- Heat index must stay Rothfusz, not a shortcut.
- Neighborhood flood sensitivity must keep coastal pins riskier than Doral-class inland pins.
- Particle rain must honor `prefers-reduced-motion`.
- Footer must keep official-source links and the “not a warning service” line.
- Offline snapshots must never render a cached place against a different selected pin.

After changes: `npm test && npm run build`, commit, and update this file if you add a feed or a view.

## 2026-10-24 rebase onto radar-helper

Claude's unmerged `claude/radar-helper` one-file page is kept as `public/radar-helper.html`. Overnight #3 changes (Miami look, rain/heat/season, phone polish) stay on the Vite app. Both READMEs survived. Nard PIN gating is still later / not in this repo.

## 2026-10-22 overnight pass

- **Look** — Biscayne-to-sunset shell, larger hero type, today's high/low.
- **Awareness** — no new network feeds. Rain clock folds existing Open-Meteo 15-minute precip (hourly fallback). Heat desk uses upcoming Rothfusz hours. Tropics desk adds early/peak/late climatology on top of `CurrentStorms.json`.
- Offline snapshots still revive without new `Snapshot` fields; rain/heat/season are derived at paint time.
- **Bugs** — place search and the painted select now share `searchNeighborhoods` (coast tags). Nowcast looks 6 hours ahead. NWS fetches send a User-Agent. Flood's next-6h rain includes the current hour. Heat peak ignores hours that already passed.

## 2026-10-21 improvement pass

Meaningful feature: **offline last snapshot** (lever 5). Each neighborhood’s last good `Snapshot` is written to `localStorage` (`miami-weather-snap:<placeId>`). Reload and feed failures keep the last briefing on screen with a stale-time banner. Wrong-place cache is ignored.

Also in this pass:

- Open-Meteo / NOAA wall-clock stamps parse as Eastern instead of the host timezone, so hourly labels stay honest in UTC CI and on non-Miami devices.
- Radar Leaflet maps are torn down before every paint, so Reload / unit toggle no longer leak maps.
- Alert cards show expiration countdown from the `ends` field that was already fetched.
- Now view uses the unused 15-minute nowcast; daily range bars align to the week’s min/max.
- Place search no longer jumps on the first letter (typing “k” used to load Brickell). It waits for a unique 3+ character match or an explicit select.
- Mobile: sticky filter + view chips, 44px tap targets, full-width place select, stacked hourly/daily rows, safe-area padding.
- Particle loop does not schedule frames when `prefers-reduced-motion` is set.
- Tests added for time parsing, snapshot revive, nowcast copy, stale UI, and mocked `loadSnapshot`.
