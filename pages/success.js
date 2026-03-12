import { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

export default function Success() {
  const router = useRouter()
  const { session_id } = router.query
  const [status, setStatus] = useState('verifying') // verifying | success | error

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
          setStatus('success')
        } else {
          setStatus('error')
        }
      })
      .catch(() => setStatus('error'))
  }, [session_id])

  return (
    <>
      <Head>
        <title>Welcome to Jobs Uncle Pro</title>
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
          <img
            src="/uncle-spin-hero.png"
            alt="Jobs Uncle"
            style={{ width: 100, height: 'auto', marginBottom: '24px' }}
          />

          {status === 'verifying' && (
            <>
              <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', margin: '0 0 12px' }}>
                One sec...
              </h1>
              <p style={{ color: 'var(--text-soft)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Confirming your payment.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', margin: '0 0 12px', lineHeight: 1.1 }}>
                You're in. Let's get to work.
              </h1>
              <p style={{ color: 'var(--text-soft)', fontSize: '0.9rem', margin: '0 0 32px', lineHeight: 1.6 }}>
                Unlimited resumes and cover letters, tailored to every job you apply for.
              </p>
              <button
                onClick={() => router.push('/')}
                style={{
                  width: '100%',
                  padding: '1rem 2rem',
                  background: 'var(--ink)',
                  color: 'var(--bg)',
                  border: 'none',
                  borderRadius: '4px',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                }}
              >
                Build my first resume →
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', margin: '0 0 12px' }}>
                Something went wrong.
              </h1>
              <p style={{ color: 'var(--text-soft)', fontSize: '0.9rem', margin: '0 0 32px', lineHeight: 1.6 }}>
                Payment may have gone through — email <a href="mailto:support@jobsuncle.ai" style={{ color: 'var(--accent)' }}>support@jobsuncle.ai</a> and we'll sort it out.
              </p>
              <button
                onClick={() => router.push('/')}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'transparent',
                  color: 'var(--ink)',
                  border: '1.5px solid var(--border)',
                  borderRadius: '4px',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
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
