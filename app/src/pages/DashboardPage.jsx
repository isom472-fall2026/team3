import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Below this many completed trips an average is one bad morning, not a pattern.
const MIN_TRIPS = 5

function minutesOfDay(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// Nearest-rank: the shortest trip time that at least 85% of the trips finished within,
// so the coordinator can check it by sorting the trips and counting down the list.
function suggestedMinutes(durations) {
  if (durations.length < MIN_TRIPS) return null
  const sorted = [...durations].sort((a, b) => a - b)
  const rank = Math.ceil(0.85 * sorted.length)
  return Math.ceil(sorted[rank - 1])
}

function signed(value) {
  const rounded = Math.round(value * 10) / 10
  return `${rounded > 0 ? '+' : ''}${rounded}`
}

async function loadDepartures(routeId) {
  const { data: schedules, error: schedulesError } = await supabase
    .from('schedules')
    .select('id, planned_start_time')
    .eq('route_id', routeId)
    .order('planned_start_time')
  if (schedulesError) throw schedulesError
  if (!schedules.length) return []

  const { data: lastStops, error: lastStopError } = await supabase
    .from('routes_stops')
    .select('id, offset_minutes')
    .eq('route_id', routeId)
    .order('sequence_order', { ascending: false })
    .limit(1)
  if (lastStopError) throw lastStopError
  const lastStop = lastStops[0]

  const scheduleIds = schedules.map((s) => s.id)
  let lastStopTimes = []
  if (lastStop) {
    const { data, error } = await supabase
      .from('scheduled_stop_times')
      .select('schedule_id, expected_arrival_time')
      .in('schedule_id', scheduleIds)
      .eq('route_stop_id', lastStop.id)
    if (error) throw error
    lastStopTimes = data
  }

  const { data: trips, error: tripsError } = await supabase
    .from('trips')
    .select('schedule_id, actual_start, actual_completion')
    .in('schedule_id', scheduleIds)
    .in('status', ['completed', 'Completed'])
    .not('actual_start', 'is', null)
    .not('actual_completion', 'is', null)
  if (tripsError) throw tripsError

  return schedules.map((schedule) => {
    const durations = trips
      .filter((t) => t.schedule_id === schedule.id)
      .map((t) => (new Date(t.actual_completion) - new Date(t.actual_start)) / 60000)

    // The timetable's arrival at the last stop is the plan; a schedule without stop
    // times falls back to the route's own offset for that stop.
    const stopTime = lastStopTimes.find((s) => s.schedule_id === schedule.id)
    let planned = null
    if (stopTime?.expected_arrival_time) {
      planned = minutesOfDay(stopTime.expected_arrival_time) - minutesOfDay(schedule.planned_start_time)
    } else if (lastStop?.offset_minutes != null) {
      planned = lastStop.offset_minutes
    }

    const average = durations.length
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : null

    return {
      id: schedule.id,
      time: schedule.planned_start_time.slice(0, 5),
      trips: durations.length,
      average,
      planned,
      suggested: suggestedMinutes(durations),
      enough: durations.length >= MIN_TRIPS,
    }
  })
}

function TripTimesChart({ departures }) {
  const width = 640
  const height = 240
  const left = 36
  const bottom = 28
  const top = 16
  const plotHeight = height - top - bottom
  const highest = Math.max(10, ...departures.flatMap((d) => [d.enough ? d.average : 0, d.planned ?? 0]))
  const scaleMax = Math.ceil(highest / 10) * 10
  const y = (minutes) => top + plotHeight - (minutes / scaleMax) * plotHeight
  const slot = (width - left) / departures.length
  const barWidth = Math.min(56, slot * 0.6)
  const ticks = [0, scaleMax / 2, scaleMax]

  return (
    <figure className="dashboard-chart" id="trip-times-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Average actual trip time and planned trip time for each departure">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={left} x2={width} y1={y(t)} y2={y(t)} className="dashboard-grid" />
            <text x={left - 6} y={y(t) + 4} textAnchor="end" className="dashboard-axis">{t}</text>
          </g>
        ))}
        {departures.map((d, i) => {
          const centre = left + slot * i + slot / 2
          return (
            <g key={d.id}>
              {d.enough ? (
                <>
                  <rect x={centre - barWidth / 2} y={y(d.average)} width={barWidth}
                    height={y(0) - y(d.average)} rx="3" className="dashboard-bar" />
                  <text x={centre} y={y(d.average) - 5} textAnchor="middle" className="dashboard-value">
                    {Math.round(d.average)}
                  </text>
                </>
              ) : (
                <text x={centre} y={y(0) - 8} textAnchor="middle" className="dashboard-axis">No data</text>
              )}
              {d.planned != null && (
                <line x1={centre - slot / 2 + 4} x2={centre + slot / 2 - 4} y1={y(d.planned)} y2={y(d.planned)}
                  className="dashboard-planned" />
              )}
              <text x={centre} y={height - 8} textAnchor="middle" className="dashboard-axis">{d.time}</text>
            </g>
          )
        })}
      </svg>
      <figcaption className="dashboard-legend">
        <span><span className="dashboard-key dashboard-key-bar" /> Average actual minutes</span>
        <span><span className="dashboard-key dashboard-key-planned" /> Planned minutes</span>
      </figcaption>
    </figure>
  )
}

