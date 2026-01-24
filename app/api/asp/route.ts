import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * TILE GRID — MUST MATCH CENTERLINE
 */
const TILE_COLS = 4
const TILE_ROWS = 4

const TILE_BBOX = {
  west: -74.05,
  south: 40.56,
  east: -73.83,
  north: 40.74,
}

/**
 * TYPES (LOCKED)
 */
type AspPoint = {
  lat: number
  lon: number
  onStreet: string
  fromStreet: string
  toStreet: string
  side: string
  signText: string
}

/**
 * UTILS
 */
function toNum(v: string | null): number | null {
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function inBbox(
  p: { lat: number; lon: number },
  west: number,
  south: number,
  east: number,
  north: number
) {
  return (
    p.lon >= west &&
    p.lon <= east &&
    p.lat >= south &&
    p.lat <= north
  )
}

/**
 * TILE SELECTION — IDENTICAL TO CENTERLINE
 */
function tileIndexForLonLat(lon: number, lat: number) {
  const x = (lon - TILE_BBOX.west) / (TILE_BBOX.east - TILE_BBOX.west)
  const y = (lat - TILE_BBOX.south) / (TILE_BBOX.north - TILE_BBOX.south)

  return {
    col: clamp(Math.floor(x * TILE_COLS), 0, TILE_COLS - 1),
    row: clamp(Math.floor(y * TILE_ROWS), 0, TILE_ROWS - 1),
  }
}

function tilesForBbox(
  west: number,
  south: number,
  east: number,
  north: number
) {
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

/**
 * POINTER NORMALIZATION
 */
function normalizePointer(s: string) {
  const t = s.trim()
  if (t.startsWith("v0blob://")) return t.slice("v0blob://".length)
  return t
}

/**
 * FETCH JSON SAFELY
 */
async function fetchJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { cache: "force-cache" })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * FETCH ONE TILE VIA POINTER (HARDENED)
 */
async function fetchTileFromPointer(
  origin: string,
  tileName: string
): Promise<{ points: AspPoint[]; error?: string }> {
  try {
    const pointerUrl = `${origin}/asp/brooklyn/pointers/${tileName}.txt`

    const pRes = await fetch(pointerUrl, { cache: "force-cache" })
    if (!pRes.ok) {
      return { points: [], error: `pointer missing: ${tileName}` }
    }

    let pointerText = normalizePointer(await pRes.text())

    if (pointerText.startsWith("/")) {
      pointerText = `${origin}${pointerText}`
    }

    if (
      !pointerText.startsWith("http://") &&
      !pointerText.startsWith("https://")
    ) {
      return { points: [], error: `invalid pointer: ${tileName}` }
    }

    const json = await fetchJson(pointerText)
    if (!Array.isArray(json)) {
      return { points: [], error: `bad tile json: ${tileName}` }
    }

    return { points: json as AspPoint[] }
  } catch (e: any) {
    return {
      points: [],
      error: `tile fetch failed: ${tileName}`,
    }
  }
}

/**
 * ROUTE
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const sp = url.searchParams

    const west = toNum(sp.get("west"))
    const south = toNum(sp.get("south"))
    const east = toNum(sp.get("east"))
    const north = toNum(sp.get("north"))

    if (west == null || south == null || east == null || north == null) {
      return NextResponse.json(
        { ok: false, points: [], partial: true, note: "Missing bbox params" },
        { status: 400 }
      )
    }

    if (!(west < east) || !(south < north)) {
      return NextResponse.json(
        { ok: false, points: [], partial: true, note: "Invalid bbox" },
        { status: 400 }
      )
    }

    // Clamp to tile grid
    const cw = clamp(west, TILE_BBOX.west, TILE_BBOX.east)
    const ce = clamp(east, TILE_BBOX.west, TILE_BBOX.east)
    const cs = clamp(south, TILE_BBOX.south, TILE_BBOX.north)
    const cn = clamp(north, TILE_BBOX.south, TILE_BBOX.north)

    const tiles = tilesForBbox(cw, cs, ce, cn)
    const origin = url.origin

    const points: AspPoint[] = []
    const errors: string[] = []

    for (const tile of tiles) {
      const res = await fetchTileFromPointer(origin, tile)
      if (res.error) errors.push(res.error)

      for (const p of res.points) {
        if (
          typeof p?.lat !== "number" ||
          typeof p?.lon !== "number"
        )
          continue

        if (inBbox(p, west, south, east, north)) {
          points.push(p)
        }
      }
    }

    const partial = errors.length > 0
    const note = partial
      ? `ASP tiles partially loaded (${errors.length} issue${errors.length > 1 ? "s" : ""})`
      : undefined

    return NextResponse.json(
      { ok: true, points, partial: partial || undefined, note },
      {
        headers: {
          "Cache-Control": "public, max-age=30",
        },
      }
    )
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: true,
        points: [],
        partial: true,
        note: `ASP route error: ${String(err?.message || "unknown").slice(0, 160)}`,
      },
      { status: 200 }
    )
  }
}
