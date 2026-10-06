import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

function SignUp({ onSwitchToSignIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSignUp = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      setError('Please enter your Kuwait University email.')
      return
    }

    if (!password) {
      setError('Please enter a password.')
      return
    }

    setLoading(true)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      })

      if (signUpError) {
        let displayError = signUpError.message
        // If Supabase rejects a non-KU email via domain restriction or hook, ensure
        // the required acceptance criterion message is shown.
        if (
          displayError.toLowerCase().includes('invalid') ||
          displayError.toLowerCase().includes('not allowed') ||
          displayError.toLowerCase().includes('signup disabled')
        ) {
          if (!trimmedEmail.toLowerCase().endsWith('ku.edu.kw')) {
            displayError = 'Please sign up with your Kuwait University email (ending in ku.edu.kw).'
          }
        }
        setError(displayError)
      } else {
        // If user already exists and email confirmations are active, Supabase may return an empty identities array
        if (data?.user?.identities && data.user.identities.length === 0) {
          setError('An account with this email already exists. Please sign in instead.')
        } else {
          setSuccess('Check your KU email to confirm your account.')
          setEmail('')
          setPassword('')
        }
      }
    } catch (err) {
      setError(err?.message || 'An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="badge-ku">Kuwait University</div>
        <h2>Student Sign Up</h2>
        <p className="auth-subtitle">
          Sign up to access the campus bus tracking system and live schedules.
        </p>
      </div>

      {error && (
        <div className="alert alert-error" role="alert" id="signup-error">
          <svg className="alert-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div className="alert alert-success" role="alert" id="signup-success">
          <svg className="alert-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
          <div>{success}</div>
        </div>
      )}

      <form onSubmit={handleSignUp} className="auth-form" noValidate>
        <div className="form-group">
          <label htmlFor="signup-email">KU Email Address</label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. s2221160339@ku.edu.kw"
            required
            disabled={loading}
          />
          <span className="field-hint">Must end in ku.edu.kw (e.g. @ku.edu.kw or @cba.ku.edu.kw)</span>
        </div>

        <div className="form-group">
          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Choose a password for this app"
            required
            disabled={loading}
          />
          <div className="password-security-note" id="password-security-note">
            <svg className="security-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
            </svg>
            <span>Create a new password for this app. Don't reuse your KU portal password.</span>
          </div>
        </div>

        <button
          type="submit"
          id="signup-submit"
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div className="auth-footer">
        <span>Already have an account?</span>{' '}
        <button
          type="button"
          onClick={onSwitchToSignIn}
          className="btn-link"
          id="switch-to-signin"
        >
          Sign In
        </button>
      </div>
    </div>
  )
}

export default SignUp
