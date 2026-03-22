import { useState } from 'react'

export default function ContactModal({ onClose }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | success | error

  async function handleSubmit() {
    if (!name.trim() || !email.trim() || !message.trim()) return
    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message })
      })
      if (res.ok) {
        setStatus('success')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem'
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--surface, #fff)', borderRadius: '16px',
        padding: '2rem', maxWidth: '440px', width: '100%',
        boxShadow: '0 8px 40px rgba(0,209,255,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <img src="/jobsuncle-logo.png" alt="JobsUncle.ai" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink, #1a1a2e)' }}>
            Contact Us
          </h2>
        </div>

        {status === 'success' ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
            <p style={{ fontWeight: 700, color: '#00D1FF', margin: '0 0 0.5rem' }}>Message sent!</p>
            <p style={{ color: 'var(--text-soft, #666)', fontSize: '0.9rem', margin: 0 }}>
              We'll get back to you soon. We'll get back to you soon.
            </p>
            <button onClick={onClose} style={{
              marginTop: '1.25rem', background: '#00D1FF', color: '#fff',
              border: 'none', borderRadius: '20px', padding: '8px 24px',
              fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem'
            }}>Close</button>
          </div>
        ) : (
          <>
            <p style={{ color: 'var(--text-soft, #666)', fontSize: '0.88rem', margin: '0 0 1.25rem' }}>
              Question, feedback, or bug? We read everything.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                style={inputStyle}
              />
              <input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
              />
              <textarea
                placeholder="What's on your mind?"
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            {status === 'error' && (
              <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: '0.5rem 0 0' }}>
                Something went wrong. Try again.
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={onClose} style={{
                flex: 1, background: 'transparent', border: '1.5px solid #e5e7eb',
                borderRadius: '20px', padding: '8px', fontWeight: 600,
                cursor: 'pointer', color: 'var(--text-soft, #666)', fontSize: '0.88rem'
              }}>Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={status === 'sending' || !name || !email || !message}
                style={{
                  flex: 2, background: '#00D1FF', color: '#fff',
                  border: 'none', borderRadius: '20px', padding: '8px',
                  fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem',
                  opacity: (!name || !email || !message) ? 0.5 : 1
                }}
              >
                {status === 'sending' ? 'Sending…' : 'Send Message'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1.5px solid #e5e7eb',
  fontSize: '0.9rem',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  background: 'var(--bg, #fafafa)',
  color: 'var(--ink, #1a1a2e)'
}
