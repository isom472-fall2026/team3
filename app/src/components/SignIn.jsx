import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import AuthCrest from './AuthCrest.jsx'

function SignIn({ onSwitchToSignUp, onSignInSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignIn = async (e) => {
    e.preventDefault()
    setError('')

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setError('Please provide both your KU email and password.')
      return
    }

    setLoading(true)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })

      if (signInError) {
        setError(signInError.message)
      } else if (data?.user) {
        if (onSignInSuccess) {
          onSignInSuccess(data.user)
        }
      }
    } catch (err) {
      setError(err?.message || 'Failed to sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // #131: a visitor without a KU account signs in anonymously. If anonymous sign-ins
  // are turned off in Supabase, or the request fails, nothing changes and we say so.
  const handleGuest = async () => {
    setError('')
    setGuestLoading(true)
    try {
      const { data, error: guestError } = await supabase.auth.signInAnonymously()
      if (guestError || !data?.user) {
        if (guestError) console.error('Guest sign-in failed:', guestError)
        setError('Guest access is not available right now.')
      } else if (onSignInSuccess) {
        onSignInSuccess(data.user)
      }
    } catch (err) {
      console.error('Guest sign-in failed:', err)
      setError('Guest access is not available right now.')
    } finally {
      setGuestLoading(false)
    }
  }

  const busy = loading || guestLoading

  return (
    <div className="auth-card">
      <AuthCrest heading="Where is my bus?" />

      {error && (
        <div className="alert alert-error" role="alert" id="signin-error">
          <svg className="alert-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleSignIn} className="auth-form" noValidate>
        <div className="form-group">
          <label htmlFor="signin-email">KU email</label>
          <input
            id="signin-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. s2221160339@ku.edu.kw"
            required
            disabled={busy}
          />
        </div>

        <div className="form-group">
          <label htmlFor="signin-password">Password</label>
          <input
            id="signin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={busy}
          />
        </div>

        <button
          type="submit"
          id="signin-submit"
          className="btn btn-primary"
          disabled={busy}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <div className="auth-or">or</div>

      <button
        type="button"
        id="continue-as-guest"
        className="btn btn-secondary auth-wide"
        onClick={handleGuest}
        disabled={busy}
      >
        {guestLoading ? 'Continuing as guest...' : 'Continue as a guest'}
      </button>
      <p className="auth-guest-note">Guests see routes, stops and live buses.</p>

      <div className="auth-footer">
        <span>No account yet?</span>{' '}
        <button
          type="button"
          onClick={onSwitchToSignUp}
          className="btn-link"
          id="switch-to-signup"
        >
          Sign up with your KU email
        </button>
      </div>
    </div>
  )
}

export default SignIn
