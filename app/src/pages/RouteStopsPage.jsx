import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const LOAD_ERROR = 'Stops could not be loaded. Try again.'

function byName(a, b) {
  return a.localeCompare(b, undefined, { sensitivity: 'base' })
}

function stopName(raw) {
  const name = (raw ?? '').trim()
  return name === '' ? 'Unnamed stop' : name
}

async function loadRouteStops(routeId) {
  const { data, error } = await supabase
    .from('routes_stops')
    .select('id, sequence_order, offset_minutes, stops(name)')
    .eq('route_id', routeId)
    .order('sequence_order', { ascending: true })

  if (error) return { rows: [], error: true }

  const rows = (data || [])
    .filter((row) => row.stops)
    .map((row) => ({
      id: row.id,
      sequence: row.sequence_order,
      name: stopName(row.stops.name),
      offset: row.offset_minutes,
    }))
  rows.sort((a, b) => Number(a.sequence) - Number(b.sequence) || byName(a.name, b.name))
  return { rows, error: false }
}

function RouteStopsPage({ user }) {
  const [routes, setRoutes] = useState([])
  const [routesLoading, setRoutesLoading] = useState(true)
  const [routesError, setRoutesError] = useState(false)

  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [stops, setStops] = useState([])
  const [stopsLoading, setStopsLoading] = useState(false)
  const [stopsError, setStopsError] = useState(false)

  const [isStaff, setIsStaff] = useState(false)
  const [allStops, setAllStops] = useState([])

  const [chosenStopId, setChosenStopId] = useState('')
  const [sequenceOrder, setSequenceOrder] = useState('')
  const [offsetMinutes, setOffsetMinutes] = useState('')
  const [formSaving, setFormSaving] = useState(false)
  const [formMessage, setFormMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [errors, setErrors] = useState({})

  useEffect(() => {
    let isMounted = true
    supabase.rpc('is_staff').then(({ data, error }) => {
      if (isMounted) {
        setIsStaff(!error && data === true)
      }
    })
    return () => {
      isMounted = false
    }
  }, [user])

  useEffect(() => {
    let isMounted = true

    const loadRoutes = async () => {
      const { data, error } = await supabase
        .from('routes')
        .select('id, name')
        .eq('is_active', true)

      if (!isMounted) return
      setRoutesError(Boolean(error))
      setRoutes(error ? [] : [...(data || [])].sort((a, b) => byName(a.name, b.name)))
      setRoutesLoading(false)
    }

    loadRoutes()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!isStaff) return
    let isMounted = true

    const loadAllStops = async () => {
      const { data, error } = await supabase
        .from('stops')
        .select('id, name')

      if (!isMounted) return
      if (!error && data) {
        setAllStops([...data].sort((a, b) => byName(stopName(a.name), stopName(b.name))))
      }
    }

    loadAllStops()
    return () => {
      isMounted = false
    }
  }, [isStaff])

  const fetchRouteStops = async (routeId) => {
    const { data, error } = await supabase
      .from('routes_stops')
      .select('id, sequence_order, offset_minutes, stops(name)')
      .eq('route_id', routeId)
      .order('sequence_order', { ascending: true })

    if (error) {
      setStopsError(true)
      setStopsLoading(false)
      return
    }

    const rows = (data || [])
      .filter((row) => row.stops)
      .map((row) => ({
        id: row.id,
        sequence: row.sequence_order,
        name: stopName(row.stops.name),
        offset: row.offset_minutes,
      }))
    rows.sort((a, b) => Number(a.sequence) - Number(b.sequence) || byName(a.name, b.name))

    setStops(rows)
    setStopsLoading(false)
  }

  useEffect(() => {
    if (!selectedRouteId) return
    let isMounted = true

    fetchRouteStops(selectedRouteId)

    return () => {
      isMounted = false
    }
  }, [selectedRouteId])

  const handleAddStopToRoute = async (e) => {
    e.preventDefault()
    if (!isStaff) return
    setFormMessage('')
    setFormError('')

    const newErrors = {}
    if (!chosenStopId) {
      newErrors.stop = 'Choose a stop.'
    }
    const trimmedOrder = String(sequenceOrder).trim()
    if (!trimmedOrder) {
      newErrors.order = "Enter the stop's position (1, 2, 3…)."
    } else if (!/^\d+$/.test(trimmedOrder) || Number(trimmedOrder) <= 0) {
      newErrors.order = 'Order must be 1, 2, 3…'
    }

    const trimmedOffset = String(offsetMinutes).trim()
    if (trimmedOffset !== '') {
      if (!/^\d+$/.test(trimmedOffset) || Number(trimmedOffset) < 0) {
        newErrors.offset = 'Minutes must be 0 or more.'
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    setFormSaving(true)

    const { error: insertError } = await supabase.from('routes_stops').insert([
      {
        route_id: selectedRouteId,
        stop_id: chosenStopId,
        sequence_order: Number(trimmedOrder),
        offset_minutes: trimmedOffset !== '' ? Number(trimmedOffset) : 0,
      },
    ])

    if (insertError) {
      setFormSaving(false)
      const isUniqueViolation =
        insertError.code === '23505' ||
        insertError.code === '409' ||
        insertError.message?.toLowerCase().includes('unique') ||
        insertError.message?.toLowerCase().includes('duplicate') ||
        insertError.message?.toLowerCase().includes('already exists') ||
        insertError.details?.toLowerCase().includes('already exists')

      if (isUniqueViolation) {
        setErrors({ order: `Another stop already has position ${Number(trimmedOrder)}.` })
        return
      }

      setFormError(insertError.message)
      return
    }

    setFormMessage('Stop added to route.')
    setChosenStopId('')
    setSequenceOrder('')
    setOffsetMinutes('')

    // Update the route's stops without reloading the page
    showRouteStops(await loadRouteStops(selectedRouteId))
    setFormSaving(false)
  }

  const selectedRoute = routes.find((r) => r.id === selectedRouteId)

  return (
    <div className="bus-confirmed-section" id="route-stops-page">
      <div className="bus-content-intro">
        <h2>Route Stops</h2>
        <p>Choose a route to see the stops the bus makes, in order.</p>
      </div>

      {routesLoading && <p>Loading routes…</p>}

      {routesError && (
        <div className="alert alert-error" role="alert" id="route-stops-routes-error">
          <div>{LOAD_ERROR}</div>
        </div>
      )}

      {!routesLoading && !routesError && routes.length === 0 && (
        <div className="schedule-empty-notice" id="route-stops-no-routes">
          No routes available right now.
        </div>
      )}

      {!routesLoading && !routesError && routes.length > 0 && (
        <div className="schedule-route-selector">
          <label className="schedule-route-label" htmlFor="route-stops-select">
            Route
          </label>
          <select
            id="route-stops-select"
            className="form-select schedule-route-select"
            value={selectedRouteId}
            onChange={(e) => {
              setSelectedRouteId(e.target.value)
              setStops([])
              setStopsError(false)
              setStopsLoading(Boolean(e.target.value))
              setFormMessage('')
              setFormError('')
              setErrors({})
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
        <div className="schedule-departures-section" id="route-stops-section">
          <h3 className="schedule-departures-heading">
            {selectedRoute ? selectedRoute.name : ''} — Stops
          </h3>

          {stopsLoading && <p>Loading stops…</p>}

          {stopsError && (
            <div className="alert alert-error" role="alert" id="route-stops-load-error">
              <div>{LOAD_ERROR}</div>
            </div>
          )}

          {!stopsLoading && !stopsError && stops.length === 0 && (
            <div className="schedule-empty-notice" id="route-stops-empty">
              No stops listed for this route
            </div>
          )}

          {!stopsLoading && !stopsError && stops.length > 0 && (
            <ol className="route-stops-list" aria-label="Stops on this route">
              {stops.map((stop) => (
                <li key={stop.id} className="route-stops-item">
                  {stop.name}
                </li>
              ))}
            </ol>
          )}

          {isStaff && (
            <div
              className="add-route-stop-card"
              style={{
                marginTop: '24px',
                padding: '16px',
                background: 'var(--white)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
              }}
            >
              <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>
                Add stop to route
              </h4>

              {formMessage && (
                <div className="alert alert-success" role="alert" id="add-route-stop-success" style={{ marginBottom: '14px' }}>
                  <div>{formMessage}</div>
                </div>
              )}

              {formError && (
                <div className="alert alert-error" role="alert" id="add-route-stop-error" style={{ marginBottom: '14px' }}>
                  <div>{formError}</div>
                </div>
              )}

              <form id="f-route-stop" className="auth-form" onSubmit={handleAddStopToRoute} noValidate>
                <div className={`form-group ${errors.stop ? 'bad' : ''}`} data-f="stop">
                  <label htmlFor="rs-stop">Stop</label>
                  <select
                    id="rs-stop"
                    className="form-select"
                    value={chosenStopId}
                    onChange={(e) => {
                      setChosenStopId(e.target.value)
                      if (errors.stop) setErrors((prev) => ({ ...prev, stop: '' }))
                    }}
                    style={{
                      width: '100%',
                      minHeight: '44px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: errors.stop ? '1.5px solid var(--error-text)' : '1.5px solid var(--border-color)',
                      background: 'var(--white)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="">— Choose a stop —</option>
                    {allStops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {stopName(s.name)}
                      </option>
                    ))}
                  </select>
                  {errors.stop && (
                    <div
                      className="field-error msg"
                      id="rs-stop-error"
                      style={{ color: 'var(--error-text)', fontSize: '13px', fontWeight: 600, marginTop: '4px' }}
                    >
                      {errors.stop}
                    </div>
                  )}
                </div>

                <div className={`form-group ${errors.order ? 'bad' : ''}`} data-f="order">
                  <label htmlFor="rs-order">Position</label>
                  <input
                    id="rs-order"
                    type="text"
                    inputMode="numeric"
                    placeholder="1, 2, 3…"
                    value={sequenceOrder}
                    style={{ borderColor: errors.order ? 'var(--error-text)' : undefined }}
                    onChange={(e) => {
                      setSequenceOrder(e.target.value)
                      if (errors.order) setErrors((prev) => ({ ...prev, order: '' }))
                    }}
                  />
                  {errors.order && (
                    <div
                      className="field-error msg"
                      id="rs-order-error"
                      style={{ color: 'var(--error-text)', fontSize: '13px', fontWeight: 600, marginTop: '4px' }}
                    >
                      {errors.order}
                    </div>
                  )}
                </div>

                <div className={`form-group ${errors.offset ? 'bad' : ''}`} data-f="offset">
                  <label htmlFor="rs-offset">
                    Offset minutes <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span>
                  </label>
                  <input
                    id="rs-offset"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={offsetMinutes}
                    style={{ borderColor: errors.offset ? 'var(--error-text)' : undefined }}
                    onChange={(e) => {
                      setOffsetMinutes(e.target.value)
                      if (errors.offset) setErrors((prev) => ({ ...prev, offset: '' }))
                    }}
                  />
                  {errors.offset && (
                    <div
                      className="field-error msg"
                      id="rs-offset-error"
                      style={{ color: 'var(--error-text)', fontSize: '13px', fontWeight: 600, marginTop: '4px' }}
                    >
                      {errors.offset}
                    </div>
                  )}
                </div>

                <button type="submit" className="btn btn-primary" disabled={formSaving} id="add-route-stop-submit">
                  {formSaving ? 'Saving…' : 'Add stop to route'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default RouteStopsPage
