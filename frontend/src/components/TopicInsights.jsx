import { useState } from 'react';

const THEME_COLORS = {
  'Side Effects & Symptoms': '#D32F2F',
  'Treatment Effectiveness': '#43A047',
  'Dosage & Administration': '#1565C0',
  'Lifestyle & Diet Changes': '#1BA89C',
  'Long-term Management': '#1565C0',
};

const THEME_EXPLANATIONS = {
  'Side Effects & Symptoms': 'Symptoms and side effects patients frequently mention in their discussions',
  'Treatment Effectiveness': 'How patients describe whether the treatment worked for them',
  'Dosage & Administration': 'How patients discuss doses, timing, and how they take their medication',
  'Lifestyle & Diet Changes': 'Lifestyle modifications patients mention alongside their treatment',
  'Long-term Management': 'How patients talk about managing their condition over time',
};

export default function TopicInsights({ topics, treatment }) {
  const [expandedTopic, setExpandedTopic] = useState(null);

  if (!topics || topics.length === 0) return null;

  return (
    <div className="glass-card full-width">
      <div className="card-header">
        <div className="card-icon" style={{ background: '#1565C0' }}>T</div>
        <div>
          <div className="card-title">Discussion Topics</div>
          <div className="card-subtitle">Key themes discovered from {treatment} patient discussions — click any topic to see source evidence</div>
        </div>
      </div>

      <div className="topic-grid">
        {topics.map((topic, i) => {
          const isExpanded = expandedTopic === i;
          const color = THEME_COLORS[topic.theme] || '#1565C0';
          return (
            <div
              key={i}
              className="topic-card"
              style={{
                borderColor: color,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={() => setExpandedTopic(isExpanded ? null : i)}
            >
              <div className="topic-header">
                <span className="topic-icon" style={{ background: color }}>
                  {topic.theme.charAt(0)}
                </span>
                <div style={{ flex: 1 }}>
                  <span className="topic-theme">{topic.theme}</span>
                  <div style={{ fontSize: 11, color: '#7A8B9C', marginTop: 2, lineHeight: 1.4 }}>
                    {THEME_EXPLANATIONS[topic.theme] || 'Topics patients discuss'}
                  </div>
                </div>
                <span style={{ fontSize: 14, color: '#7A8B9C', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
              </div>

              <div className="topic-keywords">
                {topic.keywords.map((kw, j) => (
                  <span key={j} className="topic-keyword" style={{
                    borderColor: color,
                    color: color,
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
                      background: color,
                    }}
                  />
                </div>
                <span className="topic-mentions">{topic.total_mentions} mentions</span>
              </div>

              {/* Expanded: show source evidence posts */}
              {isExpanded && topic.example_posts && topic.example_posts.length > 0 && (
                <div style={{
                  marginTop: 12, paddingTop: 12,
                  borderTop: `1px solid ${color}22`,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#4A5B6C', marginBottom: 8 }}>
                    Source Evidence — where these topics come from:
                  </div>
                  {topic.example_posts.map((post, k) => (
                    <div key={k} style={{
                      padding: '8px 12px', marginBottom: 6,
                      background: 'rgba(21,101,192,0.02)', borderRadius: 8,
                      borderLeft: `3px solid ${color}`,
                      fontSize: 12, color: '#4A5B6C', lineHeight: 1.5,
                    }}>
                      <div style={{ fontStyle: 'italic', marginBottom: 4 }}>"{post.text}"</div>
                      <div style={{ display: 'flex', gap: 8, fontSize: 10, color: '#7A8B9C' }}>
                        {post.source && <span style={{ background: 'rgba(21,101,192,0.04)', padding: '1px 8px', borderRadius: 10 }}>{post.source}</span>}
                        {post.url && (
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#1565C0', textDecoration: 'none' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            View source →
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isExpanded && (!topic.example_posts || topic.example_posts.length === 0) && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${color}22`, fontSize: 11, color: '#7A8B9C' }}>
                  These themes were detected from keyword frequency analysis across all {treatment} discussions.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
