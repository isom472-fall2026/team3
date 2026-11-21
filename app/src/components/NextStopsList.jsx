import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { kuwaitClock } from '../lib/kuwaitTime.js'

// Newest first; a row with no logged_at cannot be placed in time, so it goes last.
function byNewest(a, b) {
  if (!a.logged_at) return b.logged_at ? 1 : 0
  if (!b.logged_at) return -1
  return Date.parse(b.logged_at) - Date.parse(a.logged_at)
}

// Timetable times are Kuwait local time on the trip's date; Kuwait is UTC+3 all year.
function kuwaitInstant(tripDate, time) {
  return new Date(`${tripDate}T${String(time).slice(0, 8)}+03:00`)
}

// Stops on the trip's route that the bus has not reached yet, in route order (#187),
// each with its timetable time plus the trip's latest delay.
async function loadNextStops(tripId) {
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, trip_date, schedule_id, schedules(route_id)')
    .eq('id', tripId)
    .maybeSingle()
  if (tripError || !trip?.schedules?.route_id) throw tripError || new Error('No route')

  const [stopsRes, updatesRes, timesRes, delaysRes] = await Promise.all([
    supabase
      .from('routes_stops')
      .select('id, sequence_order, stops(name)')
      .eq('route_id', trip.schedules.route_id)
      .order('sequence_order', { ascending: true }),
    supabase
      .from('trip_stop_updates')
      .select('routes_stop_id, actual_arrival_time')
      .eq('trips_id', tripId),
    supabase
      .from('scheduled_stop_times')
      .select('route_stop_id, expected_arrival_time')
      .eq('schedule_id', trip.schedule_id),
    supabase
      .from('delay_logs')
      .select('delay_minutes, logged_at')
      .eq('trip_id', tripId),
  ])
  const failed = [stopsRes, updatesRes, timesRes, delaysRes].find((r) => r.error)
  if (failed) throw failed.error

  const reached = new Set(
    (updatesRes.data || []).filter((u) => u.actual_arrival_time).map((u) => u.routes_stop_id),
  )
  const latestDelay = [...(delaysRes.data || [])].sort(byNewest)[0]
  const delayMinutes = latestDelay?.delay_minutes > 0 ? latestDelay.delay_minutes : 0

  const routeStops = stopsRes.data || []
  // Checked on every refresh, so a time that passes while the popup is open turns into "Due now".
  const now = Date.now()
  const stops = routeStops
    .filter((rs) => !reached.has(rs.id))
    .sort((a, b) => Number(a.sequence_order) - Number(b.sequence_order))
    .map((rs) => {
      const scheduled = (timesRes.data || []).find((t) => t.route_stop_id === rs.id)?.expected_arrival_time
      const expected = scheduled && String(scheduled).trim()
        ? new Date(kuwaitInstant(trip.trip_date, scheduled).getTime() + delayMinutes * 60000)
        : null
      const due = Boolean(expected) && expected.getTime() <= now
      return { id: rs.id, name: rs.stops?.name?.trim() || 'Unnamed stop', expected, delayMinutes, due }
    })
  return { stops, allReached: routeStops.length > 0 && stops.length === 0 }
}

// The geofence records an arrival as soon as the bus enters a stop (#79); reloading this
// often keeps the list within 10 seconds of it, with later times recalculated.
const REFRESH_MS = 5000

function NextStopsList({ tripId }) {
  const [result, setResult] = useState({ tripId: null, stops: [], allReached: false })

  useEffect(() => {
    let isMounted = true
    const refresh = () =>
      loadNextStops(tripId)
        .then((next) => { if (isMounted) setResult({ tripId, ...next }) })
        .catch(() => {
          // A failed refresh keeps the last list instead of emptying the popup.
          if (isMounted) setResult((prev) => (prev.tripId === tripId ? prev : { tripId, stops: [], allReached: false }))
        })
    refresh()
    const id = setInterval(refresh, REFRESH_MS)
    return () => {
      isMounted = false
      clearInterval(id)
    }
  }, [tripId])

  if (result.tripId !== tripId) return null

  if (result.allReached) {
    return (
      <div className="next-stops" id="bus-trip-next-stops">
        <div className="next-stops-heading">Next stops</div>
        <div className="next-stops-done" id="bus-trip-last-stop-reached">Last stop reached.</div>
      </div>
    )
  }

  if (result.stops.length === 0) return null

  return (
    <div className="next-stops" id="bus-trip-next-stops">
      <div className="next-stops-heading">Next stops</div>
      <ol className="next-stops-list">
        {result.stops.map((stop) => (
          <li key={stop.id} className="next-stops-item">
            <span className="next-stops-name">{stop.name}</span>
            {stop.expected ? (
              <span className="next-stops-time">
                {stop.due ? 'Due now' : kuwaitClock(stop.expected)}
                {stop.delayMinutes > 0 && <span className="next-stops-delay"> +{stop.delayMinutes} min</span>}
              </span>
            ) : (
              <span className="next-stops-no-time">No time set</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

export default NextStopsList
