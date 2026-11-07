import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { kuwaitToday } from '../lib/kuwaitTime.js'
import { buildTestBusPath } from '../lib/testBusPath.js'

// How often the test bus sends a location, in milliseconds.
const EVERY_MS = 5000

// Staff only (#106): play back fake locations along an active trip's route, so the
// live map, arrivals and delays can be shown without a real bus. The database's
// geofence trigger records arrivals and finishes the trip at the last stop.
function TestBusPage() {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [playingId, setPlayingId] = useState(null)
  const [preparingId, setPreparingId] = useState(null)
  const [progress, setProgress] = useState({}) // trip id -> { sent, total, stopName }
  const [messages, setMessages] = useState({}) // trip id -> { kind, text }

  const timer = useRef(null)
  const busy = useRef(false) // stops a slow insert from overlapping the next one
  const run = useRef(null) // the current playback; a reply from an older one is ignored

  useEffect(() => {
    let isMounted = true

    const loadTrips = async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('id, status, buses(bus_number), schedules(planned_start_time, route_id, routes(name))')
        .eq('trip_date', kuwaitToday())
        .eq('status', 'active')

      if (!isMounted) return
      setLoadError(Boolean(error))
      setTrips(
        error
          ? []
          : (data || []).sort((a, b) =>
              (a.schedules?.planned_start_time || '').localeCompare(b.schedules?.planned_start_time || '')
            )
      )
      setLoading(false)
    }

    loadTrips()

    return () => {
      isMounted = false
      clearInterval(timer.current) // leaving the page stops playback
    }
  }, [])

  const setMessage = (tripId, kind, text) => setMessages((prev) => ({ ...prev, [tripId]: { kind, text } }))

  const stopPlayback = (tripId, kind, text) => {
    clearInterval(timer.current)
    timer.current = null
    run.current = null
    busy.current = false
    setPlayingId(null)
    if (text) setMessage(tripId, kind, text)
  }

  const startPlayback = async (trip) => {
    setMessages((prev) => ({ ...prev, [trip.id]: null }))
    setPreparingId(trip.id)

    const { data: routeStops, error } = await supabase
      .from('routes_stops')
      .select('sequence_order, stops(name, latitude, longitude, geofence_radius_m)')
      .eq('route_id', trip.schedules?.route_id)
      .order('sequence_order')
    setPreparingId(null)

    if (error) {
      setMessage(trip.id, 'error', "The route's stops could not be loaded. Try again.")
      return
    }
    if (!routeStops || routeStops.length < 2) {
      setMessage(trip.id, 'error', 'This route needs at least two stops.')
      return
    }

    // Stops outside Kuwait are skipped: the bus goes straight to the next stop.
    const { points } = buildTestBusPath(routeStops.map((rs) => rs.stops).filter(Boolean))
    if (points.length === 0) {
      setMessage(trip.id, 'error', 'This route needs at least two stops.')
      return
    }

    let next = 0
    const thisRun = {}
    run.current = thisRun
    setPlayingId(trip.id)
    setProgress((prev) => ({ ...prev, [trip.id]: { sent: 0, total: points.length, stopName: null } }))

    const sendNext = async () => {
      if (busy.current) return
      busy.current = true

      // The trigger sets 'completed' at the last stop; staff may also end or cancel the trip.
      const { data: current, error: statusError } = await supabase
        .from('trips')
        .select('status')
        .eq('id', trip.id)
        .maybeSingle()
      if (run.current !== thisRun) return // "Stop playback" was pressed meanwhile
      if (!statusError && current?.status !== 'active') {
        stopPlayback(trip.id, 'success', 'Trip finished.')
        return
      }

      if (next >= points.length) {
        stopPlayback(trip.id, 'success', 'Playback reached the end of the route.')
        return
      }

      const point = points[next]
      // recorded_at is left to the database, so it is always "now".
      const { error: insertError } = await supabase
        .from('bus_locations')
        .insert({ trip_id: trip.id, latitude: point.lat, longitude: point.lng })
      if (run.current !== thisRun) return

      if (insertError) {
        // A refused row right after the last stop means the trigger has just finished the trip.
        const { data: after } = await supabase.from('trips').select('status').eq('id', trip.id).maybeSingle()
        if (after && after.status !== 'active') {
          stopPlayback(trip.id, 'success', 'Trip finished.')
        } else {
          console.error('Test bus location was refused:', insertError)
          stopPlayback(trip.id, 'error', 'Location could not be saved.')
        }
        return
      }

      next += 1
      setProgress((prev) => ({ ...prev, [trip.id]: { sent: next, total: points.length, stopName: point.stopName } }))
      busy.current = false
    }

    timer.current = setInterval(sendNext, EVERY_MS)
    sendNext() // the first point goes straight away
  }

  return (
    <div className="bus-confirmed-section" id="test-bus-page">
      <div className="bus-content-intro">
        <h2>Run test bus</h2>
        <p>Plays back fake locations along an active trip's route, one every 5 seconds, so live tracking and arrivals can be shown without a real bus.</p>
      </div>

      {loading && <p>Loading active trips…</p>}

      {loadError && (
        <div className="alert alert-error" role="alert">
          <div>Active trips could not be loaded. Try again.</div>
        </div>
      )}

      {!loading && !loadError && trips.length === 0 && (
        <p className="no-routes-message" id="no-active-trip-message">No active trip to play back.</p>
      )}

      {trips.length > 0 && (
        <div className="route-hours-grid" id="test-bus-trips">
          {trips.map((trip) => {
            const isPlaying = playingId === trip.id
            const p = progress[trip.id]
            const msg = messages[trip.id]
            return (
              <div key={trip.id} className="route-hours-card" data-trip-id={trip.id}>
                <div className="route-hours-name">{trip.schedules?.routes?.name ?? 'Unnamed route'}</div>
                <div className="route-hours-value">
                  Bus {trip.buses?.bus_number ?? '—'}
                  {trip.schedules?.planned_start_time ? `, ${trip.schedules.planned_start_time.slice(0, 5)}` : ''}
                </div>

                {isPlaying ? (
                  <button
                    type="button"
                    className="btn btn-danger"
                    id={`stop-playback-${trip.id}`}
                    onClick={() => stopPlayback(trip.id, 'success', 'Playback stopped.')}
                  >
                    Stop playback
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    id={`start-playback-${trip.id}`}
                    disabled={playingId !== null || preparingId !== null}
                    onClick={() => startPlayback(trip)}
                  >
                    {preparingId === trip.id ? 'Preparing…' : 'Start playback'}
                  </button>
                )}

                {isPlaying && p && (
                  <p className="departure-state" id={`playback-progress-${trip.id}`} aria-live="polite">
                    Sent {p.sent} of {p.total} locations{p.stopName ? `, at ${p.stopName}` : ''}.
                  </p>
                )}

                {msg && (
                  <div
                    className={`alert ${msg.kind === 'error' ? 'alert-error' : 'alert-success'}`}
                    role={msg.kind === 'error' ? 'alert' : 'status'}
                    id={`playback-message-${trip.id}`}
                  >
                    {msg.text}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default TestBusPage
