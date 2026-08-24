# HUD Speed

A heads-up display speedometer as a Progressive Web App. Place your phone on
your car dashboard — the windshield reflects the bright digits back at you like
a real HUD. No apps to install, no accounts, no paid APIs.

![HUD Speed](https://img.shields.io/badge/status-stable-brightgreen)
![PWA](https://img.shields.io/badge/PWA-ready-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Live speed** from GPS — smooth animated display, no jitter
- **Speed bar** — yellow animated gauge from 0–160 km/h with glowing indicator
- **Speed colour ramp** — digits shift cyan → green → yellow → orange → red
- **Current road name** — free reverse geocoding via OpenStreetMap (no API key)
- **Max speed & distance** — tracked per session
- **Live clock** — always visible at the top
- **Wake lock** — screen stays on while driving
- **Installable** — add to home screen, launches fullscreen
- **Fully offline** — works without a connection after first load
- **Zero cost** — every API used is browser-native or free (OpenStreetMap)

## How it works

| Data | Source | Cost |
|------|--------|------|
| Speed | `Geolocation API` — `coords.speed` | Free (browser native) |
| Road name | Nominatim / OpenStreetMap reverse geocoding | Free, no API key |
| Screen on | Screen Wake Lock API | Free (browser native) |
| Offline | Service Worker + Cache API | Free (browser native) |
| Install | Web App Manifest | Free (browser native) |

## Quick start

### Option 1 — GitHub Pages

1. Fork or clone this repo
2. Go to **Settings → Pages**
3. Set source to `main` branch, root `/`
4. Visit `https://yourusername.github.io/speed/`

### Option 2 — Local

```bash
git clone https://github.com/yourusername/speed.git
cd speed
npx serve .

```