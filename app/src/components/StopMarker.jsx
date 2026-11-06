import { useEffect, useMemo, useState } from 'react'
import { Circle, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../lib/supabase.js'

function StopMarker({ stop, routes = [] }) {
  const latitude = Number(stop.latitude)
  const longitude = Number(stop.longitude)
  const radius = Number(stop.geofence_radius_m)

  const stopName = stop.name && stop.name.trim() !== '' ? stop.name.trim() : 'Unnamed stop'
  const stopArea = stop.area && stop.area.trim() !== '' ? stop.area.trim() : null

  // Merge prop routes with any fetched from the database.
  // The parent (MapPage) passes fetched routes, so the effect only runs
  // when no routes were provided — avoiding a synchronous setState in the
  // effect body, which triggers cascading renders.
  const [activeRoutes, setActiveRoutes] = useState([])

  useEffect(() => {
    if (routes && routes.length > 0) {
      return
    }
    if (!stop.id) return

    let isMounted = true
    supabase
      .from('routes_stops')
      .select('routes!inner(id, name, is_active)')
      .eq('stop_id', stop.id)
      .eq('routes.is_active', true)
      .then(({ data, error }) => {
        if (!isMounted || error || !data) return
        const names = data.map((rs) => rs.routes?.name).filter(Boolean)
        setActiveRoutes(Array.from(new Set(names)).sort((a, b) => a.localeCompare(b)))
      })

    return () => {
      isMounted = false
    }
  }, [stop.id, routes])

  // When routes prop is provided, use it directly; otherwise use fetched state.
  const displayRoutes = routes && routes.length > 0 ? routes : activeRoutes

  const icon = useMemo(() => {
    const areaHtml = stopArea ? `<span class="stop-pin-area">${escapeHtml(stopArea)}</span>` : ''
    return L.divIcon({
      className: 'stop-pin-marker',
      html: `<div class="stop-pin-inner" id="stop-pin-${stop.id}"><span class="stop-pin-icon" aria-hidden="true">🚏</span><div class="stop-pin-label"><span class="stop-pin-name">${escapeHtml(stopName)}</span>${areaHtml}</div></div>`,
      iconSize: null,
      iconAnchor: [0, 0],
      popupAnchor: [0, -32],
    })
  }, [stop.id, stopName, stopArea])

  return (
    <>
      {radius > 0 && (
        <Circle
          center={[latitude, longitude]}
          radius={radius}
          pathOptions={{
            color: '#0EACE3',
            fillColor: '#0EACE3',
            fillOpacity: 0.18,
            weight: 2,
          }}
        />
      )}
      <Marker
        position={[latitude, longitude]}
        icon={icon}
        title={stopName}
        alt={stopName}
        zIndexOffset={500}
      >
        <Popup className="stop-popup" id={`stop-popup-${stop.id}`}>
          <div className="stop-popup-content">
            <div className="stop-popup-header">
              <strong className="stop-popup-name">{stopName}</strong>
              {stopArea && <span className="stop-popup-area">{stopArea}</span>}
            </div>
            <div className="stop-popup-routes-section">
              <span className="stop-popup-routes-heading">Routes stopping here:</span>
              {displayRoutes && displayRoutes.length > 0 ? (
                <ul className="stop-popup-routes-list" id={`stop-routes-list-${stop.id}`}>
                  {displayRoutes.map((r) => (
                    <li key={r} className="stop-popup-route-item">{r}</li>
                  ))}
                </ul>
              ) : (
                <p className="stop-popup-no-routes">No active routes stop here.</p>
              )}
            </div>
          </div>
        </Popup>
      </Marker>
    </>
  )
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

export default StopMarker

