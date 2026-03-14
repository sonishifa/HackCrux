import { useState } from 'react';
import './App.css';
import SearchBar from './components/SearchBar';
import TreatmentDashboard from './components/TreatmentDashboard';
import ChatAssistant from './components/ChatAssistant';
import { searchTreatment } from './api/client';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState('search'); // 'search' or 'dashboard'

  const handleSearch = async (treatment) => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchTreatment(treatment);
      setData(result);
      setView('dashboard');
    } catch (err) {
      setError(err.message || 'Failed to fetch treatment data');
    }
    setLoading(false);
  };

  const handleBack = () => {
    setView('search');
    setData(null);
    setError(null);
  };

  return (
    <div className="app">
      {/* Header */}
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
            <div className="header-stat-value">90+</div>
            <div className="header-stat-label">Discussions</div>
          </div>
          <div className="header-stat">
            <div className="header-stat-value">6</div>
            <div className="header-stat-label">Treatments</div>
          </div>
          <div className="header-stat">
            <div className="header-stat-value">4</div>
            <div className="header-stat-label">Sources</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {view === 'search' && (
          <>
            <SearchBar onSearch={handleSearch} loading={loading} />
            {error && <div className="error-message">{error}</div>}
            {loading && (
              <div className="loading">
                <div className="spinner" />
                <div className="loading-text">Analyzing patient discussions with AI...</div>
              </div>
            )}
          </>
        )}

        {view === 'dashboard' && data && (
          <TreatmentDashboard data={data} onBack={handleBack} />
        )}
      </main>

      {/* Chat Assistant */}
      <ChatAssistant />
    </div>
  );
}

export default App;
