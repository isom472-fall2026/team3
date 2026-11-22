import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { kuwaitToday, kuwaitWeekday, kuwaitSecondsOfDay } from '../lib/kuwaitTime.js'
import { findNotStarted } from '../lib/notStarted.js'

async function loadNotStarted() {
  const today = kuwaitToday()
  const [schedulesRes, tripsRes] = await Promise.all([
    supabase.from('schedules').select('id, route_id, planned_start_time, days_of_week, routes(name, is_active)'),
    supabase.from('trips').select('schedule_id').eq('trip_date', today),
  ])
  if (schedulesRes.error || tripsRes.error) throw schedulesRes.error || tripsRes.error

  const started = new Set((tripsRes.data || []).map((t) => t.schedule_id))
  return findNotStarted(schedulesRes.data || [], started, kuwaitWeekday(), kuwaitSecondsOfDay())
}

// A trip started from Start a trip (#105) must clear its row within 5 seconds, so reload
// more often than that. Each reload also brings in departures that just became 10 minutes late.
const REFRESH_MS = 3000

function NotStartedPage() {
  const [state, setState] = useState({ loading: true, error: false, rows: [], noDays: 0, unreadableDays: 0 })

  useEffect(() => {
    let isMounted = true
    const refresh = () =>
      loadNotStarted()
        .then((result) => { if (isMounted) setState({ loading: false, error: false, ...result }) })
        .catch(() => {
          // After the first load, a failed refresh keeps the last list on screen.
          if (isMounted) setState((prev) => (prev.loading ? { loading: false, error: true, rows: [], noDays: 0, unreadableDays: 0 } : prev))
        })
    refresh()
    const id = setInterval(refresh, REFRESH_MS)
    return () => {
      isMounted = false
      clearInterval(id)
    }
  }, [])

  return (
    <div className="bus-confirmed-section" id="not-started-page">
      <div className="bus-content-intro">
        <h2>Not started</h2>
        <p>Today's departures that have not started 10 minutes after their time.</p>
      </div>

      {state.loading && <p>Loading today's departures…</p>}

      {state.error && (
        <div className="alert alert-error" role="alert" id="not-started-error">
          <div>Departures could not be loaded.</div>
        </div>
      )}

      {!state.loading && !state.error && state.rows.length === 0 && (
        <div className="schedule-empty-notice" id="not-started-none">
          Every departure so far has started.
        </div>
      )}

      {!state.loading && !state.error && state.rows.length > 0 && (
        <ul className="schedule-departure-list" id="not-started-list">
          {state.rows.map((row) => (
            <li key={row.id} className="schedule-departure-item not-started-item">
              <span className="not-started-route">{row.routeName}</span>
              <span className="schedule-departure-time">{row.time}</span>
              <span className="not-started-label">Not started — {row.minutesLate} min</span>
            </li>
          ))}
        </ul>
      )}

      {!state.loading && !state.error && state.noDays > 0 && (
        <p className="not-started-skipped" id="not-started-skipped-no-days">
          {state.noDays === 1
            ? '1 departure has no days set and was skipped.'
            : `${state.noDays} departures have no days set and were skipped.`}
        </p>
      )}

      {!state.loading && !state.error && state.unreadableDays > 0 && (
        <p className="not-started-skipped" id="not-started-skipped-unreadable-days">
          {state.unreadableDays === 1
            ? '1 departure has days that could not be read and was skipped.'
            : `${state.unreadableDays} departures have days that could not be read and were skipped.`}
        </p>
      )}
    </div>
  )
}

export default NotStartedPage
