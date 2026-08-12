// F6: map legend. Static key for the three things a judge sees but nothing
// labels — the tier choropleth, the site-dot states (the grey-out demo beat),
// and the dispatch lines. Reads no live data; it explains the encoding.
// Collapsible so it never fights the map on a small projector.
import { useState } from 'react'

const TIERS = [
  { key: 'critical', label: 'Critical', hint: 'gap > 4h' },
  { key: 'warning', label: 'Warning', hint: '0–4h' },
  { key: 'safe', label: 'Safe', hint: 'within runtime' },
]

export default function Legend() {
  const [open, setOpen] = useState(true)

  return (
    <div className={`legend${open ? '' : ' collapsed'}`}>
      <button
        className="legend-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>Legend</span>
        <span className="legend-caret">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="legend-body">
          <div className="legend-group">
            <div className="legend-head">Exposure tier</div>
            {TIERS.map((t) => (
              <div className="legend-row" key={t.key}>
                <span className={`legend-swatch swatch-${t.key}`} />
                <span className="legend-label">{t.label}</span>
                <span className="legend-hint">{t.hint}</span>
              </div>
            ))}
            <div className="legend-note">
              brighter fill = larger gap within a tier
            </div>
          </div>

          <div className="legend-group">
            <div className="legend-head">Charging sites</div>
            <div className="legend-row">
              <span className="legend-dot dot-reachable" />
              <span className="legend-label">MARTA-reachable</span>
            </div>
            <div className="legend-row">
              <span className="legend-dot dot-desert" />
              <span className="legend-label">No transit access</span>
            </div>
            <div className="legend-row">
              <span className="legend-line" />
              <span className="legend-label">Dispatch → NPU</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
