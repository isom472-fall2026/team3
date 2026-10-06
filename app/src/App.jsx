import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'
import SignUp from './components/SignUp.jsx'
import SignIn from './components/SignIn.jsx'
import BusPages from './components/BusPages.jsx'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [authView, setAuthView] = useState('signup') // 'signup' | 'signin'
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    // Check initial active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setInitializing(false)
    }).catch(() => {
      setInitializing(false)
    })

    // Listen for auth state changes (sign in, sign out, token refreshed)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (initializing) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading Kuwait University Bus System...</p>
      </div>
    )
  }

  return (
    <div className="app-layout">
      <header className="app-navbar">
        <div className="navbar-container">
          <div className="brand">
            <span className="brand-logo" aria-hidden="true">🚌</span>
            <div className="brand-text">
              <span className="brand-title">KU Bus Tracker</span>
              <span className="brand-subtitle">Kuwait University</span>
            </div>
          </div>
          {!user && (
            <div className="auth-tab-group" role="tablist" aria-label="Authentication Options">
              <button
                type="button"
                role="tab"
                aria-selected={authView === 'signup'}
                className={`tab-btn ${authView === 'signup' ? 'active' : ''}`}
                onClick={() => setAuthView('signup')}
                id="tab-signup"
              >
                Sign Up
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authView === 'signin'}
                className={`tab-btn ${authView === 'signin' ? 'active' : ''}`}
                onClick={() => setAuthView('signin')}
                id="tab-signin"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="main-content">
        {user ? (
          <BusPages user={user} onSignOut={() => setUser(null)} />
        ) : authView === 'signup' ? (
          <SignUp onSwitchToSignIn={() => setAuthView('signin')} />
        ) : (
          <SignIn
            onSwitchToSignUp={() => setAuthView('signup')}
            onSignInSuccess={(signedInUser) => setUser(signedInUser)}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>© 2026 Kuwait University — Student Bus Tracking System</p>
      </footer>
    </div>
  )
}

export default App