import { useState } from 'react';

// No hardcoded suggestions — everything is live search

const STAGE_LABELS = {
  started: 'Starting search...',
  normalizing: 'Normalizing treatment name...',
  scraping_reddit: 'Fetching Reddit discussions...',
  scraping_pubmed: 'Fetching PubMed studies...',
  scraping_drugs: 'Fetching Drugs.com reviews...',
  scraping_youtube: 'Fetching YouTube comments...',
  extracting: 'Extracting medical entities...',
  analyzing: 'Running sentiment & credibility analysis...',
  synthesizing: 'Synthesizing insights...',
  complete: 'Complete!',
};

export default function SearchBar({ onSearch, loading }) {
  const [query, setQuery] = useState('');
  const [currentStage, setCurrentStage] = useState('');
  const [stageHistory, setStageHistory] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() && !loading) {
      setCurrentStage('');
      setStageHistory([]);
      onSearch(query.trim());
    }
  };

  const handleQuickTag = (treatment) => {
    if (!loading) {
      setQuery(treatment);
      setCurrentStage('');
      setStageHistory([]);
      onSearch(treatment);
    }
  };

  return (
    <div className="hero-section">
      <h1 className="hero-title">Treatment Intelligence</h1>
      <p className="hero-subtitle">
        AI-powered insights from thousands of real patient experiences.
        Search a treatment to explore crowdsourced health intelligence.
      </p>
      <form onSubmit={handleSubmit} className="search-container">
        <div className="search-wrapper">
          <span className="search-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input
            type="text"
            className="search-input"
            placeholder="Search any disease or treatment"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="search-btn" disabled={loading || !query.trim()}>
            {loading ? 'Analyzing...' : 'Search'}
          </button>
        </div>
      </form>

      <div style={{ marginTop: 12, fontSize: 11, color: '#7A8B9C', textAlign: 'center' }}>
        Try searching: Diabetes, Migraine, PCOS, Lung Infection, Arthritis, Depression, or any treatment name
      </div>
    </div>
  );
}
