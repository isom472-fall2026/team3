import { useEffect, useState } from 'react'
import TripDelay from '../components/TripDelay.jsx'
import { supabase } from '../lib/supabase.js'
import { kuwaitToday } from '../lib/kuwaitTime.js'

function tripLabel(trip) {
  const route = trip.schedules?.routes?.name || 'Unnamed route'
  const time = trip.schedules?.planned_start_time?.slice(0, 5) || '—'
  const bus = trip.buses?.bus_number
  return `${route} — ${time}${bus ? ` · Bus ${bus}` : ''}`
}

function DelaysPage() {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [selectedTripId, setSelectedTripId] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadTrips = async () => {
      // Every status, not only running trips: a finished trip's delay still helps a
      // student plan, and a cancelled one must say so.
      const { data, error } = await supabase
        .from('trips')
        .select('id, schedules(planned_start_time, routes(name)), buses(bus_number)')
        .eq('trip_date', kuwaitToday())

      if (!isMounted) return
      setLoadError(Boolean(error))
      setTrips(error ? [] : [...(data || [])].sort((a, b) =>
        (a.schedules?.planned_start_time ?? '').localeCompare(b.schedules?.planned_start_time ?? '')
        || tripLabel(a).localeCompare(tripLabel(b))))
      setLoading(false)
    }

    loadTrips()
    return () => { isMounted = false }
  }, [])

  return (
    <div className="bus-confirmed-section" id="delays-page">
      <div className="bus-content-intro">
        <h2>Delays</h2>
        <p>Choose one of today's trips to see whether it is running late.</p>
      </div>

      {loading && <p>Loading today's trips…</p>}

      {loadError && (
        <div className="alert alert-error" role="alert" id="delays-trips-error">
          <div>Delay information could not be loaded.</div>
        </div>
      )}

      {!loading && !loadError && trips.length === 0 && (
        <div className="schedule-empty-notice" id="delays-no-trips">
          No trips today.
        </div>
      )}

      {!loading && !loadError && trips.length > 0 && (
        <div className="schedule-route-selector">
          <label className="schedule-route-label" htmlFor="delays-trip-select">
            Trip
          </label>
          <select
            id="delays-trip-select"
            className="form-select schedule-route-select"
            value={selectedTripId}
            onChange={(e) => setSelectedTripId(e.target.value)}
          >
            <option value="">— Select a trip —</option>
            {trips.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {tripLabel(trip)}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedTripId && (
        <div className="schedule-departures-section" id="delays-trip-section">
          <TripDelay tripId={selectedTripId} />
        </div>
      )}
    </div>
  )
}

export default DelaysPage
