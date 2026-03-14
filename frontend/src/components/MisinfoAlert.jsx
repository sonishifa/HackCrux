import { useState } from 'react';

// Human-readable explanations of each category
const CATEGORY_EXPLANATIONS = {
  cure_claim: {
    label: 'Unverified Cure Claims',
    icon: '🚫',
    plain: 'A post claims the treatment cures the condition 100% or guarantees results — which is not supported by medical evidence.',
  },
  anti_science: {
    label: 'Anti-Science Language',
    icon: '⚠️',
    plain: 'A post contains language suggesting doctors or researchers are hiding information, or dismisses medical science entirely.',
  },
  dangerous_advice: {
    label: 'Potentially Dangerous Advice',
    icon: '🛑',
    plain: 'A post advises stopping prescribed medication or replacing it with something else without medical supervision.',
  },
  extreme_claim: {
    label: 'Absolute or Extreme Claims',
    icon: '📢',
    plain: 'A post makes absolute statements like "works for everyone" or "the only solution" — which are rarely accurate for any medication.',
  },
  suspicious_spam: {
    label: 'Possible Spam',
    icon: '🤖',
    plain: 'A very short post with extreme positive language that may be promotional rather than a genuine experience.',
  },
};

function FlaggedPostCard({ post }) {
  const [expanded, setExpanded] = useState(false);
  const categories = post.misinfo?.categories || [];
  const reasons = post.misinfo?.reasons || [];

  return (
    <div style={{
      padding: '12px 14px',
      marginBottom: 10,
      background: 'rgba(239, 68, 68, 0.04)',
      border: '1px solid rgba(239, 68, 68, 0.12)',
      borderRadius: 10,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
          background: `${post.source?.toLowerCase() === 'reddit' ? '#ff4500' : post.source?.toLowerCase() === 'drugs.com' ? '#0066cc' : '#10b981'}20`,
          color: post.source?.toLowerCase() === 'reddit' ? '#ff4500' : post.source?.toLowerCase() === 'drugs.com' ? '#0066cc' : '#10b981',
        }}>
          {post.source}
        </span>
        <span style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(239,68,68,0.12)', color: '#fca5a5', borderRadius: 4, fontWeight: 600 }}>
          ⚠️ Flagged
        </span>
        {categories.map((cat, i) => {
          const info = CATEGORY_EXPLANATIONS[cat];
          return info ? (
            <span key={i} style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(245,158,11,0.1)', color: '#fbbf24', borderRadius: 4 }}>
              {info.icon} {info.label}
            </span>
          ) : null;
        })}
      </div>

      {/* Post text */}
      <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.55, marginBottom: 8 }}>
        "{post.text}"
      </div>

      {/* Why flagged — collapsible */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ fontSize: 11, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        {expanded ? '▲ Hide explanation' : '▼ Why was this flagged?'}
      </button>

      {expanded && (
        <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
          {categories.map((cat, i) => {
            const info = CATEGORY_EXPLANATIONS[cat];
            return info ? (
              <div key={i} style={{ marginBottom: 6, fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>{info.icon} {info.label}: </span>
                {info.plain}
              </div>
            ) : null;
          })}
          {reasons.map((r, i) => (
            <div key={i} style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>• {r}</div>
          ))}
        </div>
      )}

      {post.url && (
        <a href={post.url} target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-block', marginTop: 6, fontSize: 11, color: '#3b82f6', textDecoration: 'none' }}>
          ↗ View original post
        </a>
      )}
    </div>
  );
}

export default function MisinfoAlert({ misinformation, sourcePosts }) {
  const [showPosts, setShowPosts] = useState(false);

  if (!misinformation || misinformation.flagged_count === 0) return null;

  const flaggedPosts = sourcePosts
    ? sourcePosts.filter(p => p.misinfo && p.misinfo.is_flagged)
    : [];

  const categories = misinformation.categories || {};
  const isSafe = misinformation.flagged_pct < 10;
  const isModerate = misinformation.flagged_pct < 30;

  return (
    <div className="glass-card full-width misinfo-card">
      <div className="card-header">
        <div className="card-icon" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>🚨</div>
        <div>
          <div className="card-title">Content Quality Alerts</div>
          <div className="card-subtitle">
            Automated scan of {misinformation.total_posts} discussions for potentially misleading health claims
          </div>
        </div>
      </div>

      {/* Plain-English summary */}
      <div style={{
        padding: '14px 16px', marginBottom: 16, borderRadius: 10,
        background: isSafe ? 'rgba(34,197,94,0.06)' : isModerate ? 'rgba(245,158,11,0.06)' : 'rgba(239,68,68,0.06)',
        border: `1px solid ${isSafe ? 'rgba(34,197,94,0.2)' : isModerate ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}`,
        fontSize: 13, color: '#f0f4ff', lineHeight: 1.6,
      }}>
        <strong>{isSafe ? '✅ Mostly reliable' : isModerate ? '⚠️ Some concerns' : '🛑 Notable concerns'}: </strong>
        {misinformation.flagged_count} out of {misinformation.total_posts} discussions ({misinformation.flagged_pct}%) 
        contain language our system flagged for potential misinformation.{' '}
        {isSafe
          ? 'The majority of discussions appear to be genuine patient experiences.'
          : isModerate
          ? 'Most discussions are genuine, but a portion contain unverified claims worth being aware of.'
          : 'A significant portion of discussions contain claims that should be verified with a healthcare professional.'
        }
      </div>

      {/* Category breakdown */}
      {Object.keys(categories).length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 8 }}>
            Types of issues found:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(categories).map(([cat, count]) => {
              const info = CATEGORY_EXPLANATIONS[cat];
              if (!info) return null;
              return (
                <div key={cat} style={{
                  padding: '8px 12px', borderRadius: 8,
                  background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)',
                  fontSize: 12,
                }}>
                  <div style={{ fontWeight: 600, color: '#fca5a5', marginBottom: 2 }}>
                    {info.icon} {info.label} <span style={{ color: '#64748b' }}>({count}×)</span>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 11, maxWidth: 280, lineHeight: 1.4 }}>
                    {info.plain}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Toggle flagged posts */}
      {flaggedPosts.length > 0 && (
        <>
          <button
            onClick={() => setShowPosts(s => !s)}
            style={{
              fontSize: 12, padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#fca5a5', fontFamily: 'Inter, sans-serif', marginBottom: showPosts ? 12 : 0,
            }}
          >
            {showPosts ? '▲ Hide flagged posts' : `▼ View ${flaggedPosts.length} flagged post${flaggedPosts.length > 1 ? 's' : ''}`}
          </button>

          {showPosts && flaggedPosts.slice(0, 5).map((post, i) => (
            <FlaggedPostCard key={i} post={post} />
          ))}
        </>
      )}

      {/* Disclaimer */}
      <div style={{
        marginTop: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.02)',
        borderRadius: 8, fontSize: 11, color: '#64748b', lineHeight: 1.6,
      }}>
        ℹ️ This is automated detection using pattern matching, not medical review. 
        Flags indicate posts that <em>may</em> contain misleading language — not confirmed misinformation. 
        Always consult a qualified healthcare professional for medical decisions.
      </div>
    </div>
  );
}
