import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router'
import { supabase } from '../lib/supabase.js'
import { pages } from '../pages/index.js'

function SignedInLayout({ user, onSignOut }) {
  const [currentUser, setCurrentUser] = useState(user)
  const [refreshing, setRefreshing] = useState(false)
  // Changing the key remounts the open page, so Refresh reloads its data
  // without every page having to handle a refresh itself.
  const [refreshKey, setRefreshKey] = useState(0)
  // null until we know, so a staff page is not redirected away while the check is running.
  const [isStaff, setIsStaff] = useState(null)
  const navigate = useNavigate()

  const isConfirmed = Boolean(currentUser?.email_confirmed_at)
  const firstPage = pages[0].path
  const visiblePages = pages.filter((page) => !page.staffOnly || isStaff)

  // The database decides who is staff (staff_members); this only hides screens.
  // An error counts as not staff, so a student never sees a staff screen by accident.
  const checkStaff = async () => {
    const { data, error } = await supabase.rpc('is_staff')
    setIsStaff(!error && data === true)
  }

  // The session's copy of the user can be older than the email confirmation.
  const reloadUser = async () => {
    const { data } = await supabase.auth.getUser()
    if (data?.user) setCurrentUser(data.user)
  }

  useEffect(() => {
    let isMounted = true
    supabase.auth.getUser().then(({ data }) => {
      if (isMounted && data?.user) setCurrentUser(data.user)
    })
    supabase.rpc('is_staff').then(({ data, error }) => {
      if (isMounted) setIsStaff(!error && data === true)
    })
    return () => {
      isMounted = false
    }
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await reloadUser()
      await checkStaff()
    } finally {
      setRefreshKey((k) => k + 1)
      setRefreshing(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
    } finally {
      // The next person to sign in on this browser starts on the first page.
      navigate('/', { replace: true })
      if (onSignOut) onSignOut()
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
            onClick={handleRefresh}
            className="btn btn-secondary"
            disabled={refreshing}
            id="refresh-status-btn"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="btn btn-danger"
            id="bus-signout-btn"
          >
            Sign Out
          </button>
        </div>
      </header>

      {!isConfirmed ? (
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
        <>
          <nav className="bus-tabs-nav" aria-label="Pages">
            {visiblePages.map((page) => (
              <NavLink
                key={page.path}
                to={`/${page.path}`}
                id={`nav-${page.path}`}
                className={({ isActive }) => `bus-tab-btn ${isActive ? 'active' : ''}`}
              >
                {page.label}
              </NavLink>
            ))}
          </nav>

          <div className="verification-status-banner">
            <span className="status-dot-active"></span>
            <span>KU Student Verified — Email confirmed</span>
          </div>

          {isStaff === null ? (
            <p>Loading…</p>
          ) : (
            <Routes>
              {visiblePages.map(({ path, component: Page }) => (
                <Route key={path} path={`/${path}`} element={<Page key={refreshKey} user={currentUser} />} />
              ))}
              <Route path="*" element={<Navigate to={`/${firstPage}`} replace />} />
            </Routes>
          )}
        </>
      )}
    </div>
  )
}

export default SignedInLayout
