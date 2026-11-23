const APK_URL =
  (import.meta.env.VITE_APK_URL as string | undefined) ||
  'https://github.com/mithulpranav24012008/rentbook/releases/download/latest-apk/RentBook.apk'

export function Landing({ onOpenApp }: { onOpenApp: () => void }) {
  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ₹
          </span>
          RentBook
        </div>
        <button className="btn" onClick={onOpenApp}>
          Sign in
        </button>
      </header>

      <main className="landing-main">
        <section className="hero">
          <h1>Know who has paid rent this month. At a glance.</h1>
          <p className="lead">
            RentBook keeps your tenants’ details, your buildings and flats, and a monthly rent checklist in one place.
            Every landlord gets a private account.
          </p>
          <div className="hero-actions">
            <a className="btn primary big" href={APK_URL} download>
              Download APK
            </a>
            <button className="btn big" onClick={onOpenApp}>
              Use it in the browser
            </button>
          </div>
          <p className="muted small">Android 7.0 or newer. Same account works on the phone app and the website.</p>
        </section>

        <section className="preview" aria-label="Example rent checklist">
          <div className="preview-card">
            <p className="summary-label">November 2026</p>
            <p className="preview-total">
              <strong>₹48,500</strong> <span className="muted">of ₹62,000</span>
            </p>
            <div className="progress">
              <div style={{ width: '78%' }} />
            </div>
            <ul className="preview-list">
              <li className="paid">
                <span className="check">✓</span>Ravi Kumar <span className="muted">House 1A</span>
              </li>
              <li className="paid">
                <span className="check">✓</span>Priya S. <span className="muted">House 2B</span>
              </li>
              <li>
                <span className="check" />
                Arjun M. <span className="muted">Shop 1</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="features">
          <div>
            <h2>Rent checklist</h2>
            <p>Tick tenants off as they pay. See what’s collected and who’s still due, month by month.</p>
          </div>
          <div>
            <h2>Tenant records</h2>
            <p>Aadhaar and address, rent, advance, occupying and leaving dates, and every rent paid date.</p>
          </div>
          <div>
            <h2>Apartments and houses</h2>
            <p>House numbers, EB bill and key numbers, and your electrician and EB line man on one tap.</p>
          </div>
          <div>
            <h2>WhatsApp reminders</h2>
            <p>One tap sends a polite rent reminder to anyone who hasn’t paid yet.</p>
          </div>
        </section>

        <section className="install">
          <h2>Installing the APK</h2>
          <ol>
            <li>Tap <strong>Download APK</strong> on your Android phone.</li>
            <li>Open the downloaded file. If asked, allow your browser to “install unknown apps”.</li>
            <li>Open RentBook and sign in, or create an account.</li>
          </ol>
        </section>
      </main>

      <footer className="landing-foot muted small">RentBook · Your data is private to your account.</footer>
    </div>
  )
}
