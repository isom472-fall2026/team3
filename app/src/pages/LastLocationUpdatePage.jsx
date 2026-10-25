import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { kuwaitClock, kuwaitToday } from '../lib/kuwaitTime.js'

// If live updates cannot connect, ask again this often instead, so a new
// location still shows within 5 seconds.
const FALLBACK_POLL_MS = 4 * 1000

// A location older than this may no longer be where the bus is.
const STALE_AFTER_MS = 2 * 60 * 1000

// A recorded_at this far ahead of the device's clock cannot be trusted.
const FUTURE_TOLERANCE_MS = 60 * 1000

// Re-check how old the location is this often, even when no new row arrives.
const CLOCK_TICK_MS = 15 * 1000

// Only these exact statuses mean the trip is over.
const FINISHED_STATUSES = ['completed', 'cancelled']

function tripLabel(trip) {
  const route = trip.schedules?.routes?.name || 'Unnamed route'
  const time = trip.schedules?.planned_start_time?.slice(0, 5) || '—'
  const bus = trip.buses?.bus_number
  return `${route} — ${time}${bus ? ` · Bus ${bus}` : ''}`
}

function LastLocationUpdatePage() {
  const [trips, setTrips] = useState([])
  const [loadingTrips, setLoadingTrips] = useState(true)
  const [tripsError, setTripsError] = useState(false)
  const [selectedTripId, setSelectedTripId] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadTrips = async () => {
      // Today's trips in Kuwait time, whatever their status: a finished trip
      // must still say when its bus was last seen.
      const { data, error } = await supabase
        .from('trips')
        .select('id, schedules(planned_start_time, routes(name)), buses(bus_number)')
        .eq('trip_date', kuwaitToday())

      if (!isMounted) return
      setTripsError(Boolean(error))
      setTrips(error ? [] : [...(data || [])].sort((a, b) =>
        (a.schedules?.planned_start_time ?? '').localeCompare(b.schedules?.planned_start_time ?? '')
        || tripLabel(a).localeCompare(tripLabel(b))))
      setLoadingTrips(false)
    }

    loadTrips()
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="bus-confirmed-section" id="location-update-page">
      <div className="bus-content-intro">
        <h2>Bus location update</h2>
        <p>Choose one of today's trips to see how recent its bus location is.</p>
      </div>

      {loadingTrips && <p>Loading today's trips…</p>}

      {tripsError && (
        <div className="alert alert-error" role="alert" id="location-trips-error">
          <div>Location information unavailable</div>
        </div>
      )}

      {!loadingTrips && !tripsError && trips.length === 0 && (
        <div className="schedule-empty-notice" id="no-trips-message">
          No trips today.
        </div>
      )}

      {!loadingTrips && !tripsError && trips.length > 0 && (
        <div className="schedule-route-selector">
          <label className="schedule-route-label" htmlFor="trip-select">
            Trip
          </label>
          <select
            id="trip-select"
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
        <div className="schedule-departures-section" id="location-update-section">
          <LastUpdated tripId={selectedTripId} />
        </div>
      )}
    </div>
  )
}

// When one trip's bus location was last updated, kept up to date live.
function LastUpdated({ tripId }) {
  const { result, loading } = useLatestLocation(tripId)
  const now = useNow(CLOCK_TICK_MS)

  if (loading) return <p>Checking location…</p>

  if (result.error || !result.hasLocation) {
    return (
      <div className="last-updated last-updated-unavailable" id="location-unavailable">
        Location information unavailable
      </div>
    )
  }

  const recordedAt = Date.parse(result.recordedAt)
  if (!Number.isFinite(recordedAt) || recordedAt - now > FUTURE_TOLERANCE_MS) {
    return (
      <div className="last-updated last-updated-unknown" id="last-update-unknown">
        Last update unknown
      </div>
    )
  }

  const time = kuwaitClock(result.recordedAt)

  if (FINISHED_STATUSES.includes(result.status)) {
    return (
      <div className="last-updated last-updated-finished" id="last-updated-display">
        Trip finished — last updated {time}
      </div>
    )
  }

  const stale = now - recordedAt > STALE_AFTER_MS
  return (
    <div className={`last-updated${stale ? ' last-updated-stale' : ''}`} id="last-updated-display">
      Last updated {time}
      {stale && <span className="last-updated-label">May be out of date</span>}
    </div>
  )
}

// The trip's status and the recorded_at of its newest bus_locations row.
// Reloads when a new location is saved or the trip changes (live through
// Realtime, or every few seconds if Realtime cannot connect).
function useLatestLocation(tripId) {
  const [state, setState] = useState({ tripId: null, result: null })
  const [version, setVersion] = useState(0)
  const [liveTripId, setLiveTripId] = useState(null)

  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    let current = true

    const load = async () => {
      const [trip, latest] = await Promise.all([
        supabase.from('trips').select('status').eq('id', tripId).single(),
        supabase
          .from('bus_locations')
          .select('recorded_at')
          .eq('trip_id', tripId)
          .order('recorded_at', { ascending: false })
          .limit(1),
      ])
      if (!current) return

      if (trip.error || latest.error) {
        setState({ tripId, result: { error: true } })
        return
      }
      const row = latest.data?.[0]
      setState({
        tripId,
        result: {
          error: false,
          status: trip.data?.status ?? null,
          hasLocation: Boolean(row),
          recordedAt: row?.recorded_at ?? null,
        },
      })
    }

    load().catch(() => current && setState({ tripId, result: { error: true } }))
    return () => {
      current = false
    }
  }, [tripId, version])

  useEffect(() => {
    const channel = supabase
      .channel(`last-location-${tripId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bus_locations', filter: `trip_id=eq.${tripId}` },
        reload)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
        reload)
      .subscribe((status) => setLiveTripId(status === 'SUBSCRIBED' ? tripId : null))

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tripId, reload])

  const live = liveTripId === tripId
  useEffect(() => {
    if (live) return undefined
    const id = setInterval(reload, FALLBACK_POLL_MS)
    return () => clearInterval(id)
  }, [live, reload])

  // Until this trip's first answer arrives, an older trip's answer is not shown.
  const loading = state.tripId !== tripId
  return { result: state.result, loading }
}

function useNow(intervalMs) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export default LastLocationUpdatePage
