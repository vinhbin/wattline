import React, { useState } from 'react';
import { Bus, MapPin, CheckCircle2, AlertOctagon, Navigation, Layers } from 'lucide-react';

export default function SitesPanel({ sites, dispatchActive, setDispatchActive, onSelectSite }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'unreachable'

  const sitesList = sites?.sites || [];
  const filteredSites = filter === 'unreachable'
    ? sitesList.filter((s) => !s.transit_reachable)
    : sitesList;

  const reachableCount = sitesList.filter((s) => s.transit_reachable).length;
  const unreachableCount = sitesList.filter((s) => !s.transit_reachable).length;

  return (
    <div
      className="glass-panel"
      style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        width: '320px',
        maxHeight: 'calc(100% - 140px)',
        borderRadius: '12px',
        padding: '16px',
        zIndex: 35,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
      }}
    >
      {/* Title & Dispatch Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700 }}>
            Charging Sites ({sitesList.length})
          </h3>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
            MARTA Transit Access Verification
          </div>
        </div>

        {/* Dispatch Lines Toggle Button */}
        <button
          onClick={() => setDispatchActive(!dispatchActive)}
          style={{
            background: dispatchActive ? 'var(--color-accent)' : 'var(--color-surface)',
            color: dispatchActive ? '#0B1416' : 'var(--color-text)',
            border: `1px solid ${dispatchActive ? 'var(--color-accent)' : 'var(--color-border)'}`,
            borderRadius: '6px',
            padding: '6px 10px',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: dispatchActive ? '0 0 10px rgba(245,181,74,0.4)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          <Navigation size={13} fill={dispatchActive ? "#0B1416" : "none"} />
          <span>{dispatchActive ? 'Dispatch Active' : 'Dispatch'}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            flex: 1,
            padding: '6px',
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
            background: filter === 'all' ? 'var(--color-surface-hover)' : 'transparent',
            color: filter === 'all' ? 'var(--color-text)' : 'var(--color-text-muted)',
            fontSize: '0.72rem',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          All Sites ({sitesList.length})
        </button>

        <button
          onClick={() => setFilter('unreachable')}
          style={{
            flex: 1,
            padding: '6px',
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
            background: filter === 'unreachable' ? 'rgba(179, 57, 42, 0.25)' : 'transparent',
            color: filter === 'unreachable' ? '#F87171' : 'var(--color-text-muted)',
            fontSize: '0.72rem',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Transit Deserts ({unreachableCount})
        </button>
      </div>

      {/* Sites List Scrollable Container */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredSites.map((site) => {
          const isReachable = site.transit_reachable;
          return (
            <div
              key={site.site_id}
              onClick={() => onSelectSite && onSelectSite(site)}
              className="card-panel"
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                opacity: isReachable ? 1 : 0.65,
                borderColor: isReachable ? 'var(--color-border)' : 'rgba(179, 57, 42, 0.4)',
                background: isReachable ? 'var(--color-surface-card)' : 'rgba(19, 34, 38, 0.6)',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isReachable ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                  {site.name}
                </span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    background: isReachable ? 'rgba(31, 111, 92, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                    color: isReachable ? '#4ADE80' : '#94A3B8',
                    border: `1px solid ${isReachable ? 'var(--color-safe)' : '#64748B'}`,
                  }}
                >
                  {isReachable ? 'MARTA Accessible' : 'No Transit Access'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                <span>Cap: {site.capacity} seats</span>
                <span>Assigned: {site.assigned_npus?.join(', ') || 'None'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
