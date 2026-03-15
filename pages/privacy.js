import Head from 'next/head'
import Link from 'next/link'

export default function Privacy() {
  return (
    <>
      <Head>
        <title>Privacy Policy — JobsUncle.ai</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <img src="/uncle-spin-logo.png" alt="JobsUncle.ai" style={{ width: 32, height: 'auto' }} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>JobsUncle.ai</span>
          </Link>
          <a href="/about" className="header-nav-link" style={{ color: 'var(--text-soft)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, marginLeft: '1.5rem' }}>Our Story</a>
          <a href="/example" className="header-nav-link" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 700, marginLeft: '1.25rem', border: '1.5px solid var(--accent)', borderRadius: '20px', padding: '3px 10px' }}>See an example</a>
          <a href="/faq" className="header-nav-link" style={{ color: 'var(--text-soft)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, marginLeft: '1.25rem' }}>FAQ</a>
        </div>
        <span className="header-tagline-inline" style={{ fontSize: '0.8rem', color: 'var(--text-soft)' }}>Resumes for the AI age.</span>
      </header>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '3rem 2rem 5rem' }}>

        {/* WE DON'T STORE YOUR RESUME — HERO CALLOUT */}
        <div style={{ background: 'rgba(34,197,94,0.08)', border: '2px solid #22c55e', borderRadius: '12px', padding: '1.5rem 2rem', marginBottom: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🔒</div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>We don't store your resume.</div>
          <div style={{ fontSize: '0.95rem', color: 'var(--text-soft)', lineHeight: 1.6 }}>We don't store your job description. We don't sell your data. Ever. Your documents are processed, delivered to you, and gone.</div>
        </div>

        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Privacy Policy</h1>
        <p style={{ color: 'var(--text-soft)', fontSize: '0.85rem', marginBottom: '2.5rem' }}>Last updated: March 14, 2026</p>

        <div style={{ lineHeight: 1.8, color: 'var(--ink)', fontSize: '0.95rem' }}>

          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', marginTop: '2rem' }}>What happens when you use JobsUncle.ai</h2>
          <p>You upload a PDF and paste a job description. We send that to an AI model to generate your documents. Once your session ends, that data is gone. We do not retain, store, or log the contents of your resume or job description on our servers.</p>

          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', marginTop: '2rem' }}>What we do store</h2>
          <ul style={{ paddingLeft: '1.5rem', lineHeight: 2 }}>
            <li>A usage count tied to your IP address to manage free tier limits</li>
            <li>Your email address if you create a paid account or use the restore access feature</li>
            <li>Payment information is handled entirely by Stripe — we never see or store your card details</li>
          </ul>

          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', marginTop: '2rem' }}>Cookies</h2>
          <p>We use a single session cookie to verify paid access. No tracking cookies. No ad targeting.</p>

          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', marginTop: '2rem' }}>Third parties</h2>
          <ul style={{ paddingLeft: '1.5rem', lineHeight: 2 }}>
            <li><strong>Anthropic</strong> — powers the AI generation. Your data is subject to Anthropic's API data policies.</li>
            <li><strong>Stripe</strong> — handles all payments securely.</li>
            <li><strong>Vercel</strong> — hosts the application.</li>
          </ul>

          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', marginTop: '2rem' }}>Your data rights</h2>
          <p>Want your email removed from our system? Contact us at <a href="mailto:jobsuncleai@gmail.com" style={{ color: 'var(--accent)' }}>jobsuncleai@gmail.com</a> and we'll delete it within 48 hours.</p>

          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', marginTop: '2rem' }}>Changes</h2>
          <p>If we make material changes to this policy we'll update the date above.</p>

          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', marginTop: '2rem' }}>Contact</h2>
          <p><a href="mailto:jobsuncleai@gmail.com" style={{ color: 'var(--accent)' }}>jobsuncleai@gmail.com</a></p>

        </div>

        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
          <Link href="/" style={{ color: 'var(--text-soft)', textDecoration: 'none' }}>← Back to JobsUncle.ai</Link>
          <Link href="/terms" style={{ color: 'var(--text-soft)', textDecoration: 'none' }}>Terms of Service</Link>
          <Link href="/about" style={{ color: 'var(--text-soft)', textDecoration: 'none' }}>Our Story</Link>
        </div>

      </div>
    </>
  )
}
