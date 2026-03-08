# Carbon Collectible NFTs — Application Documentation

## Overview

This is a self-hosted clone of the **carboncollectiblenfts.com** website, served locally via a Node.js/Express server. It allows users to look up any of the 20,000 Carbon Collectible NFTs and view the corresponding hectare on a satellite map of the Avatime forest in Ghana.

The original site relied on an external backend API (`satnavapp.com/hectare_api`). This version replaces that API entirely with local data loaded from CSV files — no external API calls are needed for core functionality.

---

## Folder Structure

```
cNFTs/
├── server.js                          # Main server — handles all routes and data loading
├── data/                              # CSV data files (editable by non-developers)
│   ├── hectares.csv                   # 20,000 hectares — NFT ID to lat/lng mapping
│   ├── sites-of-interest.csv          # 72 points of interest (red dots on map)
│   └── forest-boundary.csv            # 59 boundary points (blue polygon on map)
└── site/
    └── carboncollectiblenfts.com/     # Static front-end files (React app)
        ├── index.html                 # App entry point
        ├── favicon.ico
        ├── logo192.png
        └── static/
            ├── js/
            │   └── main.462cca2c.js   # Compiled React app (patched — see below)
            ├── css/
            │   └── main.97a91641.css  # App styles
            ├── data/
            │   └── hectare_data.json  # Contains sub_divisions (static reference data)
            └── media/                 # Images and downloadable PDFs
```

---

## Starting the Server

```bash
cd C:\Users\markl\Documents\Workspace\cNFTs
RELOAD_KEY=your-secret-password node server.js
```

The server starts on **port 3003** by default. If that port is already in use it will try a random available port.

Visit: `http://localhost:3003/carboncollectiblenfts.com/`

