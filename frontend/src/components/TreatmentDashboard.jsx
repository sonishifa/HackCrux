import SideEffectChart from './SideEffectChart';
import SentimentChart from './SentimentChart';
import RecoveryTimeline from './RecoveryTimeline';
import PatientJourney from './PatientJourney';
import CombinationTherapy from './CombinationTherapy';
import SourceTraceability from './SourceTraceability';
import TreatmentComparison from './TreatmentComparison';
import MisinfoAlert from './MisinfoAlert';
import TopicInsights from './TopicInsights';

function GuideStrip({ treatment, total, sources }) {
  const sourceList = Object.keys(sources?.breakdown || {});
  return (
    <div style={{
      padding: '14px 20px', marginBottom: 28, borderRadius: 12,
      background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.14)',
      fontSize: 13, color: '#94a3b8', lineHeight: 1.7,
    }}>
      <span style={{ fontWeight: 600, color: '#f0f4ff' }}>📖 How to read this report: </span>
      We scraped <strong style={{ color: '#3b82f6' }}>{total} real patient discussions</strong> about{' '}
      <strong style={{ color: '#06d6a0' }}>{treatment}</strong> from{' '}
      {sourceList.map((s, i) => (
        <span key={s}>
          <strong style={{ color: '#f0f4ff' }}>{s}</strong>
          {i < sourceList.length - 2 ? ', ' : i < sourceList.length - 1 ? ' and ' : ''}
        </span>
      ))}{', '}
      then used NLP to find patterns. Everything below comes from what real patients wrote —
      not medical advice. Scroll down to see: side effects, how people felt, recovery timelines,
      combination therapies, and the original source posts.
    </div>
  );
}

