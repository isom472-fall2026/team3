import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { kuwaitToday } from '../lib/kuwaitTime.js'

function ActiveTripBusPage() {
  const [trips, setTrips] = useState([])
  const [selectedTripId, setSelectedTripId] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadActiveTrips = async () => {
      // The student can only pick from trips that are currently running today in Kuwait time.
      const { data, error } = await supabase
        .from('trips')
        .select('id, bus_id, status, trip_date, schedules(routes(name))')
        .eq('status', 'active')
        .eq('trip_date', kuwaitToday())

      if (!isMounted) return
      setLoadError(Boolean(error))
      setTrips(error ? [] : data || [])
      setLoading(false)
    }

    loadActiveTrips()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="bus-confirmed-section" id="active-trip-bus-page">
      <div className="bus-content-intro">
        <h2>Active trip bus info</h2>
        <p>Select an active trip to view bus information.</p>
      </div>

      {loading && <p>Loading active trips…</p>}

      {loadError && (
        <div className="alert alert-error" role="alert">
          <div>Trips could not be loaded. Try again.</div>
        </div>
      )}

      {!loading && !loadError && trips.length === 0 && (
        <p className="no-routes-message" id="no-active-trips-message">
          No active trips right now.
        </p>
      )}

      {!loading && !loadError && trips.length > 0 && (
        <div className="form-group">
          <label htmlFor="active-trip-select">
            Active trip:{' '}
            <select
              id="active-trip-select"
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
            >
              <option value="">Select an active trip…</option>
              {trips.map((trip) => {
                const routeName = trip.schedules?.routes?.name
                return (
                  <option key={trip.id} value={trip.id}>
                    {routeName ? `${routeName} (Trip ${trip.id.slice(0, 8)})` : `Trip ${trip.id.slice(0, 8)}`}
                  </option>
                )
              })}
            </select>
          </label>
        </div>
      )}
    </div>
  )
}

export default ActiveTripBusPage
