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
- `src/data/neighborhoods.ts` and `src/data/king-tides.ts`

Docs: `README.md`, `docs/RESEARCH.md`. Tests: `tests/*.test.ts`. CI: `.github/workflows/ci.yml`.

Constraints that still apply: **do not deploy**. **No personal names** in UI or docs. **No passcode / PIN gate**. Borrow ideas only — no copied assets.

## How to run

```bash
npm install
npm test
npm run dev
```

`vite.config.ts` proxies `/api/nws` → `https://api.weather.gov` and `/api/nhc` → `https://www.nhc.noaa.gov` for local CORS. Production static hosting must rely on those APIs’ own CORS; NHC may fail and the UI already degrades.

## Next useful work (pick one lever)

1. **Alerts geofence** — NWS zone/county filters for Miami-Dade / Broward / Monroe instead of a single point, and show expiration countdown.
2. **Tide chart** — sparkline from CO-OPS interval predictions, not just hi/lo, and flag when the next high crosses the NWS minor coastal flood threshold.
3. **Radar layers** — satellite + rain + a simple legend; keep play/pause. RainViewer satellite paths are in the same `weather-maps.json`.
4. **Spanish copy** — NWS Miami publishes En Español. Add a language toggle with the same briefing rules, no LLM.
5. **Offline last snapshot** — persist the last good `Snapshot` and show stale-time when feeds fail.
6. **More tests** — fixture `loadSnapshot` with mocked `fetch` so CI asserts parser shape without the network.

## Invariants

- Briefing must stay deterministic and list `firedRules`.
- Heat index must stay Rothfusz, not a shortcut.
- Neighborhood flood sensitivity must keep coastal pins riskier than Doral-class inland pins.
- Particle rain must honor `prefers-reduced-motion`.
- Footer must keep official-source links and the “not a warning service” line.

After changes: `npm test && npm run build`, commit, and update this file if you add a feed or a view.
