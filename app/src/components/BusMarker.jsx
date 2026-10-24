import { useMemo } from 'react'
import { Marker } from 'react-leaflet'
import L from 'leaflet'
import { kuwaitClock } from '../lib/kuwaitTime.js'

// A bus on the map: its number in a badge, greyed out when its position is old.
// Built from HTML (divIcon) rather than Leaflet's default pin image, so it can
// show the bus number and needs no image files.
function BusMarker({ bus, stale }) {
  const { latitude, longitude, recordedAt } = bus.location

  const icon = useMemo(() => {
    const note = stale
      ? `<span class="bus-marker-note">${recordedAt ? `Last updated ${kuwaitClock(recordedAt)}` : 'Last update unknown'}</span>`
      : ''
    return L.divIcon({
      className: `bus-marker${stale ? ' bus-marker--stale' : ''}`,
      html: `<span class="bus-marker-inner"><span class="bus-marker-badge">🚌 ${escapeHtml(bus.busNumber)}</span>${note}</span>`,
      iconSize: null,
      iconAnchor: [0, 0],
    })
  }, [bus.busNumber, stale, recordedAt])

  return (
    <Marker
      position={[latitude, longitude]}
      icon={icon}
      // Buses with a current position stay on top of greyed-out ones.
      zIndexOffset={stale ? 0 : 1000}
      title={`Bus ${bus.busNumber}${bus.routeName ? ` — ${bus.routeName}` : ''}`}
      alt={`Bus ${bus.busNumber}`}
    />
  )
}

// Bus numbers come from the database; never let one inject HTML into the map.
function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

export default BusMarker
