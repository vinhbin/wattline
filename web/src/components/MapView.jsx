import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import Legend from './Legend.jsx'

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

// Bounds center as a cheap NPU anchor for dispatch lines (processed npus.json
// carries no centroid property).
function centerOf(feature) {
  const b = boundsOf({ features: [feature] })
  const c = b.getCenter()
  return [c.lng, c.lat]
}

const SITE_TYPE_LABEL = {
  library: 'library',
  fire_station: 'fire station',
  rec_center: 'rec center',
}

export default function MapView({ npus, exposure, sites, selectedId, onSelect }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const hoverIdRef = useRef(null)
  const prevSelectedRef = useRef(null)
  // map handlers bind once (source setup) — keep the latest callback reachable
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const [ready, setReady] = useState(false)
  const [tip, setTip] = useState(null)
  // F5: dispatch lines are opt-in — the button press is the demo beat
  const [dispatchOn, setDispatchOn] = useState(false)

  const expById = useMemo(() => {
    const m = {}
    if (exposure) for (const e of exposure.npus) m[e.npu_id] = e
    return m
  }, [exposure])

  // F5: site points + site→assigned-NPU dispatch lines as GeoJSON
  const sitesGeo = useMemo(() => {
    if (!sites?.sites) return null
    return {
      type: 'FeatureCollection',
      features: sites.sites.map((s) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
        properties: {
          site_id: s.site_id,
          name: s.name,
          type: s.type,
          capacity: s.capacity,
          transit_reachable: s.transit_reachable,
          people_served: s.people_served,
          assigned: (s.assigned_npus ?? []).length,
        },
      })),
    }
  }, [sites])

  const linesGeo = useMemo(() => {
    if (!sites?.sites || !npus) return null
    const centers = {}
    for (const f of npus.features) {
      centers[f.properties.npu_id] = centerOf(f)
    }
    const features = []
    for (const s of sites.sites) {
      for (const npuId of s.assigned_npus ?? []) {
        if (!centers[npuId]) continue
        features.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [[s.lon, s.lat], centers[npuId]],
          },
          properties: { site_id: s.site_id, npu_id: npuId },
        })
      }
    }
    return { type: 'FeatureCollection', features }
  }, [sites, npus])

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP,
      center: [-84.42, 33.77], // Atlanta, refined by fitBounds once data lands
      zoom: 10.3,
      attributionControl: { compact: true },
    })
    // bottom-right so the F4 detail panel (top-right) never covers zoom
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'bottom-right',
    )
    map.on('load', () => setReady(true))
    mapRef.current = map
    window.__wl_map = map // headless-verification handle
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
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            '#f5b54a',
            '#e8f1f2',
          ],
          'line-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            0.95,
            // base boundaries lifted for projector legibility (F6) so NPU
            // shapes stay separable and the choropleth never reads as one blob
            0.4,
          ],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            2.5,
            ['boolean', ['feature-state', 'hover'], false],
            2,
            1,
          ],
        },
      },
      firstSymbol,
    )

    // F4: click a polygon → select; click empty basemap → deselect.
    // Site dots sit above the fills and are not selectable — clicking one
    // must not deselect the NPU under it.
    map.on('click', (e) => {
      const layers = ['site-dots', 'npu-fill'].filter((id) => map.getLayer(id))
      const hits = map.queryRenderedFeatures(e.point, { layers })
      if (!hits.length) return onSelectRef.current(null)
      if (hits[0].layer.id === 'site-dots') return
      onSelectRef.current(hits[0].id)
    })

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

  // F5: sites + dispatch-lines layers. Lines under dots, both under labels.
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || !sitesGeo || !linesGeo) return

    if (map.getSource('sites')) {
      map.getSource('sites').setData(sitesGeo)
      map.getSource('dispatch-lines').setData(linesGeo)
      return
    }

    map.addSource('sites', { type: 'geojson', data: sitesGeo })
    map.addSource('dispatch-lines', { type: 'geojson', data: linesGeo })

    const firstSymbol = map
      .getStyle()
      .layers.find((l) => l.type === 'symbol')?.id

    map.addLayer(
      {
        id: 'dispatch-lines',
        type: 'line',
        source: 'dispatch-lines',
        layout: { visibility: 'none' },
        paint: {
          'line-color': '#f5b54a',
          'line-opacity': 0.45,
          'line-width': 1.2,
          'line-dasharray': [2, 2],
        },
      },
      firstSymbol,
    )
    map.addLayer(
      {
        id: 'site-dots',
        type: 'circle',
        source: 'sites',
        paint: {
          // the grey-out IS the demo beat: no transit → dim grey dot
          'circle-color': [
            'case',
            ['get', 'transit_reachable'],
            '#f5b54a',
            '#8a9698',
          ],
          'circle-opacity': [
            'case',
            ['get', 'transit_reachable'],
            0.92,
            0.4,
          ],
          'circle-radius': ['case', ['get', 'transit_reachable'], 4.2, 3.4],
          'circle-stroke-color': '#0b1416',
          'circle-stroke-width': 1.2,
        },
      },
      firstSymbol,
    )

    map.on('mousemove', 'site-dots', (e) => {
      const f = e.features?.[0]
      if (!f) return
      map.getCanvas().style.cursor = 'pointer'
      setTip({ kind: 'site', x: e.point.x, y: e.point.y, props: f.properties })
    })
    map.on('mouseleave', 'site-dots', () => {
      map.getCanvas().style.cursor = ''
      setTip((t) => (t?.kind === 'site' ? null : t))
    })
  }, [ready, sitesGeo, linesGeo])

  // F5: dispatch toggle — pure visibility flip, nothing recomputes
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || !map.getLayer('dispatch-lines')) return
    map.setLayoutProperty(
      'dispatch-lines',
      'visibility',
      dispatchOn ? 'visible' : 'none',
    )
  }, [ready, dispatchOn, linesGeo])

  // F4: selected outline via feature-state (same pattern as hover)
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || !map.getSource('npus')) return
    if (prevSelectedRef.current && prevSelectedRef.current !== selectedId) {
      map.setFeatureState(
        { source: 'npus', id: prevSelectedRef.current },
        { selected: false },
      )
    }
    if (selectedId) {
      map.setFeatureState(
        { source: 'npus', id: selectedId },
        { selected: true },
      )
    }
    prevSelectedRef.current = selectedId
  }, [ready, npus, selectedId])

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

  const tipExp = tip && tip.kind !== 'site' ? expById[tip.props.npu_id] : null
  const reachableCount = sites?.sites?.filter((s) => s.transit_reachable).length
  const desertCount = sites?.sites
    ? sites.sites.length - reachableCount
    : null

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="map" />
      {npus && <Legend />}
      {sites && (
        <div className="map-controls">
          <button
            className={`dispatch-btn${dispatchOn ? ' on' : ''}`}
            onClick={() => setDispatchOn((o) => !o)}
            aria-pressed={dispatchOn}
          >
            Dispatch
          </button>
          <span className="sites-cap">
            {reachableCount} sites transit-reachable ·{' '}
            <span className="no-transit">{desertCount} unreachable</span>
          </span>
        </div>
      )}
      {tip && tip.kind === 'site' && (
        <div className="map-tooltip" style={{ left: tip.x, top: tip.y }}>
          <div className="t-name">{tip.props.name}</div>
          <div className="t-est">
            {SITE_TYPE_LABEL[tip.props.type] ?? tip.props.type} · capacity{' '}
            {tip.props.capacity}
            {tip.props.people_served > 0 && (
              <> · serves {tip.props.people_served}</>
            )}
          </div>
          {tip.props.transit_reachable ? (
            <div className="t-gap tier-safe">MARTA-reachable</div>
          ) : (
            <div className="t-gap tier-critical">No transit access</div>
          )}
        </div>
      )}
      {tip && tip.kind !== 'site' && (
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
