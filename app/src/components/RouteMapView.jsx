import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../lib/supabase.js'
import BusMap from './BusMap.jsx'
import { MAP_VIEWS } from '../lib/mapViews.js'

// #121: one route's stops on the campus map, joined by a line in routes_stops.sequence_order.
// MapPage shows this instead of the live buses when the address has ?route=<id>.

// Each pin shows its position on the route and the stop's name; the first stop
// is labelled "Start" and the last "End".
function pinIcon(position, name, endLabel) {
  const endHtml = endLabel ? `<span class="stop-pin-area">${endLabel}</span>` : ''
  return L.divIcon({
    className: 'stop-pin-marker',
    // The number sits centred on the stop itself, as a badge on the line; the label hangs below it.
    html: `<div class="stop-pin-inner" style="transform: translate(-50%, -13px)"><span class="stop-pin-icon route-stop-number" style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:#0EACE3;color:#000;font-size:14px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3)">${position}</span><div class="stop-pin-label"><span class="stop-pin-name">${escapeHtml(name)}</span>${endHtml}</div></div>`,
    iconSize: null,
    iconAnchor: [0, 0],
  })
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

// Zooms the map so every pin of the route is in view.
function FitToStops({ points }) {
  const map = useMap()
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [40, 40] })
    else if (points.length === 1) map.setView(points[0], 17)
  }, [map, points])
  return null
}

function RouteMapView({ routeId }) {
  const [route, setRoute] = useState(null)
  const [stops, setStops] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const loadRoute = async () => {
      const [routeRes, stopsRes] = await Promise.all([
        supabase.from('routes').select('id, name, service_type').eq('id', routeId).maybeSingle(),
        supabase
          .from('routes_stops')
          .select('sequence_order, stops(id, name, latitude, longitude)')
          .eq('route_id', routeId)
          .order('sequence_order'),
      ])
      if (!isMounted) return
      setRoute(routeRes.data ?? null)
      setStops(
        (stopsRes.data ?? [])
          .filter((rs) => rs.stops)
          .map((rs) => ({ ...rs.stops, sequenceOrder: rs.sequence_order }))
      )
      setLoading(false)
    }
    loadRoute()
    return () => {
      isMounted = false
    }
  }, [routeId])

  // Pins and the line follow the stops in sequence order.
  const points = useMemo(
    () => stops.map((stop) => [Number(stop.latitude), Number(stop.longitude)]),
    [stops]
  )

  return (
    <div className="bus-confirmed-section" id="route-map-page">
      <div className="bus-content-intro">
        <h2>Route on the map</h2>
        <p>
          {route?.name ? <>Stops on <strong>{route.name}</strong>, in order.</> : 'The stops on this route, in order.'}{' '}
          <Link to="/map">Back to the live map</Link>
        </p>
      </div>

      {loading && <p className="map-status">Loading route…</p>}

      {!loading && stops.length === 0 && (
        <p className="map-status" id="route-no-stops-message">No stops listed for this route.</p>
      )}

      <BusMap
        key={routeId}
        view={MAP_VIEWS[route?.service_type] ?? MAP_VIEWS.on_campus}
        label={`Map of the stops on ${route?.name ?? 'this route'}`}
      >
        <FitToStops points={points} />
        {points.length > 1 && (
          <Polyline positions={points} pathOptions={{ color: '#0EACE3', weight: 5 }} />
        )}
        {stops.map((stop, i) => {
          const endLabel = i === 0 ? 'Start' : i === stops.length - 1 ? 'End' : null
          return (
            <Marker
              key={stop.id}
              position={points[i]}
              icon={pinIcon(i + 1, stop.name, endLabel)}
              title={`${i + 1}. ${stop.name}`}
            />
          )
        })}
      </BusMap>
    </div>
  )
}

export default RouteMapView