function PubMedEvidence({ evidence, patientSideEffects, treatment }) {
  if (!evidence || evidence.studies_count === 0) return null;

  const confirmedSet = new Set((evidence.confirmed_side_effects || []).map(e => e.toLowerCase()));
  const patientReported = (patientSideEffects || []).map(e => e.name);
  const confirmedByBoth = patientReported.filter(e => confirmedSet.has(e.toLowerCase()));
  const clinicalOnly = (evidence.confirmed_side_effects || []).filter(
    e => !patientReported.some(p => p.toLowerCase() === e.toLowerCase())
  );
  const patientOnly = patientReported.filter(e => !confirmedSet.has(e.toLowerCase()));

  return (
    <div className="glass-card full-width" style={{ marginBottom: 24 }}>
      <div className="card-header">
        <div className="card-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>📚</div>
        <div>
          <div className="card-title">Clinical Evidence (PubMed)</div>
          <div className="card-subtitle">
            {evidence.studies_count} published studies analyzed — comparing clinical findings with patient reports
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14, lineHeight: 1.55 }}>
        This compares what patients report in discussions with what researchers have found in published studies.
        Effects confirmed by both sources are the strongest signals.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        {confirmedByBoth.length > 0 && (
          <div style={{ background: 'rgba(16,185,129,0.06)', borderRadius: 10, padding: 14, border: '1px solid rgba(16,185,129,0.2)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', marginBottom: 8 }}>✅ CONFIRMED BY BOTH</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {confirmedByBoth.map((e, i) => (
                <span key={i} style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', padding: '2px 9px', borderRadius: 10, fontSize: 11 }}>{e}</span>
              ))}
            </div>
          </div>
        )}
        {clinicalOnly.length > 0 && (
          <div style={{ background: 'rgba(59,130,246,0.06)', borderRadius: 10, padding: 14, border: '1px solid rgba(59,130,246,0.2)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', marginBottom: 8 }}>📋 IN STUDIES, LESS REPORTED BY PATIENTS</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {clinicalOnly.slice(0, 8).map((e, i) => (
                <span key={i} style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '2px 9px', borderRadius: 10, fontSize: 11 }}>{e}</span>
              ))}
            </div>
          </div>
        )}
        {patientOnly.length > 0 && (
          <div style={{ background: 'rgba(245,158,11,0.06)', borderRadius: 10, padding: 14, border: '1px solid rgba(245,158,11,0.2)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', marginBottom: 8 }}>👥 REPORTED BY PATIENTS, NOT IN STUDIES</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {patientOnly.slice(0, 8).map((e, i) => (
                <span key={i} style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '2px 9px', borderRadius: 10, fontSize: 11 }}>{e}</span>
              ))}
            </div>
          </div>
        )}
      </div>
      {evidence.top_studies?.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>Referenced Studies</div>
          {evidence.top_studies.map((study, i) => (
            <div key={i} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: 6, fontSize: 12 }}>
              <a href={study.url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
                {study.title}
              </a>
              <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                {study.journal}{study.year ? ` (${study.year})` : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ label, sub }) {
  return (
    <div style={{ marginBottom: 12, marginTop: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: '#475569' }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: 12, color: '#334155', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function TreatmentDashboard({ data, onBack }) {
  if (!data) return null;

  const sentimentLabel = data.sentiment.average_score > 0.1 ? 'positive' :
                         data.sentiment.average_score < -0.1 ? 'negative' : 'neutral';

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <button className="back-btn" onClick={onBack}>← Back to Search</button>
          <h2 className="dashboard-title" style={{ marginTop: 12 }}>
            <span className="dashboard-treatment-name">{data.treatment}</span> — Patient Intelligence Report
          </h2>
          {data.sources?.breakdown && (
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              {Object.entries(data.sources.breakdown).map(([k, v]) => `${v} posts from ${k}`).join(' · ')}
            </div>
          )}
        </div>
        <div className="dashboard-meta">
          <span className={`meta-badge ${sentimentLabel}`}>
            {sentimentLabel === 'positive' ? '👍' : sentimentLabel === 'negative' ? '👎' : '😐'}
            {' '}{sentimentLabel.charAt(0).toUpperCase() + sentimentLabel.slice(1)} Sentiment
          </span>
          <span className="meta-badge positive">📊 {data.total_discussions} Discussions</span>
          <span className="meta-badge neutral">{data.effectiveness.effectiveness_label}</span>
          {data.credibility && (
            <span className={`meta-badge ${data.credibility.average_label === 'high' ? 'positive' : data.credibility.average_label === 'medium' ? 'neutral' : 'negative'}`}>
              🛡️ {data.credibility.average_label.charAt(0).toUpperCase() + data.credibility.average_label.slice(1)} Credibility
            </span>
          )}
        </div>
      </div>

      {/* Guide strip */}
      <GuideStrip treatment={data.treatment} total={data.total_discussions} sources={data.sources} />

      {/* 1. Content quality */}
      {data.misinformation?.flagged_count > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionLabel label="⚠ Content Quality Check" sub="Some posts were automatically flagged for potentially misleading language" />
          <MisinfoAlert misinformation={data.misinformation} sourcePosts={data.source_posts} />
        </div>
      )}

      {/* 2. Clinical evidence */}
      {data.pubmed_evidence?.studies_count > 0 && (
        <div style={{ marginBottom: 4 }}>
          <SectionLabel label="📚 Clinical Evidence" sub="What published research says vs what patients report" />
          <PubMedEvidence evidence={data.pubmed_evidence} patientSideEffects={data.side_effects} treatment={data.treatment} />
        </div>
      )}

      {/* 3. Effectiveness */}
      <SectionLabel label="🎯 Effectiveness" sub="How many patients reported this treatment helped them" />
      <div className="glass-card" style={{ marginBottom: 28 }}>
        <div className="card-header">
          <div className="card-icon" style={{ background: 'rgba(34,197,94,0.15)' }}>🎯</div>
          <div>
            <div className="card-title">Treatment Effectiveness</div>
            <div className="card-subtitle">Detected from patient language — words like "helped", "stopped taking", "made it worse"</div>
          </div>
        </div>
        <div className="effectiveness-section">
          <div className="effectiveness-label">{data.effectiveness.effectiveness_label}</div>
          <div className="effectiveness-stats">
            <div className="stat-item">
              <div className="stat-value positive">{data.effectiveness.positive_pct}%</div>
              <div className="stat-label">Reported positive outcomes</div>
            </div>
            <div className="stat-item">
              <div className="stat-value negative">{data.effectiveness.negative_pct}%</div>
              <div className="stat-label">Reported negative outcomes</div>
            </div>
          </div>
          <div className="effectiveness-bar">
            <div className="ebar-positive" style={{ width: `${data.effectiveness.positive_pct}%` }} />
            <div className="ebar-negative" style={{ width: `${data.effectiveness.negative_pct}%` }} />
          </div>
          {data.dosages?.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Dosages mentioned by patients</div>
              <div className="dosage-list">
                {data.dosages.map((d, i) => <span key={i} className="dosage-pill">{d.dosage} · {d.count}×</span>)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Patient journey */}
      <SectionLabel label="🗺 Patient Journey" sub="Typical progression based on what patients describe at different time points" />
      <div style={{ marginBottom: 28 }}>
        <PatientJourney timeline={data.recovery_timeline} treatment={data.treatment} />
      </div>

      {/* 5. Side effects + Sentiment */}
      <SectionLabel label="⚠ Side Effects & How Patients Feel" sub="Most frequently mentioned side effects and overall patient sentiment" />
      <div className="dashboard-grid" style={{ marginBottom: 28 }}>
        <SideEffectChart sideEffects={data.side_effects} />
        <SentimentChart sentiment={data.sentiment} />
      </div>

      {/* 6. Timeline + Combinations */}
      <SectionLabel label="📅 Recovery Timeline & Combination Therapies" sub="Week-by-week timeline and other things patients used alongside this treatment — click any combination card to see the source quotes" />
      <div className="dashboard-grid" style={{ marginBottom: 28 }}>
        <RecoveryTimeline timeline={data.recovery_timeline} />
        <CombinationTherapy combinations={data.combinations} treatment={data.treatment} />
      </div>

      {/* 7. Topics */}
      {data.topics?.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionLabel label="🧠 What Patients Talk About" sub="Key themes discovered from all discussions using topic modeling" />
          <TopicInsights topics={data.topics} treatment={data.treatment} />
        </div>
      )}

      {/* 8. Source evidence */}
      <SectionLabel label="🔍 Source Evidence" sub="Original posts — every insight above traces back to these real discussions" />
      <div style={{ marginBottom: 28 }}>
        <SourceTraceability sourcePosts={data.source_posts} />
      </div>

      {/* 9. Compare */}
      <TreatmentComparison currentTreatment={data.treatment} />
    </div>
  );
}
