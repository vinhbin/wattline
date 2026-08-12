const fmt = (n) => (n == null ? '—' : n.toLocaleString('en-US'))

export default function Header({ stats, mock }) {
  return (
    <header className="header">
      <div className="brand">
        <h1>
          WATT<span className="line">LINE</span>
        </h1>
        <span className="tagline">Atlanta · Outage Exposure</span>
        {mock && <span className="mock-chip">mock data</span>}
      </div>
      <div className="stats">
        <div className="stat">
          <div className="num">{fmt(stats?.georgia_total)}</div>
          <div className="label">electricity-dependent in GA</div>
        </div>
        <div className="stat">
          <div className="num">{fmt(stats?.metro_atlanta_total)}</div>
          <div className="label">metro Atlanta</div>
        </div>
        <div className="stat">
          <div className="num critical">{fmt(stats?.npus_critical)}</div>
          <div className="label">NPUs critical</div>
        </div>
      </div>
    </header>
  )
}
