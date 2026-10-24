import { useEffect, useState } from 'react'
import RouteDepartureForm from '../components/RouteDepartureForm.jsx'
import { supabase } from '../lib/supabase.js'

function RoutesPage() {
  const [isStaff, setIsStaff] = useState(false);
  useEffect(() => {
    // check if the signed‑in user is staff via the DB function
    supabase.rpc('is_staff').then(({ data, error }) => {
      if (!error) setIsStaff(Boolean(data));
    });
  }, []);
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [stopsByRoute, setStopsByRoute] = useState({})
  const [stopsError, setStopsError] = useState(false)
  const [routeTab, setRouteTab] = useState('on_campus') // 'on_campus' | 'off_campus'

  useEffect(() => {
    let isMounted = true

    const loadRoutes = async () => {
      const { data, error } = await supabase
        .from('routes')
        .select('id, name, operating_hours, service_type, routes_stops(sequence_order, stops(name))')
        .eq('is_active', true)

      if (!isMounted) return
      setLoadError(Boolean(error))
      setRoutes(error ? [] : data || [])
      setLoading(false)
    }

    loadRoutes()

    return () => {
      isMounted = false
    }
  }, [])

  const routesInTab = routes
    .filter((r) => r.service_type === routeTab)
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="bus-confirmed-section" id="routes-page">
      <div className="bus-content-intro">
        <h2>Routes</h2>
        <p>On-campus and off-campus bus routes and their operating hours.</p>
      </div>

      <div className="route-type-tabs" role="tablist" aria-label="Route Type Tabs">
        <button
          type="button"
          role="tab"
          id="tab-on-campus"
          aria-selected={routeTab === 'on_campus'}
          className={`bus-tab-btn ${routeTab === 'on_campus' ? 'active' : ''}`}
          onClick={() => setRouteTab('on_campus')}
        >
          On campus
        </button>
        <button
          type="button"
          role="tab"
          id="tab-off-campus"
          aria-selected={routeTab === 'off_campus'}
          className={`bus-tab-btn ${routeTab === 'off_campus' ? 'active' : ''}`}
          onClick={() => setRouteTab('off_campus')}
        >
          Off campus
        </button>
      </div>

      {loading && <p>Loading routes…</p>}

      {loadError && (
        <div className="alert alert-error" role="alert">
          <div>Routes could not be loaded. Try again.</div>
        </div>
      )}

      {routes.length > 0 && (
        <div className="route-hours-section" id="route-operating-hours">
          <h3>Route Operating Hours</h3>
          <div className="route-hours-grid">
            {routesInTab.map((route) => (
              <div key={route.id} className="route-hours-card" data-route-id={route.id}>
                <div className="route-hours-name">{route.name}</div>
                <div className="route-hours-value">
                  {route.operating_hours
                    ? route.operating_hours
                    : <span className="route-hours-unavailable">Operating hours not available</span>}
                </div>
                <RouteEndpoints routeStops={route.routes_stops} />
                {isStaff && (
                  <RouteDepartureForm route={route} />
                )}
              </div>
            ))}
            {routesInTab.length === 0 && (
              <div className="no-routes-message">
                {routeTab === 'on_campus' ? 'No on-campus routes right now.' : 'No off-campus routes right now.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Returns a display-safe stop name: trims whitespace; 'Unnamed stop' if blank.
function resolveStopName(raw) {
  if (!raw || raw.trim() === '') return 'Unnamed stop'
  return raw.trim()
}

// Renders the start → end endpoint line inside a route card.
function RouteEndpoints({ routeStops }) {
  // null means Supabase failed to return the relation at all.
  if (routeStops == null) {
    return (
      <div className="route-endpoints route-endpoints-error">
        Stops could not be loaded.
      </div>
    )
  }

  if (routeStops.length === 0) {
    return (
      <div className="route-endpoints route-endpoints-unset">
        Stops not set
      </div>
    )
  }

  // Sort by sequence_order to identify first and last stops reliably.
  const sorted = [...routeStops].sort((a, b) => a.sequence_order - b.sequence_order)
  const firstName = resolveStopName(sorted[0].stops?.name)

  if (sorted.length === 1) {
    return (
      <div className="route-endpoints">
        <span className="route-endpoint-stop">{firstName}</span>
        <span className="route-endpoint-one-stop"> — This route has only one stop.</span>
      </div>
    )
  }

  const lastName = resolveStopName(sorted[sorted.length - 1].stops?.name)
  return (
    <div className="route-endpoints">
      <span className="route-endpoint-stop">{firstName}</span>
      <span className="route-endpoint-arrow" aria-hidden="true"> → </span>
      <span className="route-endpoint-stop">{lastName}</span>
    </div>
  )
}

export default RoutesPage
