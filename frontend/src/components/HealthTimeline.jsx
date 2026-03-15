import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'curatrace_health_timeline';

const EVENT_TYPES = [
  { value: 'diagnosis', label: 'Diagnosis', color: '#8b5cf6' },
  { value: 'doctor_visit', label: 'Doctor Visit', color: '#3b82f6' },
  { value: 'treatment_started', label: 'Treatment Started', color: '#22c55e' },
  { value: 'symptom', label: 'Symptom / Side Effect', color: '#f59e0b' },
  { value: 'test_result', label: 'Test / Lab Result', color: '#06b6d4' },
  { value: 'improvement', label: 'Improvement', color: '#10b981' },
  { value: 'cost', label: 'Cost / Payment', color: '#e6960a' },
  { value: 'note', label: 'Personal Note', color: '#64748b' },
];

const SEVERITY_OPTIONS = [
  { value: 'mild', label: 'Mild', color: '#f59e0b' },
  { value: 'moderate', label: 'Moderate', color: '#f97316' },
  { value: 'severe', label: 'Severe', color: '#ef4444' },
];

const emptyForm = () => ({
  date: new Date().toISOString().split('T')[0],
  event_type: 'note',
  treatment: '',
  doctor: '',
  hospital: '',
  cost: '',
  severity: '',
  notes: '',
});

