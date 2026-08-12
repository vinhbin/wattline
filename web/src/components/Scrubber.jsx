// F3 — the demo moment. Range input drives the hour; series is prefetched
// upstream so every change is a pure state swap, never a fetch.
const TICKS = [0, 6, 12, 18, 24]

export default function Scrubber({ hour, maxHour, setHour, playing, onPlay, ready }) {
  return (
    <footer className="scrubber">
      <button
        className="play"
        onClick={onPlay}
        disabled={!ready}
        aria-label={playing ? 'Pause' : 'Play outage timeline'}
      >
        {playing ? (
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <rect x="2.5" y="2" width="4" height="12" rx="1" fill="currentColor" />
            <rect x="9.5" y="2" width="4" height="12" rx="1" fill="currentColor" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path
              d="M4.5 2.6v10.8a.7.7 0 0 0 1.06.6l8.9-5.4a.7.7 0 0 0 0-1.2l-8.9-5.4a.7.7 0 0 0-1.06.6Z"
              fill="currentColor"
            />
          </svg>
        )}
      </button>
      <div className="track">
        <input
          type="range"
          min="0"
          max={maxHour}
          step="1"
          value={hour}
          onChange={(e) => setHour(Number(e.target.value))}
          disabled={!ready}
          aria-label="Hours since outage began"
          style={{ '--fill': `${(hour / maxHour) * 100}%` }}
        />
        <div className="ticks" aria-hidden="true">
          {TICKS.map((t) => (
            <span key={t} style={{ left: `${(t / maxHour) * 100}%` }}>
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="readout">
        <span className="h-label">hour</span>
        <span className="h-num">{hour}</span>
      </div>
    </footer>
  )
}
