export default function SourceTraceability({ sourcePosts }) {
  if (!sourcePosts || sourcePosts.length === 0) return null;

  const getCredBadgeClass = (label) => {
    if (label === 'high') return 'cred-high';
    if (label === 'medium') return 'cred-medium';
    return 'cred-low';
  };

  const getSourceIcon = (source) => {
    switch (source?.toLowerCase()) {
      case 'reddit': return '🟠';
      case 'pubmed': return '📚';
      case 'drugs.com': return '💊';
      case 'youtube': return '▶️';
      default: return '🔗';
    }
  };

  return (
    <div className="glass-card full-width">
      <div className="card-header">
        <div className="card-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>🔍</div>
        <div>
          <div className="card-title">Source Evidence & Traceability</div>
          <div className="card-subtitle">
            Original patient discussions — {sourcePosts.length} sources
            {' • Click to verify'}
          </div>
        </div>
      </div>

      <div className="source-list">
        {sourcePosts.slice(0, 10).map((post, i) => (
          <div key={i} className="source-item">
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className={`source-badge ${post.source.toLowerCase().replace('.', '')}`}>
                {getSourceIcon(post.source)} {post.source}
              </span>
              {post.video_title && (
                <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                  📹 {post.video_title}
                </span>
              )}
              {post.rating && (
                <span style={{ fontSize: 11, color: '#f59e0b' }}>
                  ⭐ {post.rating}/10
                </span>
              )}
              {post.credibility && (
                <span className={`cred-badge ${getCredBadgeClass(post.credibility.label)}`}>
                  {post.credibility.label === 'high' ? '✅' : post.credibility.label === 'medium' ? '🔶' : '🔸'}
                  {' '}{post.credibility.label} credibility
                </span>
              )}
              {post.misinfo && post.misinfo.is_flagged && (
                <span className="misinfo-inline-flag">⚠️ flagged</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div className="source-text">{post.text}</div>
              <div className="source-meta">
                <span className={`source-sentiment ${post.sentiment}`}>
                  {post.sentiment}
                </span>
                {post.timestamp && (
                  <span className="source-date">{post.timestamp}</span>
                )}
                {post.credibility && (
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    Score: {post.credibility.score}
                  </span>
                )}
                {post.url && (
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 11,
                      color: '#3b82f6',
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    ↗ View Original
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
