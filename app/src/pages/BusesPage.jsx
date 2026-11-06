import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { kuwaitToday } from '../lib/kuwaitTime.js'
const STATUSES = ['active', 'maintenance', 'out_of_service']
function BusesPage() {
  const [buses, setBuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [isStaff, setIsStaff] = useState(false)
  const [choices, setChoices] = useState({}) // bus id -> status chosen in the drop-down
  const [messages, setMessages] = useState({}) // bus id -> { kind, text }
  const [savingId, setSavingId] = useState(null)
  useEffect(() => {
    let isMounted = true
    const loadBuses = async () => {
      const [busesRes, staffRes] = await Promise.all([
        supabase.from('buses').select('*'),
        supabase.rpc('is_staff'),
      ])
      if (!isMounted) return
      setLoadError(Boolean(busesRes.error))
      setBuses(busesRes.error ? [] : busesRes.data || [])
      // Only staff see the drop-down (#117); the database also refuses anyone else.
      setIsStaff(staffRes.data === true)
      setLoading(false)
    }
    loadBuses()
    return () => {
      isMounted = false
    }
  }, [])
  const setMessage = (busId, kind, text) => setMessages((prev) => ({ ...prev, [busId]: { kind, text } }))
  const handleSave = async (bus) => {
    const chosen = choices[bus.id] ?? bus.status ?? ''
    setMessages((prev) => ({ ...prev, [bus.id]: null }))
    if (!chosen) {
      setMessage(bus.id, 'error', 'Choose a status first.')
      return
    }
    setSavingId(bus.id)
    // A bus on an active trip today must stay active (#117 criterion 5).
    if (chosen !== 'active') {
      const { data: activeTrips, error: tripError } = await supabase
        .from('trips')
        .select('id')
        .eq('bus_id', bus.id)
        .eq('status', 'active')
        .eq('trip_date', kuwaitToday())
        .limit(1)
      if (tripError) {
        console.error('Could not check the bus for an active trip:', tripError)
        setMessage(bus.id, 'error', 'Status could not be saved. Try again.')
        setSavingId(null)
        return
      }
      if (activeTrips && activeTrips.length > 0) {
        setMessage(bus.id, 'error', `Bus ${bus.bus_number} is on a trip now. Cancel or finish the trip first.`)
        setSavingId(null)
        return
      }
    }
    // .select() returns the changed row; an empty result means the database refused it.
    const { data: updated, error } = await supabase
      .from('buses')
      .update({ status: chosen })
      .eq('id', bus.id)
      .select()
    setSavingId(null)
    if (error || !updated || updated.length === 0) {
      console.error('Bus status was not saved:', error || 'no row changed')
      setChoices((prev) => ({ ...prev, [bus.id]: bus.status ?? '' }))
      setMessage(bus.id, 'error', 'Status could not be saved. Try again.')
      return
    }
    setBuses((prev) => prev.map((b) => (b.id === bus.id ? { ...b, status: updated[0].status } : b)))
    setMessage(bus.id, 'success', 'Status saved.')
  }
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
          {buses.map((bus) => {
            const msg = messages[bus.id]
            const chosen = choices[bus.id] ?? bus.status ?? ''
            return (
              <div key={bus.id} className="bus-card" data-bus-id={bus.id}>
                <div className="bus-card-header">
                  <span className="bus-number">Bus #{bus.bus_number}</span>
                  <span className={`bus-status status-${(bus.status || 'not-set').toLowerCase()}`}>
                    {bus.status || 'Not set'}
                  </span>
                </div>
                <div className="bus-card-body">
                  <p><strong>Plate:</strong> {bus.plate_number || 'N/A'}</p>
                  {isStaff && (
                    <div className="bus-status-edit">
                      <label htmlFor={`bus-status-${bus.id}`}><strong>Status:</strong></label>{' '}
                      <select
                        id={`bus-status-${bus.id}`}
                        value={chosen}
                        onChange={(e) => setChoices((prev) => ({ ...prev, [bus.id]: e.target.value }))}
                        disabled={savingId === bus.id}
                      >
                        {!bus.status && <option value="">Not set</option>}
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>{' '}
                      <button
                        type="button"
                        className="btn btn-secondary"
                        id={`save-bus-status-${bus.id}`}
                        onClick={() => handleSave(bus)}
                        disabled={savingId === bus.id}
                      >
                        {savingId === bus.id ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  )}
                  {msg && (
                    <div
                      className={`alert ${msg.kind === 'error' ? 'alert-error' : 'alert-success'}`}
                      role={msg.kind === 'error' ? 'alert' : 'status'}
                      id={`bus-status-message-${bus.id}`}
                    >
                      {msg.text}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
export default BusesPage
