export default function RecoveryTimeline({ estimates, treatment, category }) {
  // If no LLM estimates available, show a simple fallback
  if (!estimates || estimates.length === 0) {
    return (
      <div className="glass-card">
        <div className="card-header">
          <div className="card-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>⏱️</div>
          <div>
            <div className="card-title">Recovery Timeline</div>
            <div className="card-subtitle">Estimated time-to-improvement across treatment approaches</div>
          </div>
        </div>
        <div style={{ padding: '16px 0', color: '#94a3b8', fontSize: 13 }}>
          Recovery estimates are being generated. Search again for updated results.
        </div>
      </div>
    );
  }

  const approachColors = {
    'Allopathy': '#3b82f6',
    'Naturopathy': '#06d6a0',
    'Homeopathy': '#a78bfa',
    'Lifestyle': '#f59e0b',
  };

  const approachIcons = {
    'Allopathy': '💊',
    'Naturopathy': '🌿',
    'Homeopathy': '🧪',
    'Lifestyle': '🏃',
  };

  const confidenceBadge = {
    'high': { bg: 'rgba(34,197,94,0.1)', color: '#22c55e', text: 'High confidence' },
    'medium': { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', text: 'Medium confidence' },
    'low': { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', text: 'Low confidence' },
  };

  return (
    <div className="glass-card">
      <div className="card-header">
        <div className="card-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>⏱️</div>
        <div>
          <div className="card-title">Recovery Timeline</div>
          <div className="card-subtitle">Average time-to-improvement by treatment approach</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
        {estimates.map((est, i) => {
          const color = approachColors[est.approach] || '#64748b';
          const icon = approachIcons[est.approach] || '💉';
          const conf = confidenceBadge[est.confidence] || confidenceBadge['medium'];
          const isCurrentTreatment = est.treatment_name?.toLowerCase() === treatment?.toLowerCase();

          return (
            <div key={i} style={{
              padding: '14px 16px',
              borderRadius: 10,
              background: isCurrentTreatment ? `${color}10` : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isCurrentTreatment ? `${color}40` : 'rgba(255,255,255,0.06)'}`,
              position: 'relative',
            }}>
              {isCurrentTreatment && (
                <div style={{
                  position: 'absolute', top: -8, right: 12,
                  background: color, color: '#fff', fontSize: 10, fontWeight: 700,
                  padding: '2px 8px', borderRadius: 8,
                }}>CURRENT</div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: color }}>{est.approach}</div>
                  <div style={{ fontSize: 12, color: '#cbd5e1' }}>{est.treatment_name}</div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#f0f4ff' }}>{est.avg_improvement}</div>
                  <div style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 8,
                    background: conf.bg, color: conf.color, display: 'inline-block',
                  }}>{conf.text}</div>
                </div>
              </div>

              <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{est.details}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
