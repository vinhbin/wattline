// F4: NPU detail panel. Click a polygon (or a sidebar row) → this drawer.
// The gap re-derives from the scrubbed hour, so it updates live in autoplay.
// Rebuilt from Kareem's salvage panel onto the canonical theme — no invented
// fallbacks: everything shown comes straight from /api/npus + /api/exposure.

// Life-critical device classes (BUILD-PLAN D3 tier list) — these set the
// clock. Mobility-class devices render dimmer.
const CRITICAL_DEVICES = new Set([
  'ventilator',
  'bipap',
  'oxygen_concentrator',
  'iv_pump',
])

const deviceLabel = (d) => d.replaceAll('_', ' ')

export default function NpuDetailPanel({ npu, exp, hour, onClose }) {
  const gap = exp?.exposure_gap_hours ?? 0
  const tier = exp?.tier ?? 'safe'
  const devices = Object.entries(npu.device_mix ?? {}).sort(
    (a, b) => b[1] - a[1],
  )
  const maxDev = Math.max(...devices.map(([, n]) => n), 1)

  return (
    <section
      className={`npu-panel panel-${tier}`}
      aria-label={`${npu.name} details`}
    >
      <div className="p-head">
        <span className={`npu-chip${tier !== 'safe' ? ` chip-${tier}` : ''}`}>
          {npu.npu_id.replace('NPU-', '')}
        </span>
        <div className="p-title">
          <h2>{npu.name}</h2>
          <span className={`p-tier tier-${tier}`}>{tier}</span>
        </div>
        <button className="p-close" onClick={onClose} aria-label="Close panel">
          ×
        </button>
      </div>

      {exp && (
        <div className="p-gap">
          {gap > 0 ? (
            <>
              <div className={`g-big tier-${tier}`}>
                {gap.toFixed(1)}
                <span className="g-unit"> hours unprotected</span>
              </div>
              <div className="g-sub">
                utility ETA {exp.utility_eta_hours}h − shortest device runtime{' '}
                {exp.shortest_runtime_hours}h
              </div>
              <div className="g-sub">
                <b>{exp.people_at_risk}</b> people at risk at hour {hour}
              </div>
            </>
          ) : exp.is_dark ? (
            <>
              <div className="g-big tier-safe">within runtime</div>
              <div className="g-sub">
                dark, but device batteries outlast the remaining ETA (
                {exp.utility_eta_hours}h)
              </div>
            </>
          ) : (
            <>
              <div className="g-big tier-safe">power on</div>
              <div className="g-sub">no exposure gap at hour {hour}</div>
            </>
          )}
        </div>
      )}

      <div className="p-cards">
        <div className="p-card">
          <div className="c-num">{npu.dme_estimate}</div>
          <div className="c-band">
            est. {npu.dme_low}–{npu.dme_high}
          </div>
          <div className="c-label">electricity-dependent residents</div>
        </div>
        <div className="p-card">
          <div className="c-num">{Math.round(npu.no_vehicle_rate * 100)}%</div>
          <div className="c-band">no vehicle</div>
          <div className="c-label">of households have no car</div>
        </div>
      </div>

      <div className="p-devices">
        <div className="d-head">device mix</div>
        {devices.map(([dev, n]) => (
          <div className="d-row" key={dev}>
            <span className="d-name">{deviceLabel(dev)}</span>
            <span className="d-bar">
              <span
                className={
                  CRITICAL_DEVICES.has(dev) ? 'd-critical' : 'd-mobility'
                }
                style={{ width: `${(n / maxDev) * 100}%` }}
              />
            </span>
            <span className="d-num">{n}</span>
          </div>
        ))}
      </div>

      <div className="p-note">
        Disaggregated from {npu.zip_source_count} emPOWER ZIP
        {npu.zip_source_count === 1 ? '' : 's'} onto official NPU boundaries,
        weighted by housing units, age 65+, and disability rates.
      </div>
    </section>
  )
}
