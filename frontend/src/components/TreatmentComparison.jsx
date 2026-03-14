import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#06d6a0', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

const APPROACH_META = {
  Allopathy:    { icon: '💊', desc: 'Conventional medicine & pharmaceuticals' },
  Naturopathy:  { icon: '🌿', desc: 'Natural remedies & herbal supplements' },
  Homeopathy:   { icon: '🧪', desc: 'Diluted substances — "like cures like"' },
  Lifestyle:    { icon: '🏃', desc: 'Diet, exercise, meditation & therapy' },
};

export default function TreatmentComparison({ currentTreatment, category, approachComparison, diseaseContext, effectiveness, sentiment, sideEffects }) {
  const condition = diseaseContext?.condition || 'this condition';
  const approaches = approachComparison || [];

  if (approaches.length === 0) {
    return (
      <div className="comparison-section">
        <div className="glass-card full-width">
          <div className="card-header">
            <div className="card-icon" style={{ background: 'rgba(236, 72, 153, 0.15)' }}>⚖️</div>
            <div>
              <div className="card-title">Treatment Approach Comparison</div>
              <div className="card-subtitle">Comparing different medical approaches for {condition}</div>
            </div>
          </div>
          <div style={{ padding: '16px 0', color: '#94a3b8', fontSize: 13 }}>
            Treatment approach comparison is being generated. Search again for updated results.
          </div>
        </div>
      </div>
    );
  }

  // Radar chart data
  const radarData = approaches.length > 1 ? [
    {
      metric: 'Speed',
      ...Object.fromEntries(approaches.map(a => {
        const text = (a.avg_improvement_time || '').toLowerCase();
        let score = 50;
        if (text.includes('1') && text.includes('week')) score = 90;
        else if (text.includes('2') && text.includes('week')) score = 80;
        else if (text.includes('3') || text.includes('4')) score = 65;
        else if (text.includes('month')) score = 40;
        return [a.approach, score];
      })),
    },
    {
      metric: 'Sentiment',
      ...Object.fromEntries(approaches.map(a => [
        a.approach,
        (a.patient_sentiment || '').includes('positive') ? 80 :
        (a.patient_sentiment || '').includes('mixed') ? 50 : 30,
      ])),
    },
    {
      metric: 'Evidence',
      ...Object.fromEntries(approaches.map(a => [
        a.approach,
        a.approach === 'Allopathy' ? 85 :
        a.approach === 'Lifestyle' ? 60 :
        a.approach === 'Naturopathy' ? 45 : 30,
      ])),
    },
  ] : [];

  return (
    <div className="comparison-section">
      <div className="glass-card full-width">
        <div className="card-header">
          <div className="card-icon" style={{ background: 'rgba(236, 72, 153, 0.15)' }}>⚖️</div>
          <div>
            <div className="card-title">Treatment Approach Comparison</div>
            <div className="card-subtitle">Comparing medical approaches for <strong style={{ color: '#f0f4ff' }}>{condition}</strong></div>
          </div>
        </div>

        {/* Approach cards */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          {approaches.map((a, i) => {
            const meta = APPROACH_META[a.approach] || { icon: '💉', desc: 'Medical approach' };
            const color = COLORS[i % COLORS.length];
            const isCurrent = a.treatment_name?.toLowerCase() === currentTreatment?.toLowerCase();
            return (
              <div key={a.approach} style={{
                flex: '1 1 220px',
                padding: 16,
                borderRadius: 12,
                background: isCurrent ? `${color}12` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isCurrent ? `${color}50` : 'rgba(255,255,255,0.06)'}`,
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
                  <span style={{ fontSize: 22 }}>{meta.icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color }}>{a.approach}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{meta.desc}</div>
                  </div>
                </div>

                <div style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                  {a.treatment_name}
                </div>

                {a.mechanism && (
                  <div style={{ fontSize: 11, color: '#818cf8', marginBottom: 8, fontStyle: 'italic' }}>
                    {a.mechanism}
                  </div>
                )}

                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5, marginBottom: 10 }}>
                  {a.details}
                </div>

                {a.common_side_effects?.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Side Effects</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {a.common_side_effects.map((se, j) => (
                        <span key={j} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.15)' }}>
                          {se}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Avg Improvement</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f4ff' }}>{a.avg_improvement_time || 'varies'}</div>
                  </div>
                  {a.patient_sentiment && (
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 10,
                      background: (a.patient_sentiment || '').includes('positive') ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                      color: (a.patient_sentiment || '').includes('positive') ? '#22c55e' : '#f59e0b',
                    }}>{a.patient_sentiment}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Radar chart */}
        {radarData.length > 0 && (
          <div style={{ width: '100%', maxWidth: 420, margin: '0 auto' }}>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                {approaches.map((a, i) => (
                  <Radar
                    key={a.approach}
                    name={a.approach}
                    dataKey={a.approach}
                    stroke={COLORS[i % COLORS.length]}
                    fill={COLORS[i % COLORS.length]}
                    fillOpacity={0.12}
                    strokeWidth={2}
                  />
                ))}
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f0f4ff', fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
