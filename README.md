# miami-ai-weather

Mobile-first Miami AI Weather Helper: a live radar map of South Florida with particle rain, lightning and a short
practical insight. It's one self-contained file, `index.html`, with no dependencies and no build step. Open it in any browser.

## What's on screen
- **Map**: stylised South Florida coast, Biscayne Bay, the Keys, I-95 / Turnpike / US-1 / Tamiami Trail, the KAMX radar
  sweep and range rings. Drag to pan, pinch or scroll to zoom, tap anywhere to check that spot, ⌖ to come back to Miami.
- **Layers**: Radar (dBZ ramp green → yellow → orange → red → magenta), GeoColor (simulated satellite clouds lit by the
  low western sun, with shadows), Wind (streamlines, including gust-front outflow from the heavy cores).
- **HUD**: temperature dial (feels-like marker), wind compass, and a bottom panel with the insight, a 3-hour rain strip for
  the selected spot (it doubles as the loop scrubber), and stats.
- **Rain and lightning**: drop density follows the rain rate at the selected spot. Drop tilt follows the real wind vector
  (gravity plus horizontal drift ≈ wind speed ÷ ~9 m/s terminal fall speed). Lightning fires from cores ≥ 42 dBZ. A strike
  within ~10 mi flashes the screen and shows the distance and the thunder delay (distance ÷ 343 m/s).

## One model, three views
Everything comes from one deterministic field: storm cells built from Gaussian cores in linear Z. A bowed leading line with
trailing stratiform sits over you now, the next band builds upstream, and scattered sea-breeze cells pop up and die.
The cells are steered at 1.6× the surface wind, and each one grows and decays over its own lifetime.
- Rain rate uses Marshall–Palmer, `Z = 200 R^1.6`. The model is calibrated so the observation point reads the observed
  rate right now (1.2 in/hr ≈ 47 dBZ).
- The radar, the clouds, the wind outflow, the rain overlay, the lightning, the storm track (+15/+30 min) and the
  insight text all read this same field, so they always agree.
- It is **modeled, not live radar**, and the page says so in its footer.

## Data in
| Source | How |
|---|---|
| Built-in snapshot | `SNAPSHOT` at the top of the script (Miami, Oct 17 2026 late afternoon: 82°F / feels 84°, rain 1.2 in/hr, wind 7 mph from 326°, 83% RH) |
| Open-Meteo (no key) | open `index.html?live=1` |
| JS | `NardWeather.set({...})`, `NardWeather.mode("radar"\|"geo"\|"wind")`, `NardWeather.focus(lat, lon)` |
| Parent frame | `postMessage({ type: "nard-weather", data }, "*")` (only accepted from `window.parent`) |

`set()` accepts this file's flat shape or Nard's `get_weather` tool output (`{ location, now: { temp_f, feels_like_f,
humidity_pct, wind_mph, precip_in, conditions } }`). Add `wind_dir_deg` (and optionally `precip_in_hr`).

## Nard integration (later, not done yet)
- The colour tokens are copied from NARD 2.0 (`public/nard-2.0/css/nard.css`): dark, muted amber and cool mono. Radar
  colours are data colours. The insight is labelled "Nard · insight".
- Planned: serve it as `public/weather/index.html` behind the passcode gate (no new public paths). Feed it from
  `/api/today` or the `get_weather` tool. Add `wind_direction_10m` to that tool's Open-Meteo `current=` list and return it
  as `now.wind_dir_deg`. That's an additive field, and the export format is unaffected.
- The insight text is built on the device from the nowcast, so it costs zero neurons. An optional Workers AI rewrite
  could come later.
