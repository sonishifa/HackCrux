const THERAPY_ICONS = {
  'Exercise': '🏃',
  'Walking': '🚶',
  'Running': '🏃',
  'Yoga': '🧘',
  'Physical Therapy': '💪',
  'Stretching': '🤸',
  'Strength Training': '🏋️',
  'Diet': '🥗',
  'Dietary Changes': '🥗',
  'Dietary Control': '🥗',
  'Low-Carb Diet': '🥗',
  'Keto Diet': '🥑',
  'Mediterranean Diet': '🫒',
  'Dash Diet': '🥗',
  'Low-Salt Diet': '🧂',
  'Low Sodium': '🧂',
  'Intermittent Fasting': '⏰',
  'Probiotics': '🦠',
  'Supplements': '💊',
  'Vitamin': '💊',
  'B12': '💊',
  'Meditation': '🧘',
  'Lifestyle Changes': '🌱',
  'Weight Loss': '⚖️',
  'Insulin': '💉',
  'Metformin': '💊',
  'Acetaminophen': '💊',
  'Amlodipine': '💊',
  'Berberine': '🌿',
};

export default function CombinationTherapy({ combinations, treatment }) {
  if (!combinations || combinations.length === 0) return null;

  return (
    <div className="glass-card">
      <div className="card-header">
        <div className="card-icon" style={{ background: 'rgba(6, 214, 160, 0.15)' }}>🔗</div>
        <div>
          <div className="card-title">Combination Treatments</div>
          <div className="card-subtitle">Frequently used alongside {treatment}</div>
        </div>
      </div>

      <div className="combo-grid">
        {combinations.map((combo, i) => (
          <div key={i} className="combo-card">
            <div className="combo-icon">{THERAPY_ICONS[combo.name] || '💊'}</div>
            <div className="combo-name">{combo.name}</div>
            <div className="combo-count">{combo.count} patient{combo.count !== 1 ? 's' : ''} reported</div>
          </div>
        ))}
      </div>
    </div>
  );
}
