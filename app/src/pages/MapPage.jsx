import { useEffect, useState } from 'react'
import BusMap from '../components/BusMap.jsx'
import BusMarker from '../components/BusMarker.jsx'
import { MAP_VIEWS, isInKuwait } from '../lib/mapViews.js'
import { useActiveBuses } from '../lib/useActiveBuses.js'

const TABS = [
  { type: 'on_campus', label: 'On campus' },
  { type: 'off_campus', label: 'Off campus' },
]

// A position older than this is shown greyed out: the bus may have moved since.
const STALE_AFTER_MS = 2 * 60 * 1000

// Re-check how old each position is this often, so a marker greys out
// even when no new data arrives.
const CLOCK_TICK_MS = 15 * 1000

function MapPage() {
  const [serviceType, setServiceType] = useState('on_campus')
  const { buses, loading, error } = useActiveBuses()
  const now = useNow(CLOCK_TICK_MS)

  const busesInTab = buses.filter((bus) => bus.serviceType === serviceType)
  const onMap = busesInTab.filter(
    (bus) => bus.location && isInKuwait(bus.location.latitude, bus.location.longitude)
  )
  const notOnMap = busesInTab.filter((bus) => !onMap.includes(bus))

  const isStale = (bus) => {
    const recordedAt = Date.parse(bus.location.recordedAt)
    return !Number.isFinite(recordedAt) || now - recordedAt > STALE_AFTER_MS
  }

  return (
    <div className="bus-confirmed-section" id="map-page">
      <div className="bus-content-intro">
        <h2>Live bus map</h2>
        <p>Where the buses are right now.</p>
      </div>

      <div className="bus-tabs-nav map-type-tabs" role="tablist" aria-label="Route type">
        {TABS.map((tab) => (
          <button
            key={tab.type}
            type="button"
            role="tab"
            id={`map-tab-${tab.type}`}
            aria-selected={serviceType === tab.type}
            className={`bus-tab-btn ${serviceType === tab.type ? 'active' : ''}`}
            onClick={() => setServiceType(tab.type)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="alert alert-error" role="alert" id="map-error">
          <div>Bus locations could not be loaded. Try again.</div>
        </div>
      )}

      {!loading && !error && busesInTab.length === 0 && (
        <p className="map-status" id="no-buses-message">No buses running right now.</p>
      )}

      {/* A new key per tab re-creates the map at that tab's starting view. */}
      <BusMap
        key={serviceType}
        view={MAP_VIEWS[serviceType]}
        label={serviceType === 'on_campus' ? 'On-campus bus map' : 'Off-campus bus map'}
      >
        {onMap.map((bus) => (
          <BusMarker key={bus.tripId} bus={bus} stale={isStale(bus)} />
        ))}
      </BusMap>

      {notOnMap.length > 0 && (
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
