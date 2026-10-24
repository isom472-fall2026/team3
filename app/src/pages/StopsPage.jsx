import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

function StopsPage() {
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadStops = async () => {
      const { data, error } = await supabase
        .from('stops')
        .select('id, name, area')
        .order('name', { ascending: true });
      if (!isMounted) return;
      setLoadError(Boolean(error));
      setStops(error ? [] : data || []);
      setLoading(false);
    };
    loadStops();
    return () => {
      isMounted = false;
    };
  }, []);

  const trimmed = search.trim().toLowerCase();
  const filtered = stops
    .filter((s) => {
      const name = s.name?.trim() ?? '';
      const area = s.area?.trim() ?? '';
      if (trimmed === '') return true;
      const lowerName = name.toLowerCase();
      const lowerArea = area.toLowerCase();
      return lowerName.includes(trimmed) || lowerArea.includes(trimmed);
    })
    .sort((a, b) =>
      (a.name ?? '').trim().localeCompare((b.name ?? '').trim(), undefined, { sensitivity: 'base' })
    );

  return (
    <div className="bus-confirmed-section" id="stops-page">
      <div className="bus-content-intro">
        <h2>Stops</h2>
        <p>Search for a bus stop by name or area.</p>
      </div>

      <input
        type="text"
        placeholder="Search stops…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        disabled={loadError}
        className="stop-search-box"
        id="stop-search-input"
      />

      {loading && <p>Loading stops…</p>}

      {loadError && (
        <div className="alert alert-error" role="alert">
          <div>Stops could not be loaded. Try again.</div>
        </div>
      )}

      {!loading && !loadError && filtered.length === 0 && (
        <p>No stops match "{search.trim()}".</p>
      )}

      {!loading && !loadError && filtered.length > 0 && (
        <div className="stops-list" id="stops-list">
          {filtered.map((stop) => (
            <div key={stop.id} className="stop-card" data-stop-id={stop.id}>
              <div className="stop-name">
                {stop.name && stop.name.trim() !== ''
                  ? stop.name.trim()
                  : 'Unnamed stop'}
              </div>
              {stop.area && stop.area.trim() !== '' && (
                <div className="stop-area">{stop.area.trim()}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default StopsPage;
