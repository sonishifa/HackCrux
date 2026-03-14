import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = { positive: '#22c55e', neutral: '#f59e0b', negative: '#ef4444' };

export default function SentimentChart({ sentiment }) {
  if (!sentiment) return null;

  const data = [
    { name: 'Positive', value: sentiment.positive, pct: sentiment.distribution.positive_pct },
    { name: 'Neutral', value: sentiment.neutral, pct: sentiment.distribution.neutral_pct },
    { name: 'Negative', value: sentiment.negative, pct: sentiment.distribution.negative_pct },
  ];

  const scoreLabel = sentiment.average_score > 0.1 ? 'Positive' :
                     sentiment.average_score < -0.1 ? 'Negative' : 'Neutral';

  return (
    <div className="glass-card">
      <div className="card-header">
        <div className="card-icon" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>💬</div>
        <div>
          <div className="card-title">Patient Sentiment</div>
          <div className="card-subtitle">Overall feeling: {scoreLabel} ({sentiment.average_score})</div>
        </div>
      </div>

      <div className="sentiment-container">
        <ResponsiveContainer width={180} height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={COLORS[entry.name.toLowerCase()]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f0f4ff', fontSize: 13 }}
              formatter={(value) => `${value} posts`}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="sentiment-legend">
          {data.map((d) => (
            <div key={d.name} className="legend-item">
              <div className="legend-dot" style={{ background: COLORS[d.name.toLowerCase()] }} />
              <span className="legend-label">{d.name}</span>
              <span className="legend-value">{d.pct}%</span>
            </div>
          ))}
          <div className="legend-item" style={{ marginTop: 8 }}>
            <span className="legend-label">Total Discussions</span>
            <span className="legend-value">{sentiment.total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
