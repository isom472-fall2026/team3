import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Departures are timetabled in Kuwait time, so "today" is Kuwait's today,
// whatever time zone the coordinator's laptop is set to.
function kuwaitToday() {
  const now = new Date()
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuwait' }).format(now) // YYYY-MM-DD
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kuwait', weekday: 'short' }).format(now) // Sun
  return { date, weekday }
}

function runsOn(daysOfWeek, weekday) {
  if (!daysOfWeek || !daysOfWeek.trim()) return false
  return daysOfWeek.split(',').map((d) => d.trim()).includes(weekday)
}

function StartTripPage() {
  const [departures, setDepartures] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadDepartures = async () => {
      const { weekday } = kuwaitToday()
      const { data, error } = await supabase
        .from('schedules')
        .select('id, planned_start_time, days_of_week, routes!inner(id, name, is_active)')
        .eq('routes.is_active', true)
        .order('planned_start_time')

      if (!isMounted) return
      setLoadError(Boolean(error))
      setDepartures(
        error
          ? []
          : (data || [])
              .filter((s) => s.routes?.is_active === true && runsOn(s.days_of_week, weekday))
              .sort((a, b) => a.planned_start_time.localeCompare(b.planned_start_time))
      )
      setLoading(false)
    }

    loadDepartures()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="bus-confirmed-section" id="start-trip-page">
      <div className="bus-content-intro">
        <h2>Start a trip</h2>
        <p>Today's departures. Choose a bus and start the trip.</p>
      </div>

      {loading && <p>Loading departures…</p>}

      {loadError && (
        <div className="alert alert-error" role="alert">
          <div>Departures could not be loaded. Try again.</div>
        </div>
      )}

      {!loading && !loadError && departures.length === 0 && (
        <p className="no-routes-message" id="no-departures-message">No departures today.</p>
      )}

      {departures.length > 0 && (
        <div className="route-hours-grid" id="departure-list">
          {departures.map((dep) => (
            <div key={dep.id} className="route-hours-card" data-schedule-id={dep.id}>
              <div className="route-hours-name">{dep.routes.name}</div>
              <div className="route-hours-value">{dep.planned_start_time.slice(0, 5)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default StartTripPage
