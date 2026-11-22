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

function NotStartedPage() {
  const [state, setState] = useState({ loading: true, error: false, rows: [] })

  useEffect(() => {
    let isMounted = true
    loadNotStarted()
      .then((rows) => { if (isMounted) setState({ loading: false, error: false, rows }) })
      .catch(() => { if (isMounted) setState({ loading: false, error: true, rows: [] }) })
    return () => { isMounted = false }
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

      {!state.loading && !state.error && state.rows.length > 0 && (
        <ul className="schedule-departure-list" id="not-started-list">
          {state.rows.map((row) => (
            <li key={row.id} className="schedule-departure-item not-started-item">
              <span className="not-started-route">{row.routeName}</span>
              <span className="schedule-departure-time">{row.time}</span>
              <span className="not-started-label">Not started · {row.minutesLate} min late</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default NotStartedPage
