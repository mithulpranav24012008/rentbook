import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { ErrorNote, Field } from '../components/ui'

type Mode = 'signin' | 'signup' | 'reset'

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else if (!data.session) setInfo('Account created. Check your email for a confirmation link, then sign in.')
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) setError(error.message)
      else setInfo('If that email has an account, a password reset link is on its way.')
    }
    setBusy(false)
  }

  const titles: Record<Mode, string> = {
    signin: 'Sign in',
    signup: 'Create your account',
    reset: 'Reset password',
  }

  return (
    <main className="auth">
      <div className="auth-card">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ₹
          </span>
          RentBook
        </div>
        <h1>{titles[mode]}</h1>
        <p className="muted">Your tenants, buildings and rent records stay private to your account.</p>
        <form onSubmit={submit} className="stack">
          <Field label="Email">
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          {mode !== 'reset' && (
            <Field label="Password">
              <input
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={6}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          )}
          <ErrorNote message={error} />
          {info && <p className="info">{info}</p>}
          <button className="btn primary" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
          </button>
        </form>
        <div className="auth-links">
          {mode !== 'signin' && (
            <button className="link" onClick={() => setMode('signin')}>
              Have an account? Sign in
            </button>
          )}
          {mode !== 'signup' && (
            <button className="link" onClick={() => setMode('signup')}>
              New here? Create an account
            </button>
          )}
          {mode === 'signin' && (
            <button className="link" onClick={() => setMode('reset')}>
              Forgot password?
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
