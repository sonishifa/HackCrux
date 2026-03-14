import { useState, useEffect } from 'react';
import './App.css';
import SearchBar from './components/SearchBar';
import TreatmentDashboard from './components/TreatmentDashboard';
import ChatAssistant from './components/ChatAssistant';

const API_BASE = 'http://localhost:8000';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState('search');
  const [stats, setStats] = useState({ total_posts: 0, treatments_count: 0, active_sources: [] });
  const [sourceStatus, setSourceStatus] = useState({});
  const [progressMessages, setProgressMessages] = useState([]);

  // Fetch live stats and source status on mount
  useEffect(() => {
    // Stats
    fetch(`${API_BASE}/api/stats`)
      .then(res => res.json())
      .then(d => {
        if (d.total_posts !== undefined) setStats(d);
        if (d.source_status) setSourceStatus(d.source_status);
      })
      .catch(() => {});

    // Health / source status
    fetch(`${API_BASE}/health`)
      .then(res => res.json())
      .then(d => {
        if (d.source_status) setSourceStatus(d.source_status);
      })
      .catch(() => {});
  }, []);

  const handleSearch = async (treatment) => {
    setLoading(true);
    setError(null);
    setProgressMessages([]);

    try {
      // SSE streaming
      const eventSource = new EventSource(
        `${API_BASE}/api/search/stream?treatment=${encodeURIComponent(treatment)}`
      );

      eventSource.onmessage = (event) => {
        const parsed = JSON.parse(event.data);

        if (parsed.stage === 'progress') {
          setProgressMessages(prev => [...prev, parsed.message]);
        } else if (parsed.stage === 'complete') {
          eventSource.close();
          setData(parsed.data);
          setView('dashboard');
          setLoading(false);
          // Refresh live stats after search completes
          fetch(`${API_BASE}/api/stats`)
            .then(r => r.json())
            .then(d => {
              setStats(d);
              if (d.source_status) setSourceStatus(d.source_status);
            })
            .catch(() => {});
        } else if (parsed.stage === 'not_found') {
          eventSource.close();
          setError(`No data found for "${treatment}". Try a different treatment name.`);
          setLoading(false);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        // Fallback to regular search
        fetch(`${API_BASE}/api/search?treatment=${encodeURIComponent(treatment)}`)
          .then(res => {
            if (!res.ok) throw new Error('Treatment not found');
            return res.json();
          })
          .then(result => {
            setData(result);
            setView('dashboard');
          })
          .catch(err => setError(err.message))
          .finally(() => setLoading(false));
      };

      // Timeout after 90s (scraping can take time)
      setTimeout(() => {
        if (loading) {
          eventSource.close();
          setError('Search timed out. Please try again.');
          setLoading(false);
        }
      }, 90000);

    } catch (err) {
      setError(err.message || 'Failed to fetch treatment data');
      setLoading(false);
    }
  };

  const handleBack = () => {
    setView('search');
    setData(null);
    setError(null);
    setProgressMessages([]);
  };

  // Source status badges
  const sourceBadges = [
    { key: 'reddit', label: 'Reddit' },
    { key: 'pubmed', label: 'PubMed' },
    { key: 'drugs_com', label: 'Drugs.com' },
    { key: 'youtube', label: 'YouTube' },
  ];

  return (
    <div className="app">
      <header className="header">
        <div className="header-brand">
          <div className="header-logo">🧬</div>
          <div>
            <div className="header-title">CureInsight</div>
            <div className="header-subtitle">Crowdsourced Treatment Intelligence</div>
          </div>
        </div>
        <div className="header-stats">
          <div className="header-stat">
            <div className="header-stat-value">{stats.total_posts || '—'}</div>
            <div className="header-stat-label">Discussions</div>
          </div>
          <div className="header-stat">
            <div className="header-stat-value">{stats.treatments_count || '—'}</div>
            <div className="header-stat-label">Treatments</div>
          </div>
          <div className="header-stat">
            <div className="header-stat-value">{stats.active_sources?.length || '—'}</div>
            <div className="header-stat-label">Sources</div>
          </div>
          {/* Source status badges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 10 }}>
            {sourceBadges.map(({ key, label }) => {
              const live = sourceStatus[key];
              if (live === undefined) return null;
              return (
                <span key={key} style={{ color: live ? '#22c55e' : '#64748b' }}>
                  {live ? '●' : '○'} {label}
                </span>
              );
            })}
          </div>
        </div>
      </header>

      <main className="main-content">
        {view === 'search' && (
          <>
            <SearchBar onSearch={handleSearch} loading={loading} />
            {error && <div className="error-message">{error}</div>}
            {loading && (
              <div className="loading">
                <div className="spinner" />
                <div className="loading-text">
                  {progressMessages.length > 0
                    ? progressMessages[progressMessages.length - 1]
                    : 'Scraping live data from Reddit, PubMed, Drugs.com...'}
                </div>
                {progressMessages.length > 1 && (
                  <div style={{ marginTop: 8, fontSize: 11, color: '#64748b' }}>
                    {progressMessages.map((msg, i) => (
                      <div key={i}>✓ {msg}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {view === 'dashboard' && data && (
          <TreatmentDashboard data={data} onBack={handleBack} />
        )}
      </main>

      <ChatAssistant />
    </div>
  );
}

export default App;