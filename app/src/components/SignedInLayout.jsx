import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'
import { supabase } from '../lib/supabase.js'
import { pages, sections } from '../pages/index.js'
import TabIcon from './TabIcon.jsx'

function SignedInLayout({ user, onSignOut }) {
  const [currentUser, setCurrentUser] = useState(user)
  const [refreshing, setRefreshing] = useState(false)
  // Changing the key remounts the open page, so Refresh reloads its data
  // without every page having to handle a refresh itself.
  const [refreshKey, setRefreshKey] = useState(0)
  // null until we know, so a staff page is not redirected away while the check is running.
  const [isStaff, setIsStaff] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  // A guest (#131) signed in anonymously: no email, so nothing to confirm.
  const isGuest = Boolean(currentUser?.is_anonymous)
  const isConfirmed = isGuest || Boolean(currentUser?.email_confirmed_at)
  const firstPage = pages[0].path
  const visiblePages = pages.filter((page) => !page.staffOnly || isStaff)
  const visibleSections = sections
    .filter((section) => !section.staffOnly || isStaff)
    .map((section) => ({ ...section, pages: visiblePages.filter((page) => page.section === section.id) }))
    .filter((section) => section.pages.length > 0)
  const currentPath = location.pathname.replace(/^\//, '')
  const currentSection = visibleSections.find((section) =>
    section.pages.some((page) => page.path === currentPath)
  )

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
      <header className="app-topbar">
        <img className="app-topbar-logo" src={`${import.meta.env.BASE_URL}ku-shield.png`} alt="" />
        <div className="app-topbar-id">
          <span className="app-topbar-name">KU Bus Tracker</span>
          <span className="app-topbar-who user-email-tag" title={isGuest ? 'Guest' : currentUser?.email}>
            {isGuest ? 'Guest' : currentUser?.email}
          </span>
        </div>
        <div className="app-topbar-actions">
          <button
            type="button"
            onClick={handleRefresh}
            className="btn btn-secondary btn-sm"
            disabled={refreshing}
            id="refresh-status-btn"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="btn btn-danger btn-sm"
            id="bus-signout-btn"
          >
            Sign out
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
          {currentSection && currentSection.pages.length > 1 && (
            <nav className="bus-tabs-nav section-tabs" aria-label={`${currentSection.label} pages`}>
              {currentSection.pages.map((page) => (
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
          )}

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

          <nav className="tabbar" aria-label="Main">
            {visibleSections.map((section) => (
              <NavLink
                key={section.id}
                to={`/${section.pages[0].path}`}
                id={`tab-${section.id}`}
                className={`tabbar-btn ${currentSection?.id === section.id ? 'active' : ''}`}
                aria-current={currentSection?.id === section.id ? 'page' : undefined}
              >
                <TabIcon name={section.icon} />
                <span>{section.label}</span>
              </NavLink>
            ))}
          </nav>
        </>
      )}
    </div>
  )
}

export default SignedInLayout
