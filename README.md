# Flight Whisperer — Web App

Static PWA for [Flight Whisperer](https://github.com/saurabhdamle11/flight_alert_backend): pick your location, subscribe to browser push notifications, and get alerted when a plane flies within ~25 km of you.

Live: https://flights.saurabhdamle.com · API: https://flights-api.saurabhdamle.com

## How it works

1. **Location** — browser geolocation, or city search via the [Open-Meteo geocoding API](https://open-meteo.com/en/docs/geocoding-api). Coordinates are rounded to 2 decimals (~1 km).
2. **Subscribe** — asks notification permission, creates a Push API subscription with the server's VAPID key, `POST /register` (gets a device token, kept in `localStorage`), then `POST /me/push-subscriptions`.
3. **Notifications** — `sw.js` shows each push payload and opens the flight on Flightradar24 when tapped.
4. **Unsubscribe** — removes the browser subscription and `DELETE /me` (account and location deleted).

iPhone/iPad: Web Push only works from the Home Screen app (iOS 16.4+); the page shows install steps.

## Files

| File | Purpose |
|---|---|
| `index.html`, `styles.css`, `app.js` | The page (no framework, no build step) |
| `sw.js` | Service worker: `push` → notification, `notificationclick` → open URL |
| `manifest.webmanifest`, `icons/` | PWA install metadata and icons (`icons/*.svg` are the sources) |
| `_headers` | Cloudflare Pages response headers (CSP, `no-cache` for `sw.js`) |

## Run locally

```bash
python3 -m http.server 5173
```
Open http://localhost:5173 — `localhost` counts as a secure context, and the API allows this origin via CORS.
Brave: enable "Use Google services for push messaging" in `brave://settings/privacy`.

## Deploy (Cloudflare Pages)

Connected to this GitHub repo; every push to `main` deploys. Build settings: framework preset **None**, build command empty, output directory `/`.
