import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { kuwaitClock, kuwaitToday } from '../lib/kuwaitTime.js'

// A location recorded more than 2 minutes ago means the bus is no longer
// sending an up-to-date position.
const TWO_MINUTES_MS = 2 * 60 * 1000

function StoppedLocationPage() {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadStaleTrips = async () => {
      const { data: activeTrips, error: tripsError } = await supabase
        .from('trips')
        .select('id, buses(bus_number), schedules(routes(name))')
        .eq('status', 'active')
        .eq('trip_date', kuwaitToday())

      if (!isMounted) return

      if (tripsError) {
        setError(true)
        setLoading(false)
        return
      }

      const tripsWithLocations = await Promise.all(
        (activeTrips || []).map(async (trip) => {
          const { data: locs, error: locError } = await supabase
            .from('bus_locations')
            .select('recorded_at')
            .eq('trip_id', trip.id)
            .order('recorded_at', { ascending: false })
            .limit(1)

          if (locError) {
            return { ...trip, recordedAt: null }
          }

          return {
            ...trip,
            recordedAt: locs?.[0]?.recorded_at ?? null,
          }
        })
      )

      if (!isMounted) return

      const now = Date.now()
      const stale = tripsWithLocations
        .filter((trip) => {
          if (!trip.recordedAt) return false
          const recordedMs = new Date(trip.recordedAt).getTime()
          return !Number.isNaN(recordedMs) && now - recordedMs > TWO_MINUTES_MS
        })
        .map((trip) => {
          const recordedMs = new Date(trip.recordedAt).getTime()
          const diffMinutes = Math.floor((now - recordedMs) / 60000)
          const time = kuwaitClock(trip.recordedAt)
          const busNumber = trip.buses?.bus_number || '—'
          const routeName = trip.schedules?.routes?.name || 'Unnamed route'

          return {
            id: trip.id,
            busNumber,
            routeName,
            locationText: `Last location ${time} (${diffMinutes} min ago)`,
          }
        })

      setTrips(stale)
      setLoading(false)
    }

    loadStaleTrips()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="bus-confirmed-section" id="stopped-location-page">
      <div className="bus-content-intro">
        <h2>Stopped location buses</h2>
        <p>Buses running today that have not sent a location for more than 2 minutes.</p>
      </div>

      {loading && <p>Loading stopped location buses…</p>}

      {error && (
        <div className="alert alert-error" role="alert" id="stopped-location-error">
          <div>Location information unavailable</div>
        </div>
      )}

      {!loading && !error && (
        <ul className="stopped-buses-list" id="stopped-buses-list">
          {trips.map((trip) => (
            <li key={trip.id} className="stopped-bus-item">
              <span className="bus-number">Bus {trip.busNumber}</span> ·{' '}
              <span className="route-name">{trip.routeName}</span> ·{' '}
              <span className="last-location">{trip.locationText}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default StoppedLocationPage

