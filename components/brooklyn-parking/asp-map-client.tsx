"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import useSWR from "swr"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import L from "leaflet"

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
const SLICE_PADDING_METERS = 20

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

function pointToSegmentMeters(
  pLat: number,
  pLon: number,
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number
) {
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
  const [mapRef, setMapRef] = useState<L.Map | null>(null)

  const [viewport, setViewport] = useState<Viewport | null>(null)
  const [resetNonce, setResetNonce] = useState(0)

  const [addressOpen, setAddressOpen] = useState(false)
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
    if (!viewport) return { tone: "neutral" as const, text: "Zoom in to street level (17+) to load parking rules." }

    if (!isZoomEligible) {
      return {
        tone: "neutral" as const,
        text: "Zoom in to street level (17+) to load parking rules.",
      }
    }

    if (aspLoading || clLoading) return { tone: "loading" as const, text: "Loading visible area…" }

    const anyErr = buildError
    if (anyErr) return { tone: "error" as const, text: "Error loading data" }

    return { tone: "ok" as const, text: "" }
  }, [viewport, isZoomEligible, aspLoading, clLoading, buildError])

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
        setAddressOpen(false)
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
    <div className="h-screen w-screen relative overflow-hidden">
      {/* MAP */}
      <div className="absolute inset-0">
        <ASPMap
          lines={lines}
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          isZoomEligible={isZoomEligible}
          resetNonce={resetNonce}
          goTo={goToTarget}
          goToNonce={goToNonce}
          onMapReady={(map) => setMapRef(map)}
          onViewportChange={({ bbox, zoom, center }: { bbox: BBox; zoom: number; center: [number, number] }) => {
            if (!bbox || typeof zoom !== "number" || !center) return
            if (
              ![bbox.west, bbox.south, bbox.east, bbox.north, center[0], center[1]].every((n) => Number.isFinite(n))
            )
              return

            const key = `${zoom.toFixed(3)}|${center[0].toFixed(5)},${center[1].toFixed(5)}|${bbox.west.toFixed(
              5
            )},${bbox.south.toFixed(5)},${bbox.east.toFixed(5)},${bbox.north.toFixed(5)}`
            if (key === lastKeyRef.current) return
            lastKeyRef.current = key

            if (viewportDebounceRef.current) window.clearTimeout(viewportDebounceRef.current)
            viewportDebounceRef.current = window.setTimeout(() => {
              setViewport({ bbox, zoom, center })
            }, 200)
          }}
        />
      </div>

      {/* DESKTOP LEFT PANEL (overlay, not sidebar) */}
      <div className="hidden md:block absolute left-6 top-[30%] z-[1200] pointer-events-none">
        <div className="pointer-events-auto">

  {/* ===================== */}
  {/* TOP AREA — TITLE ONLY */}
  {/* ===================== */}
  <div className="-mt-20 mb-17">
   <div style={{ fontFamily: "'Bebas Neue', sans-serif" }} className="select-none">
    <div className="bk-title text-[100px] leading-none uppercase text-white">BROOKLYN</div>
  </div>

  <style jsx>{`
    .bk-title {
      text-shadow: 6px 6px 0 #000;
    }
  `}</style>
</div>


  {/* ===================== */}
  {/* MIDDLE AREA — RULES + ZOOM */}
  {/* ===================== */}
  <div className="mt-4">
    {/* RULES POD */}
    <div className="mt-4 w-[310px] bg-white border-2 border-black px-4 py-2 rounded-full">
      <div className="text-[12px] font-bold uppercase tracking-wide text-black leading-tight text-center">
        Zoom to street level (17+) to load.
        <br />
        Tap blue lines to view parking rules.
      </div>
    </div>

    {/* CURRENT ZOOM + +/- */}
    <div className="mt-3 w-[310px] flex items-center justify-between">
      <div className="flex items-center gap-2 pl-1">
        <div className="text-black font-bold uppercase tracking-wide text-base">Current</div>
        <div className="w-12 h-12 rounded-full border-2 border-black bg-white flex items-center justify-center">
          <span className="text-black font-bold text-lg">{fmt(viewport?.zoom, 0)}</span>
        </div>
        <div className="text-black font-bold uppercase tracking-wide text-base">Zoom</div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => mapRef?.zoomOut()}
          disabled={!mapRef}
          className="w-10 h-10 border-2 border-black bg-white font-bold text-xl leading-none"
        >
          −
        </button>

        <button
          onClick={() => mapRef?.zoomIn()}
          disabled={!mapRef}
          className="w-10 h-10 border-2 border-black bg-white font-bold text-xl leading-none"
        >
          +
        </button>
      </div>
    </div>
  </div>

  {/* ===================== */}
  {/* BOTTOM AREA — BUTTONS */}
  {/* ===================== */}
  <div className="mt-18 w-[310px] flex flex-col gap-3">
    <Button
      onClick={onReset}
      className="h-12 w-full rounded-full border-2 border-black bg-[#79D49A] hover:bg-[#67C989] text-black font-bold uppercase"
    >
      Reset Map View
    </Button>

    <Button
      onClick={() => {
        setGeocodeError("")
        setAddressOpen(true)
      }}
      className="h-12 w-full rounded-full border-2 border-black bg-[#79D49A] hover:bg-[#67C989] text-black font-bold uppercase"
    >
      Address Search
    </Button>

    <Button
      asChild
      className="h-12 w-full rounded-full border-2 border-black bg-[#4D8AC9] hover:bg-[#3F7FBE] text-black font-bold uppercase"
    >
      <Link href="/">Back To Main Page</Link>
    </Button>
    </div>
   </div>
 </div>

