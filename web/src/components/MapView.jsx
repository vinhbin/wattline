import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

// Dark Carto basemap tiles (No Mapbox token required)
const CARTO_DARK_BASEMAP = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const TIER_COLORS = {
  safe: '#1F6F5C',
  warning: '#C77D0A',
  critical: '#B3392A',
};

export default function MapView({
  npuGeojson,
  exposureData,
  sitesData,
  hour,
  dispatchActive,
  selectedNpu,
  onSelectNpu,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // Initialize MapLibre GL Map
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: CARTO_DARK_BASEMAP,
      center: [-84.388, 33.754],
      zoom: 11.2,
      pitch: 15,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    map.on('load', () => {
      mapRef.current = map;
      if (npuGeojson) {
        setupNpuLayer(map, npuGeojson);
      }
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update/Load NPU layer when GeoJSON arrives
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !npuGeojson) return;

    if (!map.getSource('npus-source')) {
      setupNpuLayer(map, npuGeojson);
    } else {
      map.getSource('npus-source').setData(npuGeojson);
    }
  }, [npuGeojson]);

  // Recolor NPU choropleth based on current hour exposure data
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getLayer('npus-fill')) return;

    if (!exposureData) return;

    // Build color match expression for NPU IDs
    const colorMatch = ['match', ['get', 'npu_id']];
    exposureData.forEach((exp) => {
      const color = TIER_COLORS[exp.tier] || TIER_COLORS.safe;
      colorMatch.push(exp.npu_id, color);
    });
    colorMatch.push('#1F6F5C'); // Fallback color

    map.setPaintProperty('npus-fill', 'fill-color', colorMatch);
  }, [hour, exposureData]);

  // Render Emergency Site Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !sitesData?.sites) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    sitesData.sites.forEach((site) => {
      const el = document.createElement('div');
      const isReachable = site.transit_reachable;

      el.style.width = isReachable ? '14px' : '10px';
      el.style.height = isReachable ? '14px' : '10px';
      el.style.borderRadius = '50%';
      el.style.background = isReachable ? '#4ADE80' : '#64748B';
      el.style.border = `2px solid ${isReachable ? '#0B1416' : '#334155'}`;
      el.style.boxShadow = isReachable ? '0 0 10px rgba(74, 222, 128, 0.6)' : 'none';
      el.style.opacity = isReachable ? '1' : '0.4';
      el.style.cursor = 'pointer';
      el.title = `${site.name} (${isReachable ? 'MARTA Accessible' : 'No Transit Access'})`;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([site.lon, site.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [sitesData]);

  // Setup MapLibre NPU Layer & Interactions
  const setupNpuLayer = (map, geojson) => {
    if (map.getSource('npus-source')) return;

    map.addSource('npus-source', {
      type: 'geojson',
      data: geojson,
    });

    // Fill Layer with smooth color transition
    map.addLayer({
      id: 'npus-fill',
      type: 'fill',
      source: 'npus-source',
      paint: {
        'fill-color': '#1F6F5C',
        'fill-opacity': 0.65,
        'fill-color-transition': { duration: 300 },
      },
    });

    // Outline Layer
    map.addLayer({
      id: 'npus-line',
      type: 'line',
      source: 'npus-source',
      paint: {
        'line-color': '#E8F1F2',
        'line-width': 1.5,
        'line-opacity': 0.5,
      },
    });

    // Click Listener
    map.on('click', 'npus-fill', (e) => {
      if (e.features && e.features.length > 0) {
        onSelectNpu(e.features[0].properties);
      }
    });

    map.on('mouseenter', 'npus-fill', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'npus-fill', () => {
      map.getCanvas().style.cursor = '';
    });
  };

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        background: '#0B1416',
      }}
    />
  );
}
