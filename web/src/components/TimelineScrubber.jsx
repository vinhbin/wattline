import React from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';

export default function TimelineScrubber({ hour, setHour, isPlaying, setIsPlaying }) {
  const togglePlay = () => setIsPlaying(!isPlaying);
  const resetTimeline = () => {
    setIsPlaying(false);
    setHour(0);
  };

  return (
    <div
      className="glass-panel"
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 480px)',
        maxWidth: '840px',
        minWidth: '360px',
        borderRadius: '12px',
        padding: '14px 20px',
        zIndex: 30,
        boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        {/* Play Controls & Current Hour */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={togglePlay}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: isPlaying ? 'var(--color-critical)' : 'var(--color-accent)',
              border: 'none',
              color: '#0B1416',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: isPlaying ? '0 0 12px var(--color-critical-glow)' : '0 0 12px rgba(245,181,74,0.4)',
              transition: 'all 0.2s ease',
            }}
            title={isPlaying ? "Pause timeline" : "Play timeline scrub"}
          >
            {isPlaying ? <Pause size={18} fill="#0B1416" /> : <Play size={18} fill="#0B1416" style={{ marginLeft: '2px' }} />}
          </button>

          <button
            onClick={resetTimeline}
            style={{
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              padding: '6px 10px',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
            }}
            title="Reset to Hour 0"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
            <Clock size={16} color="var(--color-accent)" />
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)' }}>
              HOUR {hour}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {hour === 0 ? "(Pre-Outage Baseline)" : `(Helene Grid Outage T+${hour}h)`}
            </span>
          </div>
        </div>

        {/* Shortest Runtime Badge */}
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-critical)' }} />
          <span>Shortest DME Runtime: <strong style={{ color: 'var(--color-text)' }}>0.9h</strong> (O₂ Concentrator)</span>
        </div>
      </div>

      {/* Timeline Slider */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="range"
          min={0}
          max={24}
          value={hour}
          onChange={(e) => setHour(parseInt(e.target.value, 10))}
          style={{
            width: '100%',
            height: '6px',
            WebkitAppearance: 'none',
            appearance: 'none',
            background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${(hour / 24) * 100}%, var(--color-border) ${(hour / 24) * 100}%, var(--color-border) 100%)`,
            borderRadius: '3px',
            outline: 'none',
            cursor: 'pointer',
          }}
        />
      </div>

      {/* Hour Tick Markers */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.68rem', color: 'var(--color-text-dim)' }}>
        <span>0h</span>
        <span>4h</span>
        <span>8h</span>
        <span>12h</span>
        <span>16h</span>
        <span>20h</span>
        <span>24h</span>
      </div>
    </div>
  );
}
