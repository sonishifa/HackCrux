import { useState, useEffect, useRef } from 'react';
import { fetchNearby } from '../api/client';

const FACILITY_TYPES = [
  { key: 'hospital', label: 'Hospitals', icon: '🏥', desc: 'Hospitals & medical centers' },
  { key: 'clinic', label: 'Clinics', icon: '🩺', desc: 'Clinics & health centers' },
  { key: 'doctor', label: 'Doctors', icon: '👨‍⚕️', desc: 'Doctor practices' },
  { key: 'pharmacy', label: 'Pharmacies', icon: '💊', desc: 'Pharmacies & stores' },
];

export default function NearbyHealthCenters({ treatment }) {
  const [pincode, setPincode] = useState('');
  const [facilityType, setFacilityType] = useState('hospital');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastPincode, setLastPincode] = useState('');
  const [expandedIdx, setExpandedIdx] = useState(null);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  const doSearch = async (searchPin, searchType) => {
    if (!searchPin) { setError('Please enter a pincode'); return; }
    setLoading(true);
    setError('');
    setExpandedIdx(null);
    try {
      const data = await fetchNearby(searchPin, searchType, 'India', 10, treatment || '');
      if (data.error) { setError(data.error); setResults(null); }
      else { setResults(data); setLastPincode(searchPin); }
    } catch (err) { setError(err.message || 'Failed to fetch'); }
    setLoading(false);
  };

  const handleSearch = () => doSearch(pincode.trim(), facilityType);
  const handleTypeChange = (newType) => {
    setFacilityType(newType);
    if (lastPincode) doSearch(lastPincode, newType);
  };

  // Fly to a facility on the map
  const flyToFacility = (place) => {
    if (mapInstance.current && window.L) {
      mapInstance.current.setView([place.lat, place.lon], 16);
    }
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (!results || !results.location || !mapRef.current) return;
    if (!window.L) return;
    const L = window.L;
    if (mapInstance.current) mapInstance.current.remove();

    const map = L.map(mapRef.current).setView([results.location.lat, results.location.lon], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // User location
    L.marker([results.location.lat, results.location.lon], {
      icon: L.divIcon({
        html: '<div style="background:#3b82f6;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 8px rgba(59,130,246,0.6)"></div>',
        className: '', iconSize: [20, 20], iconAnchor: [10, 10],
      }),
    }).addTo(map).bindPopup(`<b>📍 Your Area: ${lastPincode}</b><br><small>${results.location.display_name}</small>`);

    // Facility markers with labels
    const typeInfo = FACILITY_TYPES.find(f => f.key === facilityType) || FACILITY_TYPES[0];
    results.results.forEach((place, idx) => {
      const isRelevant = place.is_relevant;
      const markerColor = isRelevant ? '#22c55e' : (place.is_multispeciality ? '#8b5cf6' : '#64748b');
      const marker = L.marker([place.lat, place.lon], {
        icon: L.divIcon({
          html: `<div style="background:${markerColor};color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.3)">${isRelevant ? '⭐ ' : ''}${place.name.substring(0, 20)}${place.name.length > 20 ? '…' : ''}</div>`,
          className: '', iconSize: [null, null], iconAnchor: [0, 0],
        }),
      }).addTo(map);
      marker.bindPopup(`
        <b>${place.name}</b><br>
        ${place.specialty ? `<em style="color:#8b5cf6">🏷 ${place.specialty}</em><br>` : ''}
        ${place.address ? `📍 ${place.address}<br>` : ''}
        ${place.phone ? `📞 ${place.phone}<br>` : ''}
        <b>${place.distance_km} km away</b>
        ${isRelevant ? '<br><span style="color:green">⭐ Relevant to your search</span>' : ''}
        ${place.is_multispeciality ? '<br><span style="color:#8b5cf6">🏛 Multi-speciality</span>' : ''}
      `);
    });

    mapInstance.current = map;
    if (results.results.length > 0) {
      const allPoints = results.results.map(p => [p.lat, p.lon]);
      allPoints.push([results.location.lat, results.location.lon]);
      map.fitBounds(L.latLngBounds(allPoints), { padding: [40, 40] });
    }
  }, [results]);

  const currentTypeInfo = FACILITY_TYPES.find(f => f.key === facilityType) || FACILITY_TYPES[0];

  return (
    <div className="glass-card full-width">
      <div className="card-header">
        <div className="card-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>🗺️</div>
        <div>
          <div className="card-title">Find Nearby Health Centers</div>
          <div className="card-subtitle">
            {treatment
              ? `Showing ${currentTypeInfo.label.toLowerCase()} for "${treatment}" near your area`
              : 'Enter your pincode to find nearby health facilities'
            }
          </div>
        </div>
      </div>

      {/* Specialty filter banner */}
      {treatment && results?.specialties_searched?.length > 0 && (
        <div style={{
          padding: '10px 14px', marginBottom: 12, borderRadius: 8,
          background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
          fontSize: 12, color: '#94a3b8',
        }}>
          🎯 <strong style={{ color: '#22c55e' }}>Specialty Filter Active:</strong>{' '}
          Only showing facilities related to{' '}
          <strong style={{ color: '#e2e8f0' }}>{results.specialties_searched.join(', ')}</strong>{' '}
          for {treatment}.{' '}
          <span style={{ color: '#64748b' }}>
            Found <strong style={{ color: '#22c55e' }}>{results.relevant_count}</strong> relevant
            {results.relevant_count === 1 ? ' facility' : ' facilities'} out of {results.count} total.
          </span>
        </div>
      )}

      {/* Search controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text" placeholder="Enter pincode (e.g., 302021)"
          value={pincode} onChange={(e) => setPincode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={{
            flex: 1, minWidth: 150, padding: '10px 16px', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
            color: '#f0f4ff', fontSize: 14, outline: 'none',
          }}
        />
        <button onClick={handleSearch} disabled={loading} style={{
          padding: '10px 24px', borderRadius: 10, border: 'none',
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          color: '#fff', fontSize: 14, fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
        }}>
          {loading ? '🔄 Searching...' : '🔍 Search'}
        </button>
      </div>

      {/* Facility type tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {FACILITY_TYPES.map(({ key, label, icon, desc }) => (
          <button key={key} onClick={() => handleTypeChange(key)} style={{
            flex: 1, minWidth: 100, padding: '8px 10px', borderRadius: 10,
            border: facilityType === key ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
            background: facilityType === key ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)',
            color: facilityType === key ? '#3b82f6' : '#94a3b8',
            fontSize: 12, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
          }}>
            <div style={{ fontSize: 18 }}>{icon}</div>
            <div style={{ fontWeight: 600, marginTop: 2 }}>{label}</div>
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: '10px 16px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, color: '#f87171', fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {results && (
        <>
          {/* Map */}
          <div ref={mapRef} style={{
            height: 380, borderRadius: 12, overflow: 'hidden',
            marginBottom: 16, border: '1px solid rgba(255,255,255,0.1)',
          }} />

          {/* Results header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: '#f0f4ff', fontWeight: 600 }}>
              {currentTypeInfo.icon} {results.count} result{results.count !== 1 ? 's' : ''} near {lastPincode}
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              Within {results.radius_km} km
            </div>
          </div>

          {/* Collapsible results list */}
          <div style={{ display: 'grid', gap: 6 }}>
            {results.results.map((place, i) => {
              const isExpanded = expandedIdx === i;
              const isRelevant = place.is_relevant;
              const isMulti = place.is_multispeciality;
              const borderColor = isRelevant ? '#22c55e' : isMulti ? '#8b5cf6' : 'rgba(255,255,255,0.06)';

              return (
                <div key={i} style={{
                  borderRadius: 10, overflow: 'hidden',
                  border: `1px solid ${borderColor}`,
                  background: isRelevant ? 'rgba(34,197,94,0.04)' : 'rgba(255,255,255,0.02)',
                  transition: 'all 0.2s',
                }}>
                  {/* Collapsed header — always visible */}
                  <div
                    onClick={() => setExpandedIdx(isExpanded ? null : i)}
                    style={{
                      padding: '12px 16px', cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#f0f4ff', fontSize: 14 }}>
                        {isRelevant ? '⭐ ' : isMulti ? '🏛 ' : `${currentTypeInfo.icon} `}
                        {place.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {isRelevant && <span style={{ color: '#22c55e', marginRight: 8 }}>● Relevant</span>}
                        {isMulti && <span style={{ color: '#8b5cf6', marginRight: 8 }}>● Multi-speciality</span>}
                        {place.specialty && <span style={{ color: '#8b5cf6', marginRight: 8 }}>🏷 {place.specialty}</span>}
                        {place.address && <span>📍 {place.address.substring(0, 40)}{place.address.length > 40 ? '…' : ''}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: place.distance_km < 2 ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)',
                        color: place.distance_km < 2 ? '#22c55e' : '#3b82f6',
                      }}>
                        {place.distance_km} km
                      </span>
                      <span style={{
                        fontSize: 12, color: '#64748b', transition: 'transform 0.2s',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                      }}>▼</span>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div style={{
                      padding: '0 16px 14px', borderTop: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
                        {place.address && (
                          <div style={{ fontSize: 12, color: '#cbd5e1' }}>📍 <strong>Address:</strong> {place.address}</div>
                        )}
                        {place.phone && (
                          <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                            📞 <strong>Phone:</strong>{' '}
                            <a href={`tel:${place.phone}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>{place.phone}</a>
                          </div>
                        )}
                        {place.website && (
                          <div style={{ fontSize: 12 }}>
                            🌐 <strong style={{ color: '#cbd5e1' }}>Website:</strong>{' '}
                            <a href={place.website} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>Visit website</a>
                          </div>
                        )}
                        {place.opening_hours && (
                          <div style={{ fontSize: 12, color: '#cbd5e1' }}>🕒 <strong>Hours:</strong> {place.opening_hours}</div>
                        )}
                        {place.specialty && (
                          <div style={{ fontSize: 12, color: '#8b5cf6' }}>🏷 <strong>Specialty:</strong> {place.specialty}</div>
                        )}
                        {place.emergency && (
                          <div style={{ fontSize: 12, color: '#f59e0b' }}>🚑 <strong>Emergency services available</strong></div>
                        )}
                      </div>

                      {/* Directions button */}
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); flyToFacility(place); }}
                          style={{
                            padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: 'rgba(59,130,246,0.15)', color: '#3b82f6', fontSize: 12, fontWeight: 600,
                          }}
                        >
                          📍 Show on Map
                        </button>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`}
                          target="_blank" rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            padding: '6px 14px', borderRadius: 8, textDecoration: 'none',
                            background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontSize: 12, fontWeight: 600,
                          }}
                        >
                          🧭 Get Directions
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {results.results.length === 0 && (
            <div style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: 13 }}>
              No {currentTypeInfo.label.toLowerCase()} found for {treatment || 'your search'} within {results.radius_km} km.
              Try a different facility type or widen your search.
            </div>
          )}
        </>
      )}
    </div>
  );
}
