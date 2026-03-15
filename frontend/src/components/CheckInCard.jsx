import { useState, useEffect } from 'react';

const SEARCH_LOG_KEY = 'curatrace_search_log';
const CHECKIN_KEY = 'curatrace_checkins';
const CHECKIN_DISMISS_KEY = 'curatrace_checkin_dismissed';
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

const RESPONSE_OPTIONS = [
  { value: 'better', label: 'Feeling Better', color: '#22c55e' },
  { value: 'same', label: 'About the Same', color: '#f59e0b' },
  { value: 'worse', label: 'Feeling Worse', color: '#ef4444' },
  { value: 'stopped', label: 'Stopped Treatment', color: '#64748b' },
];

export default function CheckInCard() {
  const [checkIn, setCheckIn] = useState(null);
  const [responded, setResponded] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState(null);

  useEffect(() => {
    try {
      const dismissedAt = localStorage.getItem(CHECKIN_DISMISS_KEY);
      if (dismissedAt && (Date.now() - parseInt(dismissedAt)) < THREE_DAYS) return;

      const stored = localStorage.getItem(SEARCH_LOG_KEY);
      if (!stored) return;
      const log = JSON.parse(stored);
      if (log.length === 0) return;

      const lastSearch = log[log.length - 1];
      const timeSince = Date.now() - lastSearch.timestamp;

      if (timeSince >= SEVEN_DAYS) {
        const freq = {};
        log.forEach(e => { freq[e.treatment] = (freq[e.treatment] || 0) + 1; });
        const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
        if (top) {
          const displayName = log.find(e => e.treatment === top[0])?.display_name || top[0];
          setCheckIn({ treatment: top[0], display_name: displayName, searches: top[1] });
        }
      }
    } catch {}
  }, []);

  const handleResponse = (response) => {
    setSelectedResponse(response);
    setResponded(true);

    try {
      const stored = localStorage.getItem(CHECKIN_KEY);
      const checkins = stored ? JSON.parse(stored) : [];
      checkins.push({
        id: `checkin_${Date.now()}`,
        treatment: checkIn.treatment,
        response: response,
        timestamp: Date.now(),
        date: new Date().toISOString(),
      });
      localStorage.setItem(CHECKIN_KEY, JSON.stringify(checkins));
    } catch {}

    setTimeout(() => {
      setCheckIn(null);
      localStorage.setItem(CHECKIN_DISMISS_KEY, Date.now().toString());
    }, 3000);
  };

  const handleDismiss = () => {
    setCheckIn(null);
    localStorage.setItem(CHECKIN_DISMISS_KEY, Date.now().toString());
  };

  if (!checkIn) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 90, right: 24, zIndex: 999,
      width: 320, borderRadius: 12,
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      border: '1px solid rgba(139,92,246,0.2)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      overflow: 'hidden',
      animation: 'slideUp 0.3s ease-out',
    }}>
      <div style={{
        padding: '14px 16px 10px',
        background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(59,130,246,0.1) 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
            Quick Check-In
          </div>
          <button onClick={handleDismiss} style={{
            background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14,
          }}>×</button>
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
          You searched for <strong style={{ color: '#8b5cf6' }}>{checkIn.display_name}</strong> recently.
          How are you doing with it?
        </div>
      </div>

      <div style={{ padding: '12px 16px' }}>
        {!responded ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {RESPONSE_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => handleResponse(opt.value)} style={{
                padding: '10px 8px', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                color: '#cbd5e1', fontSize: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.15s',
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color, display: 'inline-block' }} />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 13, color: '#22c55e', fontWeight: 600 }}>Thanks for checking in!</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Your response helps improve insights for others.</div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
