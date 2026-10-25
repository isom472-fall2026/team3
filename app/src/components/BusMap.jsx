import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// The one map component for the app. Pages pass where it starts (view) and
// what to draw on it (children: markers, routes, stops).
function BusMap({ view, children, label = 'Map' }) {
  return (
    <div className="bus-map" role="region" aria-label={label}>
      <MapContainer center={view.center} zoom={view.zoom} scrollWheelZoom className="bus-map-canvas">
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        {children}
      </MapContainer>
    </div>
  )
}

export default BusMap
