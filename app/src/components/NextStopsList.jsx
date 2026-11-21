import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Stops on the trip's route that the bus has not reached yet, in route order (#187).
async function loadNextStops(tripId) {
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, schedules(route_id)')
    .eq('id', tripId)
    .maybeSingle()
  if (tripError || !trip?.schedules?.route_id) throw tripError || new Error('No route')

  const [stopsRes, updatesRes] = await Promise.all([
    supabase
      .from('routes_stops')
      .select('id, sequence_order, stops(name)')
      .eq('route_id', trip.schedules.route_id)
      .order('sequence_order', { ascending: true }),
    supabase
      .from('trip_stop_updates')
      .select('routes_stop_id, actual_arrival_time')
      .eq('trips_id', tripId),
  ])
  if (stopsRes.error || updatesRes.error) throw stopsRes.error || updatesRes.error

  const reached = new Set(
    (updatesRes.data || []).filter((u) => u.actual_arrival_time).map((u) => u.routes_stop_id),
  )

  return (stopsRes.data || [])
    .filter((rs) => !reached.has(rs.id))
    .sort((a, b) => Number(a.sequence_order) - Number(b.sequence_order))
    .map((rs) => ({ id: rs.id, name: rs.stops?.name?.trim() || 'Unnamed stop' }))
}

function NextStopsList({ tripId }) {
  const [result, setResult] = useState({ tripId: null, stops: [] })

  useEffect(() => {
    let isMounted = true
    loadNextStops(tripId)
      .then((stops) => { if (isMounted) setResult({ tripId, stops }) })
      .catch(() => { if (isMounted) setResult({ tripId, stops: [] }) })
    return () => { isMounted = false }
  }, [tripId])

  if (result.tripId !== tripId || result.stops.length === 0) return null

  return (
    <div className="next-stops" id="bus-trip-next-stops">
      <div className="next-stops-heading">Next stops</div>
      <ol className="next-stops-list">
        {result.stops.map((stop) => (
          <li key={stop.id} className="next-stops-item">
            <span className="next-stops-name">{stop.name}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default NextStopsList
