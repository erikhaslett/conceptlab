"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { MapContainer, TileLayer, Polyline, Popup, Marker, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

export type BBox = {
  west: number
  south: number
  east: number
  north: number
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

type Props = {
  lines: BlockfaceLine[]
  defaultCenter: [number, number]
  defaultZoom: number
  isZoomEligible: boolean
  onViewportChange: (v: { bbox: BBox; zoom: number; center: [number, number] }) => void
  resetNonce: number
  goTo?: { lat: number; lon: number; label?: string } | null
  goToNonce?: number
  onMapReady?: (map: L.Map) => void
}

function computeBBox(map: L.Map): BBox {
  const b = map.getBounds()
  const sw = b.getSouthWest()
  const ne = b.getNorthEast()
  return {
    west: sw.lng,
    south: sw.lat,
    east: ne.lng,
    north: ne.lat,
  }
}

const BROOKLYN_MAX_BOUNDS = L.latLngBounds(
  [40.50988387630726, -74.13728713989259],
  [40.79379856838544, -73.73079299926759]
)

function FixLeafletResize() {
  const map = useMap()

  useEffect(() => {
    let ro: ResizeObserver | null = null
    let rafPending = false
    let isUnmounted = false

    const safeInvalidate = () => {
      if (isUnmounted) return
      const anyMap: any = map as any
      if (!anyMap?._loaded || !anyMap?._mapPane) return
      try {
        map.invalidateSize()
      } catch {}
    }

    const t = window.setTimeout(safeInvalidate, 0)

    const container = map.getContainer?.()
    if (container && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        if (rafPending) return
        rafPending = true
        requestAnimationFrame(() => {
          rafPending = false
          safeInvalidate()
        })
      })
      ro.observe(container)
    }

    return () => {
      isUnmounted = true
      window.clearTimeout(t)
      if (ro) ro.disconnect()
    }
  }, [map])

  return null
}

