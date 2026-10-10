import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

function SignIn({ onSwitchToSignUp, onSignInSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
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

  return (
    <div className="auth-card">
      <div className="auth-header">
        <img className="auth-logo" src={`${import.meta.env.BASE_URL}ku-logo.png`} alt="Kuwait University logo" />
        <h2>Student Sign In</h2>
        <p className="auth-subtitle">
          Sign in with your registered KU email to view bus routes and tracking.
        </p>
      </div>

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
          <label htmlFor="signin-email">KU Email Address</label>
          <input
            id="signin-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. s2221160339@ku.edu.kw"
            required
            disabled={loading}
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
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          id="signin-submit"
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="auth-footer">
        <span>Don't have an account yet?</span>{' '}
        <button
          type="button"
          onClick={onSwitchToSignUp}
          className="btn-link"
          id="switch-to-signup"
        >
          Sign Up
        </button>
      </div>
    </div>
  )
}

export default SignIn
