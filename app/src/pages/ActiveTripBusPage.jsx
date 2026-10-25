import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { kuwaitToday } from '../lib/kuwaitTime.js'

// If live updates cannot connect, check the trip this often instead, so a finished
// trip is shown within 5 seconds.
const FALLBACK_POLL_MS = 4 * 1000

function isBlank(value) {
  return value == null || String(value).trim() === ''
}

function tripLabel(trip) {
  const route = trip.schedules?.routes?.name || 'Unnamed route'
  const time = trip.schedules?.planned_start_time?.slice(0, 5) || '—'
  const bus = trip.buses?.bus_number
  return `${route} — ${time}${isBlank(bus) ? '' : ` · Bus ${bus.trim()}`}`
}

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
        .select('id, schedules(planned_start_time, routes(name)), buses(bus_number)')
        .eq('status', 'active')
        .eq('trip_date', kuwaitToday())

      if (!isMounted) return
      setLoadError(Boolean(error))
      setTrips(error ? [] : [...(data || [])].sort((a, b) => tripLabel(a).localeCompare(tripLabel(b))))
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
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {tripLabel(trip)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {selectedTripId && <TripBusDetails key={selectedTripId} tripId={selectedTripId} />}
    </div>
  )
}

// The bus running one trip, kept up to date so the student sees when the trip ends.
function TripBusDetails({ tripId }) {
  const [state, setState] = useState({ loading: true, error: false, tripStatus: null, bus: null })
  const [version, setVersion] = useState(0)
  const [live, setLive] = useState(false)

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('status, buses(bus_number, plate_number, status)')
        .eq('id', tripId)
        .single()

      if (!isMounted) return
      // A trip whose bus_id points to no bus comes back with buses = null.
      if (error || !data?.buses) {
        setState((prev) => (prev.loading ? { loading: false, error: true, tripStatus: null, bus: null } : prev))
        return
      }
      setState({ loading: false, error: false, tripStatus: data.status, bus: data.buses })
    }

    load()
    return () => { isMounted = false }
  }, [tripId, version])

  // Live updates: any change to this trip reloads it.
  useEffect(() => {
    const channel = supabase
      .channel(`trip-bus-${tripId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
        () => setVersion((v) => v + 1))
      .subscribe((status) => setLive(status === 'SUBSCRIBED'))

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tripId])

  useEffect(() => {
    if (live) return undefined
    const id = setInterval(() => setVersion((v) => v + 1), FALLBACK_POLL_MS)
    return () => clearInterval(id)
  }, [live])

  if (state.loading) return <p>Loading bus details…</p>

  if (state.error) {
    return (
      <div className="alert alert-error" role="alert" id="bus-details-error">
        <div>Bus details unavailable.</div>
      </div>
    )
  }

  if (state.tripStatus !== 'active') {
    return <p className="no-routes-message" id="trip-finished-message">This trip has finished</p>
  }

  const { bus } = state
  return (
    <div className="bus-card" id="active-trip-bus-details">
      <div className="bus-card-header">
        <span className="bus-number">{isBlank(bus.bus_number) ? 'Unnamed bus' : `Bus ${bus.bus_number.trim()}`}</span>
      </div>
      <div className="bus-card-body">
        <p><strong>Plate:</strong> {isBlank(bus.plate_number) ? 'Not available' : bus.plate_number}</p>
        <p><strong>Status:</strong> {isBlank(bus.status) ? 'Not available' : bus.status}</p>
      </div>
    </div>
  )
}

export default ActiveTripBusPage
