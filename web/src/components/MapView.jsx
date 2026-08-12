import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

// CARTO dark-matter: vector basemap, no token (D-008: no Mapbox).
const BASEMAP = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

// Palette frozen in BUILD-PLAN §4.
const PENDING_COLOR = '#10333a' // exposure not loaded yet

// Within-tier ramp by exposure gap (Guttu's demo-blocker #3): tiers saturate
// on the real data, so brightness carries the gap and the scrub reads
// continuously. Fixed 3–12h window (where the real gaps live: 6.6–10.6) so
// hours are comparable and the spread is visible on a projector.
const GAP_RAMP_START = 3
const GAP_RAMP_END = 12
const TIER_RAMPS = {
  safe: ['#1f6f5c', '#1f6f5c'], // gap ≤ 0 by definition — flat
  warning: ['#7d4e06', '#e8a52c'],
  critical: ['#6f2015', '#e2553f'],
}

const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
function rampColor(tier, gapHours) {
  const [lo, hi] = TIER_RAMPS[tier] ?? [PENDING_COLOR, PENDING_COLOR]
  const t = Math.max(
    0,
    Math.min(1, (gapHours - GAP_RAMP_START) / (GAP_RAMP_END - GAP_RAMP_START)),
  )
  const [a, b] = [hexToRgb(lo), hexToRgb(hi)]
  const mix = a.map((v, i) => Math.round(v + (b[i] - v) * t))
  return `rgb(${mix[0]},${mix[1]},${mix[2]})`
}

// F2: fill from feature-state so the scrub recolors without touching source
// data (instant, D-006-friendly). Color is precomputed per hour in JS.
const FILL_BY_STATE = [
  'to-color',
  ['coalesce', ['feature-state', 'color'], PENDING_COLOR],
]

// Handles Polygon and MultiPolygon — real NPU boundaries mix both.
function boundsOf(geojson) {
  const b = new maplibregl.LngLatBounds()
  for (const f of geojson.features) {
    const polys =
      f.geometry.type === 'Polygon'
        ? [f.geometry.coordinates]
        : f.geometry.coordinates
    for (const poly of polys) {
      for (const pos of poly[0]) b.extend(pos)
    }
  }
  return b
}

export default function MapView({ npus, exposure }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const hoverIdRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [tip, setTip] = useState(null)

  const expById = useMemo(() => {
    const m = {}
    if (exposure) for (const e of exposure.npus) m[e.npu_id] = e
    return m
  }, [exposure])

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP,
      center: [-84.42, 33.77], // Atlanta, refined by fitBounds once data lands
      zoom: 10.3,
      attributionControl: { compact: true },
    })
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'top-right',
    )
    map.on('load', () => setReady(true))
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      setReady(false)
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || !npus) return

    if (map.getSource('npus')) {
      map.getSource('npus').setData(npus)
      return
    }

    map.addSource('npus', { type: 'geojson', data: npus, promoteId: 'npu_id' })

    // keep basemap place labels above the choropleth
    const firstSymbol = map
      .getStyle()
      .layers.find((l) => l.type === 'symbol')?.id

    map.addLayer(
      {
        id: 'npu-fill',
        type: 'fill',
        source: 'npus',
        paint: {
          'fill-color': FILL_BY_STATE,
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.85,
            0.62,
          ],
        },
      },
      firstSymbol,
    )
    map.addLayer(
      {
        id: 'npu-line',
        type: 'line',
        source: 'npus',
        paint: {
          'line-color': '#e8f1f2',
          'line-opacity': 0.25,
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            2,
            0.75,
          ],
        },
      },
      firstSymbol,
    )

    map.on('mousemove', 'npu-fill', (e) => {
      const f = e.features?.[0]
      if (!f) return
      map.getCanvas().style.cursor = 'pointer'
      if (hoverIdRef.current !== null && hoverIdRef.current !== f.id) {
        map.setFeatureState(
          { source: 'npus', id: hoverIdRef.current },
          { hover: false },
        )
      }
      hoverIdRef.current = f.id
      map.setFeatureState({ source: 'npus', id: f.id }, { hover: true })
      setTip({ x: e.point.x, y: e.point.y, props: f.properties })
    })
    map.on('mouseleave', 'npu-fill', () => {
      map.getCanvas().style.cursor = ''
      if (hoverIdRef.current !== null) {
        map.setFeatureState(
          { source: 'npus', id: hoverIdRef.current },
          { hover: false },
        )
        hoverIdRef.current = null
      }
      setTip(null)
    })

    map.fitBounds(boundsOf(npus), { padding: 48, duration: 900 })
  }, [ready, npus])

  // F2/F3: push the current hour's tier into feature-state — instant recolor.
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || !exposure || !map.getSource('npus')) return
    for (const e of exposure.npus) {
      map.setFeatureState(
        { source: 'npus', id: e.npu_id },
        {
          tier: e.tier,
          dark: e.is_dark,
          color: rampColor(e.tier, e.exposure_gap_hours),
        },
      )
    }
  }, [ready, npus, exposure])

  const tipExp = tip ? expById[tip.props.npu_id] : null

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="map" />
      {tip && (
        <div className="map-tooltip" style={{ left: tip.x, top: tip.y }}>
          <div className="t-name">
            {tip.props.name} · {tip.props.npu_id}
          </div>
          <div className="t-est">
            <b>{tip.props.dme_estimate}</b> electricity-dependent residents
            (est. {tip.props.dme_low}–{tip.props.dme_high})
          </div>
          {tipExp && (
            <div className={`t-gap tier-${tipExp.tier}`}>
              {tipExp.exposure_gap_hours > 0 ? (
                <>
                  <b>{tipExp.exposure_gap_hours.toFixed(1)}h</b> exposure gap ·{' '}
                  {tipExp.people_at_risk} at risk
                </>
              ) : tipExp.is_dark ? (
                'dark · within device runtime'
              ) : (
                'power on · no exposure gap'
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