{/* MOBILE TOP STACK (TITLE + RULES + ZOOM) */}
<div className="md:hidden absolute top-6 left-0 right-0 z-[1200] px-4 pointer-events-none">
  <div className="pointer-events-auto w-full flex flex-col items-center">
    {/* TITLE */}
    <div style={{ fontFamily: "'Bebas Neue', sans-serif" }} className="w-full text-center select-none">
      <div
        className="text-[85px] leading-none uppercase text-white"
        style={{ textShadow: "6px 6px 0 rgba(0,0,0,1)" }}
      >
        BROOKLYN
      </div>
    </div>

    {/* RULES + ZOOM (desktop middle block) */}
    <div className="mt-4 w-[310px] flex flex-col items-center">
      {/* RULES POD */}
      <div className="w-full bg-white border-2 border-black px-4 py-2 rounded-full">
        <div className="text-[12px] font-bold uppercase tracking-wide text-black leading-tight text-center">
          Zoom to street level (17+) to load.
          <br />
          Tap blue lines to view parking rules.
        </div>
      </div>

      {/* CURRENT ZOOM + +/- */}
      <div className="mt-3 w-full flex justify-center">
        <div className="flex items-center gap-2">
          <div className="text-black font-bold uppercase tracking-wide text-base">Current</div>
          <div className="w-12 h-12 rounded-full border-2 border-black bg-white flex items-center justify-center">
            <span className="text-black font-bold text-lg">{fmt(viewport?.zoom, 0)}</span>
          </div>
          <div className="text-black font-bold uppercase tracking-wide text-base">Zoom</div>
        </div>
      </div>
    </div>
  </div>
</div>


      {/* MOBILE BOTTOM CONTROLS */}
<div className="md:hidden absolute left-0 right-0 bottom-10 z-[1200] px-4 pointer-events-none">
  <div className="pointer-events-auto w-full flex flex-col items-center">
    <div className="w-[310px] flex flex-col gap-3">
      <Button
        onClick={onReset}
        className="h-12 w-full rounded-full border-2 border-black bg-[#79D49A] hover:bg-[#67C989] text-black font-bold uppercase"
      >
        Reset Map View
      </Button>

      <Button
        onClick={() => {
          setGeocodeError("")
          setAddressOpen(true)
        }}
        className="h-12 w-full rounded-full border-2 border-black bg-[#79D49A] hover:bg-[#67C989] text-black font-bold uppercase"
      >
        Address Search
      </Button>

      <Button
        asChild
        className="h-12 w-full rounded-full border-2 border-black bg-[#4D8AC9] hover:bg-[#3F7FBE] text-black font-bold uppercase"
      >
        <Link href="/">Back To Main Page</Link>
      </Button>
    </div>
  </div>
</div>


      {/* ADDRESS SEARCH POPUP (opened by button) */}
      {addressOpen && (
        <div className="fixed inset-0 z-[2000]">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              if (!geocodeLoading) setAddressOpen(false)
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-xl border-2 border-black bg-white">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="text-base font-bold uppercase text-black">Type in address</div>
                  <Button
                    variant="ghost"
                    className="h-8 px-2 text-black"
                    onClick={() => {
                      if (!geocodeLoading) setAddressOpen(false)
                    }}
                  >
                    Close
                  </Button>
                </div>

                <div className="mt-3 text-sm font-semibold text-black">Number and Street Only</div>

                <div className="mt-3 flex items-center gap-2 w-full overflow-hidden">
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
                    className="min-w-0 basis-2/3 h-10 rounded-none border-2 border-black bg-white px-3 text-sm outline-none text-black"
                  />

                  <Button
                    onClick={onGoToAddress}
                    disabled={geocodeLoading || !addressQuery.trim()}
                    className="shrink-0 h-10 px-4 rounded-md border-2 border-black bg-[#79D49A] hover:bg-[#67C989] text-black font-bold uppercase disabled:opacity-100"
                  >
                    {geocodeLoading ? "…" : "Go"}
                  </Button>
                </div>

                <div className="mt-3 h-4 text-sm font-semibold text-center">
                  {geocodeError ? <span className="text-red-600">{geocodeError}</span> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
