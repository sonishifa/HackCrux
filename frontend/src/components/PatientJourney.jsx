export default function PatientJourney({ timeline, treatment }) {
  if (!timeline || timeline.length === 0) return null;

  const phaseIcons = {
    'warning': '⚡',
    'neutral': '🔄',
    'positive': '📈',
    'success': '✅',
  };

  const phaseColors = {
    'warning': '#f59e0b',
    'neutral': '#3b82f6',
    'positive': '#06d6a0',
    'success': '#22c55e',
  };

  return (
    <div className="glass-card full-width">
      <div className="card-header">
        <div className="card-icon" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>🗺️</div>
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
                opacity: 0.4,
                zIndex: 0,
              }} />
            )}

            {/* Circle */}
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: `${phaseColors[phase.type]}20`,
              border: `3px solid ${phaseColors[phase.type]}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              position: 'relative',
              zIndex: 1,
              marginBottom: 12,
            }}>
              {phaseIcons[phase.type] || '📌'}
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
              color: '#f0f4ff',
              marginBottom: 4,
              textAlign: 'center',
            }}>
              {phase.title}
            </div>
            <div style={{
              fontSize: 11,
              color: '#94a3b8',
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
