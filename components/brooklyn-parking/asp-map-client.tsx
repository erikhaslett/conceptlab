"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import useSWR from "swr"
import { MapPin, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type BBox = { west: number; south: number; east: number; north: number }
type Viewport = { bbox: BBox; zoom: number; center: [number, number] }

type AspPoint = {
  lat: number
  lon: number
  onStreet: string
  fromStreet: string
  toStreet: string
  side: string // N/S/E/W
  signText: string
}

type AspResponse = {
  ok: boolean
  points: AspPoint[]
  partial?: boolean
  note?: string
}

// NOTE: centerline may come either wrapped {ok, geojson} OR raw FeatureCollection
type CenterlineFeature = {
  type: "Feature"
  id?: number | string
  properties?: { name?: string; highway?: string }
  geometry?: { type: "LineString"; coordinates: [number, number][] } // [lon,lat]
}

type CenterlineWrappedResponse = {
  ok: boolean
  geojson: { type: "FeatureCollection"; features: CenterlineFeature[] }
  featureCount?: number
}

type CenterlineRawResponse = {
  type: "FeatureCollection"
  features: CenterlineFeature[]
}

export type BlockfaceLine = {
  id: string
  latlngs: [number, number][]
  street: string
  from: string
  to: string
  sideLabel: string
  rule: string
}

const ASPMap = dynamic(() => import("@/components/brooklyn-parking/asp-map"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-muted">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
})

async function fetcher(url: string) {
  const res = await fetch(url)
  const contentType = res.headers.get("content-type") || ""
  const text = await res.text()

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}: ${text.slice(0, 220)}`)
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(
      `Non-JSON response from ${url} (content-type: ${contentType || "unknown"}): ${text.slice(0, 220)}`
    )
  }
}

// Defaults
const DEFAULT_CENTER: [number, number] = [40.65141, -73.94194]
const DEFAULT_ZOOM = 13

// Load only when zoomed in enough
const MIN_ZOOM_TO_LOAD = 17

// Visual separation (meters) from centerline, per side
const OFFSET_METERS = 6

// Expand sliced segment so blocks don't collapse to the ends (parks, long runs)
const SLICE_PADDING_METERS = 60

function fmt(n: unknown, digits = 5) {
  return typeof n === "number" && Number.isFinite(n) ? n.toFixed(digits) : "--"
}
function cleanRuleForPopup(raw: string) {
  let t = String(raw || "")

  // Remove the specific junk we're seeing in popups
  t = t.replace(/<->/g, " ")
  t = t.replace(/\(\s*\)/g, " ") // empty parentheses
  t = t.replace(/[()]/g, " ") // any stray leftover parentheses

  // Collapse whitespace
  t = t.replace(/\s+/g, " ").trim()

  return t
}

type AspSuspension = { name: string; when: string; meters: string }

// Display rules:
// - Fixed-date: "Month Day"
// - Weekday-rule: "Rule text"
// - Date-varies: "Date varies — typically falls in <Month/Range>"
const ALT_STREET_PARKING_SUSPENSIONS: AspSuspension[] = [
  { name: "New Year's Day", when: "January 1", meters: "Parking meters NOT in effect." },
  { name: "Three Kings' Day", when: "January 6", meters: "Parking meters in effect." },
  { name: "Martin Luther King Jr", when: "3rd Monday in January", meters: "Parking meters in effect." },
  { name: "Lincoln's Birthday", when: "February 12", meters: "Parking meters in effect." },
  { name: "Washington's Birthday (Presidents Day)", when: "3rd Monday in February", meters: "Parking meters in effect." },

  { name: "Lunar New Year's Eve", when: "Date varies — typically falls in February", meters: "Parking meters in effect." },
  { name: "Lunar New Year", when: "Date varies — typically falls in February", meters: "Parking meters in effect." },
  { name: "Losar (Tibetan New Year)", when: "Date varies — typically falls in February", meters: "Parking meters in effect." },
  { name: "Ash Wednesday", when: "Date varies — typically falls in February–March", meters: "Parking meters in effect." },

  { name: "Purim", when: "Date varies — typically falls in February–March", meters: "Parking meters in effect." },

  { name: "Idul-Fitr (Eid Al-Fitr)", when: "Date varies — typically falls in March–April", meters: "Parking meters in effect." },

  { name: "Passover", when: "Date varies — typically falls in March–April", meters: "Parking meters in effect." },
  { name: "Holy Thursday", when: "Date varies — typically falls in March–April", meters: "Parking meters in effect." },
  { name: "Good Friday", when: "Date varies — typically falls in March–April", meters: "Parking meters in effect." },
  { name: "the seventh and eighth days of Passover", when: "Date varies — typically falls in April", meters: "Parking meters in effect." },
  { name: "Orthodox Holy Thursday", when: "Date varies — typically falls in March–April", meters: "Parking meters in effect." },
  { name: "Orthodox Good Friday", when: "Date varies — typically falls in March–April", meters: "Parking meters in effect." },

  { name: "Solemnity of the Ascension", when: "Date varies — typically falls in May–June", meters: "Parking meters in effect." },
  { name: "Shavuoth", when: "Date varies — typically falls in May–June", meters: "Parking meters in effect." },

  { name: "Memorial Day", when: "Last Monday in May", meters: "Parking meters NOT in effect." },

  { name: "Idul-Adha (Eid Al-Adha)", when: "Date varies — typically falls in May–June", meters: "Parking meters in effect." },

  { name: "Juneteenth", when: "June 19", meters: "Parking meters in effect." },
  { name: "Independence Day", when: "July 4", meters: "Parking meters NOT in effect." },

  { name: "Tisha B'Av", when: "Date varies — typically falls in July–August", meters: "Parking meters in effect." },
  { name: "Feast of the Assumption", when: "August 15", meters: "Parking meters in effect." },

  { name: "Labor Day", when: "1st Monday in September", meters: "Parking meters NOT in effect." },

  { name: "Rosh Hashanah", when: "Date varies — typically falls in September–October", meters: "Parking meters in effect." },
  { name: "Yom Kippur", when: "Date varies — typically falls in September–October", meters: "Parking meters in effect." },
  { name: "Succoth", when: "Date varies — typically falls in September–October", meters: "Parking meters in effect." },
  { name: "Shemini Atzereth", when: "Date varies — typically falls in September–October", meters: "Parking meters in effect." },
  { name: "Simchas Torah", when: "Date varies — typically falls in September–October", meters: "Parking meters in effect." },

  { name: "Columbus Day", when: "2nd Monday in October", meters: "Parking meters in effect." },

  { name: "All Saints' Day", when: "November 1", meters: "Parking meters in effect." },
  { name: "Election Day", when: "Tuesday after the first Monday in November", meters: "Parking meters in effect." },

  { name: "Diwali", when: "Date varies — typically falls in October–November", meters: "Parking meters in effect." },

  { name: "Veterans Day", when: "November 11", meters: "Parking meters in effect." },
  { name: "Thanksgiving Day", when: "4th Thursday in November", meters: "Parking meters NOT in effect." },

  { name: "Immaculate Conception", when: "December 8", meters: "Parking meters in effect." },
  { name: "Christmas Day", when: "December 25", meters: "Parking meters NOT in effect." },
]

function normalizeStreetName(s: string) {
  let t = (s || "")
    .trim()
    .toUpperCase()
    .replace(/['']/g, "")
    .replace(/[.,]/g, " ")

  t = t.replace(/\bEAST\b/g, "E")
  t = t.replace(/\bWEST\b/g, "W")
  t = t.replace(/\bNORTH\b/g, "N")
  t = t.replace(/\bSOUTH\b/g, "S")

  t = t.replace(/\bSTREET\b/g, "ST")
  t = t.replace(/\bAVENUE\b/g, "AVE")
  t = t.replace(/\bBOULEVARD\b/g, "BLVD")
  t = t.replace(/\bPLACE\b/g, "PL")
  t = t.replace(/\bROAD\b/g, "RD")
  t = t.replace(/\bDRIVE\b/g, "DR")
  t = t.replace(/\bCOURT\b/g, "CT")
  t = t.replace(/\bPARKWAY\b/g, "PKWY")

  t = t.replace(/\b(\d+)(ST|ND|RD|TH)\b/g, "$1")
  t = t.replace(/\s+/g, " ").trim()

  return t
}

function stableKeyForBlockface(p: AspPoint) {
  return [
    normalizeStreetName(p.onStreet),
    normalizeStreetName(p.fromStreet),
    normalizeStreetName(p.toStreet),
    (p.side || "").trim().toUpperCase(),
    (p.signText || "").trim(),
  ].join("||")
}

// ----- geometry helpers -----

function toRad(d: number) {
  return (d * Math.PI) / 180
}
function metersPerDegLat() {
  return 111_320
}
function metersPerDegLon(lat: number) {
  return 111_320 * Math.cos(toRad(lat))
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function pointToSegmentMeters(pLat: number, pLon: number, aLat: number, aLon: number, bLat: number, bLon: number) {
  const lat0 = (aLat + bLat + pLat) / 3
  const mx = metersPerDegLon(lat0)
  const my = metersPerDegLat()

  const px = pLon * mx
  const py = pLat * my
  const ax = aLon * mx
  const ay = aLat * my
  const bx = bLon * mx
  const by = bLat * my

  const abx = bx - ax
  const aby = by - ay
  const apx = px - ax
  const apy = py - ay
  const ab2 = abx * abx + aby * aby
  if (ab2 === 0) return Math.hypot(px - ax, py - ay)

  let t = (apx * abx + apy * aby) / ab2
  t = Math.max(0, Math.min(1, t))
  const cx = ax + t * abx
  const cy = ay + t * aby
  return Math.hypot(px - cx, py - cy)
}

function projectPointToLineMeters(
  pLat: number,
  pLon: number,
  lineLatLng: [number, number][]
): { along: number; dist: number } | null {
  if (lineLatLng.length < 2) return null

  let bestDist = Infinity
  let bestAlong = 0

  let accum = 0
  for (let i = 0; i < lineLatLng.length - 1; i++) {
    const [aLat, aLon] = lineLatLng[i]
    const [bLat, bLon] = lineLatLng[i + 1]

    const lat0 = (aLat + bLat + pLat) / 3
    const mx = metersPerDegLon(lat0)
    const my = metersPerDegLat()

    const px = pLon * mx
    const py = pLat * my
    const ax = aLon * mx
    const ay = aLat * my
    const bx = bLon * mx
    const by = bLat * my

    const abx = bx - ax
    const aby = by - ay
    const apx = px - ax
    const apy = py - ay
    const ab2 = abx * abx + aby * aby
    const segLen = Math.sqrt(ab2)

    if (ab2 === 0) continue

    let t = (apx * abx + apy * aby) / ab2
    t = Math.max(0, Math.min(1, t))
    const cx = ax + t * abx
    const cy = ay + t * aby
    const d = Math.hypot(px - cx, py - cy)

    if (d < bestDist) {
      bestDist = d
      bestAlong = accum + t * segLen
    }

    accum += segLen
  }

  return { along: bestAlong, dist: bestDist }
}

function sliceLineByMeters(line: [number, number][], start: number, end: number): [number, number][] {
  if (line.length < 2) return line
  const s = Math.max(0, Math.min(start, end))
  const e = Math.max(0, Math.max(start, end))

  const cum: number[] = [0]
  for (let i = 0; i < line.length - 1; i++) {
    const [aLat, aLon] = line[i]
    const [bLat, bLon] = line[i + 1]
    cum.push(cum[cum.length - 1] + haversineMeters(aLat, aLon, bLat, bLon))
  }

  const total = cum[cum.length - 1]
  const ss = Math.max(0, Math.min(s, total))
  const ee = Math.max(0, Math.min(e, total))

  const out: [number, number][] = []

  function interp(i: number, tt: number): [number, number] {
    const [aLat, aLon] = line[i]
    const [bLat, bLon] = line[i + 1]
    return [aLat + (bLat - aLat) * tt, aLon + (bLon - aLon) * tt]
  }

  let iStart = 0
  while (iStart < cum.length - 1 && cum[iStart + 1] < ss) iStart++

  {
    const segLen = cum[iStart + 1] - cum[iStart]
    const tt = segLen === 0 ? 0 : (ss - cum[iStart]) / segLen
    out.push(interp(iStart, tt))
  }

  let i = iStart
  while (i < cum.length - 1 && cum[i + 1] < ee) {
    out.push(line[i + 1])
    i++
  }

  {
    const segLen = cum[i + 1] - cum[i]
    const tt = segLen === 0 ? 0 : (ee - cum[i]) / segLen
    out.push(interp(i, tt))
  }

  const cleaned: [number, number][] = []
  for (const p of out) {
    const last = cleaned[cleaned.length - 1]
    if (!last || Math.abs(last[0] - p[0]) > 1e-8 || Math.abs(last[1] - p[1]) > 1e-8) cleaned.push(p)
  }
  return cleaned
}

function offsetPolylineMeters(line: [number, number][], metersSigned: number): [number, number][] {
  if (line.length < 2) return line
  const out: [number, number][] = []

  for (let i = 0; i < line.length; i++) {
    const prev = line[Math.max(0, i - 1)]
    const cur = line[i]
    const next = line[Math.min(line.length - 1, i + 1)]

    const lat0 = cur[0]
    const mx = metersPerDegLon(lat0)
    const my = metersPerDegLat()

    const vx = (next[1] - prev[1]) * mx
    const vy = (next[0] - prev[0]) * my
    const len = Math.hypot(vx, vy) || 1

    const nx = -vy / len
    const ny = vx / len

    const dxMeters = nx * metersSigned
    const dyMeters = ny * metersSigned

    const dLon = dxMeters / mx
    const dLat = dyMeters / my

    out.push([cur[0] + dLat, cur[1] + dLon])
  }

  return out
}

function sideLabel(side: string) {
  const s = (side || "").trim().toUpperCase()
  if (s === "N") return "N side"
  if (s === "S") return "S side"
  if (s === "E") return "E side"
  if (s === "W") return "W side"
  return s ? `${s} side` : "Side unknown"
}

function signedOffsetForSide(side: string, headingDx: number, headingDy: number) {
  const s = (side || "").trim().toUpperCase()
  const eastWest = Math.abs(headingDx) >= Math.abs(headingDy)

  if (eastWest) {
    if (s === "N") return +OFFSET_METERS
    if (s === "S") return -OFFSET_METERS
  } else {
    if (s === "E") return +OFFSET_METERS
    if (s === "W") return -OFFSET_METERS
  }

  if (s === "N" || s === "E") return +OFFSET_METERS
  if (s === "S" || s === "W") return -OFFSET_METERS
  return +OFFSET_METERS
}

// --- helper: normalize centerline response into a single FeatureCollection ---
function extractCenterlineFeatures(data: unknown): CenterlineFeature[] {
  if (!data) return []
  const anyData: any = data

  if (anyData?.geojson?.type === "FeatureCollection" && Array.isArray(anyData.geojson.features)) {
    return anyData.geojson.features as CenterlineFeature[]
  }
  if (anyData?.type === "FeatureCollection" && Array.isArray(anyData.features)) {
    return anyData.features as CenterlineFeature[]
  }
  if (anyData?.ok === true && Array.isArray(anyData.features)) {
    return anyData.features as CenterlineFeature[]
  }
  return []
}

export default function ASPMapClient() {
  const [viewport, setViewport] = useState<Viewport | null>(null)
  const [resetNonce, setResetNonce] = useState(0)
  const [showSuspensions, setShowSuspensions] = useState(false)

  const [addressQuery, setAddressQuery] = useState("")
  const [geocodeLoading, setGeocodeLoading] = useState(false)
  const [geocodeError, setGeocodeError] = useState("")
  const [goToTarget, setGoToTarget] = useState<{ lat: number; lon: number; label?: string } | null>(null)
  const [goToNonce, setGoToNonce] = useState(0)

  const lastKeyRef = useRef<string>("")
  const viewportDebounceRef = useRef<number | null>(null)

  const isZoomEligible = (viewport?.zoom ?? 0) >= MIN_ZOOM_TO_LOAD

  const aspUrl = useMemo(() => {
    if (!viewport || !isZoomEligible) return null
    const { west, south, east, north } = viewport.bbox
    return `/api/asp?west=${west}&south=${south}&east=${east}&north=${north}`
  }, [viewport, isZoomEligible])

  const centerlineUrl = useMemo(() => {
    if (!viewport || !isZoomEligible) return null
    const { west, south, east, north } = viewport.bbox
    return `/api/centerline?west=${west}&south=${south}&east=${east}&north=${north}`
  }, [viewport, isZoomEligible])

  const { data: aspData, isLoading: aspLoading, error: aspError } = useSWR<AspResponse>(aspUrl, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  })

  const { data: clData, isLoading: clLoading, error: clError } = useSWR<
    CenterlineWrappedResponse | CenterlineRawResponse
  >(centerlineUrl, fetcher, { revalidateOnFocus: false, keepPreviousData: true })

  const [buildError, setBuildError] = useState<string>("")

  const lines: BlockfaceLine[] = useMemo(() => {
    try {
      if (!aspData?.ok || !Array.isArray(aspData.points) || aspData.points.length === 0) return []
      const clFeaturesRaw = extractCenterlineFeatures(clData)
      if (clFeaturesRaw.length === 0) return []

      const centerlineByName = clFeaturesRaw
        .filter((f) => f?.geometry?.type === "LineString" && Array.isArray(f.geometry.coordinates))
        .map((f) => {
          const name = normalizeStreetName(f?.properties?.name || "")
          const coords = (f.geometry!.coordinates || [])
            .map(([lon, lat]) => [lat, lon] as [number, number])
            .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]))
          return { name, coords }
        })
        .filter((x) => x.name && x.coords.length >= 2)

      if (centerlineByName.length === 0) return []

      const groups = new Map<string, AspPoint[]>()
      for (const p of aspData.points) {
        const k = stableKeyForBlockface(p)
        const arr = groups.get(k)
        if (arr) arr.push(p)
        else groups.set(k, [p])
      }

      const out: BlockfaceLine[] = []
      let idx = 0

      for (const pts of groups.values()) {
        const first = pts[0]
        const streetKey = normalizeStreetName(first.onStreet)

        const cLat = pts.reduce((s, p) => s + p.lat, 0) / pts.length
        const cLon = pts.reduce((s, p) => s + p.lon, 0) / pts.length

        const candidates = centerlineByName.filter((f) => f.name === streetKey)
        if (candidates.length === 0) continue

        let best: { coords: [number, number][]; score: number } | null = null
        for (const cand of candidates) {
          let minDist = Infinity
          const line = cand.coords
          for (let i = 0; i < line.length - 1; i++) {
            const d = pointToSegmentMeters(cLat, cLon, line[i][0], line[i][1], line[i + 1][0], line[i + 1][1])
            if (d < minDist) minDist = d
          }
          if (!best || minDist < best.score) best = { coords: line, score: minDist }
        }
        if (!best) continue

        const centerline = best.coords

        const projections = pts
          .map((p) => projectPointToLineMeters(p.lat, p.lon, centerline))
          .filter(Boolean) as { along: number; dist: number }[]

        if (projections.length === 0) continue

        let minAlong = Math.min(...projections.map((x) => x.along))
        let maxAlong = Math.max(...projections.map((x) => x.along))

        minAlong = Math.max(0, minAlong - SLICE_PADDING_METERS)
        maxAlong = maxAlong + SLICE_PADDING_METERS

        const sliced = sliceLineByMeters(centerline, minAlong, maxAlong)
        if (sliced.length < 2) continue

        const a = sliced[0]
        const b = sliced[sliced.length - 1]
        const lat0 = (a[0] + b[0]) / 2
        const mx = metersPerDegLon(lat0)
        const my = metersPerDegLat()
        const headingDx = (b[1] - a[1]) * mx
        const headingDy = (b[0] - a[0]) * my

        const metersSigned = signedOffsetForSide(first.side, headingDx, headingDy)
        const offset = offsetPolylineMeters(sliced, metersSigned)

        out.push({
          id: `${idx}-${streetKey}-${(first.side || "").toUpperCase()}`,
          latlngs: offset,
          street: first.onStreet || streetKey,
          from: first.fromStreet || "",
          to: first.toStreet || "",
          sideLabel: sideLabel(first.side),
          rule: cleanRuleForPopup(first.signText || ""),
        })
        idx++
      }

      return out
    } catch (e: any) {
      console.error("Line build failed:", e)
      return []
    }
  }, [aspData, clData])

  const computedBuildError = useMemo(() => {
    try {
      const aspCount = aspData?.ok && Array.isArray(aspData.points) ? aspData.points.length : 0
      const clCount = extractCenterlineFeatures(clData).length

      if (!isZoomEligible) return ""
      if ((aspError as any)?.message || (clError as any)?.message) return ""
      if (!aspCount || !clCount) return ""
      if (lines.length > 0) return ""

      return `No matches: ASP points (${aspCount}) and centerlines (${clCount}) loaded, but no street-name matches in this viewport.`
    } catch {
      return ""
    }
  }, [aspData, clData, isZoomEligible, aspError, clError, lines.length])

  useEffect(() => {
    const hard = (aspError as any)?.message || (clError as any)?.message
    if (hard) setBuildError(String(hard).slice(0, 220))
    else setBuildError(computedBuildError || "")
  }, [aspError, clError, computedBuildError])

  const status = useMemo(() => {
    if (!viewport) return { title: "Ready", subtitle: "Zoom/pan the map.", tone: "neutral" as const }

    if (!isZoomEligible) {
      return {
        title: "Zoom in to 17+ to load rules",
        subtitle: `Zoom to street level (zoom ${MIN_ZOOM_TO_LOAD}+).`,
        tone: "neutral" as const,
      }
    }

    if (aspLoading || clLoading)
      return { title: "Loading visible area…", subtitle: "Fetching and snapping…", tone: "loading" as const }

    const anyErr = buildError
    if (anyErr) return { title: "Error loading data", subtitle: String(anyErr).slice(0, 220), tone: "error" as const }

    return { title: "Ready", subtitle: `Showing ${lines.length} clickable areas.`, tone: "ok" as const }
  }, [viewport, isZoomEligible, aspLoading, clLoading, lines.length, buildError])

  const onGoToAddress = useCallback(async () => {
    const q = addressQuery.trim()
    if (!q) return

    setGeocodeError("")
    setGeocodeLoading(true)

    let didSucceed = false

    try {
      const fullQ = `${q}, Brooklyn, NY`

      const u = new URL("https://nominatim.openstreetmap.org/search")
      u.searchParams.set("format", "json")
      u.searchParams.set("limit", "1")
      u.searchParams.set("q", fullQ)

      const res = await fetch(u.toString(), {
        headers: { Accept: "application/json" },
        cache: "no-store",
      })

      if (!res.ok) {
        setGeocodeError("Address not found, please check and retry")
        return
      }

      const rows = (await res.json()) as any[]
      if (!Array.isArray(rows) || rows.length === 0) {
        setGeocodeError("Address not found, please check and retry")
        return
      }

      const first = rows[0]
      const lat = Number(first?.lat)
      const lon = Number(first?.lon)
      const label = String(first?.display_name || q)

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        setGeocodeError("Address not found, please check and retry")
        return
      }

      setGoToTarget({ lat, lon, label })
      setGoToNonce((n) => n + 1)

      didSucceed = true
    } catch {
      setGeocodeError("Address not found, please check and retry")
    } finally {
      setGeocodeLoading(false)
      if (didSucceed) {
        setAddressQuery("")
        setGeocodeError("")
      }
    }
  }, [addressQuery])

  const onReset = useCallback(() => {
    if (viewportDebounceRef.current) {
      window.clearTimeout(viewportDebounceRef.current)
      viewportDebounceRef.current = null
    }
    setResetNonce((n) => n + 1)
    lastKeyRef.current = ""
    setViewport(null)

    setAddressQuery("")
    setGeocodeError("")
    setGeocodeLoading(false)
    setGoToTarget(null)
    setGoToNonce((n) => n + 1)
  }, [])

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* LEFT SIDEBAR */}
        <aside
          className="w-72 bg-muted border-r border-border p-4 pt-8 flex flex-col gap-4 shrink-0 overflow-y-auto"
          style={{ backgroundColor: "#d9d9d9" }}
        >
          {/* Sidebar title */}
          <div
            className="text-center"
            style={{
              marginTop: "10px",
              marginBottom: "32px",
              fontFamily: "'Bebas Neue', sans-serif",
            }}
          >
            <div style={{ fontSize: "64px", fontWeight: "bold", lineHeight: 1, textTransform: "uppercase" }}>Brooklyn</div>
            <div style={{ fontSize: "28px", lineHeight: 1, textTransform: "uppercase", marginTop: "-2px" }}>
              Alt Side Parking Finder
            </div>
          </div>

         {/* Instructions block */}
<div className="rounded-lg border border-border bg-white px-4 py-4 mt-3 min-h-[160px] grid">
  <div className="w-full grid place-content-center gap-3">
    <div className="text-lg font-semibold text-center">Instructions</div>

    <div className="flex justify-center">
      <div className="grid grid-cols-[18px_auto] gap-x-2 gap-y-1 text-left">
        <div className="text-sm font-semibold text-right tabular-nums">1.</div>
        <div className="text-sm font-semibold">Move map in any direction</div>

        <div className="text-sm font-semibold text-right tabular-nums">2.</div>
        <div className="text-sm font-semibold">Zoom in to 17+ to load rules</div>

        <div className="text-sm font-semibold text-right tabular-nums">3.</div>
        <div className="text-sm font-semibold">Click on any blue street line</div>
      </div>
    </div>
  </div>
</div>

          {/* Current Zoom Level */}
          <div className="rounded-lg border border-border bg-white p-3">
            <div className="text-sm font-semibold text-center">
              Current Zoom Level: <span className="text-foreground">{fmt(viewport?.zoom, 0)}</span>
            </div>
          </div>

          {/* Reset Map View */}
          <div className="rounded-lg border border-border h-11 px-3" style={{ backgroundColor: "#e7f7ea" }}>
            <Button
              variant="ghost"
              onClick={onReset}
              className="w-full h-full text-sm font-semibold leading-none"
              style={{ backgroundColor: "transparent", color: "#000000" }}
            >
              Reset Map View
            </Button>
          </div>

          {/* Rule Suspension Calendar */}
          <div className="rounded-lg border border-border h-11 px-3" style={{ backgroundColor: "#e7f7ea" }}>
            <Button
              variant="ghost"
              onClick={() => setShowSuspensions(true)}
              className="w-full h-full text-sm font-semibold leading-none whitespace-nowrap text-center"
              style={{ backgroundColor: "transparent", color: "#000000" }}
            >
              Rule Suspension Calendar
            </Button>
          </div>

         {/* Address Search (lowest) */}
<div className="rounded-lg border border-border bg-white px-4 py-4 min-h-[160px] grid">
  <div className="w-full grid place-content-center gap-3">
    <div className="text-lg font-semibold text-center">Address Search</div>

    <div className="text-center">
      <div className="text-sm font-semibold whitespace-nowrap">Numbered Street Address Only</div>
    </div>

    <div className="flex items-center gap-2 w-full overflow-hidden">
      <input
        value={addressQuery}
        onChange={(e) => setAddressQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return
          if (!addressQuery.trim()) return
          e.preventDefault()
          if (!geocodeLoading) onGoToAddress()
        }}
        placeholder="Type Address Here"
        className="min-w-0 w-0 flex-1 h-9 rounded-md border border-border bg-background px-3 text-xs outline-none"
      />

      <Button
        variant="secondary"
        onClick={onGoToAddress}
        disabled={geocodeLoading || !addressQuery.trim()}
        className="shrink-0 h-9 px-2 text-sm font-semibold leading-none border border-border disabled:opacity-100"
        style={{ backgroundColor: "#e7f7ea", color: "#000000" }}
      >
        Go
      </Button>
    </div>

    {/* Reserve space so centering doesn't jump */}
    <div className="h-4 text-xs text-center">
      {geocodeError ? <span className="text-destructive">{geocodeError}</span> : null}
    </div>
  </div>
</div>

        </aside>

        <main className="flex-1 relative min-h-0 overflow-hidden">
          <div className="absolute top-9 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 pointer-events-none">
            <div className="pointer-events-auto rounded-full bg-white/95 border border-border shadow px-3 py-2 text-sm font-semibold">
              {status.tone === "loading"
                ? "Loading visible area…"
                : status.tone === "error"
                ? "Error loading data"
                : isZoomEligible
                ? `Displaying ${lines.length} street rules`
                : "Zoom in to 17+ to load rules"}
            </div>

            <div className="pointer-events-auto rounded-full bg-white/95 border border-border shadow px-3 py-2 text-sm font-semibold">
              Current Zoom Level: {fmt(viewport?.zoom, 0)}
            </div>

            <Button
              variant="secondary"
              onClick={onReset}
              className="pointer-events-auto h-9 rounded-full px-3 text-sm font-semibold leading-none border border-border shadow"
              style={{ backgroundColor: "#e7f7ea", color: "#000000" }}
            >
              Reset Map View
            </Button>
          </div>

          <div className="absolute inset-0">
            <ASPMap
              lines={lines}
              defaultCenter={DEFAULT_CENTER}
              defaultZoom={DEFAULT_ZOOM}
              isZoomEligible={isZoomEligible}
              resetNonce={resetNonce}
              goTo={goToTarget}
              goToNonce={goToNonce}
              onViewportChange={({ bbox, zoom, center }: { bbox: BBox; zoom: number; center: [number, number] }) => {
                if (!bbox || typeof zoom !== "number" || !center) return
                if (![bbox.west, bbox.south, bbox.east, bbox.north, center[0], center[1]].every((n) => Number.isFinite(n)))
                  return

                const key = `${zoom.toFixed(3)}|${center[0].toFixed(5)},${center[1].toFixed(5)}|${bbox.west.toFixed(5)},${bbox.south.toFixed(5)},${bbox.east.toFixed(5)},${bbox.north.toFixed(5)}`
                if (key === lastKeyRef.current) return
                lastKeyRef.current = key

                if (viewportDebounceRef.current) window.clearTimeout(viewportDebounceRef.current)
                viewportDebounceRef.current = window.setTimeout(() => {
                  setViewport({ bbox, zoom, center })
                }, 200)
              }}
            />
          </div>
        </main>
      </div>

      {showSuspensions && (
        <div className="fixed inset-0 z-[2000]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSuspensions(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-xl border border-border shadow-lg bg-white">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="text-base font-semibold">Alt Street Parking suspension dates</div>
                <Button variant="ghost" className="h-8 px-2" onClick={() => setShowSuspensions(false)}>
                  Close
                </Button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto px-4 py-3">
                <div className="text-sm text-muted-foreground mb-3">Alt Street Parking is suspended on these dates.</div>

                <div className="space-y-3">
                  {ALT_STREET_PARKING_SUSPENSIONS.map((x, i) => (
                    <div key={`${x.name}-${i}`} className="rounded-lg border border-border p-3">
                      <div className="text-sm font-semibold">{x.name}</div>
                      <div className="text-sm mt-1">{x.when}</div>
                      {x.meters ? <div className="text-xs text-muted-foreground mt-1">{x.meters}</div> : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