export default function HealthTimeline({ treatment }) {
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterCondition, setFilterCondition] = useState('all');
  const [showDoctorSummary, setShowDoctorSummary] = useState(false);
  const importRef = useRef(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setEntries(JSON.parse(stored));
    } catch {}
  }, []);

  const saveEntries = (newEntries) => {
    setEntries(newEntries);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
  };

  const handleSave = () => {
    if (!form.notes.trim() && !form.treatment.trim()) return;
    if (editingId) {
      saveEntries(entries.map(e => e.id === editingId ? { ...e, ...form, cost: form.cost ? parseFloat(form.cost) : null } : e));
      setEditingId(null);
    } else {
      const entry = { ...form, id: `entry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, created_at: new Date().toISOString(), cost: form.cost ? parseFloat(form.cost) : null };
      saveEntries([...entries, entry].sort((a, b) => new Date(a.date) - new Date(b.date)));
    }
    setForm(emptyForm());
    setShowForm(false);
  };

  const handleEdit = (entry) => {
    setForm({ ...entry, cost: entry.cost || '' });
    setEditingId(entry.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    saveEntries(entries.filter(e => e.id !== id));
    setDeleteConfirm(null);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `curatrace_timeline_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (!Array.isArray(imported)) return alert('Invalid file format');
        const existingIds = new Set(entries.map(e => e.id));
        const newEntries = imported.filter(e => !existingIds.has(e.id));
        const merged = [...entries, ...newEntries].sort((a, b) => new Date(a.date) - new Date(b.date));
        saveEntries(merged);
        alert(`Imported ${newEntries.length} new entries (${imported.length - newEntries.length} duplicates skipped)`);
      } catch { alert('Failed to parse file'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const allConditions = [...new Set(entries.map(e => e.treatment).filter(Boolean))];
  const filtered = entries
    .filter(e => filterType === 'all' || e.event_type === filterType)
    .filter(e => filterCondition === 'all' || e.treatment === filterCondition)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const totalCost = entries.reduce((s, e) => s + (e.cost || 0), 0);
  const doctorVisits = entries.filter(e => e.event_type === 'doctor_visit').length;
  const distinctConditions = new Set(entries.map(e => e.treatment).filter(Boolean)).size;
  const journeyDays = entries.length >= 2
    ? Math.ceil((new Date(entries[entries.length - 1].date) - new Date(entries[0].date)) / 86400000)
    : 0;
  const costByCondition = {};
  entries.forEach(e => { if (e.cost && e.treatment) costByCondition[e.treatment] = (costByCondition[e.treatment] || 0) + e.cost; });
  const maxConditionCost = Math.max(...Object.values(costByCondition), 1);

  const getEventInfo = (type) => EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[7];

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
    color: '#f0f4ff', fontSize: 13, outline: 'none',
  };
  const labelStyle = { fontSize: 11, color: '#94a3b8', marginBottom: 4, display: 'block' };

  // ===================== DOCTOR SUMMARY MODAL =====================
  if (showDoctorSummary) {
    const sortedEntries = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
    const conditions = [...new Set(entries.map(e => e.treatment).filter(Boolean))];
    const firstDate = sortedEntries.length ? sortedEntries[0].date : 'N/A';
    const lastDate = sortedEntries.length ? sortedEntries[sortedEntries.length - 1].date : 'N/A';

    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}>
        <div id="doctor-summary-content" style={{
          background: '#fff', color: '#1a1a1a', borderRadius: 12,
          maxWidth: 800, width: '100%', maxHeight: '90vh', overflow: 'auto', padding: 32,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '2px solid #1565C0', paddingBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, color: '#1565C0' }}>CuraTrace — Patient Health Summary</h2>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#666' }}>Generated on {new Date().toLocaleDateString()}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => window.print()} style={{
                padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: '#1565C0', color: '#fff', fontSize: 13, fontWeight: 600,
              }}>Print / Save PDF</button>
              <button onClick={() => setShowDoctorSummary(false)} style={{
                padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd',
                background: '#fff', color: '#666', fontSize: 13, cursor: 'pointer',
              }}>Close</button>
            </div>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 12, marginBottom: 24, padding: 16, background: '#f8f9fa', borderRadius: 8,
          }}>
            <div><div style={{ fontSize: 11, color: '#666' }}>Journey Period</div><div style={{ fontWeight: 600 }}>{firstDate} — {lastDate}</div></div>
            <div><div style={{ fontSize: 11, color: '#666' }}>Total Events</div><div style={{ fontWeight: 600 }}>{entries.length}</div></div>
            <div><div style={{ fontSize: 11, color: '#666' }}>Conditions</div><div style={{ fontWeight: 600 }}>{conditions.join(', ') || 'N/A'}</div></div>
            <div><div style={{ fontSize: 11, color: '#666' }}>Total Spend</div><div style={{ fontWeight: 600 }}>₹{totalCost.toLocaleString()}</div></div>
            <div><div style={{ fontSize: 11, color: '#666' }}>Doctor Visits</div><div style={{ fontWeight: 600 }}>{doctorVisits}</div></div>
          </div>

          <h3 style={{ fontSize: 14, marginBottom: 12, color: '#333' }}>Chronological Events</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px', borderBottom: '1px solid #ddd' }}>Date</th>
                <th style={{ padding: '8px 10px', borderBottom: '1px solid #ddd' }}>Event</th>
                <th style={{ padding: '8px 10px', borderBottom: '1px solid #ddd' }}>Condition</th>
                <th style={{ padding: '8px 10px', borderBottom: '1px solid #ddd' }}>Details</th>
                <th style={{ padding: '8px 10px', borderBottom: '1px solid #ddd' }}>Cost</th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry, i) => {
                const ev = getEventInfo(entry.event_type);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>{entry.date}</td>
                    <td style={{ padding: '6px 10px' }}>{ev.label}</td>
                    <td style={{ padding: '6px 10px' }}>{entry.treatment || '—'}</td>
                    <td style={{ padding: '6px 10px' }}>
                      {entry.notes}
                      {entry.doctor && <span style={{ color: '#666' }}> (Dr. {entry.doctor})</span>}
                      {entry.hospital && <span style={{ color: '#666' }}> @ {entry.hospital}</span>}
                      {entry.severity && <span style={{ color: '#e65100', fontWeight: 600 }}> [{entry.severity}]</span>}
                    </td>
                    <td style={{ padding: '6px 10px' }}>{entry.cost ? `₹${entry.cost.toLocaleString()}` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{
            marginTop: 24, padding: 12, borderTop: '1px solid #ddd',
            fontSize: 10, color: '#888', lineHeight: 1.6,
          }}>
            <strong>Medical Disclaimer:</strong> This document is a patient-maintained personal health record exported from CuraTrace.
            It is NOT a certified medical record. The information may be incomplete or inaccurate.
            Healthcare providers should verify all information through clinical examination and official records.
            This document is intended to assist in patient-provider communication only.
          </div>
        </div>
      </div>
    );
  }

  // ===================== MAIN RENDER =====================
  return (
    <div className="glass-card full-width">
      <div className="card-header">
        <div className="card-icon" style={{ background: 'rgba(139,92,246,0.15)', fontSize: 14, fontWeight: 700, color: '#8b5cf6' }}>HJ</div>
        <div style={{ flex: 1 }}>
          <div className="card-title">My Health Journey Timeline</div>
          <div className="card-subtitle">
            Track your treatment journey — stored locally, never leaves your device
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {entries.length > 0 && (
            <>
              <button onClick={() => setShowDoctorSummary(true)} style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}>Doctor Summary</button>
              <button onClick={handleExport} style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: 11, cursor: 'pointer',
              }}>Export</button>
            </>
          )}
          <button onClick={() => importRef.current?.click()} style={{
            padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: 11, cursor: 'pointer',
          }}>Import</button>
          <input ref={importRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm()); }} style={{
            padding: '6px 14px', borderRadius: 8, border: 'none',
            background: showForm ? 'rgba(239,68,68,0.15)' : 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
            color: showForm ? '#ef4444' : '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            {showForm ? 'Cancel' : '+ Add Entry'}
          </button>
        </div>
      </div>

      {/* Privacy notice */}
      <div style={{
        padding: '8px 14px', marginBottom: 12, borderRadius: 8,
        background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.1)',
        fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontWeight: 700, color: '#22c55e' }}>Private & Secure</span>
        <span>— All data is stored in your browser only. Your health data never leaves this device. No account required.</span>
      </div>

      {/* Stats panel */}
      {entries.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
            gap: 8, marginBottom: 10,
          }}>
            {[
              { label: 'Total Entries', value: entries.length, color: '#8b5cf6' },
              { label: 'Conditions', value: distinctConditions, color: '#3b82f6' },
              { label: 'Medical Spend', value: `₹${totalCost.toLocaleString()}`, color: '#e6960a' },
              { label: 'Doctor Visits', value: doctorVisits, color: '#22c55e' },
              { label: 'Journey Days', value: journeyDays, color: '#06b6d4' },
            ].map(s => (
              <div key={s.label} style={{
                padding: '10px 12px', borderRadius: 8, textAlign: 'center',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {Object.keys(costByCondition).length > 0 && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>Cost Breakdown by Condition</div>
              {Object.entries(costByCondition).sort((a, b) => b[1] - a[1]).map(([cond, amt]) => (
                <div key={cond} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 80, fontSize: 11, color: '#cbd5e1', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{cond}</div>
                  <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${(amt / maxConditionCost) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #e6960a, #f59e0b)', borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#e6960a', fontWeight: 600, minWidth: 60, textAlign: 'right' }}>₹{amt.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      {entries.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={labelStyle}>Filter by Event Type</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="all">All Types</option>
              {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={labelStyle}>Filter by Condition</label>
            <select value={filterCondition} onChange={e => setFilterCondition(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="all">All Conditions</option>
              {allConditions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div style={{
          padding: 16, borderRadius: 12, marginBottom: 16,
          background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.12)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 12 }}>
            {editingId ? 'Edit Entry' : 'New Timeline Entry'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={labelStyle}>Date *</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Event Type *</label>
              <select value={form.event_type} onChange={e => setForm({ ...form, event_type: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={labelStyle}>Treatment / Disease Name *</label>
              <input type="text" value={form.treatment} onChange={e => setForm({ ...form, treatment: e.target.value })} placeholder="e.g., Diabetes, Migraine" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Doctor Name (optional)</label>
              <input type="text" value={form.doctor} onChange={e => setForm({ ...form, doctor: e.target.value })} placeholder="Dr. Smith" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={labelStyle}>Hospital / Clinic (optional)</label>
              <input type="text" value={form.hospital} onChange={e => setForm({ ...form, hospital: e.target.value })} placeholder="e.g., Apollo Hospital" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Cost ₹ (optional)</label>
              <input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} placeholder="0" style={inputStyle} />
            </div>
            {form.event_type === 'symptom' && (
              <div>
                <label style={labelStyle}>Severity</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  {SEVERITY_OPTIONS.map(s => (
                    <button key={s.value} onClick={() => setForm({ ...form, severity: s.value })} style={{
                      flex: 1, padding: '6px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                      border: form.severity === s.value ? `2px solid ${s.color}` : '1px solid rgba(255,255,255,0.1)',
                      background: form.severity === s.value ? `${s.color}20` : 'transparent',
                      color: form.severity === s.value ? s.color : '#94a3b8',
                    }}>{s.label}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Detailed Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Describe what happened, how you felt, test results, doctor's advice..."
              rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <button onClick={handleSave} style={{
            width: '100%', padding: 10, borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', color: '#fff',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            {editingId ? 'Save Changes' : 'Add to Timeline'}
          </button>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#1e293b', borderRadius: 12, padding: 24,
            border: '1px solid rgba(255,255,255,0.1)', maxWidth: 360, textAlign: 'center',
          }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#f0f4ff', marginBottom: 8 }}>Delete this entry?</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>This action cannot be undone.</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{
                padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent', color: '#94a3b8', fontSize: 13, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={{
                padding: '8px 20px', borderRadius: 8, border: 'none',
                background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      {filtered.length > 0 ? (
        <div style={{ position: 'relative', paddingLeft: 28 }}>
          <div style={{
            position: 'absolute', left: 11, top: 0, bottom: 0, width: 2,
            background: 'linear-gradient(to bottom, #8b5cf6, rgba(139,92,246,0.1))',
          }} />

          {filtered.map((entry, i) => {
            const ev = getEventInfo(entry.event_type);
            const severityInfo = entry.severity ? SEVERITY_OPTIONS.find(s => s.value === entry.severity) : null;

            return (
              <div key={entry.id} style={{ position: 'relative', marginBottom: 12, paddingLeft: 20 }}>
                <div style={{
                  position: 'absolute', left: -24, top: 12, width: 14, height: 14,
                  borderRadius: '50%', background: ev.color,
                  border: '2px solid rgba(15,23,42,0.8)',
                  boxShadow: `0 0 6px ${ev.color}40`,
                }} />

                <div style={{
                  padding: '12px 16px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: '#64748b' }}>{entry.date}</span>
                        <span style={{
                          padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600,
                          background: `${ev.color}15`, color: ev.color,
                        }}>{ev.label}</span>
                        {severityInfo && (
                          <span style={{
                            padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600,
                            background: `${severityInfo.color}15`, color: severityInfo.color,
                          }}>{severityInfo.label}</span>
                        )}
                      </div>
                      <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>{entry.treatment}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleEdit(entry)} style={{
                        background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      }}>Edit</button>
                      <button onClick={() => setDeleteConfirm(entry.id)} style={{
                        background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      }}>Delete</button>
                    </div>
                  </div>

                  {entry.notes && (
                    <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginTop: 6 }}>{entry.notes}</div>
                  )}

                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6, fontSize: 11, color: '#64748b' }}>
                    {entry.doctor && <span>Dr. {entry.doctor}</span>}
                    {entry.hospital && <span>{entry.hospital}</span>}
                    {entry.cost && <span style={{ color: '#e6960a' }}>₹{entry.cost.toLocaleString()}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : entries.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '40px 20px',
          background: 'rgba(139,92,246,0.03)', borderRadius: 12,
          border: '1px dashed rgba(139,92,246,0.15)',
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>Start Your Health Journey</div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
            Track every step of your health journey — from diagnosis to recovery. Your data stays 100% private on this device.
          </div>

          <div style={{
            display: 'inline-flex', flexDirection: 'column', gap: 6, textAlign: 'left',
            padding: '16px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)', marginBottom: 20,
          }}>
            <div style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 600, marginBottom: 4 }}>Example Timeline:</div>
            {[
              { date: 'Jan 5', text: 'Diagnosed with PCOS' },
              { date: 'Jan 7', text: 'Started Metformin 500mg' },
              { date: 'Jan 12', text: 'Nausea side effect (Mild)' },
              { date: 'Feb 1', text: 'Blood sugar levels improved' },
            ].map((ex, i) => (
              <div key={i} style={{ fontSize: 12, color: '#94a3b8', display: 'flex', gap: 8 }}>
                <span style={{ color: '#64748b', minWidth: 44 }}>{ex.date}</span>
                <span style={{ color: '#475569' }}>—</span>
                <span>{ex.text}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={() => setShowForm(true)} style={{
              padding: '10px 20px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>+ Add First Entry</button>
            <button onClick={() => importRef.current?.click()} style={{
              padding: '10px 20px', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
              color: '#94a3b8', fontSize: 13, cursor: 'pointer',
            }}>Import Data</button>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 20, color: '#64748b', fontSize: 13 }}>
          No entries match the current filters.
        </div>
      )}
    </div>
  );
}
