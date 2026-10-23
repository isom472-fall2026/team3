import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

function BusesPage() {
  const [buses, setBuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadBuses = async () => {
      const { data, error } = await supabase.from('buses').select('*')

      if (!isMounted) return
      setLoadError(Boolean(error))
      setBuses(error ? [] : data || [])
      setLoading(false)
    }

    loadBuses()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="bus-confirmed-section" id="buses-page">
      <div className="bus-content-intro">
        <h2>Buses</h2>
        <p>The KU bus fleet.</p>
      </div>

      {loading && <p>Loading buses…</p>}

      {loadError && (
        <div className="alert alert-error" role="alert">
          <div>Buses could not be loaded. Try again.</div>
        </div>
      )}

      {!loading && !loadError && buses.length === 0 && (
        <p className="no-routes-message" id="no-buses-message">No buses to show.</p>
      )}

      {buses.length > 0 && (
        <div className="buses-grid" id="bus-list">
          {buses.map((bus) => (
            <div key={bus.id} className="bus-card">
              <div className="bus-card-header">
                <span className="bus-number">Bus #{bus.bus_number}</span>
                <span className={`bus-status status-${(bus.status || 'active').toLowerCase()}`}>
                  {bus.status || 'Active'}
                </span>
              </div>
              <div className="bus-card-body">
                <p><strong>Plate:</strong> {bus.plate_number || 'N/A'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default BusesPage
