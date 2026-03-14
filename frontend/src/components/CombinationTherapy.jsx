import { useState } from 'react';

const THERAPY_ICONS = {
  'Exercise': '🏃', 'Walking': '🚶', 'Running': '🏃', 'Yoga': '🧘',
  'Physical Therapy': '💪', 'Stretching': '🤸', 'Strength Training': '🏋️',
  'Diet': '🥗', 'Dietary Changes': '🥗', 'Dietary Control': '🥗',
  'Low-Carb Diet': '🥗', 'Keto Diet': '🥑', 'Mediterranean Diet': '🫒',
  'Dash Diet': '🥗', 'Low-Salt Diet': '🧂', 'Low Sodium': '🧂',
  'Intermittent Fasting': '⏰', 'Probiotics': '🦠', 'Supplements': '💊',
  'Vitamin': '💊', 'B12': '💊', 'Meditation': '🧘',
  'Lifestyle Changes': '🌱', 'Weight Loss': '⚖️',
};

const SOURCE_COLORS = {
  reddit: '#ff4500',
  'drugs.com': '#0066cc',
  pubmed: '#10b981',
  youtube: '#ef4444',
};

const SENTIMENT_LABELS = {
  positive: { label: 'Positive experience', color: '#22c55e' },
  negative: { label: 'Negative experience', color: '#ef4444' },
  neutral: { label: 'Neutral mention', color: '#94a3b8' },
};

function SourceBadge({ source }) {
  const color = SOURCE_COLORS[source?.toLowerCase()] || '#64748b';
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
      background: `${color}20`, color, border: `1px solid ${color}40`,
      textTransform: 'uppercase', letterSpacing: 0.5,
    }}>
      {source}
    </span>
  );
}

function ComboCard({ combo, treatment }) {
  const [open, setOpen] = useState(false);
  const evidence = combo.evidence || [];
  const hasEvidence = evidence.length > 0;

  return (
    <div
      className="combo-card"
      style={{ cursor: hasEvidence ? 'pointer' : 'default' }}
      onClick={() => hasEvidence && setOpen(o => !o)}
    >
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="combo-icon">{THERAPY_ICONS[combo.name] || '💊'}</div>
        <div style={{ flex: 1 }}>
          <div className="combo-name">{combo.name}</div>
          <div className="combo-count">
            Mentioned in {combo.count} patient report{combo.count !== 1 ? 's' : ''}
          </div>
        </div>
        {hasEvidence && (
          <div style={{ fontSize: 11, color: '#64748b', padding: '3px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 6 }}>
            {open ? '▲ hide' : '▼ see why'}
          </div>
        )}
      </div>

      {/* Source note */}
      {!open && hasEvidence && (
        <div style={{ marginTop: 6, fontSize: 11, color: '#64748b', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          From: {[...new Set(evidence.map(e => e.source))].map(s => (
            <SourceBadge key={s} source={s} />
          ))}
        </div>
      )}

      {/* Collapsible evidence */}
      {open && hasEvidence && (
        <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>
            What patients said about combining {treatment} with {combo.name}:
          </div>
          {evidence.map((ev, i) => {
            const sent = SENTIMENT_LABELS[ev.sentiment] || SENTIMENT_LABELS.neutral;
            return (
              <div key={i} style={{
                marginBottom: 10, padding: '10px 12px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 8, borderLeft: `3px solid ${sent.color}40`,
              }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                  <SourceBadge source={ev.source} />
                  <span style={{ fontSize: 10, color: sent.color }}>● {sent.label}</span>
                  {ev.timestamp && (
                    <span style={{ fontSize: 10, color: '#64748b' }}>{ev.timestamp}</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                  "{ev.text}"
                </div>
                {ev.url && (
                  <a
                    href={ev.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{ fontSize: 11, color: '#3b82f6', textDecoration: 'none', display: 'inline-block', marginTop: 4 }}
                  >
                    ↗ View original post
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CombinationTherapy({ combinations, treatment }) {
  if (!combinations || combinations.length === 0) return null;

  return (
    <div className="glass-card">
      <div className="card-header">
        <div className="card-icon" style={{ background: 'rgba(6, 214, 160, 0.15)' }}>🔗</div>
        <div>
          <div className="card-title">Combination Treatments</div>
          <div className="card-subtitle">
            Things patients used alongside {treatment} — click any card to see the source quotes
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12, padding: '8px 12px', background: 'rgba(59,130,246,0.06)', borderRadius: 8, border: '1px solid rgba(59,130,246,0.12)' }}>
        ℹ️ These combinations come from real patient posts on Reddit, Drugs.com, and PubMed — not medical recommendations. Always consult your doctor before combining treatments.
      </div>

      <div className="combo-grid">
        {combinations.map((combo, i) => (
          <ComboCard key={i} combo={combo} treatment={treatment} />
        ))}
      </div>
    </div>
  );
}
