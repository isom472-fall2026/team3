import { useEffect, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { useMap } from 'react-leaflet'
import BusMap from '../components/BusMap.jsx'
import BusMarker from '../components/BusMarker.jsx'
import StopMarker from '../components/StopMarker.jsx'
import { MAP_VIEWS, isInKuwait } from '../lib/mapViews.js'
import { useActiveBuses } from '../lib/useActiveBuses.js'
import { supabase } from '../lib/supabase.js'

const TABS = [
  { type: 'on_campus', label: 'On campus' },
  { type: 'off_campus', label: 'Off campus' },
]

// A position older than this is shown greyed out: the bus may have moved since.
const STALE_AFTER_MS = 2 * 60 * 1000

// Re-check how old each position is this often, so a marker greys out
// even when no new data arrives.
const CLOCK_TICK_MS = 15 * 1000

// Pans the Leaflet map to a new centre when centre changes.
function MapRecenter({ center, zoom }) {
  const map = useMap()
  const prevCenter = useRef(null)
  useEffect(() => {
    if (
      center &&
      (prevCenter.current?.[0] !== center[0] || prevCenter.current?.[1] !== center[1])
    ) {
      map.setView(center, zoom, { animate: true })
      prevCenter.current = center
    }
  }, [map, center, zoom])
  return null
}

function MapPage({ user }) {
  const isGuest = Boolean(user?.is_anonymous)
  const [serviceType, setServiceType] = useState('on_campus')
  // #98: the route filter above the map. 'all' shows every route's buses.
  const [routes, setRoutes] = useState([])
  const [routesLoaded, setRoutesLoaded] = useState(false)
  const [selectedRouteId, setSelectedRouteId] = useState('all')
  const { buses, loading, error } = useActiveBuses()
  const now = useNow(CLOCK_TICK_MS)

  const [searchParams] = useSearchParams()
  const location = useLocation()

  const stopId = searchParams.get('stop') || searchParams.get('stopId')

  // Seed from navigation state if the state stop matches the query param (or no param).
  const inlineStop = location.state?.stop ?? null
  const inlineIsValid =
    inlineStop && isInKuwait(Number(inlineStop.latitude), Number(inlineStop.longitude))

  const [selectedStop, setSelectedStop] = useState(
    () => (!stopId && inlineIsValid ? inlineStop : null)
  )
  const [stopRoutes, setStopRoutes] = useState([])
  const [stopError, setStopError] = useState(false)
  const [stopLoading, setStopLoading] = useState(Boolean(stopId))

  useEffect(() => {
    if (!stopId) {
      return
    }

    let isMounted = true

    const fetchStop = async () => {
      // Reset loading/error state at the start of the async fetch (inside the callback
      // avoids a synchronous setState in the effect body).
      setStopLoading(true)
      setStopError(false)
      // Use inline stop from state when it matches the query param — saves a request.
      let stop = location.state?.stop?.id === stopId ? location.state.stop : null

      if (!stop) {
        const { data, error: err } = await supabase
          .from('stops')
          .select('id, name, area, latitude, longitude, geofence_radius_m')
          .eq('id', stopId)
          .maybeSingle()
        if (!isMounted) return
        if (err || !data) {
          setStopError(true)
          setStopLoading(false)
          return
        }
        stop = data
      }

      if (!isMounted) return

      // Fetch active routes for this stop.
      const { data: rsData } = await supabase
        .from('routes_stops')
        .select('routes!inner(id, name, is_active)')
        .eq('stop_id', stopId)
        .eq('routes.is_active', true)

      if (!isMounted) return

      const names = (rsData ?? [])
        .map((rs) => rs.routes?.name)
        .filter(Boolean)
      setStopRoutes(Array.from(new Set(names)).sort((a, b) => a.localeCompare(b)))
      setSelectedStop(stop)
      setStopLoading(false)
    }

    fetchStop()
    return () => {
      isMounted = false
    }
  }, [stopId, location.state])

  // #98: active routes for the filter, A to Z.
  useEffect(() => {
    let isMounted = true
    const loadRoutes = async () => {
      const { data } = await supabase
        .from('routes')
        .select('id, name, service_type')
        .eq('is_active', true)
        .order('name')
      if (!isMounted) return
      setRoutes((data ?? []).slice().sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')))
      setRoutesLoaded(true)
    }
    loadRoutes()
    return () => {
      isMounted = false
    }
  }, [])

  // #98: choosing a route keeps only its buses; 'all' keeps every bus in the tab.
  // The filter runs on the live list, so markers keep moving while a route is chosen.
  const busesInTab = buses.filter(
    (bus) =>
      bus.serviceType === serviceType &&
      (selectedRouteId === 'all' || bus.routeId === selectedRouteId)
  )
  const onMap = busesInTab.filter(
    (bus) => bus.location && isInKuwait(bus.location.latitude, bus.location.longitude)
  )
  const notOnMap = busesInTab.filter((bus) => !onMap.includes(bus))

  const isStale = (bus) => {
    const recordedAt = Date.parse(bus.location.recordedAt)
    return !Number.isFinite(recordedAt) || now - recordedAt > STALE_AFTER_MS
  }

  // When a stop is selected, derive the map view from its coordinates.
  const stopCenter = selectedStop
    ? [Number(selectedStop.latitude), Number(selectedStop.longitude)]
    : null
  const mapView = stopCenter
    ? { center: stopCenter, zoom: 17 }
    : MAP_VIEWS[serviceType]

  return (
    <div className="bus-confirmed-section" id="map-page">
      <div className="bus-content-intro">
        <h2>Live bus map</h2>
        <p>Where the buses are right now.</p>
      </div>

      {/* Only show the tab bar when not in stop-view mode. */}
      {!selectedStop && (
        <div className="bus-tabs-nav map-type-tabs" role="tablist" aria-label="Route type">
          {TABS.map((tab) => (
            <button
              key={tab.type}
              type="button"
              role="tab"
              id={`map-tab-${tab.type}`}
              aria-selected={serviceType === tab.type}
              className={`bus-tab-btn ${serviceType === tab.type ? 'active' : ''}`}
              onClick={() => {
                setServiceType(tab.type)
                setSelectedRouteId('all')
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {!selectedStop && (
        <div className="schedule-route-selector" id="route-filter-bar">
          <label className="schedule-route-label" htmlFor="route-filter">
            Route
          </label>
          <select
            id="route-filter"
            className="form-select schedule-route-select"
            value={selectedRouteId}
            disabled={routesLoaded && routes.length === 0}
            onChange={(e) => {
              const id = e.target.value
              setSelectedRouteId(id)
              // Show the chosen route's tab, so its buses are on the map.
              const route = routes.find((r) => r.id === id)
              if (route?.service_type) setServiceType(route.service_type)
            }}
          >
            {routesLoaded && routes.length === 0 ? (
              // Only routes with is_active TRUE are listed; if none are, say so.
              <option value="all">No routes running right now.</option>
            ) : (
              <option value="all">All routes</option>
            )}
            {routes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedStop && (
        <div className="selected-stop-banner" id="selected-stop-banner">
          Showing stop: <strong>{selectedStop.name && selectedStop.name.trim() !== '' ? selectedStop.name.trim() : 'Unnamed stop'}</strong>
          {selectedStop.area && selectedStop.area.trim() !== '' && (
            <span> · {selectedStop.area.trim()}</span>
          )}
        </div>
      )}

      {(stopError || (stopId && !stopLoading && !selectedStop)) && (
        <div className="alert alert-error" role="alert" id="map-load-error">
          <div>Map could not be loaded. Try again.</div>
        </div>
      )}

      {error && (
        <div className="alert alert-error" role="alert" id="map-error">
          <div>Bus locations could not be loaded. Try again.</div>
        </div>
      )}

      {!loading && !error && !selectedStop && busesInTab.length === 0 && (
        <p className="map-status" id="no-buses-message">No buses running right now.</p>
      )}

      {/* A new key re-creates the map when the stop changes or the tab switches. */}
      <BusMap
        key={selectedStop ? `stop-${selectedStop.id}` : serviceType}
        view={mapView}
        label={selectedStop ? `Map centred on stop ${selectedStop.name ?? ''}` : (serviceType === 'on_campus' ? 'On-campus bus map' : 'Off-campus bus map')}
      >
        {stopCenter && <MapRecenter center={stopCenter} zoom={17} />}
        {selectedStop && <StopMarker stop={selectedStop} routes={stopRoutes} />}
        {!selectedStop && onMap.map((bus) => (
          <BusMarker key={bus.tripId} bus={bus} stale={isStale(bus)} isGuest={isGuest} />
        ))}
      </BusMap>

      {!selectedStop && notOnMap.length > 0 && (
        <ul className="map-unplaced" id="location-not-available">
          {notOnMap.map((bus) => (
            <li key={bus.tripId}>
              <strong>Bus {bus.busNumber}</strong>
              {bus.routeName && <span> · {bus.routeName}</span>}
              <span className="map-unplaced-note"> — Location not available</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// The current time, updated every `intervalMs`.
function useNow(intervalMs) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export default MapPage
