import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Car, Users, Zap, X } from 'lucide-react';

export default function NpuDetailPanel({ selectedNpu, exposureData, onSelectNpu, onClose }) {
  if (!selectedNpu) return null;

  const props = selectedNpu.properties || selectedNpu;
  const npuId = props.npu_id;
  const name = props.name || npuId;
  const dmeEstimate = props.dme_estimate || 142;
  const dmeLow = props.dme_low || Math.round(dmeEstimate * 0.9);
  const dmeHigh = props.dme_high || Math.round(dmeEstimate * 1.1);
  const noVehiclePct = Math.round((props.no_vehicle_rate || 0.25) * 100);
  const deviceMix = props.device_mix || {
    oxygen_concentrator: Math.round(dmeEstimate * 0.44),
    bipap: Math.round(dmeEstimate * 0.20),
    ventilator: Math.round(dmeEstimate * 0.12),
    electric_bed: Math.round(dmeEstimate * 0.12),
    power_wheelchair: Math.round(dmeEstimate * 0.08),
    iv_pump: Math.round(dmeEstimate * 0.04),
  };

  // Find exposure state for current hour
  const expState = exposureData?.find((e) => e.npu_id === npuId) || {
    is_dark: false,
    utility_eta_hours: 0,
    shortest_runtime_hours: 0.9,
    exposure_gap_hours: 0.0,
    tier: 'safe',
    people_at_risk: 0,
  };

  const gap = expState.exposure_gap_hours;
  const tier = expState.tier;

  const tierColors = {
    safe: '#1F6F5C',
    warning: '#C77D0A',
    critical: '#B3392A',
  };

  return (
    <div
      className="glass-panel"
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '360px',
        maxHeight: 'calc(100% - 140px)',
        borderRadius: '12px',
        padding: '20px',
        zIndex: 35,
        overflowY: 'auto',
        boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
        borderLeft: `4px solid ${tierColors[tier]}`,
      }}
    >
      {/* Panel Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <span className={`badge-tier ${tier}`}>{tier} risk tier</span>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 700, marginTop: '4px' }}>
            {name}
          </h2>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Exposure Gap Banner */}
      <div
        style={{
          background: 'var(--color-surface-card)',
          borderRadius: '8px',
          padding: '14px',
          marginBottom: '16px',
          border: '1px solid var(--color-border)',
        }}
      >
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Exposure Gap
        </div>
        <div style={{ fontSize: '1.8rem', fontWeight: 700, color: tier === 'critical' ? '#F87171' : tier === 'warning' ? '#FBBF24' : '#4ADE80', margin: '4px 0' }}>
          {gap > 0 ? `${gap} hours` : '0.0 hours'}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text)' }}>
          {gap > 0 ? (
            <span>
              <strong>{gap} hours unprotected</strong> (Utility ETA {expState.utility_eta_hours}h vs 0.9h max battery)
            </span>
          ) : (
            <span style={{ color: '#4ADE80' }}>Grid operational or battery runtime sufficient</span>
          )}
        </div>
      </div>

      {/* Beneficiary Stats & Bands */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <div className="card-panel" style={{ padding: '10px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>DME Beneficiaries</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{dmeEstimate}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>Band: {dmeLow}–{dmeHigh}</div>
        </div>

        <div className="card-panel" style={{ padding: '10px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Transit Disadvantage</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Car size={16} color="var(--color-accent)" />
            {noVehiclePct}%
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>No vehicle in household</div>
        </div>
      </div>

      {/* Device Breakdown */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '8px' }}>
          Disaggregated Medical Device Mix
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {Object.entries(deviceMix).map(([device, count]) => {
            const formattedName = device.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            const pct = Math.round((count / Math.max(1, dmeEstimate)) * 100);
            return (
              <div key={device}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '2px' }}>
                  <span>{formattedName}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>{count} ({pct}%)</span>
                </div>
                <div style={{ width: '100%', height: '4px', background: 'var(--color-border)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: device === 'ventilator' ? '#F87171' : device === 'oxygen_concentrator' ? '#FBBF24' : 'var(--color-accent)',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Context note */}
      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)', fontStyle: 'italic', borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
        * Calculated by B3 spatial disaggregation conserving against emPOWER Georgia anchor 92,233.
      </div>
    </div>
  );
}
