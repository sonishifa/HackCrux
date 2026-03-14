/**
 * API Client — all backend calls go through here.
 *
 * The backend URL is set via the VITE_API_URL environment variable.
 * If not set, it defaults to http://localhost:8000 for local development.
 *
 * To configure:
 *   Create a .env file in the project root (same folder as package.json):
 *     VITE_API_URL=http://localhost:8000
 *
 *   Or if the backend is on another machine/server:
 *     VITE_API_URL=http://192.168.1.42:8000
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── Generic fetch helper ────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail?.detail?.message || detail?.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Search ──────────────────────────────────────────────────────────────────

/**
 * Returns an EventSource connected to the SSE streaming search endpoint.
 * The caller is responsible for closing it.
 */
export function createSearchStream(treatment) {
  const url = `${API_BASE}/api/search/stream?treatment=${encodeURIComponent(treatment)}`;
  return new EventSource(url);
}

export function searchTreatment(treatment) {
  return apiFetch(`/api/search?treatment=${encodeURIComponent(treatment)}`);
}

// ─── Stats / Health ──────────────────────────────────────────────────────────

export function fetchStats() {
  return apiFetch('/api/stats');
}

export function fetchHealth() {
  return apiFetch('/health');
}

// ─── Treatments list ─────────────────────────────────────────────────────────

export function getTreatments() {
  return apiFetch('/api/treatments');
}

// ─── Compare ─────────────────────────────────────────────────────────────────

export function compareTreatments(treatmentList) {
  const query = treatmentList.map(t => encodeURIComponent(t)).join(',');
  return apiFetch(`/api/compare?treatments=${query}`);
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export function chatMessage(message) {
  return apiFetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export default API_BASE;
