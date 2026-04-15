import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Header from '../components/Header'

const plans = [
  {
    id: 'pro_plus_1mo',
    label: '1 Month',
    price: '$9.99',
    per: '/mo',
    billing: 'Billed monthly',
    tagline: 'Actively applying right now.',
    badge: null,
    savings: null,
  },
  {
    id: 'pro_plus_3mo',
    label: '3 Months',
    price: '$7.99',
    per: '/mo',
    billing: 'Billed $23.97 every 3 months',
    tagline: 'Most job searches take 3 months.',
    badge: '⚡ Most Popular',
    savings: '20%',
    highlight: true,
  },
  {
    id: 'pro_plus_6mo',
    label: '6 Months',
    price: '$6.99',
    per: '/mo',
    billing: 'Billed $41.94 every 6 months',
    tagline: 'Taking your time, doing it right.',
    badge: 'Save 30%',
    savings: '30%',
  },
  {
    id: 'pro_plus_12mo',
    label: '12 Months',
    price: '$4.16',
    per: '/mo',
    billing: 'Billed $49.99/yr',
    tagline: 'Freelancer. Always on the market.',
    badge: 'Best Value — Save 58%',
    savings: '58%',
  },
]

export default function PricingPage() {
  const [selected, setSelected] = useState('pro_plus_3mo')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleCheckout = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selected }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Something went wrong. Please try again.')
        setLoading(false)
      }
    } catch (err) {
      console.error(err)
      alert('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const activePlan = plans.find((p) => p.id === selected)

  return (
    <>
      <Head>
        <title>Pricing — JobsUncle.ai</title>
        <meta name="description" content="Choose a plan that fits your job search timeline." />
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>

      <Header onSignIn={() => router.push('/?signin=true')} />

      <main className="pricing-page">
        <div className="pricing-header">
          <h1>Stop getting ignored. Start getting interviews.</h1>
          <p className="subtitle">Unlimited AI-tailored resumes. Cancel anytime.</p>
        </div>

        <div className="tier-cards">
          {plans.map((plan) => (
            <button
              key={plan.id}
              className={`tier-card ${selected === plan.id ? 'selected' : ''} ${plan.highlight ? 'highlight' : ''}`}
              onClick={() => setSelected(plan.id)}
            >
              {plan.badge && (
                <span className="badge">{plan.badge}</span>
              )}
              <div className="tier-label">{plan.label}</div>
              <div className="tier-price">
                <span className="amount">{plan.price}</span>
                <span className="per">{plan.per}</span>
              </div>
              <div className="tier-billing">{plan.billing}</div>
              <div className="tier-tagline">"{plan.tagline}"</div>
            </button>
          ))}
        </div>

        <div className="cta-section">
          <button
            className="cta-button"
            onClick={handleCheckout}
            disabled={loading}
          >
            {loading ? 'Redirecting...' : `Get Pro+ — ${activePlan?.label}`}
          </button>
          <p className="cta-sub">Cancel anytime. No questions asked.</p>
        </div>

        <div className="features-section">
          <h2>Everything in Pro+</h2>
          <ul className="features-list">
            <li>✓ Unlimited AI-tailored resumes</li>
            <li>✓ AI cover letters tailored to every role</li>
            <li>✓ Recruiter gap analysis — know what's missing before they do</li>
            <li>✓ Hiring manager DMs — skip the line, go direct</li>
            <li>✓ ATS Keyword Match score on every resume</li>
            <li>✓ Resume format control — Skills-based, Chronological, or Auto</li>
            <li className="dual-feature">
              <span className="dual-title">✓ Dual Resume Versions</span>
              <span className="dual-desc">
                One generation. Two complete resumes — one framed around leadership and strategy, one around execution and results. Built for senior people whose career can go in more than one direction, or anyone making a pivot. Read them side by side, send the one that fits. No guessing which version of yourself to present.
              </span>
            </li>
          </ul>
        </div>
      </main>

      <style jsx>{`
        .pricing-page {
          min-height: 100vh;
          background: var(--bg);
          color: var(--ink);
          font-family: 'Inter', sans-serif;
          padding: 60px 20px 80px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .pricing-header {
          text-align: center;
          margin-bottom: 48px;
        }

        .pricing-header h1 {
          font-size: clamp(28px, 5vw, 44px);
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0 0 12px;
          color: var(--ink);
        }

        .subtitle {
          color: var(--text-soft);
          font-size: 16px;
          margin: 0;
        }

        .tier-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          width: 100%;
          max-width: 900px;
          margin-bottom: 40px;
        }

        .tier-card {
          position: relative;
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: 16px;
          padding: 28px 20px 24px;
          cursor: pointer;
          text-align: center;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .tier-card:hover {
          border-color: var(--accent);
          transform: translateY(-2px);
        }

        .tier-card.selected {
          border-color: var(--accent);
          background: var(--warm);
        }

        .tier-card.highlight {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent);
        }

        .tier-card.highlight.selected {
          border-color: var(--accent);
          background: var(--warm);
        }

        .badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--accent-soft);
          color: #000;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 20px;
          white-space: nowrap;
          letter-spacing: 0.02em;
        }

        .tier-card.selected .badge {
          background: var(--accent);
          color: #fff;
        }

        .tier-card.highlight .badge,
        .tier-card.highlight.selected .badge {
          background: var(--accent-soft);
          color: #000;
        }

        .tier-label {
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-soft);
        }

        .tier-card.selected .tier-label {
          color: var(--accent);
        }

        .tier-price {
          display: flex;
          align-items: baseline;
          gap: 2px;
        }

        .amount {
          font-size: 36px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--ink);
        }

        .per {
          font-size: 14px;
          color: var(--text-soft);
        }

        .tier-billing {
          font-size: 12px;
          color: var(--text-soft);
        }

        .tier-tagline {
          font-size: 13px;
          color: var(--text-soft);
          font-style: italic;
          margin-top: 4px;
          line-height: 1.4;
        }

        .cta-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          margin-bottom: 60px;
        }

        .cta-button {
          background: var(--accent);
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          padding: 16px 40px;
          border: none;
          border-radius: 50px;
          cursor: pointer;
          transition: all 0.2s ease;
          letter-spacing: -0.01em;
        }

        .cta-button:hover:not(:disabled) {
          opacity: 0.88;
          transform: scale(1.02);
        }

        .cta-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .cta-sub {
          font-size: 13px;
          color: var(--text-soft);
          margin: 0;
        }

        .features-section {
          max-width: 480px;
          width: 100%;
          text-align: center;
        }

        .features-section h2 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 20px;
          color: var(--text-soft);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .features-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .features-list li {
          font-size: 15px;
          color: var(--ink);
          text-align: left;
        }

        .dual-feature {
          border-top: 1px solid var(--border);
          padding-top: 16px;
          margin-top: 4px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .dual-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--ink);
        }

        .dual-desc {
          font-size: 13px;
          color: var(--text-soft);
          line-height: 1.65;
        }

        @media (max-width: 640px) {
          .tier-cards {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 420px) {
          .tier-cards {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  )
}