function DashboardPage() {
  const [routes, setRoutes] = useState([])
  const [routeId, setRouteId] = useState('')
  const [departures, setDepartures] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let isMounted = true
    supabase.from('routes').select('id, name').order('name').then(({ data, error }) => {
      if (!isMounted) return
      if (error) {
        setLoadError(true)
        setLoading(false)
        return
      }
      setRoutes(data)
      if (data.length) setRouteId(data[0].id)
      else setLoading(false)
    })
    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    if (!routeId) return
    let isMounted = true
    loadDepartures(routeId)
      .then((rows) => { if (isMounted) setDepartures(rows) })
      .catch(() => { if (isMounted) setLoadError(true) })
      .finally(() => { if (isMounted) setLoading(false) })
    return () => { isMounted = false }
  }, [routeId])

  const chooseRoute = (id) => {
    setLoading(true)
    setLoadError(false)
    setRouteId(id)
  }

  const hasTrips = departures.some((d) => d.trips > 0)

  return (
    <div className="bus-confirmed-section" id="dashboard-page">
      <div className="bus-content-intro">
        <h2>Dashboard</h2>
        <p>How long each departure really takes, compared with the timetable.</p>
      </div>

      {routes.length > 0 && (
        <div className="schedule-route-selector">
          <label className="schedule-route-label" htmlFor="dashboard-route-select">Route</label>
          <select id="dashboard-route-select" className="form-select schedule-route-select"
            value={routeId} onChange={(e) => chooseRoute(e.target.value)}>
            {routes.map((route) => <option key={route.id} value={route.id}>{route.name}</option>)}
          </select>
        </div>
      )}

      <h3 className="dashboard-heading">Trip times</h3>

      {loading && <p>Loading trip times…</p>}

      {loadError && (
        <div className="alert alert-error" role="alert" id="dashboard-error">
          <div>Trip times could not be loaded.</div>
        </div>
      )}

      {!loading && !loadError && !hasTrips && (
        <div className="schedule-empty-notice" id="dashboard-no-trips">No trips recorded yet.</div>
      )}

      {!loading && !loadError && hasTrips && (
        <>
          <TripTimesChart departures={departures} />
          <div className="table-responsive">
            <table className="trips-table" id="trip-times-table">
              <thead>
                <tr>
                  <th scope="col">Departure</th>
                  <th scope="col">Completed trips</th>
                  <th scope="col">Average actual</th>
                  <th scope="col">Planned</th>
                  <th scope="col">Difference</th>
                  <th scope="col">Suggested time</th>
                </tr>
              </thead>
              <tbody>
                {departures.map((d) => (
                  <tr key={d.id}>
                    <td>{d.time}</td>
                    <td>{d.trips}</td>
                    {d.enough ? (
                      <>
                        <td>{Math.round(d.average * 10) / 10} min</td>
                        <td>{d.planned != null ? `${d.planned} min` : '—'}</td>
                        <td className={d.planned != null && d.average > d.planned ? 'dashboard-over' : 'dashboard-under'}>
                          {d.planned != null ? `${signed(d.average - d.planned)} min` : '—'}
                        </td>
                      </>
                    ) : (
                      <td colSpan="3" className="dashboard-not-enough">Not enough data</td>
                    )}
                    {d.suggested != null ? (
                      <td className="dashboard-suggested">{d.suggested} min</td>
                    ) : (
                      <td className="dashboard-not-enough">Not enough data</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="dashboard-note" id="suggested-time-note">
            Suggested time: sort a departure's completed trips from shortest to longest and
            take the trip time that 85% of them finished within, rounded up to the next
            minute. Departures with fewer than {MIN_TRIPS} completed trips show "Not enough data".
          </p>
        </>
      )}
    </div>
  )
}

export default DashboardPage
