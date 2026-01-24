// app/api/centerline/route.ts
import { NextRequest, NextResponse } from "next/server"

export const runtime = "edge"

// HARD: do not cache this route (prevents intermittent cached empty results)
export const dynamic = "force-dynamic"
export const revalidate = 0

type Position = [number, number] // [lng, lat]
type LineStringGeom = { type: "LineString"; coordinates: Position[] }
type Feature = {
  type: "Feature"
  geometry: LineStringGeom | null
  properties: Record<string, any>
}
type FeatureCollection = { type: "FeatureCollection"; features: Feature[] }

// Must match how you generated tiles (4x4)
const TILE_COLS = 4
const TILE_ROWS = 4

// Must match the bbox you used when creating tiles
const TILE_BBOX = {
  west: -74.05,
  south: 40.56,
  east: -73.83,
  north: 40.74,
}

// Concurrency for tile fetches (tune 4-8)
const MAX_CONCURRENCY = 6

function toNum(v: string | null): number | null {
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function tileIndexForLonLat(lon: number, lat: number) {
  const x = (lon - TILE_BBOX.west) / (TILE_BBOX.east - TILE_BBOX.west)
  const y = (lat - TILE_BBOX.south) / (TILE_BBOX.north - TILE_BBOX.south)
  return {
    col: clamp(Math.floor(x * TILE_COLS), 0, TILE_COLS - 1),
    row: clamp(Math.floor(y * TILE_ROWS), 0, TILE_ROWS - 1),
  }
}

function tilesForBbox(west: number, south: number, east: number, north: number) {
  const a = tileIndexForLonLat(west, south)
  const b = tileIndexForLonLat(east, north)

  const tiles: string[] = []
  const c0 = Math.min(a.col, b.col)
  const c1 = Math.max(a.col, b.col)
  const r0 = Math.min(a.row, b.row)
  const r1 = Math.max(a.row, b.row)

  for (let c = c0; c <= c1; c++) {
    for (let r = r0; r <= r1; r++) {
      tiles.push(`tile_${c}_${r}`)
    }
  }
  return tiles
}

function featureIntersectsBbox(f: Feature, west: number, south: number, east: number, north: number) {
  if (!f?.geometry || f.geometry.type !== "LineString") return false
  const coords = f.geometry.coordinates
  if (!Array.isArray(coords) || coords.length < 2) return false

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity

  for (const p of coords) {
    const x = p?.[0]
    const y = p?.[1]
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }

  return !(maxX < west || minX > east || maxY < south || maxY > north)
}

function normalizePointer(s: string) {
  const t = s.trim()
  if (t.startsWith("v0blob://")) return t.slice("v0blob://".length)
  return t
}

async function fetchJson(url: string): Promise<any | null> {
  // IMPORTANT: never cache tile fetches; prevents cached "empty success" on transient failures
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) return null
  try {
    return await res.json()
  } catch {
    return null
  }
}

async function fetchTileFromPointer(origin: string, tileName: string): Promise<FeatureCollection | null> {
  // pointer lives in /public so it is served as static text
  const pointerUrl = `${origin}/centerline/pointers/${tileName}.txt`

  // IMPORTANT: do not cache pointers here; if a transient failure returns bad/empty data we must not pin it
  const pRes = await fetch(pointerUrl, { cache: "no-store" })
  if (!pRes.ok) return null

  const pointerText = normalizePointer(await pRes.text())
  if (!pointerText.startsWith("http://") && !pointerText.startsWith("https://")) return null

  const json = await fetchJson(pointerText)
  if (!json || json.type !== "FeatureCollection" || !Array.isArray(json.features)) return null

  return json as FeatureCollection
}

async function parallelMap<T, R>(items: T[], worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let i = 0

  async function run() {
    while (true) {
      const idx = i++
      if (idx >= items.length) return
      results[idx] = await worker(items[idx])
    }
  }

  const runners = Array.from({ length: Math.min(MAX_CONCURRENCY, items.length) }, () => run())
  await Promise.all(runners)
  return results
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const sp = url.searchParams

    const west = toNum(sp.get("west"))
    const south = toNum(sp.get("south"))
    const east = toNum(sp.get("east"))
    const north = toNum(sp.get("north"))

    if (west == null || south == null || east == null || north == null) {
      return NextResponse.json({ error: "Missing bbox params: west,south,east,north" }, { status: 400 })
    }
    if (!(west < east) || !(south < north)) {
      return NextResponse.json({ error: "Invalid bbox" }, { status: 400 })
    }

    // Compute which tiles we need (clamped to our tile grid bbox)
    const cw = clamp(west, TILE_BBOX.west, TILE_BBOX.east)
    const ce = clamp(east, TILE_BBOX.west, TILE_BBOX.east)
    const cs = clamp(south, TILE_BBOX.south, TILE_BBOX.north)
    const cn = clamp(north, TILE_BBOX.south, TILE_BBOX.north)

    const tiles = tilesForBbox(cw, cs, ce, cn)
    const origin = url.origin

    // Fetch needed tiles concurrently
    const tileCollections = await parallelMap(tiles, async (tile) => fetchTileFromPointer(origin, tile))

    // HARD: if any required tile failed to load/parse, do NOT return an empty FeatureCollection "success"
    // This prevents intermittent/cached empty centerline responses that break blue lines.
    const failedTiles = tiles.filter((_, idx) => !tileCollections[idx])
    if (failedTiles.length > 0) {
      return NextResponse.json(
        {
          error: "Centerline tile fetch failed",
          failedTiles,
        },
        {
          status: 502,
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        }
      )
    }

    const features: Feature[] = []
    for (const fc of tileCollections) {
      // fc is guaranteed non-null here due to the hard fail above
      for (const f of (fc as FeatureCollection).features) {
        if (featureIntersectsBbox(f, west, south, east, north)) features.push(f)
      }
    }

    return NextResponse.json(
      { type: "FeatureCollection", features },
      {
        headers: {
          // HARD: never cache API responses
          "Cache-Control": "no-store, max-age=0",
        },
      }
    )
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "centerline error" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    )
  }
}
