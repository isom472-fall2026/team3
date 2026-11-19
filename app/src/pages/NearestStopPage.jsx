import { useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../lib/supabase.js';
import { isInKuwait } from '../lib/mapViews.js';

// Straight-line distance (haversine) in metres.
function distanceMetres(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Round to the nearest 10.
function roundToTen(n) {
  return Math.round(n / 10) * 10;
}

function NearestStopPage() {
  const [nearest, setNearest] = useState(null);
  const [distance, setDistance] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | done | denied | outside | error
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleFind = async () => {
    setStatus('loading');
    setNearest(null);
    setDistance(null);
    setErrorMsg('');

    // Ask for the phone's location.
    if (!navigator.geolocation) {
      setStatus('denied');
      return;
    }

    let position;
    try {
      position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });
    } catch {
      setStatus('denied');
      return;
    }

    const userLat = position.coords.latitude;
    const userLng = position.coords.longitude;

    // Outside Kuwait?
    if (!isInKuwait(userLat, userLng)) {
      setStatus('outside');
      return;
    }

    // Fetch stops.
    const { data, error } = await supabase
      .from('stops')
      .select('id, name, latitude, longitude');

    if (error || !data) {
      setErrorMsg('Stops could not be loaded. Try again.');
      setStatus('error');
      return;
    }

    // Keep only stops inside Kuwait.
    const kuwaitStops = data.filter((s) =>
      isInKuwait(Number(s.latitude), Number(s.longitude))
    );

    if (kuwaitStops.length === 0) {
      setErrorMsg('Stops could not be loaded. Try again.');
      setStatus('error');
      return;
    }

    let best = null;
    let bestDist = Infinity;
    for (const stop of kuwaitStops) {
      const d = distanceMetres(userLat, userLng, Number(stop.latitude), Number(stop.longitude));
      if (d < bestDist) {
        bestDist = d;
        best = stop;
      }
    }

    setNearest(best);
    setDistance(roundToTen(bestDist));
    setStatus('done');
  };

  return (
    <div className="bus-confirmed-section" id="nearest-stop-page">
      <div className="bus-content-intro">
        <h2>Nearest stop</h2>
        <p>Find the bus stop closest to where you are.</p>
      </div>

      <button
        type="button"
        className="btn btn-primary"
        id="find-nearest-btn"
        onClick={handleFind}
        disabled={status === 'loading'}
        style={{ marginBottom: '1rem' }}
      >
        {status === 'loading' ? 'Finding…' : 'Nearest stop'}
      </button>

      {status === 'denied' && (
        <div className="alert alert-error" role="alert" id="nearest-denied">
          Location is off.{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/stops'); }}>
            Search for a stop instead.
          </a>
        </div>
      )}

      {status === 'outside' && (
        <div className="alert alert-error" role="alert" id="nearest-outside">
          You seem to be outside Kuwait.
        </div>
      )}

      {status === 'error' && (
        <div className="alert alert-error" role="alert" id="nearest-error">
          {errorMsg}
        </div>
      )}

      {status === 'done' && nearest && (
        <div className="stop-card" id="nearest-result">
          <div className="stop-info">
            <div className="stop-name">{nearest.name}</div>
            <div className="stop-area">{distance} m away</div>
          </div>
          <div className="stop-actions">
            <button
              type="button"
              className="btn btn-secondary stop-map-btn"
              id="nearest-show-on-map"
              onClick={() =>
                navigate(`/map?stop=${nearest.id}`, { state: { stop: nearest } })
              }
            >
              Show on map
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NearestStopPage;

