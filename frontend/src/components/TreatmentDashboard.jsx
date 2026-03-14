import SideEffectChart from './SideEffectChart';
import SentimentChart from './SentimentChart';
import PatientJourney from './PatientJourney';
import CombinationTherapy from './CombinationTherapy';
import SourceTraceability from './SourceTraceability';
import TreatmentComparison from './TreatmentComparison';
import MisinfoAlert from './MisinfoAlert';
import TopicInsights from './TopicInsights';
import NearbyHealthCenters from './NearbyHealthCenters';
import HealthTimeline from './HealthTimeline';

function GuideStrip({ treatment, total, sources, data }) {
  const sourceList = Object.keys(sources?.breakdown || {});
  const aiSummary = data.ai_summary;
  return (
    <div style={{
      padding: '14px 20px', marginBottom: 28, borderRadius: 12,
      background: 'rgba(21,101,192,0.04)', border: '1px solid rgba(21,101,192,0.1)',
      fontSize: 13, color: '#4A5B6C', lineHeight: 1.7,
    }}>
      <span style={{ fontWeight: 600, color: '#1A2B3C' }}>How to read this report: </span>
      We analyzed <strong style={{ color: '#1565C0' }}>{total} real patient discussions</strong> about{' '}
      <strong style={{ color: '#1BA89C' }}>{treatment}</strong> from{' '}
      {sourceList.map((s, i) => (
        <span key={s}>
          <strong style={{ color: '#1A2B3C' }}>{s}</strong>
          {i < sourceList.length - 2 ? ', ' : i < sourceList.length - 1 ? ' and ' : ''}
        </span>
      ))}{', '}
      then used AI to find patterns.
      {aiSummary && (
        <div style={{ marginTop: 10, padding: 12, background: 'rgba(21,101,192,0.03)', borderRadius: 8, border: '1px solid rgba(21,101,192,0.08)' }}>
          <strong style={{ color: '#1A2B3C' }}>AI Summary:</strong>{' '}
          <span style={{ color: '#4A5B6C' }}>{aiSummary}</span>
        </div>
      )}
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
        <div className="card-icon" style={{ background: '#1BA89C' }}>P</div>
        <div>
          <div className="card-title">Clinical Evidence (PubMed)</div>
          <div className="card-subtitle">
            {evidence.studies_count} published studies analyzed — comparing clinical findings with patient reports
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#7A8B9C', marginBottom: 14, lineHeight: 1.55 }}>
        This compares what patients report in discussions with what researchers have found in published studies.
        Effects confirmed by both sources are the strongest signals.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        {confirmedByBoth.length > 0 && (
          <div style={{ background: 'rgba(67,160,71,0.05)', borderRadius: 10, padding: 14, border: '1px solid rgba(67,160,71,0.15)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#43A047', marginBottom: 8 }}>CONFIRMED BY BOTH</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {confirmedByBoth.map((e, i) => (
                <span key={i} style={{ background: 'rgba(67,160,71,0.08)', color: '#43A047', padding: '2px 9px', borderRadius: 10, fontSize: 11 }}>{e}</span>
              ))}
            </div>
          </div>
        )}
        {clinicalOnly.length > 0 && (
          <div style={{ background: 'rgba(21,101,192,0.04)', borderRadius: 10, padding: 14, border: '1px solid rgba(21,101,192,0.12)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#1565C0', marginBottom: 8 }}>IN STUDIES, LESS REPORTED BY PATIENTS</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {clinicalOnly.slice(0, 8).map((e, i) => (
                <span key={i} style={{ background: 'rgba(21,101,192,0.06)', color: '#1565C0', padding: '2px 9px', borderRadius: 10, fontSize: 11 }}>{e}</span>
              ))}
            </div>
          </div>
        )}
        {patientOnly.length > 0 && (
          <div style={{ background: 'rgba(230,150,10,0.04)', borderRadius: 10, padding: 14, border: '1px solid rgba(230,150,10,0.12)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#E6960A', marginBottom: 8 }}>REPORTED BY PATIENTS, NOT IN STUDIES</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {patientOnly.slice(0, 8).map((e, i) => (
                <span key={i} style={{ background: 'rgba(230,150,10,0.06)', color: '#E6960A', padding: '2px 9px', borderRadius: 10, fontSize: 11 }}>{e}</span>
              ))}
            </div>
          </div>
        )}
      </div>
      {evidence.top_studies?.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: '#4A5B6C', marginBottom: 8, fontWeight: 600 }}>Referenced Studies</div>
          {evidence.top_studies.map((study, i) => (
            <div key={i} style={{ padding: '8px 12px', background: 'rgba(21,101,192,0.02)', borderRadius: 8, marginBottom: 6, fontSize: 12 }}>
              <a href={study.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1565C0', textDecoration: 'none', fontWeight: 500 }}>
                {study.title}
              </a>
              <div style={{ color: '#7A8B9C', fontSize: 11, marginTop: 2 }}>
                {study.journal}{study.year ? ` (${study.year})` : ''}
              </div>
              {study.summary && (
                <div style={{ color: '#4A5B6C', fontSize: 11, marginTop: 6, fontStyle: 'italic', lineHeight: 1.5, background: 'rgba(21,101,192,0.02)', padding: '6px 10px', borderRadius: 6, borderLeft: '2px solid rgba(21, 101, 192, 0.3)' }}>
                  "{study.summary}"
                </div>
              )}
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
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: '#7A8B9C' }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: 12, color: '#4A5B6C', marginTop: 2 }}>{sub}</div>}
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
            <div style={{ fontSize: 12, color: '#7A8B9C', marginTop: 4 }}>
              {Object.entries(data.sources.breakdown).map(([k, v]) => `${v} posts from ${k}`).join(' · ')}
            </div>
          )}
        </div>
        <div className="dashboard-meta">
          <span className={`meta-badge ${sentimentLabel}`} title={`Based on language analysis of ${data.total_discussions} posts. Positive = more patients used words like 'helped', 'great', 'improved'.`}>
            {sentimentLabel.charAt(0).toUpperCase() + sentimentLabel.slice(1)} Sentiment
            <span style={{ display: 'block', fontSize: 10, opacity: 0.7, fontWeight: 400 }}>How patients feel overall</span>
          </span>
          <span className="meta-badge positive" title={`Total number of patient discussions analyzed from all sources`}>
            {data.total_discussions} Discussions
            <span style={{ display: 'block', fontSize: 10, opacity: 0.7, fontWeight: 400 }}>Posts analyzed from all sources</span>
          </span>
          <span className="meta-badge neutral" title={`${data.effectiveness.positive_pct}% positive, ${data.effectiveness.negative_pct}% negative, ${data.effectiveness.neutral_pct || 0}% neutral out of ${data.total_discussions} posts`}>
            {data.effectiveness.effectiveness_label}
            <span style={{ display: 'block', fontSize: 10, opacity: 0.7, fontWeight: 400 }}>{data.effectiveness.is_drug ? 'Based on outcome language' : 'Patient experience overview'}</span>
          </span>
        </div>
      </div>

      {/* Guide strip */}
      <GuideStrip treatment={data.treatment} total={data.total_discussions} sources={data.sources} data={data} />

      {/* Disease Context Summary */}
      {data.disease_context && (
        <div className="glass-card full-width" style={{ marginBottom: 28, borderLeft: '3px solid #1565C0' }}>
          <div className="card-header" style={{ marginBottom: 16 }}>
            <div className="card-icon" style={{ background: '#1565C0' }}>C</div>
            <div>
              <div className="card-title">Condition Context</div>
              <div className="card-subtitle">AI-generated summary of the medical condition being treated</div>
            </div>
          </div>
          <div style={{ padding: '0 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#4A5B6C' }}>Target Condition:</span>
              <span style={{ background: 'rgba(21, 101, 192, 0.06)', color: '#1565C0', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 500 }}>
                {data.disease_context.condition}
              </span>
            </div>
            <div style={{ color: '#4A5B6C', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
              {data.disease_context.context_summary}
            </div>
            {data.disease_context.related_treatments_mentioned?.length > 0 && (
              <div>
                <span style={{ fontSize: 12, color: '#7A8B9C', marginRight: 8 }}>Other treatments mentioned for this condition:</span>
                {data.disease_context.related_treatments_mentioned.map((rt, i) => (
                  <span key={i} style={{ display: 'inline-block', color: '#4A5B6C', fontSize: 12, border: '1px solid #E2E8F0', padding: '2px 8px', borderRadius: 12, marginRight: 6, marginBottom: 6 }}>
                    {rt}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1. Content quality */}
      {data.misinformation?.flagged_count > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionLabel label="Content Quality Check" sub="Some posts were automatically flagged for potentially misleading language" />
          <MisinfoAlert misinformation={data.misinformation} sourcePosts={data.source_posts} />
        </div>
      )}

      {/* 2. Clinical evidence */}
      {data.pubmed_evidence?.studies_count > 0 && (
        <div style={{ marginBottom: 4 }}>
          <SectionLabel label="Clinical Evidence" sub="What published research says vs what patients report" />
          <PubMedEvidence evidence={data.pubmed_evidence} patientSideEffects={data.side_effects} treatment={data.treatment} />
        </div>
      )}

      {/* 3. Effectiveness */}
      <SectionLabel
        label={data.effectiveness.is_drug ? 'Treatment Effectiveness' : 'Patient Experience Overview'}
        sub={data.effectiveness.is_drug
          ? 'How many patients reported this treatment helped them'
          : 'What patients are saying about their experience with this condition'
        }
      />
      <div className="glass-card" style={{ marginBottom: 28 }}>
        <div className="card-header">
          <div className="card-icon" style={{ background: '#43A047' }}>E</div>
          <div>
            <div className="card-title">{data.effectiveness.is_drug ? 'Treatment Effectiveness' : 'Patient Experience Overview'}</div>
            <div className="card-subtitle">
              {data.effectiveness.is_drug
                ? 'Detected from patient language — words like "helped", "stopped taking", "made it worse"'
                : 'Detected from how patients describe their experiences managing this condition'
              }
            </div>
          </div>
        </div>
        <div className="effectiveness-section">
          <div className="effectiveness-label">{data.effectiveness.effectiveness_label}</div>
          <div className="effectiveness-stats">
            <div className="stat-item">
              <div className="stat-value positive">{data.effectiveness.positive_pct}%</div>
              <div className="stat-label">
                {data.effectiveness.is_drug ? 'Reported positive outcomes' : 'Positive experiences'}
                <div style={{ fontSize: 10, color: '#7A8B9C', marginTop: 2 }}>
                  {data.effectiveness.positive_reports || 0} out of {data.effectiveness.total_posts || data.total_discussions} posts
                </div>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-value negative">{data.effectiveness.negative_pct}%</div>
              <div className="stat-label">
                {data.effectiveness.is_drug ? 'Reported negative outcomes' : 'Negative experiences'}
                <div style={{ fontSize: 10, color: '#7A8B9C', marginTop: 2 }}>
                  {data.effectiveness.negative_reports || 0} out of {data.effectiveness.total_posts || data.total_discussions} posts
                </div>
              </div>
            </div>
            {data.effectiveness.neutral_pct > 0 && (
              <div className="stat-item">
                <div className="stat-value" style={{ color: '#7A8B9C' }}>{data.effectiveness.neutral_pct}%</div>
                <div className="stat-label">
                  Neutral / Informational
                  <div style={{ fontSize: 10, color: '#7A8B9C', marginTop: 2 }}>
                    {data.effectiveness.neutral_reports || 0} posts — shared info without expressing clear outcome
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="effectiveness-bar">
            <div className="ebar-positive" style={{ width: `${data.effectiveness.positive_pct}%` }} />
            <div className="ebar-negative" style={{ width: `${data.effectiveness.negative_pct}%` }} />
            {data.effectiveness.neutral_pct > 0 && (
              <div style={{ width: `${data.effectiveness.neutral_pct}%`, height: '100%', background: 'rgba(122,139,156,0.25)', borderRadius: 4 }} />
            )}
          </div>
          {/* Interpretation */}
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(21,101,192,0.03)', borderRadius: 8, fontSize: 12, color: '#4A5B6C', lineHeight: 1.6 }}>
            <strong style={{ color: '#1A2B3C' }}>What this means:</strong>{' '}
            {data.effectiveness.positive_pct >= 60
              ? `Most patients (${data.effectiveness.positive_pct}%) reported positive outcomes with ${data.treatment}. This is a strong signal of effectiveness based on real patient experiences.`
              : data.effectiveness.positive_pct >= 30
              ? `${data.effectiveness.positive_pct}% of patients reported positive outcomes — results are mixed. Individual experiences may vary. The remaining ${data.effectiveness.neutral_pct || 0}% of posts were informational without expressing a clear positive or negative outcome.`
              : `Only ${data.effectiveness.positive_pct}% reported positive outcomes. Many patients (${data.effectiveness.neutral_pct || 0}%) shared general information without strong opinions. This doesn't necessarily mean ineffective — it may reflect the nature of the condition.`
            }
          </div>
          {data.dosages?.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, color: '#7A8B9C', marginBottom: 6 }}>Dosages mentioned by patients</div>
              <div className="dosage-list">
                {data.dosages.map((d, i) => <span key={i} className="dosage-pill">{d.dosage} · {d.count}×</span>)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Patient journey */}
      <SectionLabel label="Patient Journey" sub="Typical progression based on what patients describe at different time points" />
      <div style={{ marginBottom: 28 }}>
        <PatientJourney timeline={data.recovery_timeline} treatment={data.treatment} />
      </div>

      {/* 5. Side effects + Sentiment */}
      <SectionLabel label="Side Effects & Patient Sentiment" sub="Most frequently mentioned side effects and overall patient sentiment" />
      <div className="dashboard-grid" style={{ marginBottom: 28 }}>
        <SideEffectChart sideEffects={data.side_effects} />
        <SentimentChart sentiment={data.sentiment} />
      </div>

      {/* 6. Combination Therapies */}
      <SectionLabel label="Combination Therapies" sub="Other things patients used alongside this treatment — click any card to see the source quotes" />
      <div style={{ marginBottom: 28 }}>
        <CombinationTherapy combinations={data.combinations} treatment={data.treatment} sourcePosts={data.source_posts} />
      </div>

      {/* 7. Topics */}
      {data.topics?.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionLabel label="What Patients Talk About" sub="Key themes discovered from all discussions using topic modeling" />
          <TopicInsights topics={data.topics} treatment={data.treatment} />
        </div>
      )}

      {/* 8. Source evidence */}
      <SectionLabel label="Source Evidence" sub="Original posts — every insight above traces back to these real discussions" />
      <div style={{ marginBottom: 28 }}>
        <SourceTraceability sourcePosts={data.source_posts} />
      </div>

      {/* 9. Compare treatment approaches */}
      <TreatmentComparison
        currentTreatment={data.treatment}
        category={data.category}
        approachComparison={data.approach_comparison}
        diseaseContext={data.disease_context}
        effectiveness={data.effectiveness}
        sentiment={data.sentiment}
        sideEffects={data.side_effects}
      />

      {/* 10. Nearby Health Centers */}
      <SectionLabel label="Find Nearby Health Centers" sub="Discover hospitals, clinics, and doctors near your location" />
      <div style={{ marginBottom: 28 }}>
        <NearbyHealthCenters treatment={data.treatment} />
      </div>

      {/* 11. My Health Timeline */}
      <SectionLabel label="My Health Timeline" sub="Track your personal treatment journey — stored locally on your device" />
      <div style={{ marginBottom: 28 }}>
        <HealthTimeline treatment={data.treatment} />
      </div>
    </div>
  );
}
