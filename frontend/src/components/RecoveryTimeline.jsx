export default function RecoveryTimeline({ timeline }) {
  if (!timeline || timeline.length === 0) return null;

  return (
    <div className="glass-card">
      <div className="card-header">
        <div className="card-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>📅</div>
        <div>
          <div className="card-title">Recovery Timeline</div>
          <div className="card-subtitle">Typical patient journey based on aggregated experiences</div>
        </div>
      </div>

      <div className="timeline">
        {timeline.map((phase, i) => (
          <div key={i} className="timeline-item" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className={`timeline-dot ${phase.type}`} />
            <div className="timeline-phase">{phase.phase}</div>
            <div className="timeline-title">{phase.title}</div>
            <div className="timeline-desc">{phase.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
