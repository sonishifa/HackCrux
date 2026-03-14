import { useState, useEffect } from 'react';
import { compareTreatments, getTreatments } from '../api/client';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#06d6a0', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

export default function TreatmentComparison({ currentTreatment }) {
  const [treatments, setTreatments] = useState([]);
  const [selected, setSelected] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getTreatments().then((data) => {
      setTreatments(data.treatments || []);
    }).catch(() => {});
  }, []);

  const toggleTreatment = (name) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    );
  };

  const handleCompare = async () => {
    const toCompare = [currentTreatment, ...selected];
    if (toCompare.length < 2) return;
    setLoading(true);
    try {
      const data = await compareTreatments(toCompare);
      setComparison(data.comparison);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const radarData = comparison ? [
    {
      metric: 'Effectiveness',
      ...Object.fromEntries(comparison.map((c) => [c.treatment, c.effectiveness.positive_pct])),
    },
    {
      metric: 'Positive Sentiment',
      ...Object.fromEntries(comparison.map((c) => [c.treatment, c.sentiment.distribution.positive_pct])),
    },
    {
      metric: 'Discussions',
      ...Object.fromEntries(comparison.map((c) => [c.treatment, Math.min(c.total_discussions * 4, 100)])),
    },
    {
      metric: 'Low Side Effects',
      ...Object.fromEntries(comparison.map((c) => [c.treatment, Math.max(0, 100 - (c.top_side_effects[0]?.percentage || 0))])),
    },
  ] : [];

  return (
    <div className="comparison-section">
      <div className="glass-card full-width">
        <div className="card-header">
          <div className="card-icon" style={{ background: 'rgba(236, 72, 153, 0.15)' }}>⚖️</div>
          <div>
            <div className="card-title">Treatment Comparison</div>
            <div className="card-subtitle">Compare {currentTreatment} with other treatments</div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="comparison-select">
            {treatments.filter((t) => t.name !== currentTreatment).map((t) => (
              <button
                key={t.name}
                className={`comparison-tag ${selected.includes(t.name) ? 'active' : ''}`}
                onClick={() => toggleTreatment(t.name)}
              >
                {t.name}
              </button>
            ))}
            <button
              className="search-btn"
              style={{ position: 'static', borderRadius: 20, padding: '8px 20px', fontSize: 13 }}
              onClick={handleCompare}
              disabled={selected.length === 0 || loading}
            >
              {loading ? 'Comparing...' : 'Compare'}
            </button>
          </div>
        </div>

        {comparison && (
          <>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 300 }}>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.06)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                    {comparison.map((c, i) => (
                      <Radar
                        key={c.treatment}
                        name={c.treatment}
                        dataKey={c.treatment}
                        stroke={COLORS[i]}
                        fill={COLORS[i]}
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    ))}
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f0f4ff', fontSize: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ flex: 1, minWidth: 400, overflowX: 'auto' }}>
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th>Treatment</th>
                      <th>Discussions</th>
                      <th>Effectiveness</th>
                      <th>Top Side Effect</th>
                      <th>Sentiment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map((c, i) => (
                      <tr key={c.treatment}>
                        <td className="treatment-col" style={{ color: COLORS[i] }}>{c.treatment}</td>
                        <td>{c.total_discussions}</td>
                        <td>
                          <span className={`meta-badge ${c.effectiveness.positive_pct >= 70 ? 'positive' : c.effectiveness.positive_pct >= 40 ? 'neutral' : 'negative'}`}>
                            {c.effectiveness.effectiveness_label}
                          </span>
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>
                          {c.top_side_effects[0]?.name || 'N/A'} ({c.top_side_effects[0]?.percentage || 0}%)
                        </td>
                        <td>
                          <span className={`meta-badge ${c.sentiment.average_score > 0.1 ? 'positive' : c.sentiment.average_score < -0.1 ? 'negative' : 'neutral'}`}>
                            {c.sentiment.average_score > 0 ? '+' : ''}{c.sentiment.average_score}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
