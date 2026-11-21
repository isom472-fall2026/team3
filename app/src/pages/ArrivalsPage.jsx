import { useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../lib/supabase.js'

const EARTH_RADIUS_M = 6371000

// Straight-line (great-circle) distance, as the story asks — not walking distance.
function distanceInMetres(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a))
}

// #78: criteria 1–3 so far — a refused location or a failed load shows nothing yet.
function ArrivalsPage() {
  const [nearest, setNearest] = useState(null)

  const showNearestStop = async ({ coords }) => {
    const { data, error } = await supabase
      .from('stops')
      .select('id, name, latitude, longitude')
    if (error) return

    let best = null
    for (const stop of data || []) {
      const lat = Number(stop.latitude)
      const lng = Number(stop.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
      const metres = distanceInMetres(coords.latitude, coords.longitude, lat, lng)
      if (!best || metres < best.metres) best = { stop, metres }
    }
    setNearest(best)
  }

  const askForLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(showNearestStop, () => {})
  }

  return (
    <div className="bus-confirmed-section" id="nearest-stop-page">
      <div className="bus-content-intro">
        <h2>Nearest stop</h2>
        <p>Find the bus stop closest to where you are.</p>
      </div>

      <button
        type="button"
        className="btn btn-primary"
        id="nearest-stop-btn"
        onClick={askForLocation}
      >
        Nearest stop
      </button>

      {nearest && (
        <Link
          to={`/map?stop=${nearest.stop.id}`}
          state={{ stop: nearest.stop }}
          className="stop-card"
          id="nearest-stop-result"
          data-stop-id={nearest.stop.id}
          style={{ color: 'inherit', textDecoration: 'none' }}
        >
          <div className="stop-info">
            <div className="stop-name">{nearest.stop.name}</div>
            <div className="stop-area" id="nearest-stop-distance">
              {Math.round(nearest.metres / 10) * 10} m away
            </div>
          </div>
          <span className="btn btn-secondary stop-map-btn">Show on map</span>
        </Link>
      )}
    </div>
  )
}

export default ArrivalsPage
