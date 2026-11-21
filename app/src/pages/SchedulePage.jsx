import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { kuwaitSecondsOfDay, kuwaitToday, kuwaitWeekday } from '../lib/kuwaitTime.js'
import { departureStatus } from '../lib/departureStatus.js'

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

function runsOn(days_of_week, weekday) {
  return Boolean(days_of_week) && VALID_DOW_RE.test(days_of_week) && days_of_week.split(',').includes(weekday)
}

function SchedulePage() {
  const [routes, setRoutes] = useState([])
  const [routesError, setRoutesError] = useState(false)
  const [routesLoading, setRoutesLoading] = useState(true)

  const [selectedRouteId, setSelectedRouteId] = useState('')

  const [departures, setDepartures] = useState([])
  const [scheduleError, setScheduleError] = useState(false)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [tripsError, setTripsError] = useState(false)

  // "Not started yet" turns into "Did not start" with no trip change, so the clock re-renders the list.
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000)
    return () => clearInterval(id)
  }, [])

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
      setRoutes(error ? [] : [...(data || [])].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })))
      setRoutesLoading(false)
    }

    loadRoutes()
    return () => { isMounted = false }
  }, [])

  // Load schedules and today's trips whenever the selected route changes.
  useEffect(() => {
    if (!selectedRouteId) return

    let isMounted = true
    let channel = null
    let intervalId = null

    const loadSchedule = async () => {
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedules')
        .select('id, planned_start_time, days_of_week')
        .eq('route_id', selectedRouteId)

      if (!isMounted) return

      if (scheduleError) {
        setScheduleError(true)
        setScheduleLoading(false)
        return
      }

      const scheduleIds = (scheduleData || []).map((s) => s.id)

      // Guests cannot read delay_logs (#131); RLS returns no rows for them, so they see "Running" without minutes.
      const fetchTodaysTrips = async () => {
        if (scheduleIds.length === 0) {
          setTripsError(false)
          return []
        }

        const { data: tripsData, error: tripsErr } = await supabase
          .from('trips')
          .select('schedule_id, status, actual_start, delay_logs(delay_minutes, logged_at)')
          .in('schedule_id', scheduleIds)
          .eq('trip_date', kuwaitToday())

        if (tripsErr) {
          setTripsError(true)
          return null
        }

        setTripsError(false)
        return tripsData || []
      }

      const tripsFor = (ids, trips) => trips.filter((t) => ids.includes(t.schedule_id))
      const hasCancelled = (trips) => trips.some((t) => t.status === 'cancelled')

      const todaysTrips = (await fetchTodaysTrips()) || []
      if (!isMounted) return

      // Deduplicate rows that share the same time and days string.
      const seen = new Map()
      for (const row of (scheduleData || [])) {
        const key = `${row.planned_start_time}|${row.days_of_week ?? ''}`
        if (seen.has(key)) {
          seen.get(key).scheduleIds.push(row.id)
        } else {
          seen.set(key, { ...row, scheduleIds: [row.id] })
        }
      }

      const unique = Array.from(seen.values()).map((dep) => {
        const todayTrips = tripsFor(dep.scheduleIds, todaysTrips)
        return { ...dep, todayTrips, isCancelled: hasCancelled(todayTrips) }
      })

      // Earliest departure first.
      unique.sort((a, b) => {
        if (a.planned_start_time < b.planned_start_time) return -1
        if (a.planned_start_time > b.planned_start_time) return 1
        return 0
      })

      setDepartures(unique)
      setScheduleLoading(false)

      const refreshTodaysTrips = async () => {
        if (!isMounted || scheduleIds.length === 0) return
        const latestTrips = await fetchTodaysTrips()
        if (!isMounted || !latestTrips) return

        setDepartures((prev) =>
          prev.map((dep) => {
            const todayTrips = tripsFor(dep.scheduleIds, latestTrips)
            return { ...dep, todayTrips, isCancelled: hasCancelled(todayTrips) }
          })
        )
      }

      // Realtime shows a trip change straight away; the 5-second poll also runs in case the connection drops,
      // and picks up new delay_logs rows, which realtime is not listening to here.
      if (scheduleIds.length > 0) {
        channel = supabase
          .channel(`trips-changes-${selectedRouteId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'trips',
              filter: `schedule_id=in.(${scheduleIds.join(',')})`,
            },
            refreshTodaysTrips
          )
          .subscribe()
      }

      intervalId = setInterval(refreshTodaysTrips, 5000)
    }

    loadSchedule()

    return () => {
      isMounted = false
      if (intervalId) clearInterval(intervalId)
      if (channel) supabase.removeChannel(channel)
    }
  }, [selectedRouteId])

  const selectedRoute = routes.find((r) => r.id === selectedRouteId)
  const todayWeekday = kuwaitWeekday(now)
  const nowSeconds = kuwaitSecondsOfDay(now)

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
              setTripsError(false)
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

          {tripsError && (
            <div className="alert alert-error" role="alert" id="schedule-trips-error">
              <div>Today's changes could not be loaded.</div>
            </div>
          )}

          {!scheduleLoading && !scheduleError && departures.length === 0 && (
            <div className="schedule-empty-notice" id="schedule-no-departures">
              No departures scheduled for this route.
            </div>
          )}

          {!scheduleLoading && !scheduleError && departures.length > 0 && (
            <ul className="schedule-departure-list" aria-label="Departure times">
              {departures.map((dep, i) => {
                const status = !dep.isCancelled && runsOn(dep.days_of_week, todayWeekday)
                  ? departureStatus(dep.planned_start_time, dep.todayTrips, nowSeconds)
                  : null
                return (
                <li
                  key={dep.id || i}
                  className={`schedule-departure-item${dep.isCancelled ? ' schedule-departure-cancelled' : ''}`}
                  data-time={dep.planned_start_time}
                >
                  <span className="schedule-departure-time">
                    {dep.isCancelled ? (
                      <del>
                        {formatTime(dep.planned_start_time)}
                      </del>
                    ) : (
                      formatTime(dep.planned_start_time)
                    )}
                  </span>
                  <span className="schedule-departure-sep" aria-hidden="true">—</span>
                  <span className="schedule-departure-days">
                    {dep.isCancelled ? (
                      <del>
                        {formatDays(dep.days_of_week)}
                      </del>
                    ) : (
                      formatDays(dep.days_of_week)
                    )}
                  </span>
                  {dep.isCancelled && (
                    <span className="schedule-departure-status schedule-departure-cancelled-label">
                      Cancelled today
                    </span>
                  )}
                  {status && (
                    <span className={`schedule-departure-status schedule-departure-status-${status.kind}`}>
                      {status.text}
                    </span>
                  )}
                </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default SchedulePage
