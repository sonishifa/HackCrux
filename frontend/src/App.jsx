import { useState, useEffect } from 'react';
import './App.css';
import SearchBar from './components/SearchBar';
import TreatmentDashboard from './components/TreatmentDashboard';
import ChatAssistant from './components/ChatAssistant';
import { createSearchStream, searchTreatment, fetchStats, fetchHealth } from './api/client';

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
    fetchStats()
      .then(d => {
        if (d.total_posts !== undefined) setStats(d);
        if (d.source_status) setSourceStatus(d.source_status);
      })
      .catch(() => {});

    fetchHealth()
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
      // SSE streaming via client helper
      const eventSource = createSearchStream(treatment);

      eventSource.onmessage = (event) => {
        const parsed = JSON.parse(event.data);

        if (parsed.stage === 'progress') {
          setProgressMessages(prev => [...prev, parsed.message]);
        } else if (parsed.stage === 'complete') {
          eventSource.close();
          setData(parsed.data);
          setView('dashboard');
          setLoading(false);
          fetchStats()
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
        searchTreatment(treatment)
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
          <div className="header-logo">
            <img src="/favicon.png" alt="CuraTrace" />
          </div>
          <div>
            <div className="header-title">CuraTrace</div>
            <div className="header-subtitle">Crowdsourced Treatment Intelligence</div>
          </div>
        </div>
        <div className="header-stats">
          {stats.total_posts > 0 ? (
            <>
              <div className="header-stat">
                <div className="header-stat-value">{stats.total_posts}</div>
                <div className="header-stat-label">Discussions</div>
              </div>
              <div className="header-stat">
                <div className="header-stat-value">{stats.treatments_count}</div>
                <div className="header-stat-label">Treatments</div>
              </div>
            </>
          ) : (
            <div className="header-stat">
              <div className="header-stat-value" style={{ color: '#43A047' }}>Ready</div>
              <div className="header-stat-label">Search any treatment</div>
            </div>
          )}
          <div className="header-stat">
            <div className="header-stat-value">4</div>
            <div className="header-stat-label">Live Sources</div>
          </div>
          {/* Source status badges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 10 }}>
            {sourceBadges.map(({ key, label }) => {
              const live = sourceStatus[key];
              return (
                <span key={key} style={{ color: live !== false ? '#43A047' : '#7A8B9C' }}>
                  {live !== false ? '●' : '○'} {label}
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
                  <div style={{ marginTop: 8, fontSize: 11, color: '#7A8B9C' }}>
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

      {/* User Safety Disclaimer */}
      <footer style={{
        marginTop: 'auto',
        padding: '24px',
        textAlign: 'center',
        borderTop: '1px solid #E2E8F0',
        background: '#F0F4F8',
        color: '#7A8B9C',
        fontSize: '11px',
        lineHeight: '1.6'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <strong>User Safety Disclaimer:</strong> This platform ("CuraTrace") aggregates patient experiences and public discussions from the internet using AI. 
          The information presented should NOT be considered medical advice, a diagnosis, or an endorsement of any treatment. 
          Individual responses to treatments vary significantly. Always consult with a qualified healthcare provider or doctor before starting, 
          changing, or discontinuing any medical treatment.
        </div>
      </footer>

      <ChatAssistant />
    </div>
  );
}

export default App;
