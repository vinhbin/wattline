import { useEffect, useRef, useState } from 'react'

// WATTLINE landing — "the clock is the interface". Scrolling moves you through
// an outage: calm (power on) → the gap opens (red) → the tool that closes it.
// Judge-facing: problem, verified numbers, how the disaggregation works, data
// sources, limitations. Matches the app theme exactly (theme.css tokens).

const STATS = [
  { value: 92233, label: 'Georgians on electricity-dependent medical equipment', suffix: '' },
  { value: 1647, label: 'in Richmond County alone', suffix: '' },
  { value: 9, label: 'days parts of Augusta were dark after Helene', suffix: '' },
]

const METHOD = [
  {
    n: '01',
    key: 'identify',
    title: 'Identify',
    lead: 'A ZIP can span a senior tower and a golf course.',
    body: 'Federal emPOWER data publishes counts at ZIP level. We disaggregate them onto the city’s official NPU boundaries, weighted census-tract by census-tract with housing units, age 65+, and disability rates from Atlanta regional open data. The result conserves against the 92,233 state total.',
    tag: 'emPOWER → tracts → NPU',
  },
  {
    n: '02',
    key: 'gap',
    title: 'Exposure gap',
    lead: 'Not a prediction — a subtraction.',
    body: 'Utility restoration ETA minus the manufacturer’s published minimum runtime for the devices counted in that area. A portable oxygen concentrator on continuous flow runs under an hour. The ETA after Helene was measured in days.',
    tag: 'ETA − shortest runtime',
  },
  {
    n: '03',
    key: 'reach',
    title: 'Reach',
    lead: 'A household with no car can’t reach a site no bus serves.',
    body: 'Charging capacity at libraries, fire stations, and rec centers, assigned to the highest-gap neighborhoods — constrained by MARTA transit reachability. Seven sites grey out because no route reaches them.',
    tag: 'sites × MARTA GTFS',
  },
]

// pulled straight from Docket 44280 — the asymmetry that motivated the build
const FINDINGS = [
  {
    stat: '78.5%',
    label: 'positive',
    body: 'How Georgia Power measures whether its outage map is working — social-media sentiment. Not who is on a ventilator.',
  },
  {
    stat: '$450',
    label: 'reimbursed',
    body: 'A funded program pays this for a storm-damaged meter box. No program exists to get a household that can’t power life-support to a charging site.',
  },
  {
    stat: '115,000',
    label: 'tracked monthly',
    body: 'Income-qualified customers they already identify every month. The capability to track a vulnerable population plainly exists.',
  },
]

const QUOTES = [
  {
    text: 'Georgians who depend on ventilators and other electricity-dependent equipment can and do die. Georgia has no coordinated protocol to identify these residents, reach them, or get them to power in time.',
    who: 'Georgia Council on Developmental Disabilities',
    role: 'a state agency, in reply to us',
  },
  {
    text: 'No one would like to give any hard numbers as to how long a life-sustaining device will run on batteries.',
    who: 'Tools for Life · Georgia Tech CIDI',
    role: 'why we stopped predicting failure and started measuring the gap',
  },
]

const SOURCES = [
  ['HHS emPOWER', 'De-identified counts of electricity-dependent Medicare beneficiaries'],
  ['ARC Open Data', 'Tract demographics — seniors, disability, vehicles, housing'],
  ['City of Atlanta DPCD', 'Official NPU boundaries & public facilities'],
  ['MARTA GTFS', 'Transit reachability'],
  ['Census ACS', 'B01001 · B18101 · B08201'],
  ['GA PSC Docket 44280', '$912M storm cost recovery record'],
]

const LIMITS = [
  'emPOWER is Medicare-only — it undercounts under-65 disabled people. 92,233 is a floor, not a ceiling.',
  'Lookback is "filed a claim," not "currently uses" — 13 months for most DME, 5 years for implanted cardiac.',
  'Suppressed small cells (values 1–10 published as 11) are treated as intervals; we test containment, not equality.',
  'Output is a scenario-based neighborhood priority surface, not a claim about where specific individuals live.',
]

// count-up when a number scrolls into view
function useCountUp(target, run, ms = 1400) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!run) return
    let raf
    const t0 = performance.now()
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / ms)
      const eased = 1 - Math.pow(1 - p, 3)
      setN(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [run, target, ms])
  return n
}

// generic "reveal on enter viewport" hook
function useReveal(threshold = 0.2) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setSeen(true),
      { threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return [ref, seen]
}

