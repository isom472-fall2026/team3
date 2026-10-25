import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { kuwaitClock } from '../lib/kuwaitTime.js'

// Newest first; a row with no logged_at cannot be placed in time, so it goes last.
function byNewest(a, b) {
  if (!a.logged_at) return b.logged_at ? 1 : 0
  if (!b.logged_at) return -1
  return Date.parse(b.logged_at) - Date.parse(a.logged_at)
}

// The latest delay recorded for one trip. Takes only a trip id, so the bus-marker
// popup (#48) can show it too.
function TripDelay({ tripId }) {
  const [result, setResult] = useState({ tripId: null, status: null, delay: null, error: false })

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      const [trip, logs] = await Promise.all([
        supabase.from('trips').select('status').eq('id', tripId).single(),
        supabase
          .from('delay_logs')
          .select('delay_minutes, logged_at, routes_stop_id, routes_stops(stops(name))')
          .eq('trip_id', tripId),
      ])

      if (!isMounted) return
      if (trip.error || logs.error) {
        setResult({ tripId, status: null, delay: null, error: true })
        return
      }

      const delay = (logs.data || [])
        .filter((row) => row.delay_minutes > 0)
        .sort(byNewest)[0] ?? null

      setResult({ tripId, status: trip.data.status, delay, error: false })
    }

    load()
    return () => { isMounted = false }
  }, [tripId])

  if (result.tripId !== tripId) return <p>Loading delay information…</p>

  if (result.error) {
    return (
      <div className="alert alert-error" role="alert" id="trip-delay-error">
        <div>Delay information could not be loaded.</div>
      </div>
    )
  }

  if (result.status === 'cancelled') {
    return <div className="trip-delay trip-delay-cancelled" id="trip-delay-cancelled">Trip cancelled</div>
  }

  const { delay } = result
  if (!delay) {
    return <div className="trip-delay trip-delay-none" id="trip-delay-none">No delay recorded</div>
  }

  return (
    <div className="trip-delay trip-delay-late" id="trip-delay">
      <div className="trip-delay-minutes">Delayed {delay.delay_minutes} min</div>
      <div className="trip-delay-stop">
        {delay.routes_stop_id
          ? <>At {delay.routes_stops?.stops?.name}</>
          : 'Delayed — stop not recorded'}
      </div>
      {delay.logged_at && (
        <div className="trip-delay-time">Recorded at {kuwaitClock(delay.logged_at)}</div>
      )}
    </div>
  )
}

export default TripDelay
