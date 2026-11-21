import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { kuwaitClock } from '../lib/kuwaitTime.js'

// Older than this, the bus has probably stopped reporting, so the estimates are only the timetable.
const STALE_POSITION_MS = 2 * 60 * 1000

// Newest first; a row with no logged_at cannot be placed in time, so it goes last.
function byNewest(a, b) {
  if (!a.logged_at) return b.logged_at ? 1 : 0
  if (!b.logged_at) return -1
  return Date.parse(b.logged_at) - Date.parse(a.logged_at)
}

// Timetable times are Kuwait local time on the trip's date; Kuwait is UTC+3 all year.
function kuwaitInstant(tripDate, time) {
  return new Date(`${tripDate}T${time.slice(0, 8)}+03:00`)
}

async function loadArrivals(tripId) {
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, status, trip_date, schedule_id, schedules(route_id)')
    .eq('id', tripId)
    .single()
  if (tripError) throw tripError
  if (trip.status === 'completed') return { status: trip.status, stops: [] }

  const [routeStops, stopTimes, updates, delays, position] = await Promise.all([
    supabase
      .from('routes_stops')
      .select('id, sequence_order, stops(name)')
      .eq('route_id', trip.schedules.route_id)
      .order('sequence_order'),
    supabase
      .from('scheduled_stop_times')
      .select('route_stop_id, expected_arrival_time')
      .eq('schedule_id', trip.schedule_id),
    supabase
      .from('trip_stop_updates')
      .select('routes_stop_id, actual_arrival_time')
      .eq('trips_id', tripId),
    supabase
      .from('delay_logs')
      .select('delay_minutes, logged_at')
      .eq('trip_id', tripId),
    supabase
      .from('bus_locations')
      .select('recorded_at')
      .eq('trip_id', tripId)
      .order('recorded_at', { ascending: false })
      .limit(1),
  ])
  const failed = [routeStops, stopTimes, updates, delays, position].find((r) => r.error)
  if (failed) throw failed.error

  const latestDelay = [...delays.data].sort(byNewest)[0]
  const delayMinutes = latestDelay?.delay_minutes > 0 ? latestDelay.delay_minutes : 0

  const arrived = new Set(
    updates.data.filter((u) => u.actual_arrival_time).map((u) => u.routes_stop_id),
  )

  const now = Date.now()
  const stops = routeStops.data
    .filter((rs) => !arrived.has(rs.id))
    .map((rs) => {
      const expected = stopTimes.data.find((st) => st.route_stop_id === rs.id)?.expected_arrival_time
      if (!expected) return { id: rs.id, name: rs.stops?.name, estimate: null, late: false }
      const estimate = new Date(kuwaitInstant(trip.trip_date, expected).getTime() + delayMinutes * 60000)
      return { id: rs.id, name: rs.stops?.name, estimate, late: estimate.getTime() < now }
    })

  const lastSeen = position.data[0]?.recorded_at
  const positionMissing = !lastSeen || now - Date.parse(lastSeen) > STALE_POSITION_MS

  return { status: trip.status, stops, positionMissing }
}

// Upcoming stops of one trip, each with its estimated arrival time (#32).
function TripArrivals({ tripId }) {
  const [result, setResult] = useState({ tripId: null, data: null, error: false })

  useEffect(() => {
    let isMounted = true
    loadArrivals(tripId)
      .then((data) => { if (isMounted) setResult({ tripId, data, error: false }) })
      .catch(() => { if (isMounted) setResult({ tripId, data: null, error: true }) })
    return () => { isMounted = false }
  }, [tripId])

  if (result.tripId !== tripId) return <p>Loading arrival times…</p>

  if (result.error) {
    return (
      <div className="alert alert-error" role="alert" id="trip-arrivals-error">
        <div>Arrival times could not be loaded. Please try again.</div>
      </div>
    )
  }

  const { status, stops, positionMissing } = result.data

  if (status === 'completed') {
    return <div className="trip-delay trip-delay-none" id="trip-arrivals-finished">Trip finished</div>
  }

  const cancelled = status === 'cancelled'

  return (
    <div className="trip-arrivals" id="trip-arrivals">
      <h3 className="trip-arrivals-heading">Estimated arrival times</h3>

      {!cancelled && positionMissing && (
        <div className="alert alert-warning" role="status" id="trip-arrivals-position-warning">
          <div>Bus position not available — showing scheduled times</div>
        </div>
      )}

      <ul className="schedule-departure-list" id="trip-arrivals-list">
        {stops.map((stop) => (
          <li key={stop.id} className="schedule-departure-item trip-arrivals-item">
            <span className="trip-arrivals-stop">{stop.name}</span>
            {cancelled ? (
              <span className="trip-arrivals-cancelled">Trip cancelled</span>
            ) : stop.estimate ? (
              <span className="trip-arrivals-time">
                {kuwaitClock(stop.estimate)}
                {stop.late && <span className="trip-arrivals-late"> · Running late</span>}
              </span>
            ) : (
              <span className="trip-arrivals-none">No estimate</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default TripArrivals
