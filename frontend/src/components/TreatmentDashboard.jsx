import SideEffectChart from './SideEffectChart';
import SentimentChart from './SentimentChart';
import RecoveryTimeline from './RecoveryTimeline';
import PatientJourney from './PatientJourney';
import CombinationTherapy from './CombinationTherapy';
import SourceTraceability from './SourceTraceability';
import TreatmentComparison from './TreatmentComparison';

export default function TreatmentDashboard({ data, onBack }) {
  if (!data) return null;

  const sentimentLabel = data.sentiment.average_score > 0.1 ? 'positive' :
                         data.sentiment.average_score < -0.1 ? 'negative' : 'neutral';

  return (
    <div className="dashboard">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div>
          <button className="back-btn" onClick={onBack}>← Back to Search</button>
          <h2 className="dashboard-title" style={{ marginTop: 12 }}>
            <span className="dashboard-treatment-name">{data.treatment}</span> Intelligence
          </h2>
        </div>
        <div className="dashboard-meta">
          <span className={`meta-badge ${sentimentLabel}`}>
            {sentimentLabel === 'positive' ? '👍' : sentimentLabel === 'negative' ? '👎' : '😐'}
            {' '}{sentimentLabel.charAt(0).toUpperCase() + sentimentLabel.slice(1)} Sentiment
          </span>
          <span className="meta-badge positive">
            📊 {data.total_discussions} Discussions
          </span>
          <span className="meta-badge neutral">
            {data.effectiveness.effectiveness_label}
          </span>
        </div>
      </div>

      {/* Effectiveness Section */}
      <div className="glass-card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div className="card-icon" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>🎯</div>
          <div>
            <div className="card-title">Treatment Effectiveness</div>
            <div className="card-subtitle">Based on {data.total_discussions} patient reports</div>
          </div>
        </div>
        <div className="effectiveness-section">
          <div className="effectiveness-label">{data.effectiveness.effectiveness_label}</div>
          <div className="effectiveness-stats">
            <div className="stat-item">
              <div className="stat-value positive">{data.effectiveness.positive_pct}%</div>
              <div className="stat-label">Positive Outcomes</div>
            </div>
            <div className="stat-item">
              <div className="stat-value negative">{data.effectiveness.negative_pct}%</div>
              <div className="stat-label">Negative Reports</div>
            </div>
          </div>
          <div className="effectiveness-bar">
            <div className="ebar-positive" style={{ width: `${data.effectiveness.positive_pct}%` }} />
            <div className="ebar-negative" style={{ width: `${data.effectiveness.negative_pct}%` }} />
          </div>
          {data.dosages && data.dosages.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Common Dosages</div>
              <div className="dosage-list">
                {data.dosages.map((d, i) => (
                  <span key={i} className="dosage-pill">{d.dosage} ({d.count}×)</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Patient Journey */}
      <div style={{ marginBottom: 24 }}>
        <PatientJourney timeline={data.recovery_timeline} treatment={data.treatment} />
      </div>

      {/* Side Effects + Sentiment */}
      <div className="dashboard-grid">
        <SideEffectChart sideEffects={data.side_effects} />
        <SentimentChart sentiment={data.sentiment} />
      </div>

      {/* Timeline + Combinations */}
      <div className="dashboard-grid">
        <RecoveryTimeline timeline={data.recovery_timeline} />
        <CombinationTherapy combinations={data.combinations} treatment={data.treatment} />
      </div>

      {/* Source Traceability */}
      <div style={{ marginTop: 24 }}>
        <SourceTraceability sourcePosts={data.source_posts} />
      </div>

      {/* Treatment Comparison */}
      <TreatmentComparison currentTreatment={data.treatment} />
    </div>
  );
}
