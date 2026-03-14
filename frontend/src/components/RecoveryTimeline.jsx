export default function RecoveryTimeline({ estimates, treatment, category }) {
  // If no LLM estimates available, show a simple fallback
  if (!estimates || estimates.length === 0) {
    return (
      <div className="glass-card">
        <div className="card-header">
          <div className="card-icon" style={{ background: '#1565C0' }}>RT</div>
          <div>
            <div className="card-title">Recovery Timeline</div>
            <div className="card-subtitle">Estimated time-to-improvement across treatment approaches</div>
          </div>
        </div>
        <div style={{ padding: '16px 0', color: '#7A8B9C', fontSize: 13 }}>
          Recovery estimates are being generated. Search again for updated results.
        </div>
      </div>
    );
  }

  const approachColors = {
    'Allopathy': '#1565C0',
    'Naturopathy': '#1BA89C',
    'Homeopathy': '#7B1FA2',
    'Lifestyle': '#E6960A',
  };

  const approachLabels = {
    'Allopathy': 'Al',
    'Naturopathy': 'Na',
    'Homeopathy': 'Ho',
    'Lifestyle': 'Lf',
  };

  const confidenceBadge = {
    'high': { bg: 'rgba(67,160,71,0.08)', color: '#43A047', text: 'High confidence' },
    'medium': { bg: 'rgba(230,150,10,0.08)', color: '#E6960A', text: 'Medium confidence' },
    'low': { bg: 'rgba(211,47,47,0.08)', color: '#D32F2F', text: 'Low confidence' },
  };

  return (
    <div className="glass-card">
      <div className="card-header">
        <div className="card-icon" style={{ background: '#1565C0' }}>RT</div>
        <div>
          <div className="card-title">Recovery Timeline</div>
          <div className="card-subtitle">Average time-to-improvement by treatment approach</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
        {estimates.map((est, i) => {
          const color = approachColors[est.approach] || '#7A8B9C';
          const label = approachLabels[est.approach] || est.approach.substring(0, 2);
          const conf = confidenceBadge[est.confidence] || confidenceBadge['medium'];
          const isCurrentTreatment = est.treatment_name?.toLowerCase() === treatment?.toLowerCase();

          return (
            <div key={i} style={{
              padding: '14px 16px',
              borderRadius: 10,
              background: isCurrentTreatment ? `${color}08` : 'rgba(21,101,192,0.02)',
              border: `1px solid ${isCurrentTreatment ? `${color}30` : '#E2E8F0'}`,
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
                <span style={{
                  fontSize: 13, fontWeight: 700, color: '#fff',
                  width: 32, height: 32, borderRadius: 8,
                  background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{label}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: color }}>{est.approach}</div>
                  <div style={{ fontSize: 12, color: '#4A5B6C' }}>{est.treatment_name}</div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1A2B3C' }}>{est.avg_improvement}</div>
                  <div style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 8,
                    background: conf.bg, color: conf.color, display: 'inline-block',
                  }}>{conf.text}</div>
                </div>
              </div>

              <div style={{ fontSize: 12, color: '#4A5B6C', lineHeight: 1.5 }}>{est.details}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
