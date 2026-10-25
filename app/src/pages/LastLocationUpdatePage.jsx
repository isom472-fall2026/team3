import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { kuwaitClock } from '../lib/kuwaitTime.js'

function LastLocationUpdatePage() {
  const [trips, setTrips] = useState([])
  const [selectedTripId, setSelectedTripId] = useState('')
  const [latestRecordedAt, setLatestRecordedAt] = useState(null)
  const [loadingTrips, setLoadingTrips] = useState(true)
  const [loadingLocation, setLoadingLocation] = useState(false)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadTrips = async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('id, status, trip_date, schedules(routes(name))')
        .order('trip_date', { ascending: false })

      if (!isMounted) return
      setLoadError(Boolean(error))
      setTrips(error ? [] : data || [])
      setLoadingTrips(false)
    }

    loadTrips()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!selectedTripId) {
      setLatestRecordedAt(null)
      return
    }

    let isMounted = true

    const loadLatestLocation = async () => {
      setLoadingLocation(true)
      // Loads the newest recorded_at for the selected trip to show when it was last updated.
      const { data, error } = await supabase
        .from('bus_locations')
        .select('recorded_at')
        .eq('trip_id', selectedTripId)
        .order('recorded_at', { ascending: false })
        .limit(1)

      if (!isMounted) return
      setLoadingLocation(false)
      if (!error && data && data.length > 0) {
        setLatestRecordedAt(data[0].recorded_at)
      } else {
        setLatestRecordedAt(null)
      }
    }

    loadLatestLocation()

    return () => {
      isMounted = false
    }
  }, [selectedTripId])

  return (
    <div className="bus-confirmed-section" id="location-update-page">
      <div className="bus-content-intro">
        <h2>Bus location update</h2>
        <p>Check how recent the displayed bus location is.</p>
      </div>

      {loadingTrips && <p>Loading trips…</p>}

      {loadError && (
        <div className="alert alert-error" role="alert">
          <div>Trips could not be loaded. Try again.</div>
        </div>
      )}

      {!loadingTrips && !loadError && trips.length === 0 && (
        <p className="no-routes-message" id="no-trips-message">No trips found.</p>
      )}

      {!loadingTrips && !loadError && trips.length > 0 && (
        <div className="form-group">
          <label htmlFor="trip-select">
            Trip:{' '}
            <select
              id="trip-select"
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
            >
              <option value="">Select a trip…</option>
              {trips.map((trip) => {
                const routeName = trip.schedules?.routes?.name
                return (
                  <option key={trip.id} value={trip.id}>
                    {routeName ? `${routeName} (${trip.trip_date})` : `Trip ${trip.id.slice(0, 8)} (${trip.trip_date})`}
                  </option>
                )
              })}
            </select>
          </label>
        </div>
      )}

      {loadingLocation && <p>Checking location…</p>}

      {selectedTripId && latestRecordedAt && !loadingLocation && (
        <div className="last-updated-banner" id="last-updated-display">
          Last updated {kuwaitClock(latestRecordedAt)}
        </div>
      )}
    </div>
  )
}

export default LastLocationUpdatePage
