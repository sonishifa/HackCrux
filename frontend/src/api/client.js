const API_BASE = 'http://localhost:8000';

export async function searchTreatment(treatment) {
  const res = await fetch(`${API_BASE}/api/search?treatment=${encodeURIComponent(treatment)}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail?.message || 'Treatment not found');
  }
  return res.json();
}

export async function getTreatments() {
  const res = await fetch(`${API_BASE}/api/treatments`);
  if (!res.ok) throw new Error('Failed to fetch treatments');
  return res.json();
}

export async function compareTreatments(treatments) {
  const res = await fetch(`${API_BASE}/api/compare?treatments=${encodeURIComponent(treatments.join(','))}`);
  if (!res.ok) throw new Error('Failed to compare treatments');
  return res.json();
}

export async function chatMessage(message) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error('Chat request failed');
  return res.json();
}
