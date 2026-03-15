import { useState, useEffect, useRef } from 'react';
import { fetchNearby } from '../api/client';

const FACILITY_TYPES = [
  { key: 'hospital', label: 'Hospitals', desc: 'Hospitals & medical centers' },
  { key: 'clinic', label: 'Clinics', desc: 'Clinics & health centers' },
  { key: 'doctor', label: 'Doctors', desc: 'Doctor practices' },
  { key: 'pharmacy', label: 'Medical Stores', desc: 'Pharmacies & medical stores' },
];

const FACILITY_COLORS = {
  hospital: '#D32F2F',
  clinic: '#1BA89C',
  doctor: '#1565C0',
  pharmacy: '#43A047',
};

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
        html: '<div style="background:#1565C0;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 8px rgba(21,101,192,0.6)"></div>',
        className: '', iconSize: [20, 20], iconAnchor: [10, 10],
      }),
    }).addTo(map).bindPopup(`<b>Your Area: ${lastPincode}</b><br><small>${results.location.display_name}</small>`);

    // Facility markers with labels
    results.results.forEach((place, idx) => {
      const isRelevant = place.is_relevant;
      const markerColor = isRelevant ? '#43A047' : (place.is_multispeciality ? '#7B1FA2' : '#7A8B9C');
      const marker = L.marker([place.lat, place.lon], {
        icon: L.divIcon({
          html: `<div style="background:${markerColor};color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.3)">${place.name.substring(0, 20)}${place.name.length > 20 ? '…' : ''}</div>`,
          className: '', iconSize: [null, null], iconAnchor: [0, 0],
        }),
      }).addTo(map);
      marker.bindPopup(`
        <b>${place.name}</b><br>
        ${place.specialty ? `<em style="color:#7B1FA2">${place.specialty}</em><br>` : ''}
        ${place.address ? `${place.address}<br>` : ''}
        ${place.phone ? `${place.phone}<br>` : ''}
        <b>${place.distance_km} km away</b>
        ${isRelevant ? '<br><span style="color:#43A047">Relevant to your search</span>' : ''}
        ${place.is_multispeciality ? '<br><span style="color:#7B1FA2">Multi-speciality</span>' : ''}
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
  const typeColor = FACILITY_COLORS[facilityType] || '#1565C0';

  return (
    <div className="glass-card full-width">
      <div className="card-header">
        <div className="card-icon" style={{ background: '#1565C0' }}>HC</div>
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
          background: 'rgba(67,160,71,0.04)', border: '1px solid rgba(67,160,71,0.12)',
          fontSize: 12, color: '#4A5B6C',
        }}>
          <strong style={{ color: '#43A047' }}>Specialty Filter Active:</strong>{' '}
          Only showing facilities related to{' '}
          <strong style={{ color: '#1A2B3C' }}>{results.specialties_searched.join(', ')}</strong>{' '}
          for {treatment}.{' '}
          <span style={{ color: '#7A8B9C' }}>
            Found <strong style={{ color: '#43A047' }}>{results.relevant_count}</strong> relevant
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
            border: '1px solid #E2E8F0', background: '#fff',
            color: '#1A2B3C', fontSize: 14, outline: 'none',
          }}
        />
        <button onClick={handleSearch} disabled={loading} style={{
          padding: '10px 24px', borderRadius: 10, border: 'none',
          background: 'linear-gradient(135deg, #1565C0, #1BA89C)',
          color: '#fff', fontSize: 14, fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
        }}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Facility type tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {FACILITY_TYPES.map(({ key, label, desc }) => {
          const ftColor = FACILITY_COLORS[key];
          return (
            <button key={key} onClick={() => handleTypeChange(key)} style={{
              flex: 1, minWidth: 100, padding: '8px 10px', borderRadius: 10,
              border: facilityType === key ? `2px solid ${ftColor}` : '1px solid #E2E8F0',
              background: facilityType === key ? `${ftColor}08` : '#fff',
              color: facilityType === key ? ftColor : '#7A8B9C',
              fontSize: 12, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
            }}>
              <div style={{ fontWeight: 600, marginTop: 2 }}>{label}</div>
              <div style={{ fontSize: 10, color: '#7A8B9C', marginTop: 2 }}>{desc}</div>
            </button>
          );
        })}
      </div>

      {error && (
        <div style={{ padding: '10px 16px', background: 'rgba(211,47,47,0.06)', borderRadius: 8, color: '#D32F2F', fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {results && (
        <>
          {/* Map */}
          <div ref={mapRef} style={{
            height: 380, borderRadius: 12, overflow: 'hidden',
            marginBottom: 16, border: '1px solid #E2E8F0',
          }} />

          {/* Results header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: '#1A2B3C', fontWeight: 600 }}>
              {results.count} result{results.count !== 1 ? 's' : ''} near {lastPincode}
            </div>
            <div style={{ fontSize: 11, color: '#7A8B9C' }}>
              Within {results.radius_km} km
            </div>
          </div>

          {/* Collapsible results list */}
          <div style={{ display: 'grid', gap: 6 }}>
            {results.results.map((place, i) => {
              const isExpanded = expandedIdx === i;
              const isRelevant = place.is_relevant;
              const isMulti = place.is_multispeciality;
              const borderColor = isRelevant ? '#43A047' : isMulti ? '#7B1FA2' : '#E2E8F0';

              return (
                <div key={i} style={{
                  borderRadius: 10, overflow: 'hidden',
                  border: `1px solid ${borderColor}`,
                  background: isRelevant ? 'rgba(67,160,71,0.03)' : '#fff',
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
                      <div style={{ fontWeight: 600, color: '#1A2B3C', fontSize: 14 }}>
                        {place.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#7A8B9C', marginTop: 2 }}>
                        {isRelevant && <span style={{ color: '#43A047', marginRight: 8 }}>● Relevant</span>}
                        {isMulti && <span style={{ color: '#7B1FA2', marginRight: 8 }}>● Multi-speciality</span>}
                        {place.specialty && <span style={{ color: '#7B1FA2', marginRight: 8 }}>{place.specialty}</span>}
                        {place.address && <span>{place.address.substring(0, 40)}{place.address.length > 40 ? '…' : ''}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: place.distance_km < 2 ? 'rgba(67,160,71,0.08)' : 'rgba(21,101,192,0.08)',
                        color: place.distance_km < 2 ? '#43A047' : '#1565C0',
                      }}>
                        {place.distance_km} km
                      </span>
                      <span style={{
                        fontSize: 12, color: '#7A8B9C', transition: 'transform 0.2s',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                      }}>▼</span>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div style={{
                      padding: '0 16px 14px', borderTop: '1px solid #E2E8F0',
                    }}>
                      <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
                        {place.address && (
                          <div style={{ fontSize: 12, color: '#4A5B6C' }}><strong>Address:</strong> {place.address}</div>
                        )}
                        {place.phone && (
                          <div style={{ fontSize: 12, color: '#4A5B6C' }}>
                            <strong>Phone:</strong>{' '}
                            <a href={`tel:${place.phone}`} style={{ color: '#1565C0', textDecoration: 'none' }}>{place.phone}</a>
                          </div>
                        )}
                        {place.website && (
                          <div style={{ fontSize: 12 }}>
                            <strong style={{ color: '#4A5B6C' }}>Website:</strong>{' '}
                            <a href={place.website} target="_blank" rel="noopener noreferrer" style={{ color: '#1565C0', textDecoration: 'none' }}>Visit website</a>
                          </div>
                        )}
                        {place.opening_hours && (
                          <div style={{ fontSize: 12, color: '#4A5B6C' }}><strong>Hours:</strong> {place.opening_hours}</div>
                        )}
                        {place.specialty && (
                          <div style={{ fontSize: 12, color: '#7B1FA2' }}><strong>Specialty:</strong> {place.specialty}</div>
                        )}
                        {place.emergency && (
                          <div style={{ fontSize: 12, color: '#E6960A' }}><strong>Emergency services available</strong></div>
                        )}
                      </div>

                      {/* Directions button */}
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); flyToFacility(place); }}
                          style={{
                            padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: 'rgba(21,101,192,0.08)', color: '#1565C0', fontSize: 12, fontWeight: 600,
                          }}
                        >
                          Show on Map
                        </button>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`}
                          target="_blank" rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            padding: '6px 14px', borderRadius: 8, textDecoration: 'none',
                            background: 'rgba(67,160,71,0.08)', color: '#43A047', fontSize: 12, fontWeight: 600,
                          }}
                        >
                          Get Directions
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {results.results.length === 0 && (
            <div style={{ textAlign: 'center', padding: 24, color: '#7A8B9C', fontSize: 13 }}>
              No {currentTypeInfo.label.toLowerCase()} found for {treatment || 'your search'} within {results.radius_km} km.
              Try a different facility type or widen your search.
            </div>
          )}
        </>
      )}
    </div>
  );
}
