import { useState } from 'react'
import BusMap from '../components/BusMap.jsx'
import { MAP_VIEWS } from '../lib/mapViews.js'

const TABS = [
  { type: 'on_campus', label: 'On campus' },
  { type: 'off_campus', label: 'Off campus' },
]

function MapPage() {
  const [serviceType, setServiceType] = useState('on_campus')

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

      {/* A new key per tab re-creates the map at that tab's starting view. */}
      <BusMap
        key={serviceType}
        view={MAP_VIEWS[serviceType]}
        label={serviceType === 'on_campus' ? 'On-campus bus map' : 'Off-campus bus map'}
      />
    </div>
  )
}

export default MapPage
