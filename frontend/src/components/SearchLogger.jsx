import { useEffect, useRef } from 'react';

const SEARCH_LOG_KEY = 'curatrace_search_log';

/**
 * Silent search logger hook.
 * Logs every treatment/disease search to localStorage automatically.
 * Deduplicates consecutive same-treatment searches within 1 hour.
 */
export function useSearchLogger() {
  const logSearch = (treatment) => {
    if (!treatment || treatment.trim().length < 2) return;
    const trimmed = treatment.trim().toLowerCase();
    
    try {
      const stored = localStorage.getItem(SEARCH_LOG_KEY);
      const log = stored ? JSON.parse(stored) : [];
      
      // Deduplicate: skip if same treatment searched within last hour
      const now = Date.now();
      const lastEntry = log[log.length - 1];
      if (lastEntry && lastEntry.treatment === trimmed && (now - lastEntry.timestamp) < 3600000) {
        return; // Same treatment within 1 hour, skip
      }
      
      log.push({
        id: `search_${now}_${Math.random().toString(36).slice(2, 6)}`,
        treatment: trimmed,
        display_name: treatment.trim(),
        timestamp: now,
        date: new Date().toISOString(),
      });
      
      // Keep last 200 entries max
      const trimmedLog = log.slice(-200);
      localStorage.setItem(SEARCH_LOG_KEY, JSON.stringify(trimmedLog));
    } catch (e) {
      console.error('[SearchLogger] Failed to log search:', e);
    }
  };

  return { logSearch };
}

/**
 * Get the search history from localStorage.
 */
export function getSearchHistory() {
  try {
    const stored = localStorage.getItem(SEARCH_LOG_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Get the most recent treatment the user searched for.
 */
export function getLastSearchedTreatment() {
  const log = getSearchHistory();
  if (log.length === 0) return null;
  
  // Find the most frequently searched treatment in last 30 days
  const thirtyDaysAgo = Date.now() - (30 * 86400000);
  const recent = log.filter(e => e.timestamp > thirtyDaysAgo);
  if (recent.length === 0) return null;
  
  // Count frequencies
  const freq = {};
  recent.forEach(e => { freq[e.treatment] = (freq[e.treatment] || 0) + 1; });
  
  // Return most frequent
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  return {
    treatment: sorted[0][0],
    display_name: recent.find(e => e.treatment === sorted[0][0])?.display_name || sorted[0][0],
    count: sorted[0][1],
    last_search: recent[recent.length - 1].timestamp,
  };
}

export default useSearchLogger;
