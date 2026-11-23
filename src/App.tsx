import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isConfigured, supabase } from './lib/supabase'
import { isNative } from './lib/format'
import { useData } from './lib/data'
import { Landing } from './pages/Landing'
import { AuthPage } from './pages/AuthPage'
import { RentPage } from './pages/RentPage'
import { TenantsPage } from './pages/TenantsPage'
import { BuildingsPage } from './pages/BuildingsPage'
import { ErrorNote } from './components/ui'

export default function App() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // The website shows a landing page at "/" with the APK download; the app lives at "/app".
  // Inside the Android app there is no landing page.
  if (!isNative && !path.startsWith('/app')) {
    return (
      <Landing
        onOpenApp={() => {
          window.history.pushState(null, '', '/app')
          setPath('/app')
        }}
      />
    )
  }
  return <AppShell />
}

function AppShell() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    if (!isConfigured) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!isConfigured) {
    return (
      <main className="auth">
        <div className="auth-card">
          <h1>Almost ready</h1>
          <p>
            Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to a <code>.env</code> file (or your
            Vercel environment variables) and rebuild. See the README for steps.
          </p>
        </div>
      </main>
    )
  }
  if (session === undefined) return <div className="loading">Loading…</div>
  if (!session) return <AuthPage />
  // key resets all loaded data when a different user signs in.
  return <Main key={session.user.id} email={session.user.email ?? ''} />
}

type Tab = 'rent' | 'tenants' | 'buildings'

function Main({ email }: { email: string }) {
  const store = useData()
  const [tab, setTab] = useState<Tab>('rent')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab])

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ₹
          </span>
          RentBook
        </div>
        <nav className="tabs-top" aria-label="Sections">
          <TabButtons tab={tab} setTab={setTab} />
        </nav>
        <button
          className="link small"
          title={email}
          onClick={() => {
            if (confirm('Sign out?')) void supabase.auth.signOut()
          }}
        >
          Sign out
        </button>
      </header>

      <div className="content">
        <ErrorNote message={store.error} />
        {store.loading ? (
          <div className="loading">Loading your data…</div>
        ) : tab === 'rent' ? (
          <RentPage store={store} goTo={setTab} />
        ) : tab === 'tenants' ? (
          <TenantsPage store={store} />
        ) : (
          <BuildingsPage store={store} />
        )}
      </div>

      <nav className="tabs-bottom" aria-label="Sections">
        <TabButtons tab={tab} setTab={setTab} />
      </nav>
    </div>
  )
}

function TabButtons({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const items: { id: Tab; label: string; icon: string }[] = [
    { id: 'rent', label: 'Rent', icon: '✓' },
    { id: 'tenants', label: 'Tenants', icon: '☺' },
    { id: 'buildings', label: 'Apartments', icon: '⌂' },
  ]
  return (
    <>
      {items.map((i) => (
        <button key={i.id} className={tab === i.id ? 'on' : ''} aria-current={tab === i.id ? 'page' : undefined} onClick={() => setTab(i.id)}>
          <span className="tab-icon" aria-hidden="true">
            {i.icon}
          </span>
          {i.label}
        </button>
      ))}
    </>
  )
}
