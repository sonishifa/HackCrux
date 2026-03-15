import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#1BA89C', '#1565C0', '#7B1FA2', '#D32F2F', '#E6960A'];

const APPROACH_META = {
  Allopathy:    { label: 'Al', desc: 'Conventional medicine & pharmaceuticals' },
  Naturopathy:  { label: 'Na', desc: 'Natural remedies & herbal supplements' },
  Homeopathy:   { label: 'Ho', desc: 'Diluted substances — "like cures like"' },
  Lifestyle:    { label: 'Lf', desc: 'Diet, exercise, meditation & therapy' },
};

export default function TreatmentComparison({ currentTreatment, category, approachComparison, diseaseContext, effectiveness, sentiment, sideEffects }) {
  const condition = diseaseContext?.condition || 'this condition';
  const approaches = approachComparison || [];

  if (approaches.length === 0) {
    return (
      <div className="comparison-section">
        <div className="glass-card full-width">
          <div className="card-header">
            <div className="card-icon" style={{ background: '#1565C0' }}>TC</div>
            <div>
              <div className="card-title">Treatment Approach Comparison</div>
              <div className="card-subtitle">Comparing different medical approaches for {condition}</div>
            </div>
          </div>
          <div style={{ padding: '16px 0', color: '#7A8B9C', fontSize: 13 }}>
            Treatment approach comparison is being generated. Search again for updated results.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="comparison-section">
      <div className="glass-card full-width">
        <div className="card-header">
          <div className="card-icon" style={{ background: '#1565C0' }}>TC</div>
          <div>
            <div className="card-title">Treatment Approach Comparison</div>
            <div className="card-subtitle">Comparing medical approaches for <strong style={{ color: '#1A2B3C' }}>{condition}</strong></div>
          </div>
        </div>

        {/* Approach cards */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          {approaches.map((a, i) => {
            const meta = APPROACH_META[a.approach] || { label: 'Rx', desc: 'Medical approach' };
            const color = COLORS[i % COLORS.length];
            const isCurrent = a.treatment_name?.toLowerCase() === currentTreatment?.toLowerCase();
            return (
              <div key={a.approach} style={{
                flex: '1 1 220px',
                padding: 16,
                borderRadius: 12,
                background: isCurrent ? `${color}08` : 'rgba(21,101,192,0.02)',
                border: `1px solid ${isCurrent ? `${color}30` : '#E2E8F0'}`,
                position: 'relative',
              }}>
                {isCurrent && (
                  <div style={{
                    position: 'absolute', top: -8, right: 12,
                    background: color, color: '#fff', fontSize: 9, fontWeight: 700,
                    padding: '2px 8px', borderRadius: 8, letterSpacing: 0.5,
                  }}>CURRENT TREATMENT</div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 700, color: '#fff',
                    width: 36, height: 36, borderRadius: 10,
                    background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{meta.label}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color }}>{a.approach}</div>
                    <div style={{ fontSize: 11, color: '#7A8B9C' }}>{meta.desc}</div>
                  </div>
                </div>

                <div style={{ fontSize: 13, fontWeight: 600, color: '#4A5B6C', marginBottom: 6 }}>
                  {a.treatment_name}
                </div>

                {a.mechanism && (
                  <div style={{ fontSize: 11, color: '#1565C0', marginBottom: 8, fontStyle: 'italic' }}>
                    {a.mechanism}
                  </div>
                )}

                <div style={{ fontSize: 12, color: '#4A5B6C', lineHeight: 1.5, marginBottom: 10 }}>
                  {a.details}
                </div>

                {a.common_side_effects?.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: '#7A8B9C', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Side Effects</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {a.common_side_effects.map((se, j) => (
                        <span key={j} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: 'rgba(230,150,10,0.06)', color: '#E6960A', border: '1px solid rgba(230,150,10,0.12)' }}>
                          {se}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#7A8B9C', textTransform: 'uppercase', letterSpacing: 1 }}>Avg Improvement</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1A2B3C' }}>{a.avg_improvement_time || 'varies'}</div>
                  </div>
                  {a.patient_sentiment && (
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 10,
                      background: (a.patient_sentiment || '').includes('positive') ? 'rgba(67,160,71,0.08)' : 'rgba(230,150,10,0.08)',
                      color: (a.patient_sentiment || '').includes('positive') ? '#43A047' : '#E6960A',
                    }}>{a.patient_sentiment}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}