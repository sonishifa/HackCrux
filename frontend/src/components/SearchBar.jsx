import { useState } from 'react';

const SUGGESTIONS = ['Metformin', 'Insulin', 'Lisinopril', 'Omeprazole', 'Amoxicillin', 'Ibuprofen'];

export default function SearchBar({ onSearch, loading }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
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
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search a treatment (e.g., Metformin, Insulin...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="search-btn" disabled={loading || !query.trim()}>
            {loading ? 'Analyzing...' : 'Search'}
          </button>
        </div>
      </form>
      <div className="quick-tags">
        {SUGGESTIONS.map((s) => (
          <button key={s} className="quick-tag" onClick={() => { setQuery(s); onSearch(s); }}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
