export default function PatientJourney({ timeline, treatment }) {
  if (!timeline || timeline.length === 0) return null;

  const phaseLabels = {
    'warning': 'W',
    'neutral': 'N',
    'positive': 'P',
    'success': 'S',
  };

  const phaseColors = {
    'warning': '#E6960A',
    'neutral': '#1565C0',
    'positive': '#1BA89C',
    'success': '#43A047',
  };

  return (
    <div className="glass-card full-width">
      <div className="card-header">
        <div className="card-icon" style={{ background: '#1565C0' }}>J</div>
        <div>
          <div className="card-title">Patient Journey — {treatment}</div>
          <div className="card-subtitle">What patients typically experience over time</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 0, overflowX: 'auto', paddingBottom: 8 }}>
        {timeline.map((phase, i) => (
          <div key={i} style={{
            flex: '1 0 160px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            padding: '0 8px',
          }}>
            {/* Connector line */}
            {i < timeline.length - 1 && (
              <div style={{
                position: 'absolute',
                top: 24,
                left: '50%',
                right: '-50%',
                height: 3,
                background: `linear-gradient(to right, ${phaseColors[phase.type]}, ${phaseColors[timeline[i+1]?.type] || phaseColors[phase.type]})`,
                opacity: 0.3,
                zIndex: 0,
              }} />
            )}

            {/* Circle */}
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: `${phaseColors[phase.type]}12`,
              border: `3px solid ${phaseColors[phase.type]}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 700,
              color: phaseColors[phase.type],
              position: 'relative',
              zIndex: 1,
              marginBottom: 12,
            }}>
              {phaseLabels[phase.type] || '—'}
            </div>

            <div style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 1,
              color: phaseColors[phase.type],
              marginBottom: 4,
            }}>
              {phase.phase}
            </div>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#1A2B3C',
              marginBottom: 4,
              textAlign: 'center',
            }}>
              {phase.title}
            </div>
            <div style={{
              fontSize: 11,
              color: '#4A5B6C',
              textAlign: 'center',
              lineHeight: 1.4,
            }}>
              {phase.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
