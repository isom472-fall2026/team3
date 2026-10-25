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

function RouteStopsPage() {
  const [routes, setRoutes] = useState([])
  const [routesLoading, setRoutesLoading] = useState(true)
  const [routesError, setRoutesError] = useState(false)

  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [stops, setStops] = useState([])
  const [stopsLoading, setStopsLoading] = useState(false)
  const [stopsError, setStopsError] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadRoutes = async () => {
      const { data, error } = await supabase
        .from('routes')
        .select('id, name')
        .eq('is_active', true)

      if (!isMounted) return
      setRoutesError(Boolean(error))
      // Sorted here, not in the query: the database's collation put lowercase names after "Z" (see #46).
      setRoutes(error ? [] : [...(data || [])].sort((a, b) => byName(a.name, b.name)))
      setRoutesLoading(false)
    }

    loadRoutes()
    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    if (!selectedRouteId) return

    let isMounted = true

    const loadStops = async () => {
      const { data, error } = await supabase
        .from('routes_stops')
        .select('id, sequence_order, stops(name)')
        .eq('route_id', selectedRouteId)

      if (!isMounted) return
      if (error) {
        setStopsError(true)
        setStopsLoading(false)
        return
      }

      // One entry per routes_stops row, so a stop the route visits twice is listed twice.
      const rows = (data || [])
        // A row whose stop_id matches no stop comes back with stops = null; skip it, keep the rest.
        .filter((row) => row.stops)
        .map((row) => ({
          id: row.id,
          sequence: row.sequence_order,
          name: stopName(row.stops.name),
        }))
      rows.sort((a, b) => a.sequence - b.sequence || byName(a.name, b.name))

      setStops(rows)
      setStopsLoading(false)
    }

    loadStops()
    return () => { isMounted = false }
  }, [selectedRouteId])

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
        </div>
      )}
    </div>
  )
}

export default RouteStopsPage
