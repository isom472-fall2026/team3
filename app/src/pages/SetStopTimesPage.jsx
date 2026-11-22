import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

function formatTime(timeStr) {
  if (!timeStr) return ''
  return String(timeStr).slice(0, 5)
}

function calculateExpectedTime(plannedStartTime, offsetMinutes) {
  if (offsetMinutes == null || offsetMinutes === '' || isNaN(Number(offsetMinutes))) {
    return ''
  }
  if (!plannedStartTime) return ''
  const parts = String(plannedStartTime).trim().split(':')
  if (parts.length < 2) return ''
  const hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1], 10)
  if (isNaN(hours) || isNaN(minutes)) return ''

  const totalMinutes = (hours * 60 + minutes + Number(offsetMinutes)) % (24 * 60)
  const posMinutes = (totalMinutes + 24 * 60) % (24 * 60)
  const newH = Math.floor(posMinutes / 60)
  const newM = posMinutes % 60
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
}

function SetStopTimesPage({ user }) {
  const [isStaff, setIsStaff] = useState(null)
  const [schedules, setSchedules] = useState([])
  const [schedulesLoading, setSchedulesLoading] = useState(true)
  const [schedulesError, setSchedulesError] = useState(false)

  const [selectedScheduleId, setSelectedScheduleId] = useState('')
  const [stops, setStops] = useState([])
  const [stopsLoading, setStopsLoading] = useState(false)
  const [stopsError, setStopsError] = useState(false)

  const [stopTimes, setStopTimes] = useState({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  // Staff check: student accounts do not see this screen
  useEffect(() => {
    let isMounted = true
    supabase.rpc('is_staff').then(({ data, error: rpcError }) => {
      if (isMounted) {
        setIsStaff(!rpcError && data === true)
      }
    })
    return () => {
      isMounted = false
    }
  }, [user])

  // Load schedules on mount
  useEffect(() => {
    let isMounted = true

    const loadSchedules = async () => {
      const { data, error: schedError } = await supabase
        .from('schedules')
        .select('id, route_id, planned_start_time, routes(id, name, is_active)')
        .order('planned_start_time')

      if (!isMounted) return
      setSchedulesLoading(false)
      if (schedError) {
        setSchedulesError(true)
        return
      }

      const activeSchedules = (data || []).filter(
        (s) => s.routes?.is_active !== false
      )
      setSchedules(activeSchedules)
    }

    loadSchedules()
    return () => {
      isMounted = false
    }
  }, [])

  // When a schedule is chosen, load its route's stops in sequence_order
  useEffect(() => {
    if (!selectedScheduleId) {
      setStops([])
      setStopTimes({})
      return
    }

    const schedule = schedules.find((s) => s.id === selectedScheduleId)
    if (!schedule || !schedule.route_id) return

    let isMounted = true
    setStopsLoading(true)
    setStopsError(false)
    setMessage('')
    setError('')
    setFieldErrors({})

    const loadRouteStops = async () => {
      const { data, error: rsError } = await supabase
        .from('routes_stops')
        .select('id, stop_id, sequence_order, offset_minutes, stops(id, name)')
        .eq('route_id', schedule.route_id)
        .order('sequence_order', { ascending: true })

      if (!isMounted) return
      setStopsLoading(false)
      if (rsError) {
        setStopsError(true)
        return
      }

      const sortedStops = [...(data || [])].sort(
        (a, b) => Number(a.sequence_order) - Number(b.sequence_order)
      )
      setStops(sortedStops)

      // Prefill time field as schedules.planned_start_time + routes_stops.offset_minutes
      const initialTimes = {}
      sortedStops.forEach((stop) => {
        initialTimes[stop.id] = calculateExpectedTime(
          schedule.planned_start_time,
          stop.offset_minutes
        )
      })
      setStopTimes(initialTimes)
    }

    loadRouteStops()
    return () => {
      isMounted = false
    }
  }, [selectedScheduleId, schedules])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!isStaff) return
    setSaving(true)
    setMessage('')
    setError('')

    // Validate format: each non-empty field must be a valid HH:MM
    const formatErrors = {}
    const hhmm = /^\d{2}:\d{2}$/
    for (const stop of stops) {
      const raw = stopTimes[stop.id]
      const val = raw && String(raw).trim() !== '' ? String(raw).trim() : null
      if (val === null) continue
      const [h, m] = val.split(':').map(Number)
      if (!hhmm.test(val) || h > 23 || m > 59) {
        formatErrors[stop.id] = 'Use HH:MM.'
      }
    }

    if (Object.keys(formatErrors).length > 0) {
      setFieldErrors(formatErrors)
      setSaving(false)
      return
    }

    // Validate stop order: each non-empty time must be >= the previous non-empty time
    let lastTime = null
    const orderErrors = {}

    for (const stop of stops) {
      const raw = stopTimes[stop.id]
      const timeVal = raw && String(raw).trim() !== '' ? String(raw).trim() : null
      if (timeVal === null) continue
      if (lastTime !== null && timeVal < lastTime) {
        orderErrors[stop.id] = `Must be after ${lastTime}.`
      } else {
        lastTime = timeVal
      }
    }

    if (Object.keys(orderErrors).length > 0) {
      setFieldErrors(orderErrors)
      setSaving(false)
      return
    }

    const { data: existingRows, error: fetchErr } = await supabase
      .from('scheduled_stop_times')
      .select('id, route_stop_id')
      .eq('schedule_id', selectedScheduleId)

    if (fetchErr) {
      setSaving(false)
      setError('Failed to save stop times. Try again.')
      return
    }

    const existingMap = new Map((existingRows || []).map((r) => [r.route_stop_id, r.id]))
    const operations = []
    const toInsert = []
    let emptyCount = 0

    for (const stop of stops) {
      const raw = stopTimes[stop.id]
      const timeVal = raw && String(raw).trim() !== '' ? String(raw).trim() : null
      if (timeVal === null) emptyCount++
      const existingId = existingMap.get(stop.id)

      if (existingId) {
        operations.push(
          supabase
            .from('scheduled_stop_times')
            .update({ expected_arrival_time: timeVal })
            .eq('id', existingId)
        )
      } else {
        toInsert.push({
          schedule_id: selectedScheduleId,
          route_stop_id: stop.id,
          expected_arrival_time: timeVal,
        })
      }
    }

    if (toInsert.length > 0) {
      operations.push(supabase.from('scheduled_stop_times').insert(toInsert))
    }

    const results = await Promise.all(operations)
    const failed = results.find((r) => r.error)

    setSaving(false)

    if (failed) {
      setError(failed.error?.message || 'Failed to save stop times. Try again.')
      return
    }

    if (emptyCount === 0) {
      setMessage('Saved.')
    } else {
      const noun = emptyCount === 1 ? 'stop has' : 'stops have'
      setMessage(`Saved. ${emptyCount} ${noun} no time yet.`)
    }
  }

  if (isStaff === false) {
    return (
      <div className="bus-confirmed-section" id="set-stop-times-page">
        <div className="schedule-empty-notice">
          This screen is for transportation coordinators and staff only.
        </div>
      </div>
    )
  }

  const selectedSchedule = schedules.find((s) => s.id === selectedScheduleId)

  return (
    <div className="bus-confirmed-section" id="set-stop-times-page">
      <div className="bus-content-intro">
        <h2>Set Stop Arrival Times</h2>
        <p>Set the expected arrival time at each stop for a departure.</p>
      </div>

      {schedulesLoading && <p>Loading departures…</p>}

      {schedulesError && (
        <div className="alert alert-error" role="alert" id="set-stop-times-schedules-error">
          <div>Departures could not be loaded. Try again.</div>
        </div>
      )}

      {!schedulesLoading && !schedulesError && schedules.length === 0 && (
        <div className="schedule-empty-notice" id="set-stop-times-no-schedules">
          No departures available.
        </div>
      )}

      {!schedulesLoading && !schedulesError && schedules.length > 0 && (
        <div className="schedule-route-selector" style={{ marginBottom: '20px' }}>
          <label className="schedule-route-label" htmlFor="schedule-select">
            Departure
          </label>
          <select
            id="schedule-select"
            className="form-select schedule-route-select"
            value={selectedScheduleId}
            onChange={(e) => setSelectedScheduleId(e.target.value)}
          >
            <option value="">— Select a departure —</option>
            {schedules.map((s) => {
              const routeLabel = s.routes?.name ? `${s.routes.name} — ` : ''
              return (
                <option key={s.id} value={s.id}>
                  {routeLabel}{formatTime(s.planned_start_time)}
                </option>
              )
            })}
          </select>
        </div>
      )}

      {selectedScheduleId && (
        <div className="schedule-departures-section" id="set-stop-times-section">
          <h3 className="schedule-departures-heading" style={{ marginBottom: '16px' }}>
            {selectedSchedule?.routes?.name
              ? `${selectedSchedule.routes.name} (${formatTime(selectedSchedule.planned_start_time)})`
              : `Departure ${formatTime(selectedSchedule?.planned_start_time)}`}{' '}
            — Stop Times
          </h3>

          {stopsLoading && <p>Loading stops…</p>}

          {stopsError && (
            <div className="alert alert-error" role="alert" id="set-stop-times-stops-error">
              <div>Stops could not be loaded. Try again.</div>
            </div>
          )}

          {!stopsLoading && !stopsError && stops.length === 0 && (
            <div className="schedule-empty-notice" id="set-stop-times-empty">
              No stops listed for this route.
            </div>
          )}

          {!stopsLoading && !stopsError && stops.length > 0 && (
            <>
              {message && (
                <div
                  className="alert alert-success"
                  role="alert"
                  id="set-stop-times-success"
                  style={{ marginBottom: '14px' }}
                >
                  <div>{message}</div>
                </div>
              )}

              {error && (
                <div
                  className="alert alert-error"
                  role="alert"
                  id="set-stop-times-error"
                  style={{ marginBottom: '14px' }}
                >
                  <div>{error}</div>
                </div>
              )}

              <form id="f-set-stop-times" className="auth-form" onSubmit={handleSave} noValidate>
                <div
                  className="stop-times-list"
                  id="stop-times-list"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  {stops.map((stop) => {
                    const isOffsetEmpty =
                      stop.offset_minutes == null || stop.offset_minutes === ''
                    const fieldError = fieldErrors[stop.id]

                    return (
                      <div
                        key={stop.id}
                        className={`form-group ${fieldError ? 'bad' : ''}`}
                        data-route-stop-id={stop.id}
                        style={{
                          padding: '14px',
                          background: 'var(--white)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                        }}
                      >
                        <label
                          htmlFor={`time-${stop.id}`}
                          style={{
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            marginBottom: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span style={{ color: 'var(--text-muted)' }}>
                            {stop.sequence_order}.
                          </span>
                          <span>{stop.stops?.name || 'Unnamed stop'}</span>
                        </label>

                        <input
                          id={`time-${stop.id}`}
                          type="text"
                          placeholder={
                            isOffsetEmpty ? 'No offset set — type a time' : 'HH:MM'
                          }
                          value={stopTimes[stop.id] ?? ''}
                          style={{
                            width: '100%',
                            minHeight: '40px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: fieldError
                              ? '1.5px solid var(--error-text)'
                              : '1.5px solid var(--border-color)',
                            background: 'var(--white)',
                            color: 'var(--text-primary)',
                          }}
                          onChange={(e) => {
                            const val = e.target.value
                            setStopTimes((prev) => ({ ...prev, [stop.id]: val }))
                            if (fieldErrors[stop.id]) {
                              setFieldErrors((prev) => ({ ...prev, [stop.id]: '' }))
                            }
                          }}
                        />

                        {isOffsetEmpty && !stopTimes[stop.id] && (
                          <div
                            className="field-hint"
                            style={{
                              color: 'var(--text-muted)',
                              fontSize: '13px',
                              marginTop: '4px',
                            }}
                          >
                            No offset set — type a time
                          </div>
                        )}

                        {fieldError && (
                          <div
                            className="field-error msg"
                            style={{
                              color: 'var(--error-text)',
                              fontSize: '13px',
                              fontWeight: 600,
                              marginTop: '4px',
                            }}
                          >
                            {fieldError}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  id="save-stop-times-submit"
                  disabled={saving}
                  style={{ marginTop: '20px' }}
                >
                  {saving ? 'Saving…' : 'Save stop times'}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default SetStopTimesPage
