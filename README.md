# Miami AI Weather

Mobile-first helper for South Florida weather: live conditions, a written briefing, neighborhood filters, animated radar, particle rain, tides, heat, and activity windows.

This is not a warning service. For watches and warnings use [NWS Miami](https://www.weather.gov/mfl/) and the [National Hurricane Center](https://www.nhc.noaa.gov/).

## Use it

```bash
npm install
npm test
npm run dev
```

Open `http://127.0.0.1:5173`. Pick a neighborhood, then switch views with the chips: Now, Hourly, Daily, Radar, Beach, Heat, Flood, Tropics, Play.

```bash
npm run build
npm run preview
```

There is no account, no PIN, and no deploy step in this repo.

## What it does

- **Now** — large temperature, hourly strip, Rothfusz heat index, and a deterministic AI briefing
- **Radar** — RainViewer mosaic on a dark map, play/pause, pin on the selected place
- **Particle rain** — canvas drops scale with live precipitation and wind
- **Filterable views** — neighborhood search plus nine desks (beach, heat, flood, tropics, play)
- **Flood desk** — Virginia Key tides plus king-tide windows and a compound-flood score
- **Play desk** — hour-by-hour scores for beach, run, commute, patio, boat, and kids

## Data

| Feed | Link |
| --- | --- |
| Forecast, air, marine | [Open-Meteo](https://open-meteo.com/en/docs) |
| Alerts | [NWS API](https://www.weather.gov/documentation/services-web-api) |
| Local office | [NWS Miami](https://www.weather.gov/mfl/) |
| Tides | [NOAA CO-OPS](https://tidesandcurrents.noaa.gov/) |
| Radar | [RainViewer API](https://www.rainviewer.com/api.html) |
| Tropics | [NHC](https://www.nhc.noaa.gov/) |
| Heat method | [NWS heat index equation](https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml) |

## Docs

- [Research notes](docs/RESEARCH.md)
- [Handoff prompt](docs/HANDOFF.md)

## Tests

`npm test` covers heat index branches, flood scoring, briefing leads, activity windows, king-tide dates, and formatters. CI runs tests and `npm run build`.
