import Head from 'next/head'
import Link from 'next/link'

export default function Terms() {
  return (
    <>
      <Head>
        <title>Terms of Service — JobsUncle.ai</title>
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

        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Terms of Service</h1>
        <p style={{ color: 'var(--text-soft)', fontSize: '0.85rem', marginBottom: '2.5rem' }}>Last updated: March 14, 2026</p>

        <div style={{ lineHeight: 1.8, color: 'var(--ink)', fontSize: '0.95rem' }}>

          <p style={{ fontStyle: 'italic', color: 'var(--text-soft)', marginBottom: '2rem' }}>Use this service honestly. Don't abuse it. We built it to help you get hired — that's it.</p>

          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', marginTop: '2rem' }}>1. What JobsUncle.ai does</h2>
          <p>JobsUncle.ai is an AI-powered resume tailoring service. You upload a resume or LinkedIn PDF, paste a job description, and we generate a tailored resume, cover letter, recruiter gap analysis, and hiring manager DM. We don't store your documents. We don't sell your data.</p>

          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', marginTop: '2rem' }}>2. Who can use it</h2>
          <p>You must be 18 or older to use this service. By using JobsUncle.ai you confirm that the information you upload belongs to you or that you have the right to use it.</p>

          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', marginTop: '2rem' }}>3. Your content</h2>
          <p>You own your resume. You own your documents. We don't claim any rights to the content you upload or the content we generate for you. What you generate is yours.</p>

          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', marginTop: '2rem' }}>4. Acceptable use</h2>
          <p>You agree not to use JobsUncle.ai to:</p>
          <ul style={{ paddingLeft: '1.5rem', lineHeight: 2 }}>
            <li>Upload content that belongs to someone else without permission</li>
            <li>Attempt to reverse engineer, scrape, or abuse the service</li>
            <li>Use automated tools to generate bulk resumes</li>
            <li>Misrepresent your identity or credentials to employers</li>
          </ul>

          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', marginTop: '2rem' }}>5. AI-generated content</h2>
          <p>JobsUncle.ai uses AI to generate documents. The output is a starting point — not a guarantee of employment. You are responsible for reviewing, editing, and verifying the accuracy of anything you submit to an employer. We are not responsible for any outcome resulting from use of generated documents.</p>

          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', marginTop: '2rem' }}>6. Payments and refunds</h2>
          <p>All payments are processed by Stripe. Subscriptions auto-renew unless cancelled. We do not offer refunds for partial billing periods. If you have a billing issue contact <a href="mailto:jobsuncleai@gmail.com" style={{ color: 'var(--accent)' }}>jobsuncleai@gmail.com</a> and we'll sort it out.</p>

          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', marginTop: '2rem' }}>7. Availability</h2>
          <p>We do our best to keep the service running. We can't guarantee 100% uptime. We reserve the right to modify, suspend, or discontinue the service at any time.</p>

          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', marginTop: '2rem' }}>8. Limitation of liability</h2>
          <p>JobsUncle.ai is provided as-is. We are not liable for any direct, indirect, or consequential damages arising from your use of the service.</p>

          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', marginTop: '2rem' }}>9. Changes to these terms</h2>
          <p>We may update these terms. If we make material changes we'll update the date above. Continued use of the service means you accept the updated terms.</p>

          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', marginTop: '2rem' }}>10. Contact</h2>
          <p><a href="mailto:jobsuncleai@gmail.com" style={{ color: 'var(--accent)' }}>jobsuncleai@gmail.com</a></p>

        </div>

        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
          <Link href="/" style={{ color: 'var(--text-soft)', textDecoration: 'none' }}>← Back to JobsUncle.ai</Link>
          <Link href="/privacy" style={{ color: 'var(--text-soft)', textDecoration: 'none' }}>Privacy Policy</Link>
          <Link href="/about" style={{ color: 'var(--text-soft)', textDecoration: 'none' }}>Our Story</Link>
        </div>

      </div>
    </>
  )
}
