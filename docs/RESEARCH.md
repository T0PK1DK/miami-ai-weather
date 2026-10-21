# Research: Miami-first weather helpers

The repo started as a one-line concept: a mobile-first Miami AI weather helper with radar, particle rain, and filterable views. This note compares live products and official South Florida sources, then lists patterns this app borrowed as *ideas* only. No third-party code, icons, or radar palettes were copied.

## Comparable consumer apps

| Product | What it is good at | Pattern worth borrowing |
| --- | --- | --- |
| [The Weather Channel / weather.com](https://weather.com/) | Hero temperature, hourly strip, activity planner, radar with a playhead, 15-minute rain timing | Lead with a one-line nowcast, then a storm clock and activity scores |
| [Apple Weather](https://weatherkit.apple.com/) ([Mobbin home](https://mobbin.com/screens/19c0e840-fd25-46f0-beca-25889871bc2d), [map flow](https://mobbin.com/flows/b2c15ac2-a55c-4234-a0c9-55f87f12cdd0)) | Huge type, narrative sentence, 10-day range bars, precipitation map with intensity legend | Large type, a written headline, hourly strip, map as a first-class view |
| [AccuWeather](https://www.accuweather.com/) | MinuteCast-style timing and health/UV cards | Precise rain timing from 15-minute HRRR nowcast |
| [Weather Underground](https://www.wunderground.com/) | Station-level neighborhood feel | Neighborhood pins instead of one “Miami” point |
| [Carrot Weather](https://www.meetcarrot.com/weather/) | Personality without hiding the numbers | A briefing written in complete sentences |
| [Windy](https://www.windy.com/) | Map-first layers | Dark basemap plus a radar overlay you can play |
| [RadarScope](https://www.radarscope.app/) / [MyRadar](https://myradar.com/) | Serious radar, storm tracks | Animated mosaic, pause/play, pin on the selected neighborhood |
| [Flighty weather layers](https://mobbin.com/screens/b91ec468-a3cb-4636-ba84-410cc038dec0) | Explicit radar vs model layer picker | Honest source labels (RainViewer mosaic vs model rain) |
| [Tide Guide](https://mobbin.com/screens/a9580790-ccec-4905-8b5a-3e1580c4a7d4) | Tide curve next to weather | High/low table from a real NOAA station |
| [AllTrails conditions](https://mobbin.com/screens/70abd958-8899-425b-992f-9d6e6b6ab872) | Activity-specific heat, UV, and terrain notes | Per-activity scores, not one generic “outdoor” flag |

Weather Channel radar and today flows reviewed on Mobbin: [Radar](https://mobbin.com/flows/1ad8b657-4d75-40d6-bb4b-fe3e4b99a223), [Today's weather](https://mobbin.com/flows/cb788d54-f98a-41f6-a4ae-c77bfa845f73).

## Official South Florida sources

- [NWS Forecast Office Miami – South Florida](https://www.weather.gov/mfl/) — local office of record for warnings, beach, heat, and the area forecast discussion.
- [NWS Miami forecast products](https://www.weather.gov/mfl/forecast) — KAMX radar, hourly view, beach, heat, tropical, and graphical forecasts. NWS Miami still treats **afternoon sea-breeze storms**, **heat index in the 100s**, and **Atlantic rip currents** as the everyday hazards.
- [NWS API](https://www.weather.gov/documentation/services-web-api) — `https://api.weather.gov`, open data, User-Agent required, alerts at `/alerts/active?point={lat},{lon}`.
- [National Hurricane Center](https://www.nhc.noaa.gov/) — Atlantic watches, named storms, and season context. Season is 1 June–30 November.
- [NOAA CO-OPS tides](https://tidesandcurrents.noaa.gov/) — Virginia Key station `8723214` is the practical Miami tide reference.
- [Miami-Dade flooding](https://www.miamidade.gov/initiative/weather-ready/flooding/home.page) — rainy season 15 May–15 Oct; king tides, storm surge, and heavy-rain street flooding are separate threats that stack.
- [Miami-Dade flood zone maps](https://www.miamidade.gov/global/economy/building/flood-protection/flood-zone-maps.page) — limestone, high water table, and low elevation mean water can come up through drains on a clear day.
- [City of Coral Gables king tides](https://www.coralgables.com/department/public-works/right-way-maintenance-enforcement-division/services/waterways/king-tides) — 2026 windows including 7–13 Oct and 22 Oct–12 Nov; NOAA “minor flooding” threshold language.
- [Open-Meteo forecast API](https://open-meteo.com/en/docs) — free, no key, current + hourly + daily + 15-minute precipitation, WMO weather codes, ensemble precipitation probability.
- [RainViewer weather maps API](https://www.rainviewer.com/api.html) — public mosaic timestamps and tile paths.

## South Florida weather that generic apps miss

1. **Sea-breeze thunderstorms** — often quiet mornings, then towers after lunch on the interior and east metro. A briefing that only says “40% chance of rain” is weaker than a storm clock.
2. **Heat index, not just air temperature** — NWS Miami routinely cites 105–110° heat index. The published method is the [Rothfusz regression](https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml), not a linear “feels like.”
3. **Compound flooding** — king tide + stalling core + porous limestone. Coastal pins (South Beach, Brickell, Key Biscayne) are not the same as Doral.
4. **Rip currents** — a high-frequency Atlantic hazard independent of the rain story.
5. **Hurricane season as a standing desk** — even with no named storm, the season is open and NHC is the source of truth.
6. **Neighborhood grain** — “Miami” is a metro. Downtown, Kendall, Homestead, and Hollywood do not share one flood or beach story.

## Product decisions

| Decision | Why |
| --- | --- |
| Deterministic “AI briefing” instead of a hosted LLM | Testable, no key, no surprise copy, no personal names. Rules are listed under “Why this brief.” |
| Rothfusz heat index | Slower than a shortcut blend; matches NWS publications. |
| Ensemble precipitation probability + 15-minute nowcast | Better timing than a single deterministic hourly pop. |
| `Promise.allSettled` across feeds | A dead NHC or tide call must not blank the forecast. |
| Neighborhood filter chips + view chips | Borrowed from Weather Channel / Apple filter patterns, implemented with original UI. |
| Particle rain driven by live precip and wind | Visual nowcast, respects `prefers-reduced-motion`. |
| No accounts, no PIN, no deploy | Scope of this upgrade. Official warnings stay on NWS/NHC. |

## Sources

1. [weather.com](https://weather.com/)
2. [NWS Miami](https://www.weather.gov/mfl/)
3. [NWS Miami forecast](https://www.weather.gov/mfl/forecast)
4. [NWS API docs](https://www.weather.gov/documentation/services-web-api)
5. [NHC](https://www.nhc.noaa.gov/)
6. [Open-Meteo docs](https://open-meteo.com/en/docs)
7. [RainViewer API](https://www.rainviewer.com/api.html)
8. [NOAA CO-OPS](https://tidesandcurrents.noaa.gov/)
9. [Miami-Dade flooding](https://www.miamidade.gov/initiative/weather-ready/flooding/home.page)
10. [Coral Gables king tides](https://www.coralgables.com/department/public-works/right-way-maintenance-enforcement-division/services/waterways/king-tides)
11. [NWS heat index equation](https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml)
12. [Mobbin: Apple Weather](https://mobbin.com/screens/19c0e840-fd25-46f0-beca-25889871bc2d)
13. [Mobbin: Weather Channel today](https://mobbin.com/screens/1c6acbe7-6b08-4c7c-ab73-4f6f1bf8a76e)
