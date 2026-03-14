export default function SourceTraceability({ sourcePosts }) {
  if (!sourcePosts || sourcePosts.length === 0) return null;

  return (
    <div className="glass-card full-width">
      <div className="card-header">
        <div className="card-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>🔍</div>
        <div>
          <div className="card-title">Source Evidence</div>
          <div className="card-subtitle">Original patient discussions — {sourcePosts.length} sources</div>
        </div>
      </div>

      <div className="source-list">
        {sourcePosts.slice(0, 10).map((post, i) => (
          <div key={i} className="source-item">
            <div>
              <span className={`source-badge ${post.source.toLowerCase()}`}>
                {post.source}
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <div className="source-text">{post.text}</div>
              <div className="source-meta">
                <span className={`source-sentiment ${post.sentiment}`}>
                  {post.sentiment}
                </span>
                <span className="source-date">{post.timestamp}</span>
                {post.side_effects && post.side_effects.length > 0 && (
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    Side effects: {post.side_effects.join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
