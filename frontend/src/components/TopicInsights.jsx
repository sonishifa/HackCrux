const THEME_ICONS = {
  'Side Effects & Symptoms': '⚠️',
  'Treatment Effectiveness': '✅',
  'Dosage & Administration': '💊',
  'Lifestyle & Diet Changes': '🌱',
  'Long-term Management': '📋',
};

const THEME_COLORS = {
  'Side Effects & Symptoms': '#ef4444',
  'Treatment Effectiveness': '#22c55e',
  'Dosage & Administration': '#8b5cf6',
  'Lifestyle & Diet Changes': '#06d6a0',
  'Long-term Management': '#3b82f6',
};

export default function TopicInsights({ topics, treatment }) {
  if (!topics || topics.length === 0) return null;

  return (
    <div className="glass-card full-width">
      <div className="card-header">
        <div className="card-icon" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>🧠</div>
        <div>
          <div className="card-title">Discussion Topics</div>
          <div className="card-subtitle">Key themes from patient discussions about {treatment}</div>
        </div>
      </div>

      <div className="topic-grid">
        {topics.map((topic, i) => (
          <div key={i} className="topic-card" style={{ borderColor: THEME_COLORS[topic.theme] || '#3b82f6' }}>
            <div className="topic-header">
              <span className="topic-icon">
                {THEME_ICONS[topic.theme] || '📌'}
              </span>
              <span className="topic-theme">{topic.theme}</span>
            </div>
            <div className="topic-keywords">
              {topic.keywords.map((kw, j) => (
                <span key={j} className="topic-keyword" style={{
                  borderColor: THEME_COLORS[topic.theme] || '#3b82f6',
                  color: THEME_COLORS[topic.theme] || '#3b82f6',
                }}>
                  {kw}
                  {topic.keyword_counts && topic.keyword_counts[kw] && (
                    <span className="keyword-count">{topic.keyword_counts[kw]}</span>
                  )}
                </span>
              ))}
            </div>
            <div className="topic-relevance">
              <div className="topic-bar-bg">
                <div
                  className="topic-bar-fill"
                  style={{
                    width: `${Math.min(topic.relevance_score * 10, 100)}%`,
                    background: THEME_COLORS[topic.theme] || '#3b82f6',
                  }}
                />
              </div>
              <span className="topic-mentions">{topic.total_mentions} mentions</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
