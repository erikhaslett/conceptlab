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
  // Leaflet expects [lat,lng]
  latlngs: [number, number][]
  // Popup content
  street: string
  from: string
  to: string
  sideLabel: string // e.g. "N side" / "S side" / "E side" / "W side"
  rule: string
}

type Props = {
  // Rendering
  lines: BlockfaceLine[]

  // View defaults / reset target
  defaultCenter: [number, number]
  defaultZoom: number

  // UI state passed in
  isZoomEligible: boolean

  // Map -> parent callbacks
  onViewportChange: (v: { bbox: BBox; zoom: number; center: [number, number] }) => void
  // Parent increments this to force reset
  resetNonce: number

  // Address search -> map jump + pin
  goTo?: { lat: number; lon: number; label?: string } | null
  goToNonce?: number
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

/**
 * Minimal + safe Leaflet resize handling.
 * - No repeated setView calls (those can be expensive and feel “slow”)
 * - Only invalidateSize when map is ready and panes exist
 * - Throttled to once per animation frame
 */
function FixLeafletResize() {
  const map = useMap()

  useEffect(() => {
    let ro: ResizeObserver | null = null
    let rafPending = false
    let isUnmounted = false

    const safeInvalidate = () => {
      if (isUnmounted) return

      // Guard against calling invalidateSize while Leaflet is mid-init or after unmount.
      const anyMap: any = map as any
      if (!anyMap?._loaded) return
      if (!anyMap?._mapPane) return

      try {
        map.invalidateSize()
      } catch {
        // swallow — we prefer no crash over aggressive fixing
      }
    }

    // One post-mount invalidate after first paint (fast + usually sufficient)
    const t = window.setTimeout(() => {
      safeInvalidate()
    }, 0)

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

  // Fire once on mount so client has initial bbox/zoom
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

      // Single safe invalidate after reset (avoid multi-timeout thrash)
      requestAnimationFrame(() => {
        if (isUnmounted) return
        if (!anyMap?._loaded || !anyMap?._mapPane) return
        try {
          map.invalidateSize()
        } catch {
          // ignore
        }
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
    // If parent clears the target (e.g. Reset view), clear pin too.
    if (!goTo) {
      setPin(null)
      return
    }

    if (!Number.isFinite(goTo.lat) || !Number.isFinite(goTo.lon)) return

    setPin(goTo)
    map.setView([goTo.lat, goTo.lon], 17, { animate: true })
  }, [map, goTo, goToNonce])

  // Simple circle pin (avoids Leaflet default icon asset issues in Next)
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: `<div style="
          width:14px;height:14px;border-radius:9999px;
          background:#2563eb;
          border:2px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.25);
        "></div>`,
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

export default function ASPMap({
  lines,
  defaultCenter,
  defaultZoom,
  isZoomEligible,
  onViewportChange,
  resetNonce,
  goTo,
  goToNonce,
}: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // gate MapContainer mount until container has a real size
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
      // Only mount Leaflet once we have a meaningful size (prevents partial/strip render)
      if (r.width >= 200 && r.height >= 200) {
        markReady()
      }
    }

    // DEADMAN: guarantee mount even if ResizeObserver/threshold never triggers.
    // Keeps the gate, but makes it impossible to hang forever.
    deadman = window.setTimeout(() => {
      markReady()
    }, 750)

    check()

    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => check())
      ro.observe(el)
    } else {
      // fallback: one extra tick
      const t = window.setTimeout(check, 0)
      return () => {
        isUnmounted = true
        window.clearTimeout(t)
        if (deadman != null) window.clearTimeout(deadman)
      }
    }

    return () => {
      isUnmounted = true    
      if (deadman != null) window.clearTimeout(deadman)
      if (ro) ro.disconnect()
    }
  }, [])

  // Default lines should be faint until hovered
  const basePolyStyle = useMemo(
    () => ({
      weight: 5,
      opacity: 0.35,
    }),
    []
  )

  // Hovered line becomes fully visible
  const activePolyStyle = useMemo(
    () => ({
      weight: 5,
      opacity: 0.9,
    }),
    []
  )

  // A wider invisible “hit area” makes clicking easier without changing appearance.
  const hitStyle = useMemo(
    () => ({
      weight: 14,
      opacity: 0,
    }),
    []
  )

  return (
    <div ref={containerRef} className="h-full w-full relative">
      <style jsx global>{`
        /* Move the entire top-left control stack (zoom buttons) to vertical middle */
        .leaflet-top.leaflet-left {
          top: 39% !important;
          transform: translateY(-50%) !important;
        }
      `}</style>

      {containerReady ? (
        <MapContainer center={defaultCenter} zoom={defaultZoom} scrollWheelZoom className="h-full w-full" preferCanvas>
          <FixLeafletResize />
          <ViewportReporter onViewportChange={onViewportChange} />
          <ResetHandler defaultCenter={defaultCenter} defaultZoom={defaultZoom} resetNonce={resetNonce} />
          <GoToHandler goTo={goTo} goToNonce={goToNonce} />

          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Draw lines only when parent says we are zoom-eligible */}
          {isZoomEligible &&
            lines.map((ln) => {
              const isActive = hoveredId === ln.id
              const visibleStyle = isActive ? activePolyStyle : basePolyStyle

              return (
                <div key={ln.id}>
                  {/* Visible line (non-interactive) */}
                  <Polyline
                    positions={ln.latlngs}
                    pathOptions={{
                      ...visibleStyle,
                      interactive: false,
                    }}
                  />

                  {/* Invisible hit line (handles hover + click + popup) */}
                  <Polyline
                    positions={ln.latlngs}
                    pathOptions={hitStyle}
                    eventHandlers={{
                      mouseover: () => setHoveredId(ln.id),
                      mouseout: () => setHoveredId((cur) => (cur === ln.id ? null : cur)),
                    }}
                  >
                    <Popup>
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
