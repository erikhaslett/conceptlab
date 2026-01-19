import { NextRequest, NextResponse } from "next/server"

console.log("ASP route loaded – before proj4")

// Keep nodejs runtime (proj4 + large pagination is safer here than edge)
export const runtime = "nodejs"

// eslint-disable-next-line @typescript-eslint/no-var-requires
const proj4 = require("proj4") as typeof import("proj4")

const DATASET_URL = "https://data.cityofnewyork.us/resource/2x64-6f34.json"

// Working-model pagination targets (~90k BK broom signs => ~18 pages @ 5000)
const PAGE_SIZE = 5000
const MAX_PAGES = 60 // safety cap

// Retry behavior (per page fetch)
const MAX_RETRIES = 3
const BASE_BACKOFF_MS = 250

// Hard timeout per request (entire endpoint)
const TIMEOUT_MS = 25000

// EPSG:2263 (NAD83 / New York Long Island (ftUS)) <-> WGS84
const EPSG2263 =
  "+proj=lcc +lat_1=40.66666666666666 +lat_2=41.03333333333333 +lat_0=40.16666666666666 " +
  "+lon_0=-74 +x_0=300000 +y_0=0 +datum=NAD83 +units=us-ft +no_defs"

type AspPoint = {
  lat: number
  lon: number
  onStreet: string
  fromStreet: string
  toStreet: string
  side: string // N/S/E/W (single letter)
  signText: string
}

function toNum(v: string | null): number | null {
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Clean + normalize sign text (keep simple and safe)
function cleanRuleText(raw: unknown): string {
  if (!raw) return ""
  let t = String(raw)

  // normalize whitespace & remove odd markers
  t = t.replace(/[’']/g, "'")
  t = t.replace(/\s+/g, " ").trim()

  // remove some known noisy fragments
  t = t.replace(/\bSANITATION\s+BROOM\s+SYMBOL\b/gi, "").trim()
  t = t.replace(/\bSUPERSEDES\b.*$/gi, "").trim()

  // collapse again after removals
  t = t.replace(/\s{2,}/g, " ").trim()

  return t
}

// EPSG:2263 -> WGS84 (returns {lat,lon})
function xyToLatLon(x: number, y: number): { lat: number; lon: number } | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  try {
    const [lon, lat] = proj4(EPSG2263, "WGS84", [x, y]) as [number, number]
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

    // sanity bounds for NYC area
    if (lat < 40.3 || lat > 41.2) return null
    if (lon < -74.6 || lon > -73.4) return null

    return { lat, lon }
  } catch {
    return null
  }
}

function normalizeSideLetter(v: unknown): string {
  const s = String(v || "").trim().toUpperCase()
  // dataset tends to have values like "N", "S", "E", "W" or longer strings
  if (s.startsWith("N")) return "N"
  if (s.startsWith("S")) return "S"
  if (s.startsWith("E")) return "E"
  if (s.startsWith("W")) return "W"
  return s ? s[0] : ""
}

function inBbox(p: { lat: number; lon: number }, west: number, south: number, east: number, north: number) {
  return p.lon >= west && p.lon <= east && p.lat >= south && p.lat <= north
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchPage(url: string, controller: AbortController, attempt: number): Promise<any[] | null> {
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      // allow caching in platform, but not required
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      // retry on transient server errors
      if (res.status >= 500 && attempt < MAX_RETRIES) return null
      return []
    }

    const rows = (await res.json()) as any[]
    return Array.isArray(rows) ? rows : []
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const sp = url.searchParams

  const west = toNum(sp.get("west"))
  const south = toNum(sp.get("south"))
  const east = toNum(sp.get("east"))
  const north = toNum(sp.get("north"))

  if (west == null || south == null || east == null || north == null) {
    return NextResponse.json({ ok: false, error: "Missing bbox params: west,south,east,north" }, { status: 400 })
  }
  if (!(west < east) || !(south < north)) {
    return NextResponse.json({ ok: false, error: "Invalid bbox" }, { status: 400 })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  const points: AspPoint[] = []
  let partial = false
  let note: string | undefined

// SoQL filter: Brooklyn + current + broom sign (ASP)
// IMPORTANT: add bbox filter in EPSG:2263 so we don't scan the whole borough.

try {

    const corners: [number, number][] = [
      [west, south],
      [west, north],
      [east, south],
      [east, north],
  ]

  const xy = corners.map(([lon, lat]) => proj4("WGS84", EPSG2263, [lon, lat]) as [number, number])
  const xs = xy.map((p) => p[0]).filter(Number.isFinite)
  const ys = xy.map((p) => p[1]).filter(Number.isFinite)

  const xmin = Math.floor(Math.min(...xs) - 25)
  const xmax = Math.ceil(Math.max(...xs) + 25)
  const ymin = Math.floor(Math.min(...ys) - 25)
  const ymax = Math.ceil(Math.max(...ys) + 25)

  const where =
    "upper(borough) like 'BROOKLYN%'" +
    " AND record_type='Current'" +
    " AND upper(sign_description) like '%BROOM%'" +
    ` AND sign_x_coord BETWEEN ${xmin} AND ${xmax}` +
    ` AND sign_y_coord BETWEEN ${ymin} AND ${ymax}`
    
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

      let rows: any[] | null = null

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const got = await fetchPage(q.toString(), controller, attempt)
        if (got !== null) {
          rows = got
          break
        }
        // backoff
        await sleep(BASE_BACKOFF_MS * attempt * attempt)
      }

      if (rows === null) {
        partial = true
        note = `Stopped early: failed to fetch page ${page + 1} after ${MAX_RETRIES} retries.`
        break
      }

      if (rows.length === 0) {
        // no more data
        break
      }

      for (const r of rows) {
        const raw = r?.sign_description
        const signText = cleanRuleText(raw)
        if (!signText) continue

        const x = r?.sign_x_coord != null ? Number(r.sign_x_coord) : NaN
        const y = r?.sign_y_coord != null ? Number(r.sign_y_coord) : NaN
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue

        const ll = xyToLatLon(x, y)
        if (!ll) continue
        if (!inBbox(ll, west, south, east, north)) continue

        points.push({
          lat: ll.lat,
          lon: ll.lon,
          onStreet: String(r?.on_street || "").trim(),
          fromStreet: String(r?.from_street || "").trim(),
          toStreet: String(r?.to_street || "").trim(),
          side: normalizeSideLetter(r?.side_of_street),
          signText,
        })
      }

      // If we got fewer than a full page, stop
      if (rows.length < PAGE_SIZE) break
    }

    return NextResponse.json(
      { ok: true, points, partial: partial || undefined, note },
      {
        headers: {
          // short cache; upstream fetch is revalidated too
          "Cache-Control": "public, max-age=30",
        },
      }
    )
    } catch (err: any) {
      partial = true
      note = `Error: ${String(err?.message || "asp error").slice(0, 180)}`
      return NextResponse.json({ ok: true, points, partial: true, note }, { status: 200 })
    } finally {
      clearTimeout(timeout)
    }
}
