import { useEffect, useRef } from 'react'
const APK_URL =
  (import.meta.env.VITE_APK_URL as string | undefined) ||
  'https://github.com/mithulpranav24012008/rentbook/releases/download/latest-apk/RentBook.apk'

const keeps = [
  {
    title: 'Each tenant’s details',
    text: 'Name and phone, Aadhaar number and address, rent and advance, the date they came and the date they left. Every rent paid date is kept with them.',
    img: '/images/apartment-balconies.jpg',
    alt: 'Rows of balconies on an apartment block in Chennai, in black and white',
  },
  {
    title: 'Every house and its key',
    text: 'Each house number in each apartment, with its EB bill number and its house key number, and who lives there now.',
    img: '/images/house-key.jpg',
    alt: 'A brass house key',
  },
  {
    title: 'Help in one tap',
    text: 'Save the electrician’s and the EB line man’s numbers once, then call them with one press. Send a polite rent reminder on WhatsApp.',
    img: '/images/eb-meters.jpg',
    alt: 'A board of electricity meters, each marked with its house and service number',
  },
]

/** Parts of each section rise into place as it scrolls into view; nothing moves with reduced motion. */
function useReveal() {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = root.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return
    const items = [...el.querySelectorAll<HTMLElement>('[data-reveal]')]
    items.forEach((item) => {
      const group = item.closest('[data-reveal-group]')
      const index = group ? [...group.querySelectorAll('[data-reveal]')].indexOf(item) : 0
      item.style.transitionDelay = `${index * 80}ms`
      item.classList.add('pre-reveal')
    })
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.remove('pre-reveal')
            io.unobserve(e.target)
          }
        }),
      { rootMargin: '0px 0px -10% 0px' },
    )
    items.forEach((i) => io.observe(i))
    return () => io.disconnect()
  }, [])
  return root
}

export function Landing({ onOpenApp }: { onOpenApp: () => void }) {
  const root = useReveal()
  return (
    <div className="landing" ref={root}>
      <header className="landing-nav">
        <a className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            ₹
          </span>
          RentBook
        </a>
        <button className="btn" onClick={onOpenApp}>
          Sign in
        </button>
      </header>

      <main>
        <section className="hero" data-reveal-group>
          <div className="hero-copy">
            <h1 data-reveal>Who has paid rent this month?</h1>
            <p className="lead" data-reveal>
              RentBook is a simple rent register for landlords. Tick off each tenant as they pay, and see at once who still
              owes rent.
            </p>
            <div className="hero-actions" data-reveal>
              <a className="btn primary big" href={APK_URL} download>
                Download the Android app
              </a>
              <button className="btn big" onClick={onOpenApp}>
                Open in the browser
              </button>
            </div>
            <p className="label" data-reveal>
              Free. For Android 7 or newer. Your records stay private to your account.
            </p>
          </div>
          <figure className="hero-photo" data-reveal>
            <img
              src="/images/apartment-hyderabad.jpg"
              alt="A white apartment block with balconies in Hyderabad"
              width={1600}
              height={1067}
            />
            <figcaption>An apartment block in Hyderabad</figcaption>
          </figure>
        </section>

        <section className="band" aria-labelledby="keeps">
          <div className="band-head" data-reveal-group>
            <h2 id="keeps" data-reveal>
              What it keeps for you
            </h2>
            <p className="lead" data-reveal>
              The rent register comes first: press “Mark as paid” when the rent comes in, and see at once who still has to
              pay. Around it, RentBook keeps everything else you used to write in the notebook.
            </p>
          </div>
          <div className="keeps">
            {keeps.map((k) => (
              <article className="keep" key={k.title} data-reveal-group>
                <img data-reveal src={k.img} alt={k.alt} loading="lazy" width={1200} height={800} />
                <div>
                  <h3 data-reveal>{k.title}</h3>
                  <p data-reveal>{k.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="band install" aria-labelledby="install" data-reveal-group>
          <h2 id="install" data-reveal>
            Putting it on your phone
          </h2>
          <div>
            <ol className="steps" data-reveal>
              <li>
                On your Android phone, press <strong>Download the Android app</strong>.
              </li>
              <li>Open the downloaded file. If the phone asks, allow your browser to install apps.</li>
              <li>Open RentBook and create your account with your email.</li>
            </ol>
            <a className="btn primary big" href={APK_URL} download data-reveal>
              Download the Android app
            </a>
          </div>
        </section>
      </main>

      <footer className="landing-foot">
        <span className="brand">RentBook</span>
        <p className="label">A rent register for landlords. Your data is private to your account.</p>
        <p className="credits">
          Pictures: <a href="https://www.pexels.com/photo/white-concrete-building-7672060/">Photo by Sharath G. on Pexels</a>;{' '}
          <a href="https://www.flickr.com/photos/44345361@N06/4268053363">“Pattern”</a> by VinothChandar,{' '}
          <a href="https://creativecommons.org/licenses/by/2.0/">CC BY 2.0</a>, via Flickr;{' '}
          <a href="https://commons.wikimedia.org/w/index.php?curid=29077337">“Electricity meters in India”</a> by Balaji
          Kasirajan, <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>, via Wikimedia Commons;{' '}
          <a href="https://commons.wikimedia.org/w/index.php?curid=691559">“House key”</a>,{' '}
          <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>, via Wikimedia Commons.
        </p>
      </footer>
    </div>
  )
}
