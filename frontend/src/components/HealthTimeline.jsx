import { useState, useEffect } from 'react';

const STORAGE_KEY = 'curetrace_health_timeline';

const MOOD_OPTIONS = [
  { value: 'great', label: 'Great', color: '#43A047' },
  { value: 'good', label: 'Good', color: '#66BB6A' },
  { value: 'okay', label: 'Okay', color: '#E6960A' },
  { value: 'bad', label: 'Bad', color: '#E57373' },
  { value: 'terrible', label: 'Terrible', color: '#D32F2F' },
];

export default function HealthTimeline({ treatment }) {
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    treatment: treatment || '',
    notes: '',
    side_effects: '',
    cost: '',
    mood: 'okay',
    milestone: '',
  });

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setEntries(JSON.parse(stored));
    } catch {}
  }, []);

  // Save to localStorage
  const saveEntries = (newEntries) => {
    setEntries(newEntries);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
  };

  const handleAdd = () => {
    if (!form.notes.trim() && !form.milestone.trim()) return;
    const entry = {
      ...form,
      id: Date.now(),
      created_at: new Date().toISOString(),
      side_effects: form.side_effects.split(',').map(s => s.trim()).filter(Boolean),
      cost: form.cost ? parseFloat(form.cost) : null,
    };
    const updated = [entry, ...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
    saveEntries(updated);
    setForm({
      date: new Date().toISOString().split('T')[0],
      treatment: treatment || '',
      notes: '',
      side_effects: '',
      cost: '',
      mood: 'okay',
      milestone: '',
    });
    setShowForm(false);
  };

  const handleDelete = (id) => {
    saveEntries(entries.filter(e => e.id !== id));
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health_timeline_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalCost = entries.reduce((sum, e) => sum + (e.cost || 0), 0);
  const filteredEntries = treatment
    ? entries.filter(e => e.treatment.toLowerCase() === treatment.toLowerCase())
    : entries;

  return (
    <div className="glass-card full-width">
      <div className="card-header">
        <div className="card-icon" style={{ background: '#1565C0' }}>HT</div>
        <div style={{ flex: 1 }}>
          <div className="card-title">My Health Timeline</div>
          <div className="card-subtitle">
            Track your treatment journey, side effects, costs, and progress
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {entries.length > 0 && (
            <button onClick={handleExport} style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid #E2E8F0',
              background: '#fff', color: '#7A8B9C', fontSize: 11, cursor: 'pointer',
            }}>
              Export
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)} style={{
            padding: '6px 14px', borderRadius: 8, border: 'none',
            background: showForm ? 'rgba(211,47,47,0.08)' : 'linear-gradient(135deg, #1565C0, #1BA89C)',
            color: showForm ? '#D32F2F' : '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            {showForm ? '× Cancel' : '+ Add Entry'}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {entries.length > 0 && (
        <div style={{
          display: 'flex', gap: 16, padding: '10px 16px', marginBottom: 12,
          background: 'rgba(21,101,192,0.03)', borderRadius: 8, fontSize: 12,
        }}>
          <div><span style={{ color: '#7A8B9C' }}>Total entries:</span> <strong style={{ color: '#1A2B3C' }}>{entries.length}</strong></div>
          {totalCost > 0 && (
            <div><span style={{ color: '#7A8B9C' }}>Total cost:</span> <strong style={{ color: '#E6960A' }}>₹{totalCost.toLocaleString()}</strong></div>
          )}
          <div><span style={{ color: '#7A8B9C' }}>Tracking since:</span> <strong style={{ color: '#1A2B3C' }}>
            {entries.length > 0 ? entries[entries.length - 1].date : 'N/A'}
          </strong></div>
        </div>
      )}

      {/* Add entry form */}
      {showForm && (
        <div style={{
          padding: 16, background: 'rgba(21, 101, 192, 0.03)', borderRadius: 12,
          marginBottom: 16, border: '1px solid rgba(21, 101, 192, 0.1)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: '#7A8B9C', marginBottom: 4, display: 'block' }}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#1A2B3C', fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#7A8B9C', marginBottom: 4, display: 'block' }}>Treatment</label>
              <input type="text" value={form.treatment} onChange={e => setForm({ ...form, treatment: e.target.value })}
                placeholder="e.g., Metformin"
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#1A2B3C', fontSize: 13 }} />
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: '#7A8B9C', marginBottom: 4, display: 'block' }}>How are you feeling?</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {MOOD_OPTIONS.map(m => (
                <button key={m.value} onClick={() => setForm({ ...form, mood: m.value })}
                  style={{
                    padding: '6px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                    border: form.mood === m.value ? `2px solid ${m.color}` : '1px solid #E2E8F0',
                    background: form.mood === m.value ? `${m.color}12` : 'transparent',
                    color: form.mood === m.value ? m.color : '#7A8B9C',
                  }}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: '#7A8B9C', marginBottom: 4, display: 'block' }}>Notes / Experience</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="How did the treatment go? Any improvements? Describe your experience..."
              rows={3}
              style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#1A2B3C', fontSize: 13, resize: 'vertical' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: '#7A8B9C', marginBottom: 4, display: 'block' }}>Side Effects</label>
              <input type="text" value={form.side_effects} onChange={e => setForm({ ...form, side_effects: e.target.value })}
                placeholder="Comma-separated"
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#1A2B3C', fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#7A8B9C', marginBottom: 4, display: 'block' }}>Cost (₹)</label>
              <input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })}
                placeholder="0"
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#1A2B3C', fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#7A8B9C', marginBottom: 4, display: 'block' }}>Milestone</label>
              <input type="text" value={form.milestone} onChange={e => setForm({ ...form, milestone: e.target.value })}
                placeholder="e.g., First checkup"
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#1A2B3C', fontSize: 13 }} />
            </div>
          </div>

          <button onClick={handleAdd} style={{
            width: '100%', padding: '10px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #1565C0, #1BA89C)', color: '#fff',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            Save Entry
          </button>
        </div>
      )}

      {/* Timeline entries */}
      {filteredEntries.length > 0 ? (
        <div style={{ position: 'relative', paddingLeft: 24 }}>
          {/* Vertical timeline line */}
          <div style={{
            position: 'absolute', left: 7, top: 0, bottom: 0, width: 2,
            background: 'linear-gradient(to bottom, #1565C0, rgba(21,101,192,0.1))',
          }} />

          {filteredEntries.map((entry, i) => {
            const mood = MOOD_OPTIONS.find(m => m.value === entry.mood) || MOOD_OPTIONS[2];
            return (
              <div key={entry.id} style={{
                position: 'relative', marginBottom: 16, paddingLeft: 20,
              }}>
                {/* Timeline dot */}
                <div style={{
                  position: 'absolute', left: -20, top: 4, width: 12, height: 12,
                  borderRadius: '50%', background: mood.color,
                  border: '2px solid #F7F9FC',
                }} />

                <div style={{
                  padding: '12px 16px', background: '#fff',
                  borderRadius: 10, border: '1px solid #E2E8F0',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 12, color: '#7A8B9C' }}>{entry.date}</span>
                      {entry.milestone && (
                        <span style={{
                          marginLeft: 8, padding: '2px 10px', borderRadius: 20, fontSize: 10,
                          background: 'rgba(21, 101, 192, 0.06)', color: '#1565C0', fontWeight: 600,
                        }}>
                          {entry.milestone}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: mood.color }}>{mood.label}</span>
                      <button onClick={() => handleDelete(entry.id)} style={{
                        background: 'none', border: 'none', color: '#7A8B9C', cursor: 'pointer', fontSize: 12,
                      }}>×</button>
                    </div>
                  </div>

                  <div style={{ fontWeight: 600, color: '#1A2B3C', fontSize: 13, marginBottom: 4 }}>
                    {entry.treatment}
                  </div>

                  {entry.notes && (
                    <div style={{ fontSize: 13, color: '#4A5B6C', lineHeight: 1.6, marginBottom: 6 }}>
                      {entry.notes}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11 }}>
                    {entry.side_effects && entry.side_effects.length > 0 && (
                      <div style={{ color: '#D32F2F' }}>
                        Side effects: {entry.side_effects.join(', ')}
                      </div>
                    )}
                    {entry.cost && (
                      <div style={{ color: '#E6960A' }}>Cost: ₹{entry.cost.toLocaleString()}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '30px 20px', color: '#7A8B9C' }}>
          <div style={{ fontSize: 14, marginBottom: 4 }}>No entries yet</div>
          <div style={{ fontSize: 12 }}>Click "Add Entry" to start tracking your health journey</div>
        </div>
      )}
    </div>
  );
}
