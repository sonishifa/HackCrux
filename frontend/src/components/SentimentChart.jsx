import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = { positive: '#43A047', neutral: '#E6960A', negative: '#D32F2F' };

function getSentimentStory(sentiment) {
  const { average_score, distribution, positive, negative, neutral, total } = sentiment;
  const pos = distribution.positive_pct;
  const neg = distribution.negative_pct;

  if (pos >= 60) {
    return {
      headline: 'Mostly positive experiences',
      color: '#43A047',
      summary: `${pos}% of patients reported positive outcomes. The majority found this treatment helpful or well-tolerated.`,
    };
  } else if (neg >= 60) {
    return {
      headline: 'Mostly negative experiences',
      color: '#D32F2F',
      summary: `${neg}% of patients reported negative outcomes. Many found the treatment difficult to tolerate or ineffective.`,
    };
  } else if (pos >= 40 && neg <= 30) {
    return {
      headline: 'Generally positive',
      color: '#43A047',
      summary: `More patients reported positive experiences (${pos}%) than negative (${neg}%). Results vary but lean favorable.`,
    };
  } else if (neg >= 40 && pos <= 30) {
    return {
      headline: 'More negative than positive',
      color: '#E6960A',
      summary: `A higher proportion of patients reported negative experiences (${neg}%) compared to positive (${pos}%).`,
    };
  } else {
    return {
      headline: 'Mixed experiences',
      color: '#E6960A',
      summary: `Patients reported widely varied experiences — ${pos}% positive, ${neg}% negative, ${distribution.neutral_pct}% neutral. Outcomes depend heavily on individual factors.`,
    };
  }
}

export default function SentimentChart({ sentiment }) {
  if (!sentiment) return null;

  const data = [
    { name: 'Positive', value: sentiment.positive, pct: sentiment.distribution.positive_pct },
    { name: 'Neutral', value: sentiment.neutral, pct: sentiment.distribution.neutral_pct },
    { name: 'Negative', value: sentiment.negative, pct: sentiment.distribution.negative_pct },
  ].filter(d => d.value > 0);

  const story = getSentimentStory(sentiment);

  return (
    <div className="glass-card">
      <div className="card-header">
        <div className="card-icon" style={{ background: '#1BA89C' }}>S</div>
        <div>
          <div className="card-title">Patient Sentiment</div>
          <div className="card-subtitle">How patients feel about this treatment overall</div>
        </div>
      </div>

      {/* Plain-English story or LLM summary */}
      {sentiment.llm_summary ? (
        <div style={{
          padding: '16px 18px', marginBottom: 16, borderRadius: 10,
          background: 'rgba(21, 101, 192, 0.03)',
          border: '1px solid #E2E8F0',
          fontSize: 13, lineHeight: 1.6, color: '#4A5B6C'
        }}>
          <div style={{ fontWeight: 700, color: story.color, marginBottom: 8, fontSize: 14 }}>
            AI Sentiment Analysis
          </div>
          <p style={{ marginBottom: 12 }}>{sentiment.llm_summary.summary}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {sentiment.llm_summary.positive_reasons?.length > 0 && (
              <div>
                <strong style={{ color: '#43A047', display: 'block', marginBottom: 4 }}>Why Positive:</strong>
                <ul style={{ margin: 0, paddingLeft: 16, color: '#4A5B6C', fontSize: 12 }}>
                  {sentiment.llm_summary.positive_reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
            {sentiment.llm_summary.negative_reasons?.length > 0 && (
              <div>
                <strong style={{ color: '#D32F2F', display: 'block', marginBottom: 4 }}>Why Negative:</strong>
                <ul style={{ margin: 0, paddingLeft: 16, color: '#4A5B6C', fontSize: 12 }}>
                  {sentiment.llm_summary.negative_reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          padding: '12px 14px', marginBottom: 16, borderRadius: 10,
          background: `${story.color}08`,
          border: `1px solid ${story.color}20`,
          fontSize: 13, lineHeight: 1.6,
        }}>
          <div style={{ fontWeight: 700, color: story.color, marginBottom: 4 }}>
            {story.headline}
          </div>
          <div style={{ color: '#4A5B6C' }}>{story.summary}</div>
          <div style={{ marginTop: 6, fontSize: 11, color: '#7A8B9C' }}>
            Based on {sentiment.total} patient discussions · Sentiment score: {sentiment.average_score > 0 ? '+' : ''}{sentiment.average_score} (−1 = most negative, +1 = most positive)
          </div>
        </div>
      )}

      {/* Chart + Legend */}
      <div className="sentiment-container">
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={44}
              outerRadius={72}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={COLORS[entry.name.toLowerCase()]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: '#fff', border: '1px solid #E2E8F0',
                borderRadius: 8, color: '#1A2B3C', fontSize: 12,
              }}
              formatter={(value, name) => [`${value} posts`, name]}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="sentiment-legend">
          {data.map((d) => (
            <div key={d.name} className="legend-item">
              <div className="legend-dot" style={{ background: COLORS[d.name.toLowerCase()] }} />
              <span className="legend-label">{d.name}</span>
              <span className="legend-value" style={{ fontWeight: 700 }}>{d.pct}%</span>
              <span style={{ fontSize: 10, color: '#7A8B9C' }}>({d.value} posts)</span>
            </div>
          ))}
        </div>
      </div>

      {/* What this means */}
      <div style={{ marginTop: 12, fontSize: 11, color: '#7A8B9C', lineHeight: 1.5 }}>
        <strong style={{ color: '#4A5B6C' }}>How to read this:</strong> Sentiment is detected automatically from the language patients use — 
        words like "helped", "improved" score positive; "terrible", "stopped taking" score negative. 
        This reflects patient language, not clinical outcomes.
      </div>
    </div>
  );
}
