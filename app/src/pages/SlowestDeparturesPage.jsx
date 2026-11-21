import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// 'HH:MM:SS' (Postgres time) → minutes after midnight.
function timeToMinutes(time) {
  const [h, m, s] = String(time).split(':').map(Number)
  return h * 60 + m + (s || 0) / 60
}

// A departure's planned run time: from planned_start_time to the expected arrival at the
// route's last stop (highest sequence_order). A run that crosses midnight wraps round.
function plannedMinutes(schedule) {
  let last = null
  for (const sst of schedule.scheduled_stop_times || []) {
    const order = sst.routes_stops?.sequence_order
    if (sst.expected_arrival_time == null || order == null) continue
    if (!last || order > last.order) last = { order, time: sst.expected_arrival_time }
  }
  if (!last) return null
  const diff = timeToMinutes(last.time) - timeToMinutes(schedule.planned_start_time)
  return diff < 0 ? diff + 24 * 60 : diff
}

// A departure needs this many completed trips before its average is trusted for a card.
const MIN_TRIPS_FOR_CARD = 5

function formatOver(minutes) {
  if (minutes > 0) return `+${minutes} min over plan`
  if (minutes < 0) return `${-minutes} min under plan`
  return 'On plan'
}

function SlowestDeparturesPage() {
  const [departures, setDepartures] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [selectedRouteId, setSelectedRouteId] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadDepartures = async () => {
      const [schedulesResult, tripsResult] = await Promise.all([
        supabase
          .from('schedules')
          .select('id, route_id, planned_start_time, routes(name), scheduled_stop_times(expected_arrival_time, routes_stops(sequence_order))'),
        supabase
          .from('trips')
          .select('schedule_id, actual_start, actual_completion')
          .eq('status', 'completed'),
      ])
      if (!isMounted || schedulesResult.error || tripsResult.error) return

      const completedBySchedule = {}
      const runTimesBySchedule = {}
      for (const trip of tripsResult.data || []) {
        completedBySchedule[trip.schedule_id] = (completedBySchedule[trip.schedule_id] || 0) + 1
        const start = Date.parse(trip.actual_start)
        const end = Date.parse(trip.actual_completion)
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue
        ;(runTimesBySchedule[trip.schedule_id] ||= []).push((end - start) / 60000)
      }

      const measured = []
      for (const schedule of schedulesResult.data || []) {
        const planned = plannedMinutes(schedule)
        const runTimes = runTimesBySchedule[schedule.id]
        if (planned == null || !runTimes) continue
        const average = runTimes.reduce((sum, m) => sum + m, 0) / runTimes.length
        measured.push({
          id: schedule.id,
          routeId: schedule.route_id,
          route: schedule.routes?.name?.trim() || 'Unnamed route',
          departure: String(schedule.planned_start_time).slice(0, 5),
          completedTrips: completedBySchedule[schedule.id] || 0,
          overBy: average - planned,
          overMinutes: Math.round(average - planned),
        })
      }

      setDepartures(measured)
      setLoaded(true)
    }

    loadDepartures()
    return () => {
      isMounted = false
    }
  }, [])

  // Filtered on the rounded figure so a card never reads "+0 min over plan".
  const cards = departures
    .filter((d) => d.completedTrips >= MIN_TRIPS_FOR_CARD && d.overMinutes > 0)
    .sort((a, b) => b.overBy - a.overBy)
    .slice(0, 3)

  const routes = Array.from(
    new Map(departures.map((d) => [d.routeId, { id: d.routeId, name: d.route }])).values()
  ).sort((a, b) => a.name.localeCompare(b.name))
  const chartRouteId = selectedRouteId || routes[0]?.id || ''
  const chartDepartures = departures
    .filter((d) => d.routeId === chartRouteId)
    .sort((a, b) => a.departure.localeCompare(b.departure))
  const chartScale = Math.max(1, ...chartDepartures.map((d) => Math.abs(d.overMinutes)))

  const selectRoute = (routeId) => {
    setSelectedRouteId(routeId)
    document.getElementById('trip-times-chart')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="bus-confirmed-section" id="trip-times-page">
      <div className="bus-content-intro">
        <h2>Trip times</h2>
        <p>Departures that run furthest over their planned time.</p>
      </div>

      {loaded && (
        <div className="slowest-departures" id="slowest-departures">
          {cards.length === 0 ? (
            <div className="bus-card slowest-departure-card" id="all-on-time-card">
              <div className="stop-name">All departures on time</div>
            </div>
          ) : (
            cards.map((card) => (
              <button
                type="button"
                key={card.id}
                className="bus-card slowest-departure-card"
                data-schedule-id={card.id}
                onClick={() => selectRoute(card.routeId)}
                style={{ display: 'block', width: '100%', textAlign: 'left', font: 'inherit', color: 'inherit', cursor: 'pointer' }}
              >
                <div className="stop-name">{card.route}</div>
                <div className="stop-area">Departs {card.departure}</div>
                <div className="slowest-departure-over">{formatOver(card.overMinutes)}</div>
              </button>
            ))
          )}
        </div>
      )}

      {routes.length > 0 && (
        <div id="trip-times-chart" style={{ marginTop: 20 }}>
          <div className="schedule-route-selector">
            <label className="schedule-route-label" htmlFor="trip-times-route-select">
              Route
            </label>
            <select
              id="trip-times-route-select"
              className="form-select schedule-route-select"
              value={chartRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
            >
              {routes.map((route) => (
                <option key={route.id} value={route.id}>{route.name}</option>
              ))}
            </select>
          </div>

          <div className="stops-list" id="trip-times-bars">
            {chartDepartures.map((d) => (
              <div key={d.id} className="bus-card" data-schedule-id={d.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span className="stop-name">{d.departure}</span>
                  <span className="stop-area">
                    {formatOver(d.overMinutes)} · {d.completedTrips} trips
                  </span>
                </div>
                <div
                  aria-hidden="true"
                  style={{
                    height: 8,
                    marginTop: 6,
                    borderRadius: 4,
                    width: `${(Math.abs(d.overMinutes) / chartScale) * 100}%`,
                    minWidth: 4,
                    background: d.overMinutes > 0 ? 'var(--error-text)' : 'var(--success-strong)',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default SlowestDeparturesPage