> **Important:** The `RELOAD_KEY` environment variable must be set or the `/admin/reload` endpoint will refuse all requests. See the [Admin Endpoint](#admin-endpoint) section below.

---

## How the App Works

### User flow

1. User visits the site and goes to the `/go` page
2. They enter an NFT token number (1–20,000) and click **Navigate**
3. The app calls `/hectare_api/avatime_test/<token>` on the server
4. The server returns the latitude/longitude for that hectare, plus the forest boundary and sites of interest
5. The app redirects to `/my_hectare/avatime_test/<token>` and renders a Leaflet.js map centred on that hectare

### Map features

| Element | Source | Description |
|---|---|---|
| Hectare marker | `hectares.csv` | Blue pin at the centre of the selected hectare |
| Forest boundary | `forest-boundary.csv` | Blue polygon outlining the Avatime forest |
| Sites of interest | `sites-of-interest.csv` | Red dots marking points of interest within the forest |
| Map tiles | Mapbox (satellite) | Satellite imagery — token is domain-restricted to carboncollectiblenfts.com |

---

## Data Files

All map data is driven by three CSV files in the `data/` folder. These can be replaced by anyone — no developer or technical knowledge required.

### `data/hectares.csv`

Maps each NFT token number to a GPS coordinate.

| Column | Description |
|---|---|
| `global_plotid` | Internal plot ID (not used by server) |
| `projectid` | Project name (not used by server) |
| `nftid` | **NFT token number (1–20,000) — used as the lookup key** |
| `latitude` | Latitude of the hectare centre |
| `longitude` | Longitude of the hectare centre |
| `offsets` | Carbon offset data (not used by server) |
| `emitted` | Emissions data (not used by server) |
| `ingress` | Ingress data (not used by server) |
| `soi_text` | Site of interest text (not used by server) |
| `uuid` | Unique identifier (not used by server) |

**20,000 rows.** The server only reads `nftid`, `latitude`, and `longitude`.

---

### `data/sites-of-interest.csv`

Drives the red dots shown on the map.

| Column | Description |
|---|---|
| `ID` | Row identifier |
| `latitude` | Latitude of the point |
| `longitude` | Longitude of the point |
| `elevation` | Elevation in metres |
| `feature` | Type of feature (e.g. "trees", "ceiba") |
| `description` | Description of the feature |
| `comment` | Additional notes |

**72 rows.** The server reads `latitude` and `longitude`.

---

### `data/forest-boundary.csv`

Drives the blue boundary polygon shown on the map.

| Column | Description |
|---|---|
| `index` | Row number |
| `latitude` | Latitude of the boundary point |
| `longitude` | Longitude of the boundary point |
| `comments` | Notes |

**59 rows.** The server reads `latitude` and `longitude`. Points are connected in order to draw the polygon.

---

## Updating Data (Non-Technical Guide)

You can update any of the map data without restarting the server or touching any code.

### Locally (on your computer)

1. Replace the relevant CSV file in the `cNFTs/data/` folder (keep the same filename and column headers)
2. Visit `http://localhost:3003/admin/reload?key=your-secret-password` in your browser
3. You will see: `{"status":"ok","message":"Reloaded: 20000 hectares"}`
4. The map immediately uses the new data

### On the production server (Namecheap)

1. Log into **cPanel** → open **File Manager**
2. Navigate to the app's `data/` folder
3. Upload the new CSV file (overwriting the old one)
4. Visit `https://carboncollectiblenfts.com/admin/reload?key=your-secret-password` in your browser
5. You will see: `{"status":"ok","message":"Reloaded: 20000 hectares"}`
6. Done — no server restart, no outage

> **Tip:** Keep the column headers exactly as they are. Only the data rows need to change.

---

## API Routes

### `GET /hectare_api/:roi_name/:hectare_id`

The main data API called by the React app. Returns all data needed to render the map for a given NFT token.

**Example:** `/hectare_api/avatime_test/55`

**Response:**
```json
{
  "status": 200,
  "text": "Success",
  "data": {
    "hLatLng": [6.78924, 0.46704],
    "roi_coords": [[lat1, lat2, ...], [lng1, lng2, ...]],
    "soi_info":   [[lat1, lat2, ...], [lng1, lng2, ...]],
    "sub_divisions": { ... }
  }
}
```

| Field | Source | Description |
|---|---|---|
| `hLatLng` | `hectares.csv` | [lat, lng] of the requested hectare |
| `roi_coords` | `forest-boundary.csv` | Two arrays [latitudes], [longitudes] for the boundary polygon |
| `soi_info` | `sites-of-interest.csv` | Two arrays [latitudes], [longitudes] for the red dots |
| `sub_divisions` | `hectare_data.json` | Static reference data read once at startup |

---

### `GET /admin/reload?key=<RELOAD_KEY>`

Reloads all CSV data into memory without restarting the server.

| Response | Meaning |
|---|---|
| `{"status":"ok","message":"Reloaded: 20000 hectares"}` | Success |
| `{"status":"error","message":"Invalid or missing key"}` | Wrong or missing key (403) |
| `{"status":"error","message":"RELOAD_KEY environment variable is not set..."}` | Server misconfiguration (500) |

**Security:** Protected by the `RELOAD_KEY` environment variable. Anyone without the correct key receives a 403 error.

---

### `GET /satnavnfts-api/*`

Proxy route to `satnavnfts.com/api`. Currently unused — that server is offline (503). Kept in case it comes back online.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `RELOAD_KEY` | Yes | Secret key that protects the `/admin/reload` endpoint. Set this to any private password of your choice. |

**Setting the key:**

- **Locally:** `RELOAD_KEY=mypassword node server.js`
- **Namecheap cPanel:** Set in the "Environment Variables" section of the Node.js app configuration

---

## Patches Applied to the React App

The compiled JavaScript bundle (`static/js/main.462cca2c.js`) was patched in two places. These changes are already applied — this section documents what was changed and why, for future reference.

### Patch 1 — Absolute asset paths in `index.html`

**Problem:** When navigating directly to a deep URL like `/my_hectare/avatime_test/55`, the browser tried to load assets from relative paths (e.g. `/my_hectare/avatime_test/static/js/main.js`) which do not exist.

**Fix:** Changed all asset references in `index.html` from relative to absolute paths:
- `src="static/js/main.462cca2c.js"` → `src="/static/js/main.462cca2c.js"`
- `href="static/css/main.97a91641.css"` → `href="/static/css/main.97a91641.css"`
- `href="favicon.ico"` → `href="/favicon.ico"`

---

### Patch 2 — reCAPTCHA bypass in JS bundle

**Problem:** The Navigate button on the `/go` form triggered an invisible reCAPTCHA (`executeAsync()`) which never resolves on localhost or non-whitelisted domains, so the button appeared to do nothing.

**Fix:** Replaced the `executeAsync()` call with `Promise.resolve(true)` so the form always passes validation immediately.

---

### Patch 3 — Max NFT validation in JS bundle

**Problem:** The original form rejected token numbers above 5,750 (the original hectare count).

**Fix:** Changed the validation limit from 5,750 to 20,000 to match the full NFT collection size.

---

## Deployment on Namecheap (cPanel)

1. Upload the entire `cNFTs/` folder to your server (excluding `node_modules/`)
2. In cPanel, go to **"Setup Node.js App"**
3. Create a new app:
   - **Node.js version:** 18 or higher
   - **Application root:** path to your `cNFTs/` folder
   - **Application startup file:** `server.js`
4. Add environment variable: `RELOAD_KEY` = your chosen secret password
5. Click **"Run NPM Install"** to install dependencies
6. Start the app

Once running, the site is accessible at your domain. The CSV update process works exactly as described in the [Updating Data](#updating-data-non-technical-guide) section above, using your production domain instead of `localhost:3003`.