function ViewportReporter({
  onViewportChange,
}: {
  onViewportChange: (v: { bbox: BBox; zoom: number; center: [number, number] }) => void
}) {
  const map = useMapEvents({
    moveend() {
      const bbox = computeBBox(map)
      const zoom = map.getZoom()
      const c = map.getCenter()
      onViewportChange({ bbox, zoom, center: [c.lat, c.lng] })
    },
    zoomend() {
      const bbox = computeBBox(map)
      const zoom = map.getZoom()
      const c = map.getCenter()
      onViewportChange({ bbox, zoom, center: [c.lat, c.lng] })
    },
  })

  useEffect(() => {
    const bbox = computeBBox(map)
    const zoom = map.getZoom()
    const c = map.getCenter()
    onViewportChange({ bbox, zoom, center: [c.lat, c.lng] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

function ResetHandler({
  defaultCenter,
  defaultZoom,
  resetNonce,
}: {
  defaultCenter: [number, number]
  defaultZoom: number
  resetNonce: number
}) {
  const map = useMap()

  useEffect(() => {
    const isInitial = resetNonce === 0
    let isUnmounted = false
    const anyMap: any = map as any

    map.whenReady(() => {
      if (isUnmounted) return
      map.setView(defaultCenter, defaultZoom, { animate: !isInitial })
      requestAnimationFrame(() => {
        if (isUnmounted) return
        if (!anyMap?._loaded || !anyMap?._mapPane) return
        try {
          map.invalidateSize()
        } catch {}
      })
    })

    return () => {
      isUnmounted = true
    }
  }, [map, defaultCenter, defaultZoom, resetNonce])

  return null
}

function GoToHandler({
  goTo,
  goToNonce,
}: {
  goTo?: { lat: number; lon: number; label?: string } | null
  goToNonce?: number
}) {
  const map = useMap()
  const [pin, setPin] = useState<{ lat: number; lon: number; label?: string } | null>(null)

  useEffect(() => {
    if (!goTo) {
      setPin(null)
      return
    }
    if (!Number.isFinite(goTo.lat) || !Number.isFinite(goTo.lon)) return
    setPin(goTo)
    map.setView([goTo.lat, goTo.lon], 17, { animate: true })
  }, [map, goTo, goToNonce])

  const icon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: `<div style="width:14px;height:14px;border-radius:9999px;background:#2563eb;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      }),
    []
  )

  if (!pin) return null

  return (
    <Marker position={[pin.lat, pin.lon]} icon={icon}>
      <Popup>
        <div style={{ minWidth: 200 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Selected address</div>
          <div style={{ fontSize: 13 }}>{pin.label || `${pin.lat.toFixed(5)}, ${pin.lon.toFixed(5)}`}</div>
        </div>
      </Popup>
    </Marker>
  )
}

// (1) Bridge: expose the Leaflet map instance upward (for custom zoom controls later)
function ZoomController({ onReady }: { onReady?: (map: L.Map) => void }) {
  const map = useMap()
  useEffect(() => {
    onReady?.(map)
  }, [map, onReady])
  return null
}

/**
 * Borough mask — RESTORED, EXACT LOGIC
 */
function BoroughMask() {
  const map = useMap()
  const layerRef = useRef<L.Polygon | null>(null)

  useEffect(() => {
    let isUnmounted = false

    async function run() {
      try {
        const res = await fetch("/brooklyn/outline.geojson", { cache: "force-cache" })
        if (!res.ok) throw new Error(`outline fetch failed`)
        const fc = await res.json()
        const geom = fc?.features?.[0]?.geometry
        if (!geom) throw new Error("missing geometry")

        // WORLD outer ring
        const outerRing: [number, number][] = [
          [85, -180],
          [85, 180],
          [-85, 180],
          [-85, -180],
        ]

        const rings: [number, number][][] = [outerRing]

        type LngLat = [number, number]

        function ringArea(r: LngLat[]) {
          let a = 0
          for (let i = 0; i < r.length; i++) {
            const [x1, y1] = r[i]
            const [x2, y2] = r[(i + 1) % r.length]
            a += x1 * y2 - x2 * y1
          }
          return Math.abs(a / 2)
        }

        function pushPolygon(poly: any) {
          for (const ring of poly) {
            const latlng = ring
              .map((p: any) => [p[1], p[0]] as [number, number])
              .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]))
            if (latlng.length >= 3) rings.push(latlng)
          }
        }

        if (geom.type === "Polygon") {
          pushPolygon(geom.coordinates)
        } else if (geom.type === "MultiPolygon") {
          let best: any = null
          let bestArea = -1
          for (const poly of geom.coordinates) {
            const area = ringArea(poly[0])
            if (area > bestArea) {
              bestArea = area
              best = poly
            }
          }
          if (best) pushPolygon(best)
        }

        if (isUnmounted) return

        if (layerRef.current) layerRef.current.remove()

        const mask = L.polygon(rings as any, {
          interactive: false,
          stroke: false,
          fill: true,
          fillColor: "#303234",
          fillOpacity: 0.3,
          fillRule: "evenodd",
        })

        mask.addTo(map)
        layerRef.current = mask
      } catch (e) {
        console.warn("BoroughMask failed:", e)
      }
    }

    run()

    return () => {
      isUnmounted = true
      if (layerRef.current) layerRef.current.remove()
    }
  }, [map])

  return null
}

function MapReadyReporter({ onMapReady }: { onMapReady?: (map: L.Map) => void }) {
  const map = useMap()

  useEffect(() => {
    if (onMapReady) onMapReady(map)
  }, [map, onMapReady])

  return null
}

export default function ASPMap(props: Props) {
  const {
    lines,
    defaultCenter,
    defaultZoom,
    isZoomEligible,
    onViewportChange,
    resetNonce,
    goTo,
    goToNonce,
    onMapReady, // (1)
  } = props

  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerReady, setContainerReady] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let ro: ResizeObserver | null = null
    let done = false
    let deadman: number | null = null
    let isUnmounted = false

    const markReady = () => {
      if (done || isUnmounted) return
      done = true
      setContainerReady(true)
      if (deadman != null) window.clearTimeout(deadman)
      if (ro) ro.disconnect()
    }

    const check = () => {
      if (done || isUnmounted) return
      const r = el.getBoundingClientRect()
      if (r.width >= 200 && r.height >= 200) markReady()
    }

    deadman = window.setTimeout(markReady, 750)
    check()

    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(check)
      ro.observe(el)
    }

    return () => {
      isUnmounted = true
      if (deadman != null) window.clearTimeout(deadman)
      if (ro) ro.disconnect()
    }
  }, [])

  const basePolyStyle = useMemo(() => ({ weight: 5, opacity: 0.35 }), [])
  const activePolyStyle = useMemo(() => ({ weight: 5, opacity: 0.9 }), [])
  const hitStyle = useMemo(() => ({ weight: 14, opacity: 0 }), [])

  return (
    <div ref={containerRef} className="h-full w-full relative">
      {containerReady ? (
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          minZoom={13}
          // (2) hide Leaflet default +/- controls
          zoomControl={false}
          // (CHANGE) do not close popups just because the map was clicked/touched
          closePopupOnClick={false}
          maxBounds={BROOKLYN_MAX_BOUNDS}
          maxBoundsViscosity={1.0}
          scrollWheelZoom
          className="h-full w-full"
          preferCanvas
        >
          {/* (2) belt-and-suspenders: also hide any zoom UI if something re-adds it */}
          <style jsx global>{`
            .leaflet-control-zoom {
              display: none !important;
            }
          `}</style>

          {/* (1) expose map instance for custom zoom controls later */}
          <ZoomController onReady={onMapReady} />

          <FixLeafletResize />
          <ViewportReporter onViewportChange={onViewportChange} />
          <ResetHandler defaultCenter={defaultCenter} defaultZoom={defaultZoom} resetNonce={resetNonce} />
          <GoToHandler goTo={goTo} goToNonce={goToNonce} />

          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <BoroughMask />

          {isZoomEligible &&
            lines.map((ln) => {
              const isActive = hoveredId === ln.id
              const visibleStyle = isActive ? activePolyStyle : basePolyStyle

              return (
                <div key={ln.id}>
                  <Polyline positions={ln.latlngs} pathOptions={{ ...visibleStyle, interactive: false }} />
                  <Polyline
                    positions={ln.latlngs}
                    pathOptions={hitStyle}
                    eventHandlers={{
                      mouseover: () => setHoveredId(ln.id),
                      mouseout: () => setHoveredId((cur) => (cur === ln.id ? null : cur)),
                    }}
                  >
                    <Popup
                      // (CHANGE) keep popup open during map interactions; user can still close via X
                      closeOnClick={false}
                      autoClose={false}
                      closeButton={true}
                    >
                      <div style={{ minWidth: 220 }}>
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>{ln.street}</div>
                        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 8 }}>
                          {ln.from} — {ln.to} • {ln.sideLabel}
                        </div>
                        <div style={{ fontSize: 13 }}>{ln.rule}</div>
                      </div>
                    </Popup>
                  </Polyline>
                </div>
              )
            })}
        </MapContainer>
      ) : (
        <div className="absolute inset-0" />
      )}
    </div>
  )
}
