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
  const [buses, setBuses] = useState([])
  const [chosenBus, setChosenBus] = useState({}) // schedule id -> bus id
  const [todaysTrips, setTodaysTrips] = useState([])
  const [messages, setMessages] = useState({}) // schedule id -> message under that departure
  const [startingId, setStartingId] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)
  const [pendingCancel, setPendingCancel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadDepartures = async () => {
      const { date, weekday } = kuwaitToday()
      const [schedulesResult, busesResult, tripsResult] = await Promise.all([
        supabase
          .from('schedules')
          .select('id, planned_start_time, days_of_week, routes!inner(id, name, is_active)')
          .eq('routes.is_active', true)
          .order('planned_start_time'),
        supabase.from('buses').select('id, bus_number, status').eq('status', 'active').order('bus_number'),
        supabase.from('trips').select('id, schedule_id, bus_id, status, buses(bus_number)').eq('trip_date', date),
      ])

      if (!isMounted) return
      const failed = Boolean(schedulesResult.error || busesResult.error || tripsResult.error)
      setLoadError(failed)
      setDepartures(
        failed
          ? []
          : (schedulesResult.data || [])
              .filter((s) => s.routes?.is_active === true && runsOn(s.days_of_week, weekday))
              .sort((a, b) => a.planned_start_time.localeCompare(b.planned_start_time))
      )
      // Buses in maintenance, out of service, or with no status cannot be sent out.
      setBuses(failed ? [] : (busesResult.data || []).filter((b) => b.status === 'active'))
      setTodaysTrips(failed ? [] : tripsResult.data || [])
      setLoading(false)
    }

    loadDepartures()

    return () => {
      isMounted = false
    }
  }, [])

  const setMessage = (scheduleId, text) => setMessages((prev) => ({ ...prev, [scheduleId]: text }))

  const startTrip = async (dep) => {
    const busId = chosenBus[dep.id]
    if (!busId) {
      setMessage(dep.id, 'Choose a bus.')
      return
    }
    const bus = buses.find((b) => b.id === busId)
    const busyMessage = `Bus ${bus?.bus_number ?? ''} is already on a trip.`
    if (todaysTrips.some((t) => t.bus_id === busId && t.status === 'active')) {
      setMessage(dep.id, busyMessage)
      return
    }

    setStartingId(dep.id)
    setMessage(dep.id, '')
    const { date } = kuwaitToday()
    const { data, error } = await supabase
      .from('trips')
      .insert({
        schedule_id: dep.id,
        bus_id: busId,
        trip_date: date,
        status: 'active',
        actual_start: new Date().toISOString(),
      })
      .select('id, schedule_id, bus_id, status, buses(bus_number)')
    setStartingId(null)

    if (error) {
      // 23505: the database's one-active-trip-per-bus-per-day rule caught a trip
      // started from another screen since this page loaded.
      setMessage(dep.id, error.code === '23505' ? busyMessage : 'Trip could not be started.')
      return
    }
    // Only a row the database returned counts as started.
    if (data && data.length > 0) {
      setTodaysTrips((prev) => [...prev, ...data])
    } else {
      setMessage(dep.id, 'Trip could not be started.')
    }
  }

  const askCancelTrip = (dep, trip) => {
    const busNumber =
      trip.buses?.bus_number || buses.find((b) => b.id === trip.bus_id)?.bus_number || ''
    const question = `Cancel the ${dep.routes?.name ?? ''} trip on bus ${busNumber}?`

    setPendingCancel({ dep, trip, question })
  }

  const cancelTrip = async (dep, trip) => {
    setCancellingId(trip.id)
    setMessage(dep.id, '')

    // .select() returns the changed row. When the database's rules refuse the change,
    // Supabase can answer with no error and no rows, so an empty result is a refusal too.
    const { data: updated, error } = await supabase
      .from('trips')
      .update({ status: 'cancelled' })
      .eq('id', trip.id)
      .select('id')

    setCancellingId(null)
    setPendingCancel(null)

    if (error || !updated || updated.length === 0) {
      console.error('Trip was not cancelled:', error || 'no row changed')
      setMessage(dep.id, 'Trip could not be cancelled. Try again.')
      return
    }

    setTodaysTrips((prev) =>
      prev.map((t) => (t.id === trip.id ? { ...t, status: 'cancelled' } : t))
    )
  }

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
            {departures.map((dep) => {
              const trip =
                todaysTrips.find((t) => t.schedule_id === dep.id && (t.status === 'active' || t.status === 'scheduled')) ||
                todaysTrips.find((t) => t.schedule_id === dep.id)
              const isStatusEmpty = trip && (!trip.status || !trip.status.trim())
              const isEnded = trip && (trip.status === 'completed' || trip.status === 'cancelled')
              const canCancel = trip && (trip.status === 'active' || trip.status === 'scheduled')

              return (
                <div key={dep.id} className="route-hours-card" data-schedule-id={dep.id}>
                  <div className="route-hours-name">{dep.routes.name}</div>
                  <div className="route-hours-value">{dep.planned_start_time.slice(0, 5)}</div>
                  {isStatusEmpty && (
                    <div className="departure-state" id={`state-${dep.id}`}>
                      Status not set — cannot cancel
                    </div>
                  )}
                  {isEnded && (
                    <div className="departure-state" id={`state-${dep.id}`}>
                      This trip has already ended
                    </div>
                  )}
                  {canCancel && (
                    <>
                      <div className="departure-state" id={`state-${dep.id}`}>
                        {trip.status === 'active' ? 'Started' : 'Scheduled'}
                      </div>
                      <button
                        type="button"
                        className="btn btn-danger btn-cancel-trip"
                        id={`cancel-${dep.id}`}
                        data-cancel={trip.id}
                        disabled={cancellingId === trip.id}
                        onClick={() => askCancelTrip(dep, trip)}
                      >
                        Cancel trip
                      </button>
                    </>
                  )}
                  {!trip && (
                    <>
                      <label className="departure-bus">
                        Bus{' '}
                        <select
                          id={`bus-select-${dep.id}`}
                          value={chosenBus[dep.id] || ''}
                          onChange={(e) => setChosenBus((prev) => ({ ...prev, [dep.id]: e.target.value }))}
                        >
                          <option value="">Choose a bus</option>
                          {buses.map((bus) => (
                            <option key={bus.id} value={bus.id}>{bus.bus_number}</option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        id={`start-${dep.id}`}
                        disabled={startingId === dep.id}
                        onClick={() => startTrip(dep)}
                      >
                        {startingId === dep.id ? 'Starting…' : 'Start'}
                      </button>
                    </>
                  )}
                  {messages[dep.id] && (
                    <div className="alert alert-error" role="alert" id={`message-${dep.id}`}>
                      {messages[dep.id]}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

      {pendingCancel && (
        <div
          className="scrim open"
          id="scrim"
          role="presentation"
          onClick={(e) => {
            if (e.target.id === 'scrim') setPendingCancel(null)
          }}
        >
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-h">
            <h3 id="dlg-h">{pendingCancel.question}</h3>
            <p>Students will see this trip as cancelled straight away, and the bus leaves the map.</p>
            <div className="acts">
              <button
                type="button"
                className="btn btn-secondary"
                id="dlg-no"
                disabled={cancellingId === pendingCancel.trip.id}
                onClick={() => setPendingCancel(null)}
              >
                Keep trip
              </button>
              <button
                type="button"
                className="btn btn-danger"
                id="dlg-yes"
                disabled={cancellingId === pendingCancel.trip.id}
                onClick={() => cancelTrip(pendingCancel.dep, pendingCancel.trip)}
              >
                {cancellingId === pendingCancel.trip.id ? 'Cancelling…' : 'Yes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StartTripPage
