import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Success() {
  const router = useRouter()
  const { session_id } = router.query

  useEffect(() => {
    if (session_id) {
      localStorage.setItem('ju_session', session_id)
    }
  }, [session_id])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
      gap: '24px',
      padding: '40px 20px',
      textAlign: 'center'
    }}>
      <img src="/uncle-spin-hero.png" alt="Jobs Uncle" style={{ width: 160, height: 'auto' }} />
      <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '3rem', margin: 0 }}>
        You&rsquo;re in.
      </h1>
      <p style={{ fontSize: '1.1rem', color: 'var(--text-soft)', maxWidth: 400, margin: 0 }}>
        Unlimited resumes. Every job. Uncle&rsquo;s got you.
      </p>
      <button
        onClick={() => router.push('/')}
        style={{
          background: 'var(--accent)',
          color: 'white',
          border: 'none',
          padding: '14px 36px',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: 'pointer',
          letterSpacing: '0.02em'
        }}
      >
        Start building resumes →
      </button>
    </div>
  )
}
