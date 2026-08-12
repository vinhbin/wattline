import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

// CARTO dark-matter: vector basemap, no token (D-008: no Mapbox).
const BASEMAP = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

// Palette frozen in BUILD-PLAN §4.
const TIER_COLORS = {
  safe: '#1f6f5c',
  warning: '#c77d0a',
  critical: '#b3392a',
}
const PENDING_COLOR = '#10333a' // exposure not loaded yet

// F2: fill by tier, driven by feature-state so the scrub recolors without
// touching source data (instant, D-006-friendly).
const FILL_BY_TIER = [
  'match',
  ['coalesce', ['feature-state', 'tier'], 'pending'],
  'safe',
  TIER_COLORS.safe,
  'warning',
  TIER_COLORS.warning,
  'critical',
  TIER_COLORS.critical,
  PENDING_COLOR,
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
          'fill-color': FILL_BY_TIER,
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
        { tier: e.tier, dark: e.is_dark },
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
