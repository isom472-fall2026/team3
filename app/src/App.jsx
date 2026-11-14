import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'
import SignUp from './components/SignUp.jsx'
import SignIn from './components/SignIn.jsx'
import SignedInLayout from './components/SignedInLayout.jsx'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [authView, setAuthView] = useState('signin') // 'signup' | 'signin'
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
        <img className="loading-logo" src={`${import.meta.env.BASE_URL}ku-shield.png`} alt="Kuwait University logo" />
        <div className="spinner"></div>
        <p>Loading Kuwait University Bus System...</p>
      </div>
    )
  }

  return (
    <div className={`app-layout${user ? '' : ' app-layout--auth'}`}>

      <main className="main-content">
        {user ? (
          <SignedInLayout user={user} onSignOut={() => setUser(null)} />
        ) : authView === 'signup' ? (
          <SignUp onSwitchToSignIn={() => setAuthView('signin')} />
        ) : (
          <SignIn
            onSwitchToSignUp={() => setAuthView('signup')}
            onSignInSuccess={(signedInUser) => setUser(signedInUser)}
          />
        )}
      </main>

      {!user && (
        <footer className="app-footer">
          <p>© 2026 Kuwait University — Student Bus Tracking System</p>
        </footer>
      )}
    </div>
  )
}

export default App