// Hero clock: an oxygen concentrator draining against a 9h ETA. Loops so the
// gap is always visibly open — the thesis in three seconds.
function DrainClock() {
  const RUNTIME = 0.9 // SimplyGo continuous flow, published minimum (hours)
  const ETA = 9
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    let raf
    const t0 = performance.now()
    const loop = (t) => {
      const e = ((t - t0) / 1000 / 6) % (ETA + 2) // 6s = full arc, then pause
      setElapsed(e)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  const remaining = Math.max(0, RUNTIME - elapsed)
  const drained = remaining <= 0
  const pct = Math.max(0, (remaining / RUNTIME) * 100)
  const gap = Math.max(0, Math.min(ETA, elapsed) - RUNTIME)
  return (
    <div className="drain">
      <div className="drain-batt">
        <div className="drain-batt-cap" />
        <div
          className={`drain-batt-fill${drained ? ' empty' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="drain-nums">
        <div className="drain-run">
          <span className={`drain-big${drained ? ' out' : ''}`}>
            {drained ? '0.0' : remaining.toFixed(1)}
          </span>
          <span className="drain-unit">h battery left</span>
        </div>
        <div className="drain-vs">vs</div>
        <div className="drain-eta">
          <span className="drain-big dim">{ETA}.0</span>
          <span className="drain-unit">h until power returns</span>
        </div>
      </div>
      <div className={`drain-gap${gap > 0 ? ' live' : ''}`}>
        {gap > 0 ? (
          <>
            <b>{gap.toFixed(1)} hours</b> past what the battery can hold
          </>
        ) : (
          <span className="dim">oxygen concentrator · continuous flow</span>
        )}
      </div>
    </div>
  )
}

function StatBlock() {
  const [ref, seen] = useReveal(0.4)
  return (
    <section className="lp-stats" ref={ref}>
      {STATS.map((s, i) => (
        <Stat key={i} {...s} run={seen} delay={i * 140} />
      ))}
    </section>
  )
}

function Stat({ value, label, run, delay }) {
  const n = useCountUp(value, run)
  return (
    <div className="lp-stat" style={{ transitionDelay: `${delay}ms` }} data-seen={run}>
      <div className="lp-stat-num">{n.toLocaleString('en-US')}</div>
      <div className="lp-stat-label">{label}</div>
    </div>
  )
}

function MethodCard({ m, i }) {
  const [ref, seen] = useReveal(0.25)
  return (
    <article
      className={`lp-method lp-method-${m.key}`}
      ref={ref}
      data-seen={seen}
      style={{ transitionDelay: `${i * 90}ms` }}
    >
      <div className="lp-method-n">{m.n}</div>
      <h3>{m.title}</h3>
      <p className="lp-method-lead">{m.lead}</p>
      <p className="lp-method-body">{m.body}</p>
      <div className="lp-method-tag">{m.tag}</div>
    </article>
  )
}

function Section({ className, children }) {
  const [ref, seen] = useReveal(0.15)
  return (
    <section className={`lp-sec ${className}`} ref={ref} data-seen={seen}>
      {children}
    </section>
  )
}

export default function Landing({ onEnter }) {
  const [progress, setProgress] = useState(0)
  const scrollRef = useRef(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight
      setProgress(max > 0 ? el.scrollTop / max : 0)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="lp" ref={scrollRef}>
      {/* outage timeline rail — fills as you scroll through the outage */}
      <div className="lp-rail" aria-hidden>
        <div className="lp-rail-fill" style={{ height: `${progress * 100}%` }} />
        <span className="lp-rail-cap lp-rail-top">POWER ON</span>
        <span className="lp-rail-cap lp-rail-bot">RESTORED</span>
      </div>

      {/* fixed top bar */}
      <div className="lp-topbar">
        <div className="lp-brand">
          WATT<span className="line">LINE</span>
        </div>
        <div className="lp-nav">
          <a
            className="lp-nav-link"
            href="https://github.com/vinhbin/wattline"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <button className="lp-nav-cta" onClick={onEnter}>
            Live map →
          </button>
        </div>
      </div>

      {/* HERO */}
      <header className="lp-hero">
        <div className="lp-hero-glow" aria-hidden />
        <div className="lp-hero-inner">
          <div className="lp-eyebrow">Hack RenderATL · Atlanta open data</div>
          <h1 className="lp-title">
            When the power goes out,
            <br />
            some people are on a clock.
            <span className="lp-title-accent"> Nobody is counting.</span>
          </h1>
          <p className="lp-sub">
            Georgia Power tells customers to prepare for three days without
            electricity. Their entire published guidance for medical equipment
            is one line: <em>keep your devices charged.</em>
          </p>
          <DrainClock />
          <div className="lp-hero-cta">
            <button className="lp-btn primary" onClick={onEnter}>
              Enter the live map
            </button>
            <a className="lp-btn ghost" href="#how">
              How it works ↓
            </a>
          </div>
        </div>
        <div className="lp-scroll-hint" aria-hidden>
          <span>scroll into the outage</span>
          <div className="lp-scroll-line" />
        </div>
      </header>

      {/* NUMBERS */}
      <StatBlock />

      {/* PROBLEM */}
      <Section className="lp-problem">
        <div className="lp-sec-label">The gap nobody owns</div>
        <p className="lp-lede">
          We read Georgia Power&rsquo;s $912M storm cost recovery case
          (GA&nbsp;PSC Docket&nbsp;44280) — every data-request response, the
          stipulation, and the Commission&rsquo;s order. The words{' '}
          <span className="hl-crit">medical</span>,{' '}
          <span className="hl-crit">ventilator</span>,{' '}
          <span className="hl-crit">oxygen</span>, and{' '}
          <span className="hl-crit">vulnerable</span> appear{' '}
          <b>zero times.</b>
        </p>
      </Section>

      {/* WHAT WE FOUND IN THE RECORD */}
      <Section className="lp-findings">
        <div className="lp-sec-label">What the $912M record measures</div>
        <div className="lp-find-grid">
          {FINDINGS.map((f, i) => (
            <div className="lp-find" key={i}>
              <div className="lp-find-stat">{f.stat}</div>
              <div className="lp-find-tag">{f.label}</div>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* QUOTES — the credibility centerpiece */}
      <Section className="lp-quotes">
        <div className="lp-sec-label">We wrote and asked. They answered.</div>
        <div className="lp-quote-wrap">
          {QUOTES.map((q, i) => (
            <blockquote className="lp-quote" key={i}>
              <p>“{q.text}”</p>
              <footer>
                <span className="lp-quote-who">{q.who}</span>
                <span className="lp-quote-role">{q.role}</span>
              </footer>
            </blockquote>
          ))}
        </div>
      </Section>

      {/* HOW IT WORKS */}
      <section className="lp-how" id="how">
        <div className="lp-how-head">
          <div className="lp-sec-label">How WATTLINE works</div>
          <h2>Three joins the system was missing.</h2>
        </div>
        <div className="lp-methods">
          {METHOD.map((m, i) => (
            <MethodCard key={m.key} m={m} i={i} />
          ))}
        </div>
      </section>

      {/* CONCEDE / DIFFERENTIATOR */}
      <Section className="lp-concede">
        <div className="lp-sec-label">What it does not do</div>
        <p className="lp-lede">
          WATTLINE does not touch utility restoration order — a crew on a feeder
          restores 3,000 customers; the same crew on a lateral restores one
          house. That order is correct. WATTLINE uses a{' '}
          <span className="hl-accent">different resource pool</span>: buildings,
          not crews. Public health outreach, not the grid. It covers the window
          that correct order leaves open.
        </p>
      </Section>

      {/* DATA SOURCES */}
      <Section className="lp-sources">
        <div className="lp-sec-label">Built on public data</div>
        <div className="lp-source-grid">
          {SOURCES.map(([name, use]) => (
            <div className="lp-source" key={name}>
              <div className="lp-source-name">{name}</div>
              <div className="lp-source-use">{use}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* LIMITATIONS — credibility */}
      <Section className="lp-limits">
        <div className="lp-sec-label">
          Limitations — stated before you ask
        </div>
        <ul className="lp-limit-list">
          {LIMITS.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
        <p className="lp-limit-foot">
          An assistive-technology specialist at Georgia Tech CIDI confirmed no
          one in the field will commit to hard runtime numbers — charge state,
          battery age, and defects all vary, and every factor makes it worse.
          Our gap is the optimistic case.
        </p>
      </Section>

      {/* CLOSE / CTA */}
      <section className="lp-close">
        <div className="lp-close-glow" aria-hidden />
        <div className="lp-close-inner">
          <div className="lp-close-num">92,233</div>
          <p className="lp-close-line">
            Georgians depend on electricity for medical equipment. A state
            agency confirmed there is <b>no protocol</b> to identify them, reach
            them, or get them to power.
          </p>
          <h2 className="lp-close-title">WATTLINE is the missing join.</h2>
          <p className="lp-close-monday">
            Before landfall, a county emergency-management office opens WATTLINE,
            sees the three highest-gap neighborhoods, and stages a
            generator-backed charging site at each — a decision no dataset lets
            them make today.
          </p>
          <button className="lp-btn primary big" onClick={onEnter}>
            Open the live exposure map
          </button>
          <div className="lp-credits">
            HHS emPOWER · ARC · City of Atlanta DPCD · MARTA GTFS · Census ACS
          </div>
          <div className="lp-team">
            Built at Hack RenderATL by Vinh · Niko · Guttu · Kareem ·{' '}
            <a
              href="https://github.com/vinhbin/wattline"
              target="_blank"
              rel="noreferrer"
            >
              github.com/vinhbin/wattline
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
