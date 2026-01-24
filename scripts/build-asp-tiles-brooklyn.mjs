// scripts/build-asp-tiles-brooklyn.mjs
// Offline builder: fetch Socrata once, convert to AspPoint, tile into 4x4 grid matching centerline,
// output tile_0_0.json ... tile_3_3.json as JSON arrays of AspPoint.
//
// NOTE: This is an OFFLINE build-time script. It is not used at runtime.
// Run on your machine: `node scripts/build-asp-tiles-brooklyn.mjs`

import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"

// --- Locked to match centerline grid ---
const TILE_COLS = 4
const TILE_ROWS = 4
const TILE_BBOX = {
  west: -74.05,
  south: 40.56,
  east: -73.83,
  north: 40.74,
}

// --- Source (offline only) ---
const DATASET_URL = "https://data.cityofnewyork.us/resource/2x64-6f34.json"

// Pagination (same scale as runtime model)
const PAGE_SIZE = 5000
const MAX_PAGES = 80 // safety cap (offline)

// Retry behavior
const MAX_RETRIES = 5
const BASE_BACKOFF_MS = 350

// Request timeout for each page
const PAGE_TIMEOUT_MS = 20000

// Output folder (you can change this later if you want)
const OUT_DIR = path.join(process.cwd(), "out", "asp", "brooklyn")

// EPSG:2263 (NAD83 / New York Long Island (ftUS)) <-> WGS84
const EPSG2263 =
  "+proj=lcc +lat_1=40.66666666666666 +lat_2=41.03333333333333 +lat_0=40.16666666666666 " +
  "+lon_0=-74 +x_0=300000 +y_0=0 +datum=NAD83 +units=us-ft +no_defs"

// --- Helpers (must match runtime route logic) ---
async function loadProj4() {
  const mod = await import("proj4")
  const fn = mod?.default ?? mod
  if (typeof fn !== "function") throw new Error("proj4 import resolved, but is not a function")
  return fn
}

// Clean + normalize sign text (copy of route.ts logic)
function cleanRuleText(raw) {
  if (!raw) return ""
  let t = String(raw)

  t = t.replace(/[’']/g, "'")
  t = t.replace(/\s+/g, " ").trim()

  t = t.replace(/\bSANITATION\s+BROOM\s+SYMBOL\b/gi, "").trim()
  t = t.replace(/\bSUPERSEDES\b.*$/gi, "").trim()

  t = t.replace(/\s{2,}/g, " ").trim()
  return t
}

function normalizeSideLetter(v) {
  const s = String(v || "").trim().toUpperCase()
  if (s.startsWith("N")) return "N"
  if (s.startsWith("S")) return "S"
  if (s.startsWith("E")) return "E"
  if (s.startsWith("W")) return "W"
  return s ? s[0] : ""
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

// Must match centerline tileIndexForLonLat exactly
function tileIndexForLonLat(lon, lat) {
  const x = (lon - TILE_BBOX.west) / (TILE_BBOX.east - TILE_BBOX.west)
  const y = (lat - TILE_BBOX.south) / (TILE_BBOX.north - TILE_BBOX.south)
  return {
    col: clamp(Math.floor(x * TILE_COLS), 0, TILE_COLS - 1),
    row: clamp(Math.floor(y * TILE_ROWS), 0, TILE_ROWS - 1),
  }
}

// EPSG:2263 -> WGS84, returns {lat,lon} or null (same sanity bounds as route.ts)
function xyToLatLon(proj4, x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  try {
    const [lon, lat] = proj4(EPSG2263, "WGS84", [x, y])
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

    // sanity bounds for NYC area (copied from route.ts)
    if (lat < 40.3 || lat > 41.2) return null
    if (lon < -74.6 || lon > -73.4) return null

    return { lat, lon }
  } catch {
    return null
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchJsonWithTimeout(url, ms) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), ms)
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal })
    const text = await res.text()
    if (!res.ok) {
      return { ok: false, status: res.status, text }
    }
    try {
      const json = JSON.parse(text)
      return { ok: true, json }
    } catch {
      return { ok: false, status: res.status, text: `Non-JSON: ${text.slice(0, 200)}` }
    }
  } finally {
    clearTimeout(t)
  }
}

