import { useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../lib/supabase.js'
import { isInKuwait } from '../lib/mapViews.js'

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

function ArrivalsPage() {
  const [nearest, setNearest] = useState(null)
  const [locationOff, setLocationOff] = useState(false)
  const [outsideKuwait, setOutsideKuwait] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [noStops, setNoStops] = useState(false)

  const showNearestStop = async ({ coords }) => {
    if (!isInKuwait(coords.latitude, coords.longitude)) {
      setOutsideKuwait(true)
      return
    }

    // The same columns the map loads itself, so the stop opens there with its area and circle.
    const { data, error } = await supabase
      .from('stops')
      .select('id, name, area, latitude, longitude, geofence_radius_m')
    if (error) {
      setLoadError(true)
      return
    }

    let best = null
    for (const stop of data || []) {
      const lat = Number(stop.latitude)
      const lng = Number(stop.longitude)
      if (!isInKuwait(lat, lng)) continue
      const metres = distanceInMetres(coords.latitude, coords.longitude, lat, lng)
      if (!best || metres < best.metres) best = { stop, metres }
    }
    setNoStops(!best)
    setNearest(best)
  }

  const askForLocation = () => {
    setLocationOff(false)
    setOutsideKuwait(false)
    setLoadError(false)
    setNoStops(false)
    setNearest(null)
    if (!navigator.geolocation) {
      setLocationOff(true)
      return
    }
    // The timeout makes "no position returned" end in the message instead of waiting forever.
    navigator.geolocation.getCurrentPosition(
      showNearestStop,
      () => setLocationOff(true),
      { timeout: 15000 }
    )
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

      {locationOff && (
        <div className="alert alert-info" role="alert" id="nearest-stop-location-off">
          <div>
            Location is off. <Link to="/stops">Search for a stop instead.</Link>
          </div>
        </div>
      )}

      {outsideKuwait && (
        <div className="alert alert-info" role="alert" id="nearest-stop-outside-kuwait">
          <div>You seem to be outside Kuwait.</div>
        </div>
      )}

      {loadError && (
        <div className="alert alert-error" role="alert" id="nearest-stop-load-error">
          <div>Stops could not be loaded. Try again.</div>
        </div>
      )}

      {noStops && <p id="nearest-stop-none">No stops have a location yet.</p>}

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
