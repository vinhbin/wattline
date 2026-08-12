// NPU list. Once the exposure feed is live it sorts by exposure gap (the
// layout spec: "sorted by gap") and the bars show gap share, tier-colored.
export default function Sidebar({ npus, exposure, selectedId, onSelect }) {
  const byId = {}
  if (exposure) for (const e of exposure.npus) byId[e.npu_id] = e

  const rows = npus
    ? [...npus.features]
        .map((f) => ({ ...f.properties, ex: byId[f.properties.npu_id] }))
        .sort((a, b) => {
          const gap = (b.ex?.exposure_gap_hours ?? 0) - (a.ex?.exposure_gap_hours ?? 0)
          return gap !== 0 ? gap : b.dme_estimate - a.dme_estimate
        })
    : null

  const maxEst = rows ? Math.max(...rows.map((r) => r.dme_estimate), 1) : 1
  const maxGap = rows
    ? Math.max(...rows.map((r) => r.ex?.exposure_gap_hours ?? 0), 1)
    : 1

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <span>Neighborhoods</span>
        <span>{rows ? `${rows.length} NPUs` : ''}</span>
      </div>
      <div className="npu-list">
        {!rows &&
          Array.from({ length: 9 }).map((_, i) => (
            <div className="skeleton" key={i}>
              <div className="sk" />
              <div className="sk" />
            </div>
          ))}
        {rows?.map((r) => {
          const gap = r.ex?.exposure_gap_hours ?? 0
          const tier = r.ex?.tier
          return (
            <button
              className={`npu-row${selectedId === r.npu_id ? ' is-active' : ''}`}
              key={r.npu_id}
              title={r.name}
              onClick={() =>
                onSelect?.(selectedId === r.npu_id ? null : r.npu_id)
              }
            >
              <span className={`npu-chip${tier ? ` chip-${tier}` : ''}`}>
                {r.npu_id.replace('NPU-', '')}
              </span>
              <span className="npu-name">
                <span className="name">{r.name}</span>
                <span className="bar">
                  <span
                    className={tier ? `bar-${tier}` : ''}
                    style={{
                      width: r.ex
                        ? `${(gap / maxGap) * 100}%`
                        : `${(r.dme_estimate / maxEst) * 100}%`,
                    }}
                  />
                </span>
              </span>
              <span className="npu-est">
                <span className="num">{r.dme_estimate}</span>
                {r.ex && gap > 0 ? (
                  <span className={`band tier-${tier}`}>
                    {gap.toFixed(1)}h gap
                  </span>
                ) : (
                  <span className="band">
                    {r.dme_low}–{r.dme_high}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