async function fetchPageWithRetries(url) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const r = await fetchJsonWithTimeout(url, PAGE_TIMEOUT_MS)

    if (r.ok) {
      const rows = r.json
      return Array.isArray(rows) ? rows : []
    }

    // Retry 5xx + network-ish failures. (Socrata sometimes returns 500.)
    const status = r.status
    const shouldRetry = status >= 500 || status === 0
    if (!shouldRetry || attempt === MAX_RETRIES) {
      throw new Error(`Socrata fetch failed (status ${status}): ${String(r.text || "").slice(0, 240)}`)
    }

    await sleep(BASE_BACKOFF_MS * attempt * attempt)
  }

  return []
}

function ensureTileBuckets() {
  const tiles = new Map()
  for (let c = 0; c < TILE_COLS; c++) {
    for (let r = 0; r < TILE_ROWS; r++) {
      tiles.set(`tile_${c}_${r}`, [])
    }
  }
  return tiles
}

async function main() {
  console.log("BUILD ASP TILES (Brooklyn)")
  console.log("TILE_BBOX:", TILE_BBOX, "GRID:", `${TILE_COLS}x${TILE_ROWS}`)
  console.log("OUT_DIR:", OUT_DIR)

  const proj4 = await loadProj4()

  // Prepare output directory
  await fs.mkdir(OUT_DIR, { recursive: true })

  // Prepare tile buckets
  const tiles = ensureTileBuckets()

  // Locked where clause — matches runtime route intent
  const where =
    "upper(borough) like 'BROOKLYN%'" +
    " AND record_type='Current'" +
    " AND upper(sign_description) like '%BROOM%'" // matches current route filter

  let totalRows = 0
  let keptPoints = 0
  let skippedNoText = 0
  let skippedBadXY = 0
  let skippedBadLL = 0

  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE

    const q = new URL(DATASET_URL)
    q.searchParams.set(
      "$select",
      [
        "on_street",
        "from_street",
        "to_street",
        "side_of_street",
        "sign_description",
        "sign_x_coord",
        "sign_y_coord",
      ].join(",")
    )
    q.searchParams.set("$where", where)
    q.searchParams.set("$limit", String(PAGE_SIZE))
    q.searchParams.set("$offset", String(offset))

    console.log(`Fetching page ${page + 1} (offset ${offset})...`)
    const rows = await fetchPageWithRetries(q.toString())
    totalRows += rows.length

    if (rows.length === 0) {
      console.log("No more rows. Stopping.")
      break
    }

    for (const r of rows) {
      const signText = cleanRuleText(r?.sign_description)
      if (!signText) {
        skippedNoText++
        continue
      }

      const x = r?.sign_x_coord != null ? Number(r.sign_x_coord) : NaN
      const y = r?.sign_y_coord != null ? Number(r.sign_y_coord) : NaN
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        skippedBadXY++
        continue
      }

      const ll = xyToLatLon(proj4, x, y)
      if (!ll) {
        skippedBadLL++
        continue
      }

      // Assign to tile using locked TILE_BBOX + grid
      const { col, row } = tileIndexForLonLat(ll.lon, ll.lat)
      const tileName = `tile_${col}_${row}`

      const arr = tiles.get(tileName)
      if (!arr) continue

      arr.push({
        lat: ll.lat,
        lon: ll.lon,
        onStreet: String(r?.on_street || "").trim(),
        fromStreet: String(r?.from_street || "").trim(),
        toStreet: String(r?.to_street || "").trim(),
        side: normalizeSideLetter(r?.side_of_street),
        signText,
      })

      keptPoints++
    }

    if (rows.length < PAGE_SIZE) {
      console.log("Last page < PAGE_SIZE. Stopping.")
      break
    }
  }

  // Write tile files
  for (let c = 0; c < TILE_COLS; c++) {
    for (let r = 0; r < TILE_ROWS; r++) {
      const tileName = `tile_${c}_${r}`
      const arr = tiles.get(tileName) || []
      const outPath = path.join(OUT_DIR, `${tileName}.json`)
      await fs.writeFile(outPath, JSON.stringify(arr))
      console.log(`Wrote ${tileName}.json (${arr.length} points)`)
    }
  }

  console.log("DONE.")
  console.log("Total rows fetched:", totalRows)
  console.log("Points kept:", keptPoints)
  console.log("Skipped (no sign text):", skippedNoText)
  console.log("Skipped (bad XY):", skippedBadXY)
  console.log("Skipped (bad lat/lon):", skippedBadLL)
  console.log("Output folder:", OUT_DIR)
}

main().catch((e) => {
  console.error("BUILD FAILED:", e)
  process.exit(1)
})
