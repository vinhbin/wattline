import React from 'react';
import { Activity, ShieldAlert, Zap, Layers } from 'lucide-react';

export default function HeaderBar({ stats }) {
  const gaTotal = stats?.georgia_total ? stats.georgia_total.toLocaleString() : '92,233';
  const metroTotal = stats?.metro_atlanta_total ? stats.metro_atlanta_total.toLocaleString() : '2,284';
  const npusCritical = stats?.npus_critical ?? 9;
  const peopleCritical = stats?.people_critical ? stats.people_critical.toLocaleString() : '1,323';

  return (
    <header className="app-header glass-panel">
      {/* Brand & Track */}
      <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div 
          style={{
            background: 'linear-gradient(135deg, #F5B54A 0%, #C77D0A 100%)',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px rgba(245, 181, 74, 0.3)'
          }}
        >
          <Zap size={20} color="#0B1416" strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-text)' }}>
              WATTLINE
            </h1>
            <span style={{ fontSize: '0.68rem', padding: '2px 6px', background: 'var(--color-border)', borderRadius: '4px', color: 'var(--color-accent)', fontWeight: 600 }}>
              ATLANTA OPEN DATA
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Grid Outage DME Exposure & Transit Accessibility Map
          </p>
        </div>
      </div>

      {/* Live Header Metrics */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        {/* GA Total */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ padding: '6px', background: 'var(--color-surface)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
            <Layers size={16} color="var(--color-accent)" />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Georgia Total
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)' }}>
              {gaTotal} <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', fontWeight: 400 }}>emPOWER</span>
            </div>
          </div>
        </div>

        <div style={{ width: '1px', height: '24px', background: 'var(--color-border)' }} />

        {/* Metro Atlanta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ padding: '6px', background: 'var(--color-surface)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
            <Activity size={16} color="#4ADE80" />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Metro Atlanta DME
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)' }}>
              {metroTotal} <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', fontWeight: 400 }}>beneficiaries</span>
            </div>
          </div>
        </div>

        <div style={{ width: '1px', height: '24px', background: 'var(--color-border)' }} />

        {/* Critical NPUs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ padding: '6px', background: 'rgba(179, 57, 42, 0.2)', borderRadius: '6px', border: '1px solid var(--color-critical)' }}>
            <ShieldAlert size={16} color="#F87171" />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              NPUs Critical
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#F87171' }}>
              {npusCritical} NPUs <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>({peopleCritical} at risk)</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
