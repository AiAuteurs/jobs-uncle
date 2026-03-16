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
    tagline: 'In the middle of a search.',
    badge: 'Save 20%',
    savings: '20%',
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
    highlight: true,
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
      </Head>

      <Header />

      <main className="pricing-page">
        <div className="pricing-header">
          <h1>How long is your search?</h1>
          <p className="subtitle">Pick a plan that matches where you are. Cancel anytime.</p>
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
            <li>✓ Dual-version resumes — Leadership & Technical focus</li>
            <li>✓ AI cover letters</li>
            <li>✓ Recruiter gap analysis</li>
            <li>✓ Hiring manager outreach DMs</li>
            <li>✓ Promo code support on annual plans</li>
          </ul>
        </div>
      </main>

      <style jsx>{`
        .pricing-page {
          min-height: 100vh;
          background: #0a0a0a;
          color: #fff;
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
        }

        .subtitle {
          color: #888;
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
          background: #161616;
          border: 2px solid #2a2a2a;
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
          border-color: #444;
          transform: translateY(-2px);
        }

        .tier-card.selected {
          border-color: #4ade80;
          background: #0d1f15;
        }

        .tier-card.highlight {
          border-color: #f59e0b;
        }

        .tier-card.highlight.selected {
          border-color: #f59e0b;
          background: #1a140a;
        }

        .badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: #f59e0b;
          color: #000;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 20px;
          white-space: nowrap;
          letter-spacing: 0.02em;
        }

        .tier-card.selected .badge {
          background: #4ade80;
        }

        .tier-card.highlight .badge,
        .tier-card.highlight.selected .badge {
          background: #f59e0b;
        }

        .tier-label {
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #888;
        }

        .tier-card.selected .tier-label {
          color: #4ade80;
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
          color: #fff;
        }

        .per {
          font-size: 14px;
          color: #666;
        }

        .tier-billing {
          font-size: 12px;
          color: #555;
        }

        .tier-tagline {
          font-size: 13px;
          color: #aaa;
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
          background: #4ade80;
          color: #000;
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
          background: #22c55e;
          transform: scale(1.02);
        }

        .cta-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .cta-sub {
          font-size: 13px;
          color: #555;
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
          color: #888;
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
          color: #ccc;
          text-align: left;
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
