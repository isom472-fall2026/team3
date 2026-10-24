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

function getTodayDateStrings() {
  const d = new Date()
  const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  try {
    const kuwait = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuwait' }).format(d)
    return [local, kuwait]
  } catch {
    return [local]
  }
}

function isTripCancelledToday(trip) {
  // Only exact lower-case 'cancelled' is treated as cancelled; 'Cancelled' or 'CANCELLED' are ignored.
  if (!trip || trip.status !== 'cancelled' || !trip.trip_date) return false
  const tripDateStr = String(trip.trip_date).split('T')[0].trim()
  if (!tripDateStr) return false
  return getTodayDateStrings().includes(tripDateStr)
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

  // Load schedules and today's cancelled trips whenever the selected route changes.
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

      const fetchCancelledScheduleIds = async () => {
        if (scheduleIds.length === 0) {
          setTripsError(false)
          return new Set()
        }

        try {
          let tripsQuery = supabase
            .from('trips')
            .select('schedule_id, status, trip_date')

          if (typeof tripsQuery.in === 'function') {
            tripsQuery = tripsQuery.in('schedule_id', scheduleIds)
          }

          const { data: tripsData, error: tripsErr } = await tripsQuery
          if (tripsErr) {
            setTripsError(true)
            return null
          }

          setTripsError(false)
          return new Set(
            (tripsData || [])
              .filter(isTripCancelledToday)
              .map((t) => t.schedule_id)
          )
        } catch {
          setTripsError(true)
          return null
        }
      }

      const cancelledScheduleIds = (await fetchCancelledScheduleIds()) || new Set()
      if (!isMounted) return

      // Deduplicate rows that share the same time and days string.
      const seen = new Map()
      for (const row of (scheduleData || [])) {
        const key = `${row.planned_start_time}|${row.days_of_week ?? ''}`
        const isCancelled = cancelledScheduleIds.has(row.id)
        if (seen.has(key)) {
          const existing = seen.get(key)
          existing.scheduleIds.push(row.id)
          if (isCancelled) {
            existing.isCancelled = true
          }
        } else {
          seen.set(key, {
            ...row,
            scheduleIds: [row.id],
            isCancelled,
          })
        }
      }

      const unique = Array.from(seen.values())

      // Earliest departure first.
      unique.sort((a, b) => {
        if (a.planned_start_time < b.planned_start_time) return -1
        if (a.planned_start_time > b.planned_start_time) return 1
        return 0
      })

      setDepartures(unique)
      setScheduleLoading(false)

      const refreshCancelledTrips = async () => {
        if (!isMounted || scheduleIds.length === 0) return
        const latestCancelledIds = await fetchCancelledScheduleIds()
        if (!isMounted || !latestCancelledIds) return

        setDepartures((prev) =>
          prev.map((dep) => {
            const isCancelled = dep.scheduleIds
              ? dep.scheduleIds.some((id) => latestCancelledIds.has(id))
              : latestCancelledIds.has(dep.id)
            if (dep.isCancelled === isCancelled) return dep
            return { ...dep, isCancelled }
          })
        )
      }

      // Realtime subscription for immediate updates, with a 5-second polling fallback.
      if (typeof supabase.channel === 'function') {
        try {
          channel = supabase
            .channel(`trips-changes-${selectedRouteId}`)
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'trips' },
              () => {
                refreshCancelledTrips()
              }
            )
          if (channel && typeof channel.subscribe === 'function') {
            channel.subscribe()
          }
        } catch {
          channel = null
        }
      }

      intervalId = setInterval(refreshCancelledTrips, 5000)
    }

    loadSchedule()

    return () => {
      isMounted = false
      if (intervalId) clearInterval(intervalId)
      if (channel && typeof supabase.removeChannel === 'function') {
        supabase.removeChannel(channel)
      }
    }
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
              {departures.map((dep, i) => (
                <li
                  key={dep.id || i}
                  className={`schedule-departure-item${dep.isCancelled ? ' schedule-departure-cancelled cancelled' : ''}`}
                  data-time={dep.planned_start_time}
                >
                  <span className="schedule-departure-time">
                    {dep.isCancelled ? (
                      <del style={{ textDecoration: 'line-through' }}>
                        {formatTime(dep.planned_start_time)}
                      </del>
                    ) : (
                      formatTime(dep.planned_start_time)
                    )}
                  </span>
                  <span className="schedule-departure-sep" aria-hidden="true">—</span>
                  <span className="schedule-departure-days">
                    {dep.isCancelled ? (
                      <del style={{ textDecoration: 'line-through' }}>
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
