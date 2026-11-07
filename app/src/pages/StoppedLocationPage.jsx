import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { kuwaitClock, kuwaitToday } from '../lib/kuwaitTime.js'

// A location older than 2 minutes means students can no longer follow the bus.
const TWO_MINUTES_MS = 2 * 60 * 1000

// A timestamp more than 1 minute ahead of device clock cannot be trusted.
const FUTURE_TOLERANCE_MS = 60 * 1000

// Re-check for stopped buses every 15 seconds.
const RECHECK_INTERVAL_MS = 15 * 1000

function safeKuwaitClock(timestamp) {
  if (!timestamp) return ''
  try {
    const d = new Date(timestamp)
    if (Number.isNaN(d.getTime())) {
      if (typeof timestamp === 'string' && timestamp.includes(':')) {
        return timestamp.slice(0, 5)
      }
      return String(timestamp)
    }
    return kuwaitClock(timestamp)
  } catch {
    return String(timestamp)
  }
}

function StoppedLocationPage() {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadStaleTrips = async () => {
      // Coordinator only checks today's active trips in Kuwait time.
      const { data: activeTrips, error: tripsError } = await supabase
        .from('trips')
        .select('id, actual_start, buses(bus_number), schedules(routes(name))')
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
            return { ...trip, rawRecordedAt: null }
          }

          const raw = locs?.[0]?.recorded_at
          return {
            ...trip,
            rawRecordedAt: raw != null && String(raw).trim() !== '' ? raw : null,
          }
        })
      )

      if (!isMounted) return

      const now = Date.now()
      const problematicTrips = []

      for (const trip of tripsWithLocations) {
        const busNumber = trip.buses?.bus_number || '—'
        const routeName = trip.schedules?.routes?.name || 'Unnamed route'
        const actualStartDisplay = safeKuwaitClock(trip.actual_start)

        // Criterion 3 & 4: No location row or empty recorded_at
        if (!trip.rawRecordedAt) {
          problematicTrips.push({
            id: trip.id,
            busNumber,
            routeName,
            actualStart: trip.actual_start,
            actualStartDisplay,
            statusKind: 'missing',
            statusText: 'No location since start',
          })
          continue
        }

        const recordedMs = new Date(trip.rawRecordedAt).getTime()

        // Criterion 5: Recorded at more than 1 minute in the future
        if (!Number.isNaN(recordedMs) && recordedMs - now > FUTURE_TOLERANCE_MS) {
          problematicTrips.push({
            id: trip.id,
            busNumber,
            routeName,
            statusKind: 'wrong',
            statusText: 'Location time not valid',
          })
          continue
        }

        // Criterion 1: Recorded at more than 2 minutes ago
        if (!Number.isNaN(recordedMs) && now - recordedMs > TWO_MINUTES_MS) {
          const diffMinutes = Math.floor((now - recordedMs) / 60000)
          const time = safeKuwaitClock(trip.rawRecordedAt)
          problematicTrips.push({
            id: trip.id,
            busNumber,
            routeName,
            statusKind: 'stale',
            statusText: `Last location ${time} (${diffMinutes} min ago)`,
          })
        }
      }

      problematicTrips.sort((a, b) =>
        (a.busNumber || '').localeCompare(b.busNumber || '', undefined, { numeric: true })
      )

      setTrips(problematicTrips)
      setError(false)
      setLoading(false)
    }

    loadStaleTrips()

    // Criterion 2: Re-check every 15 seconds
    const intervalId = setInterval(loadStaleTrips, RECHECK_INTERVAL_MS)

    const channel = supabase
      .channel('stopped-buses-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bus_locations' }, loadStaleTrips)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips' }, loadStaleTrips)
      .subscribe()

    return () => {
      isMounted = false
      clearInterval(intervalId)
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="bus-confirmed-section" id="stopped-location-page">
      <div className="bus-content-intro">
        <h2>Stopped location buses</h2>
        <p>Running buses that have not sent a location for more than 2 minutes.</p>
      </div>

      {loading && <p>Checking bus locations…</p>}

      {error && (
        <div className="alert alert-error" role="alert" id="stopped-location-error">
          <div>Location information unavailable</div>
        </div>
      )}

      {!loading && !error && trips.length === 0 && (
        <div className="schedule-empty-notice" id="all-buses-sending-location">
          All buses are sending their location.
        </div>
      )}

      {!loading && !error && trips.length > 0 && (
        <ul className="route-stops-list" id="stopped-buses-list">
          {trips.map((trip) => (
            <li key={trip.id} className="route-stops-item" data-trip-id={trip.id}>
              <span className="bus-number">Bus {trip.busNumber}</span> ·{' '}
              <span className="route-name">{trip.routeName}</span> ·{' '}
              <span className="last-location">{trip.statusText}</span>
              {trip.statusKind === 'missing' && trip.actualStartDisplay && (
                <span className="actual-start" data-actual-start={trip.actualStart}>
                  {' '}({trip.actualStartDisplay})
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default StoppedLocationPage
