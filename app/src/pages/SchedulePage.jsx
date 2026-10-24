import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Pattern from the schema constraint (same rule as the CHECK on days_of_week).
const VALID_DOW_RE = /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)(,(Sun|Mon|Tue|Wed|Thu|Fri|Sat))*$/

function formatDays(days_of_week) {
  if (!days_of_week || !VALID_DOW_RE.test(days_of_week)) return 'Days not set'
  return days_of_week.replace(/,/g, ', ')
}

function formatTime(timeStr) {
  // timeStr arrives as 'HH:MM:SS' from Postgres TIME column; display as HH:MM.
  if (!timeStr) return '—'
  return timeStr.slice(0, 5)
}

function SchedulePage() {
  const [routes, setRoutes] = useState([])
  const [routesError, setRoutesError] = useState(false)
  const [routesLoading, setRoutesLoading] = useState(true)

  const [selectedRouteId, setSelectedRouteId] = useState('')

  const [departures, setDepartures] = useState([])
  const [scheduleError, setScheduleError] = useState(false)
  const [scheduleLoading, setScheduleLoading] = useState(false)

  // Load active routes once on mount, sorted alphabetically by name.
  useEffect(() => {
    let isMounted = true

    const loadRoutes = async () => {
      const { data, error } = await supabase
        .from('routes')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      if (!isMounted) return
      setRoutesError(Boolean(error))
      setRoutes(error ? [] : data || [])
      setRoutesLoading(false)
    }

    loadRoutes()
    return () => { isMounted = false }
  }, [])

  // Load schedules whenever the selected route changes.
  useEffect(() => {
    if (!selectedRouteId) return

    let isMounted = true

    const loadSchedule = async () => {
      const { data, error } = await supabase
        .from('schedules')
        .select('planned_start_time, days_of_week')
        .eq('route_id', selectedRouteId)

      if (!isMounted) return

      if (error) {
        setScheduleError(true)
        setScheduleLoading(false)
        return
      }

      // Deduplicate rows that share the same time and days string.
      const seen = new Set()
      const unique = (data || []).filter((row) => {
        const key = `${row.planned_start_time}|${row.days_of_week ?? ''}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      // Earliest departure first.
      unique.sort((a, b) => {
        if (a.planned_start_time < b.planned_start_time) return -1
        if (a.planned_start_time > b.planned_start_time) return 1
        return 0
      })

      setDepartures(unique)
      setScheduleLoading(false)
    }

    loadSchedule()
    return () => { isMounted = false }
  }, [selectedRouteId])

  const selectedRoute = routes.find((r) => r.id === selectedRouteId)

  return (
    <div className="bus-confirmed-section" id="schedule-page">
      <div className="bus-content-intro">
        <h2>Route Schedule</h2>
        <p>Choose a route to see its planned departure times and operating days.</p>
      </div>

      {routesLoading && <p>Loading routes…</p>}

      {routesError && (
        <div className="alert alert-error" role="alert" id="schedule-routes-error">
          <div>Routes could not be loaded. Try again.</div>
        </div>
      )}

      {!routesLoading && !routesError && routes.length === 0 && (
        <div className="schedule-empty-notice" id="schedule-no-routes">
          No routes available right now.
        </div>
      )}

      {!routesLoading && !routesError && routes.length > 0 && (
        <div className="schedule-route-selector">
          <label className="schedule-route-label" htmlFor="route-select">
            Route
          </label>
          <select
            id="route-select"
            className="form-select schedule-route-select"
            value={selectedRouteId}
            onChange={(e) => {
              setSelectedRouteId(e.target.value)
              setDepartures([])
              setScheduleError(false)
              setScheduleLoading(Boolean(e.target.value))
            }}
          >
            <option value="">— Select a route —</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedRouteId && (
        <div className="schedule-departures-section" id="schedule-departures">
          <h3 className="schedule-departures-heading">
            {selectedRoute ? selectedRoute.name : ''} — Departures
          </h3>

          {scheduleLoading && <p>Loading schedule…</p>}

          {scheduleError && (
            <div className="alert alert-error" role="alert" id="schedule-load-error">
              <div>Schedule could not be loaded. Try again.</div>
            </div>
          )}

          {!scheduleLoading && !scheduleError && departures.length === 0 && (
            <div className="schedule-empty-notice" id="schedule-no-departures">
              No departures scheduled for this route.
            </div>
          )}

          {!scheduleLoading && !scheduleError && departures.length > 0 && (
            <ul className="schedule-departure-list" aria-label="Departure times">
              {departures.map((dep, i) => (
                <li
                  key={i}
                  className="schedule-departure-item"
                  data-time={dep.planned_start_time}
                >
                  <span className="schedule-departure-time">
                    {formatTime(dep.planned_start_time)}
                  </span>
                  <span className="schedule-departure-sep" aria-hidden="true">—</span>
                  <span className="schedule-departure-days">
                    {formatDays(dep.days_of_week)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default SchedulePage
