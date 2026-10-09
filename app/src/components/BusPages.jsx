import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import WeeklyTripHistory from './WeeklyTripHistory.jsx'

function BusPages({ user, onSignOut }) {
  const [buses, setBuses] = useState([])
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(user)
  const [dbError, setDbError] = useState(null)
  const [activeTab, setActiveTab] = useState('history') // 'history' | 'fleet'

  const isConfirmed = Boolean(currentUser?.email_confirmed_at)

  const fetchBusData = useCallback(async () => {
    setLoading(true)
    setDbError(null)

    try {
      const { data: userData } = await supabase.auth.getUser()
      const updatedUser = userData?.user || currentUser
      setCurrentUser(updatedUser)

      if (updatedUser?.email_confirmed_at) {
        const { data: busData, error: busError } = await supabase
          .from('buses')
          .select('*')

        if (busError) {
          setDbError(busError.message)
          setBuses([])
        } else {
          setBuses(busData || [])
        }

        const { data: routeData, error: routeError } = await supabase
          .from('routes')
          .select('id, name, operating_hours')
          .eq('is_active', true)

        if (routeError) {
          setDbError((prev) => prev ? prev + ' | ' + routeError.message : routeError.message)
          setRoutes([])
        } else {
          setRoutes(routeData || [])
        }
      } else {
        setBuses([])
        setRoutes([])
      }
    } catch (err) {
      setDbError(err?.message || 'Failed to fetch bus information.')
      setBuses([])
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    let isMounted = true

    const loadInitialData = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!isMounted) return
        const activeUser = userData?.user || user
        setCurrentUser(activeUser)

        if (activeUser?.email_confirmed_at) {
          const { data: busData, error: busError } = await supabase
            .from('buses')
            .select('*')

          if (!isMounted) return
          if (busError) {
            setDbError(busError.message)
            setBuses([])
          } else {
            setBuses(busData || [])
          }

          const { data: routeData, error: routeError } = await supabase
            .from('routes')
            .select('id, name, operating_hours')
            .eq('is_active', true)

          if (!isMounted) return
          if (routeError) {
            setDbError((prev) => prev ? prev + ' | ' + routeError.message : routeError.message)
            setRoutes([])
          } else {
            setRoutes(routeData || [])
          }
        } else {
          if (!isMounted) return
          setBuses([])
          setRoutes([])
        }
      } catch (err) {
        if (!isMounted) return
        setDbError(err?.message || 'Failed to fetch bus information.')
        setBuses([])
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadInitialData()

    return () => {
      isMounted = false
    }
  }, [user])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
    } finally {
      if (onSignOut) {
        onSignOut()
      }
    }
  }

  return (
    <div className="bus-pages-container" id="bus-pages-screen">
      <header className="bus-header">
        <div className="bus-header-left">
          <div className="badge-ku">KU Campus Transport</div>
          <h1>Bus Pages</h1>
          <p className="user-email-tag">
            Signed in as: <strong>{currentUser?.email}</strong>
          </p>
        </div>
        <div className="bus-header-actions">
          <button
            type="button"
            onClick={fetchBusData}
            className="btn btn-secondary"
            disabled={loading}
            id="refresh-status-btn"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="btn btn-outline"
            id="bus-signout-btn"
          >
            Sign Out
          </button>
        </div>
      </header>

      <nav className="bus-tabs-nav" role="tablist" aria-label="Portal Views">
        <button
          type="button"
          role="tab"
          id="tab-weekly-history"
          aria-selected={activeTab === 'history'}
          className={`bus-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📊 Weekly Trip History (Admin)
        </button>
        <button
          type="button"
          role="tab"
          id="tab-bus-fleet"
          aria-selected={activeTab === 'fleet'}
          className={`bus-tab-btn ${activeTab === 'fleet' ? 'active' : ''}`}
          onClick={() => setActiveTab('fleet')}
        >
          🚌 Campus Bus Fleet & Routes
        </button>
      </nav>

      {activeTab === 'history' ? (
        <WeeklyTripHistory user={currentUser} />
      ) : !isConfirmed ? (
        <div className="bus-unconfirmed-notice" id="unconfirmed-notice" role="alert">
          <div className="notice-icon">⚠️</div>
          <div className="notice-body">
            <h3>Email Confirmation Required</h3>
            <p>
              Your Kuwait University email address has not been confirmed yet.
              Before clicking the confirmation link, bus information is hidden.
            </p>
            <p className="notice-instruction">
              Please check your KU inbox for the confirmation link. After confirming, click
              <strong> "Refresh"</strong> above to view bus schedules and live tracking.
            </p>
          </div>
          <div className="no-bus-info-panel" id="no-bus-info-placeholder">
            <p className="no-bus-text">
              🚫 No bus information available (unconfirmed account).
            </p>
          </div>
        </div>
      ) : (
        <div className="bus-confirmed-section" id="bus-pages-content">
          <div className="verification-status-banner">
            <span className="status-dot-active"></span>
            <span>KU Student Verified — Email confirmed</span>
          </div>

          <div className="bus-content-intro">
            <h2>Campus Bus Fleet & Schedules</h2>
            <p>
              Live tracking and shuttle timetable for Shadadiya and university campuses.
            </p>
          </div>

          {dbError && (
            <div className="alert alert-error" role="alert">
              <div>Database notice: {dbError}</div>
            </div>
          )}

          {routes && routes.length > 0 && (
            <div className="route-hours-section" id="route-operating-hours">
              <h3>Route Operating Hours</h3>
              <div className="route-hours-grid">
                {routes.map((route) => (
                  <div key={route.id} className="route-hours-card" data-route-id={route.id}>
                    <div className="route-hours-name">{route.name}</div>
                    <div className="route-hours-value">
                      {route.operating_hours
                        ? route.operating_hours
                        : <span className="route-hours-unavailable">Operating hours not available</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {buses && buses.length > 0 ? (
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
          ) : (
            <div className="bus-placeholder-panel" id="bus-placeholder-panel">
              <div className="placeholder-badge">Shuttle Service Ready</div>
              <h3>University Bus Routes (Active)</h3>
              <p>
                You are successfully signed in and confirmed as a KU student. Below are the campus bus routes:
              </p>
              <div className="sample-routes-list">
                <div className="sample-route-item">
                  <div className="route-icon">🚌</div>
                  <div className="route-details">
                    <strong>Route 1: Shadadiya Campus Ring Shuttle</strong>
                    <span>College of Business Administration ⇄ Engineering ⇄ Science</span>
                  </div>
                  <span className="route-timing">Every 10 mins</span>
                </div>
                <div className="sample-route-item">
                  <div className="route-icon">🚌</div>
                  <div className="route-details">
                    <strong>Route 2: Student Parking Express</strong>
                    <span>South Parking Lot ⇄ Central Campus Station</span>
                  </div>
                  <span className="route-timing">Every 5 mins</span>
                </div>
                <div className="sample-route-item">
                  <div className="route-icon">🚌</div>
                  <div className="route-details">
                    <strong>Route 3: Inter-Campus Connector</strong>
                    <span>Shadadiya Campus ⇄ Khaldiya / Kaifan</span>
                  </div>
                  <span className="route-timing">Hourly</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default BusPages
