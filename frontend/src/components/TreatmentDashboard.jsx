import SideEffectChart from './SideEffectChart';
import SentimentChart from './SentimentChart';
import RecoveryTimeline from './RecoveryTimeline';
import PatientJourney from './PatientJourney';
import CombinationTherapy from './CombinationTherapy';
import SourceTraceability from './SourceTraceability';
import TreatmentComparison from './TreatmentComparison';
import MisinfoAlert from './MisinfoAlert';
import TopicInsights from './TopicInsights';

// ─── PubMed Clinical Evidence Panel ──────────────────────────────────────────
// Shows PubMed-confirmed side effects vs patient-reported — the platform's
// strongest differentiator: "patient voice vs clinical evidence"
function PubMedEvidence({ evidence, patientSideEffects, treatment }) {
  if (!evidence || evidence.studies_count === 0) return null;

  // Build comparison: which patient-reported effects are clinically confirmed?
  const confirmedSet = new Set(
    (evidence.confirmed_side_effects || []).map(e => e.toLowerCase())
  );
  const patientReported = (patientSideEffects || []).map(e => e.name);

  const confirmedByPatients = patientReported.filter(e =>
    confirmedSet.has(e.toLowerCase())
  );
  const onlyInClinical = (evidence.confirmed_side_effects || []).filter(e =>
    !patientReported.some(p => p.toLowerCase() === e.toLowerCase())
  );
  const onlyByPatients = patientReported.filter(e =>
    !confirmedSet.has(e.toLowerCase())
  );

  return (
    <div className="glass-card full-width" style={{ marginBottom: 24 }}>
      <div className="card-header">
        <div className="card-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>📚</div>
        <div>
          <div className="card-title">Clinical Evidence vs Patient Reports (PubMed)</div>
          <div className="card-subtitle">
            {evidence.studies_count} published studies analyzed — comparing clinical findings with patient experiences
          </div>
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
        {/* Clinically confirmed + patient-reported */}
        {confirmedByPatients.length > 0 && (
          <div style={{ background: 'rgba(16, 185, 129, 0.06)', borderRadius: 10, padding: 14, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
              ✅ Confirmed by Both
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {confirmedByPatients.map((e, i) => (
                <span key={i} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 9px', borderRadius: 10, fontSize: 11, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  {e}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Only in clinical studies */}
        {onlyInClinical.length > 0 && (
          <div style={{ background: 'rgba(59, 130, 246, 0.06)', borderRadius: 10, padding: 14, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
              📋 Clinical Only
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {onlyInClinical.slice(0, 8).map((e, i) => (
                <span key={i} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '2px 9px', borderRadius: 10, fontSize: 11, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  {e}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Only by patients */}
        {onlyByPatients.length > 0 && (
          <div style={{ background: 'rgba(245, 158, 11, 0.06)', borderRadius: 10, padding: 14, border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
              👥 Patient Reports Only
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {onlyByPatients.slice(0, 8).map((e, i) => (
                <span key={i} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '2px 9px', borderRadius: 10, fontSize: 11, border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  {e}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Top studies */}
      {evidence.top_studies && evidence.top_studies.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>
            Top Studies
          </div>
          {evidence.top_studies.map((study, i) => (
            <div key={i} style={{
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 8,
              marginBottom: 6,
              fontSize: 12,
            }}>
              <a
                href={study.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}
              >
                {study.title}
              </a>
              <div style={{ color: '#64748b', marginTop: 2, fontSize: 11 }}>
                {study.journal}{study.year ? ` (${study.year})` : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
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
          {data.sources?.breakdown && (
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              Sources: {Object.entries(data.sources.breakdown).map(([k, v]) => `${v} from ${k}`).join(' • ')}
            </div>
          )}
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
          {data.credibility && (
            <span className={`meta-badge ${data.credibility.average_label === 'high' ? 'positive' : data.credibility.average_label === 'medium' ? 'neutral' : 'negative'}`}>
              🛡️ {data.credibility.average_label.charAt(0).toUpperCase() + data.credibility.average_label.slice(1)} Credibility
            </span>
          )}
          {data.pubmed_evidence && data.pubmed_evidence.studies_count > 0 && (
            <span className="meta-badge neutral">
              📚 {data.pubmed_evidence.studies_count} Studies
            </span>
          )}
        </div>
      </div>

      {/* Misinformation Alerts */}
      {data.misinformation && data.misinformation.flagged_count > 0 && (
        <div style={{ marginBottom: 24 }}>
          <MisinfoAlert misinformation={data.misinformation} sourcePosts={data.source_posts} />
        </div>
      )}

      {/* PubMed Clinical Evidence vs Patient Reports */}
      {data.pubmed_evidence && (
        <PubMedEvidence
          evidence={data.pubmed_evidence}
          patientSideEffects={data.side_effects}
          treatment={data.treatment}
        />
      )}

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

      {/* Discussion Topics */}
      {data.topics && data.topics.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <TopicInsights topics={data.topics} treatment={data.treatment} />
        </div>
      )}

      {/* Source Traceability */}
      <div style={{ marginTop: 24 }}>
        <SourceTraceability sourcePosts={data.source_posts} />
      </div>

      {/* Treatment Comparison */}
      <TreatmentComparison currentTreatment={data.treatment} />
    </div>
  );
}
