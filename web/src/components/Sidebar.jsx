// NPU list. Sorted by dme_estimate for now; re-sorts by exposure gap
// once the exposure feed is wired in (F2/F3).
export default function Sidebar({ npus }) {
  const rows = npus
    ? [...npus.features]
        .map((f) => f.properties)
        .sort((a, b) => b.dme_estimate - a.dme_estimate)
    : null

  const max = rows ? Math.max(...rows.map((r) => r.dme_estimate), 1) : 1

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
        {rows?.map((r) => (
          <button className="npu-row" key={r.npu_id} title={r.name}>
            <span className="npu-chip">{r.npu_id.replace('NPU-', '')}</span>
            <span className="npu-name">
              <span className="name">{r.name}</span>
              <span className="bar">
                <span style={{ width: `${(r.dme_estimate / max) * 100}%` }} />
              </span>
            </span>
            <span className="npu-est">
              <span className="num">{r.dme_estimate}</span>
              <span className="band">
                {r.dme_low}–{r.dme_high}
              </span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  )
}
