export default function SideEffectChart({ sideEffects }) {
  if (!sideEffects || sideEffects.length === 0) return null;

  const maxPct = Math.max(...sideEffects.map(s => s.percentage));

  const barColors = [
    '#D32F2F', '#E6960A', '#1565C0', '#1BA89C', '#43A047',
    '#7B1FA2', '#C2185B', '#0097A7', '#689F38', '#F57C00'
  ];

  return (
    <div className="glass-card">
      <div className="card-header">
        <div className="card-icon" style={{ background: '#D32F2F' }}>SE</div>
        <div>
          <div className="card-title">Side Effects</div>
          <div className="card-subtitle">Most frequently mentioned side effects</div>
        </div>
      </div>
      {sideEffects.map((se, i) => (
        <div className="side-effect-bar" key={i}>
          <div className="side-effect-name">{se.name}</div>
          <div className="side-effect-bar-track">
            <div
              className="side-effect-bar-fill"
              style={{
                width: `${(se.percentage / maxPct) * 100}%`,
                background: barColors[i % barColors.length],
              }}
            >
              <span className="side-effect-pct">{se.percentage}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
