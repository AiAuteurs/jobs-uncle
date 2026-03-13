import { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

export default function Success() {
  const router = useRouter()
  const { session_id, plan } = router.query
  const [status, setStatus] = useState('verifying')
  const [isPlus, setIsPlus] = useState(false)

  useEffect(() => {
    if (!session_id) return

    fetch('/api/verify-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session_id }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          localStorage.setItem('ju_session', session_id)
          const plus = data.plan === 'pro_plus_monthly' || data.plan === 'pro_plus_annual' || plan === 'pro_plus_monthly' || plan === 'pro_plus_annual'
          if (plus) {
            localStorage.setItem('ju_plus_session', session_id)
            setIsPlus(true)
          }
          setStatus('success')
        } else {
          setStatus('error')
        }
      })
      .catch(() => setStatus('error'))
  }, [session_id, plan])

  return (
    <>
      <Head>
        <title>{isPlus ? 'Welcome to JobsUncle Pro+' : 'Welcome to JobsUncle Pro'}</title>
      </Head>

      <div style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{
          background: 'var(--surface)',
          border: '1.5px solid var(--border)',
          borderRadius: '12px',
          padding: '48px 40px',
          maxWidth: '440px',
          width: '100%',
          textAlign: 'center',
        }}>
          <img src="/uncle-spin-hero.png" alt="Jobs Uncle" style={{ width: 100, height: 'auto', marginBottom: '24px' }} />

          {status === 'verifying' && (
            <>
              <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', margin: '0 0 12px' }}>One sec...</h1>
              <p style={{ color: 'var(--text-soft)', fontSize: '0.9rem', lineHeight: 1.6 }}>Confirming your payment.</p>
            </>
          )}

          {status === 'success' && !isPlus && (
            <>
              <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', margin: '0 0 12px', lineHeight: 1.1 }}>
                You're in. Let's get to work.
              </h1>
              <p style={{ color: 'var(--text-soft)', fontSize: '0.9rem', margin: '0 0 32px', lineHeight: 1.6 }}>
                Unlimited resumes and cover letters, tailored to every job you apply for.
              </p>
              <button
                onClick={() => router.push('/')}
                style={{ width: '100%', padding: '1rem 2rem', background: 'var(--ink)', color: 'var(--bg)', border: 'none', borderRadius: '4px', fontFamily: 'Inter, sans-serif', fontSize: '0.95rem', fontWeight: 500, cursor: 'pointer', letterSpacing: '0.02em' }}
              >
                Build my first resume →
              </button>
            </>
          )}

          {status === 'success' && isPlus && (
            <>
              <div style={{ display: 'inline-block', background: '#6366f1', color: 'white', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', padding: '4px 12px', borderRadius: '20px', marginBottom: '16px', textTransform: 'uppercase' }}>Pro+</div>
              <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', margin: '0 0 12px', lineHeight: 1.1 }}>
                Two versions. One shot.
              </h1>
              <p style={{ color: 'var(--text-soft)', fontSize: '0.9rem', margin: '0 0 32px', lineHeight: 1.6 }}>
                Enable <strong style={{ color: 'var(--ink)' }}>Dual Resume Versions</strong> before generating to get a Leadership-focused <em>and</em> Technical-focused resume in one shot.
              </p>
              <button
                onClick={() => router.push('/')}
                style={{ width: '100%', padding: '1rem 2rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', fontFamily: 'Inter, sans-serif', fontSize: '0.95rem', fontWeight: 500, cursor: 'pointer', letterSpacing: '0.02em' }}
              >
                Build my dual resume →
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', margin: '0 0 12px' }}>Something went wrong.</h1>
              <p style={{ color: 'var(--text-soft)', fontSize: '0.9rem', margin: '0 0 32px', lineHeight: 1.6 }}>
                Payment may have gone through — email <a href="mailto:support@jobsuncle.ai" style={{ color: 'var(--accent)' }}>support@jobsuncle.ai</a> and we'll sort it out.
              </p>
              <button
                onClick={() => router.push('/')}
                style={{ width: '100%', padding: '1rem', background: 'transparent', color: 'var(--ink)', border: '1.5px solid var(--border)', borderRadius: '4px', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', cursor: 'pointer' }}
              >
                ← Back to home
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
