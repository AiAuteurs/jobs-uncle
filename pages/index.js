import { useState, useRef, useCallback, useEffect } from 'react'
import Head from 'next/head'

const renderMarkdown = (text) => {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^#{1,3}\s+(.+)$/gm, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')
    .replace(/^/, '<p>').replace(/$/, '</p>')
}

const stripMarkdown = (text) => {
  if (!text) return ''
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^#{1,3}\s+/gm, '')
    .trim()
}

export default function Home() {
  const [pdfFile, setPdfFile] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [dragover, setDragover] = useState(false)
  const [docxLoading, setDocxLoading] = useState(false)
  const [resumeCount, setResumeCount] = useState(null)
  const [counterRolling, setCounterRolling] = useState(false)
  const [mascotSpin, setMascotSpin] = useState(false)

  const updateCounter = (newCount) => {
    if (newCount === null) return
    setResumeCount(newCount)
  }
  const [showPaywall, setShowPaywall] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)
  const [manageEmail, setManageEmail] = useState('')
  const [manageStatus, setManageStatus] = useState(null)
  const [manageMsg, setManageMsg] = useState('')
  const [paywallSigninMode, setPaywallSigninMode] = useState(false)
  const [isPaid, setIsPaid] = useState(false)
  const [accessLevel, setAccessLevel] = useState(null) // null | 'free' | 'paid' | 'pro_plus'
  const [feedback, setFeedback] = useState(null) // 'yes' | 'kinda' | 'no'
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [dmCopied, setDmCopied] = useState(false)
  const [isPlusUser, setIsPlusUser] = useState(false)
  const [showPlusPaywall, setShowPlusPaywall] = useState(false)
  const [dualVersionEnabled, setDualVersionEnabled] = useState(false)
  const [activeResume, setActiveResume] = useState('a') // 'a' | 'b'
  const [showRestore, setShowRestore] = useState(false)
  const [restoreEmail, setRestoreEmail] = useState('')
  const [restoreStatus, setRestoreStatus] = useState(null) // null | 'loading' | 'success' | 'error'
  const [restoreMsg, setRestoreMsg] = useState('')
  const [showBeta, setShowBeta] = useState(false)
  const [betaCode, setBetaCode] = useState('')
  const [betaEmail, setBetaEmail] = useState('')
  const [betaStatus, setBetaStatus] = useState(null)
  const [betaMsg, setBetaMsg] = useState('')
  const [showEmailGate, setShowEmailGate] = useState(false)
  const [gateEmail, setGateEmail] = useState('')
  const [gateStatus, setGateStatus] = useState(null) // null | 'loading' | 'done' | 'error'
  const [gateMsg, setGateMsg] = useState('')
  const fileInputRef = useRef(null)

  // Fetch resume counter + check access via cookie on mount
  // Works in private/incognito &mdash; no localStorage dependency
  useEffect(() => {
    fetch('/api/counter')
      .then(r => r.json())
      .then(d => setResumeCount(d.count))
      .catch(() => {})

    fetch('/api/check-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
      .then(r => r.json())
      .then(d => {
        if (d.access === 'pro_plus') { setIsPaid(true); setIsPlusUser(true); setAccessLevel('pro_plus') }
        else if (d.access === 'paid') { setIsPaid(true); setAccessLevel('paid') }
      })
      .catch(() => {})
  }, [])

  const handleFile = (file) => {
    if (file && file.type === 'application/pdf') {
      setPdfFile(file)
      setError(null)
    } else {
      setError('Please upload a PDF file. Export your LinkedIn profile as PDF and upload it here.')
    }
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragover(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }, [])

  const handleGenerate = async () => {
    if (!pdfFile || !jobDescription.trim()) {
      setError('Please upload your LinkedIn PDF and paste the job description.')
      return
    }

    // Check access unless already paid
    if (!isPaid) {
      const accessRes = await fetch('/api/check-access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const accessData = await accessRes.json()
      if (accessData.access === 'none') {
        setPaywallSigninMode(false)
        setShowPaywall(true)
        return
      }
    }

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const formData = new FormData()
      formData.append('pdf', pdfFile)
      formData.append('jobDescription', jobDescription)
      formData.append('dualVersion', dualVersionEnabled && isPlusUser ? 'true' : 'false')

      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed')
      }

      setResults(data)

      // Increment counter + refresh display
      fetch('/api/counter', { method: 'POST' })
        .then(r => r.json())
        .then(d => updateCounter(d.count))
        .catch(() => {})

      // Mark free resume as used + show email gate after first use
      if (!isPaid) {
        fetch('/api/mark-used', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
          .then(r => r.json())
          .then(d => {
            // Show email gate after first free resume if not already registered
            if (d.usedCount === 1 && typeof window !== 'undefined' && !localStorage.getItem('ju_email_gate')) {
              setShowEmailGate(true)
            }
          })
          .catch(() => {})
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (plan = 'pro') => {
    const referral = (typeof window !== 'undefined' && window.promotekit_referral) || ''
    const res = await fetch('/api/stripe-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan, referral }) })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  // TXT &mdash; stripped plain text for pasting into ATS / job portals
  const downloadTxt = (rawContent, label) => {
    const content = stripMarkdown(rawContent)
    const filename = results?.fileBaseName
      ? `${results.fileBaseName}_${label}.txt`
      : `${label}.txt`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // DOCX &mdash; real Word doc for human readers, editable in Word / Google Docs
  const downloadDocx = async (type) => {
    if (!results) return
    setDocxLoading(true)
    try {
      const payload = {
        resume: type === 'resume' || type === 'both'
          ? (results.dualVersion ? (activeResume === 'a' ? results.resumeA : results.resumeB) : results.resume)
          : null,
        coverLetter: type === 'cover' || type === 'both' ? results.coverLetter : null,
        fileBaseName: results.fileBaseName
          ? `${results.fileBaseName}_${type === 'resume' ? (results.dualVersion ? `Resume_${activeResume.toUpperCase()}` : 'Resume') : type === 'cover' ? 'Cover_Letter' : 'Full_Package'}`
          : type,
      }

      const response = await fetch('/api/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('DOCX generation failed')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${payload.fileBaseName}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError('DOCX download failed. Try the TXT version.')
    } finally {
      setDocxLoading(false)
    }
  }

  // PDF &mdash; print via browser print dialog
  const downloadPdf = (content, label) => {
    const filename = results?.fileBaseName
      ? `${results.fileBaseName}_${label}`
      : label
    const win = window.open('', '_blank')
    win.document.write(`<!DOCTYPE html><html><head>
      <title>${filename}</title>
      <style>
        body { font-family: Georgia, serif; font-size: 12pt; line-height: 1.65; max-width: 680px; margin: 40px auto; padding: 0 20px; color: #111; }
        strong { font-weight: bold; }
        p { margin: 0 0 0.75em 0; }
        @media print { body { margin: 0; } }
      </style>
    </head><body>
      <div>${renderMarkdown(content)}</div>
    <script>window.onload = () => { window.print(); }<\/script>
    </body></html>`)
    win.document.close()
  }

  const handleRestore = async () => {
    if (!restoreEmail.includes('@')) return
    setRestoreStatus('loading')
    try {
      const res = await fetch('/api/restore-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: restoreEmail })
      })
      const data = await res.json()
      if (data.ok) {
        setRestoreStatus('success')
        setRestoreMsg('Access restored! Reloading...')
        setTimeout(() => location.reload(), 1500)
      } else {
        setRestoreStatus('error')
        setRestoreMsg(data.error || 'No account found for that email.')
      }
    } catch {
      setRestoreStatus('error')
      setRestoreMsg('Something went wrong. Try again.')
    }
  }

  const handleBeta = async () => {
    if (!betaCode.trim()) return
    if (!betaEmail.includes('@')) { setBetaStatus('error'); setBetaMsg("Enter a valid email &mdash; you'll need it to restore access later."); return }
    setBetaStatus('loading')
    try {
      const res = await fetch('/api/redeem-beta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: betaCode.trim(), email: betaEmail.trim() })
      })
      const data = await res.json()
      if (data.ok) {
        setBetaStatus('success')
        setBetaMsg('Beta access activated! Reloading...')
        setTimeout(() => location.reload(), 1500)
      } else {
        setBetaStatus('error')
        setBetaMsg(data.error || 'Invalid code.')
      }
    } catch {
      setBetaStatus('error')
      setBetaMsg('Something went wrong. Try again.')
    }
  }

  const handleEmailGate = async () => {
    if (!gateEmail || !gateEmail.includes('@')) {
      setGateMsg('Please enter a valid email.')
      return
    }
    setGateStatus('loading')
    try {
      const res = await fetch('/api/register-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: gateEmail })
      })
      if (res.ok) {
        setGateStatus('done')
        setShowEmailGate(false)
        if (typeof window !== 'undefined') localStorage.setItem('ju_email_gate', '1')
      } else {
        setGateStatus('error')
        setGateMsg('Something went wrong. Try again.')
      }
    } catch {
      setGateStatus('error')
      setGateMsg('Something went wrong. Try again.')
    }
  }

  const handleReset = () => {
    setJobDescription('')
    setResults(null)
    setError(null)
  }

  const handleManagePortal = async () => {
    if (!manageEmail.includes('@')) {
      setManageMsg('Enter a valid email.')
      return
    }
    setManageStatus('loading')
    try {
      const res = await fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: manageEmail })
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setManageStatus('error')
        setManageMsg(data.error || 'No subscription found for that email.')
      }
    } catch {
      setManageStatus('error')
      setManageMsg('Something went wrong. Try again.')
    }
  }

  const canGenerate = pdfFile && jobDescription.trim().length > 50

  return (
    <>
      {showManageModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowManageModal(false)}>
          <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '48px 40px', maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.3)', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowManageModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '1.2rem', color: 'var(--text-soft)', cursor: 'pointer', lineHeight: 1, padding: '4px 8px' }}>✕</button>
            <img src="/uncle-spin-hero.png" alt="JobsUncle.ai" style={{ width: 80, height: 'auto', marginBottom: '20px' }} />
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.8rem', margin: '0 0 10px', lineHeight: 1.1 }}>Manage your subscription</h2>
            <p style={{ color: 'var(--text-soft)', fontSize: '0.88rem', margin: '0 0 20px', lineHeight: 1.6 }}>Enter the email you used to sign up. We'll take you straight to your billing page.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="email"
                value={manageEmail}
                onChange={e => setManageEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManagePortal()}
                placeholder="you@email.com"
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem', background: 'var(--bg)', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }}
              />
              {manageMsg && <p style={{ fontSize: '0.82rem', color: manageStatus === 'error' ? '#ef4444' : 'var(--text-soft)', margin: 0 }}>{manageMsg}</p>}
              <button
                onClick={handleManagePortal}
                disabled={manageStatus === 'loading'}
                style={{ width: '100%', padding: '12px', background: 'var(--ink)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}
              >
                {manageStatus === 'loading' ? 'Looking up your account…' : 'Go to billing →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSignIn && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowSignIn(false)}>
          <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '48px 40px', maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.3)', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowSignIn(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '1.2rem', color: 'var(--text-soft)', cursor: 'pointer', lineHeight: 1, padding: '4px 8px' }}>✕</button>
            <img src="/uncle-spin-hero.png" alt="JobsUncle.ai" style={{ width: 100, height: 'auto', marginBottom: '24px' }} />
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', margin: '0 0 12px', lineHeight: 1.1 }}>Member sign in</h2>
            <p style={{ color: 'var(--text-soft)', fontSize: '0.9rem', margin: '0 0 16px', lineHeight: 1.6 }}>Enter your email to restore Pro access.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <input
                type="email"
                value={restoreEmail}
                onChange={e => setRestoreEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRestore()}
                placeholder="you@email.com"
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem', background: 'var(--bg)', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }}
              />
              <button
                onClick={handleRestore}
                disabled={restoreStatus === 'loading'}
                style={{ width: '100%', padding: '12px', background: 'var(--ink)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}
              >
                {restoreStatus === 'loading' ? 'Checking…' : 'Restore my access'}
              </button>
              {restoreMsg && <p style={{ fontSize: '0.82rem', color: restoreStatus === 'success' ? '#22c55e' : '#ef4444', margin: 0 }}>{restoreMsg}</p>}
            </div>
            <div style={{ padding: '10px 14px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--text-soft)', textAlign: 'center' }}>
              New to JobsUncle? <button onClick={() => { setShowSignIn(false) }} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem', padding: 0 }}>Try it free — no card needed →</button>
            </div>
          </div>
        </div>
      )}

      {showPaywall && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowPaywall(false)}>
          <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '48px 40px', maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.3)', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowPaywall(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '1.2rem', color: 'var(--text-soft)', cursor: 'pointer', lineHeight: 1, padding: '4px 8px' }}>✕</button>
            <img src="/uncle-spin-hero.png" alt="JobsUncle.ai" style={{ width: 100, height: 'auto', marginBottom: '24px' }} />
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', margin: '0 0 12px', lineHeight: 1.1 }}>Your free resume is done.</h2>
            <p style={{ color: 'var(--text-soft)', fontSize: '0.95rem', margin: '0 0 32px', lineHeight: 1.6 }}>
              Upgrade to Pro for unlimited resumes, every job, forever.<br />
              <strong style={{ color: 'var(--ink)' }}>$49.99 / year.</strong> Cancel anytime.
            </p>
            <button onClick={() => handleUpgrade('pro')} style={{ width: '100%', background: 'var(--accent)', color: 'white', border: 'none', padding: '16px', borderRadius: '8px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', marginBottom: '12px', letterSpacing: '0.02em' }}>
              Upgrade to Pro &mdash; $49.99/yr
            </button>
            <button onClick={() => { setShowPaywall(false); setShowSignIn(true) }} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.85rem', cursor: 'pointer', padding: '8px', fontWeight: 600 }}>
              Already a member? Sign in →
            </button>
            <button onClick={() => setShowPaywall(false)} style={{ display: 'block', background: 'none', border: 'none', color: 'var(--text-soft)', fontSize: '0.85rem', cursor: 'pointer', padding: '4px', margin: '0 auto' }}>
              Maybe later
            </button>

            <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-soft)', marginBottom: '6px' }}>Got a beta code?</div>
                {!showBeta ? (
                  <button onClick={() => setShowBeta(true)} style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: '20px', color: 'var(--text-soft)', fontSize: '0.8rem', fontWeight: 600, padding: '6px 16px', cursor: 'pointer' }}>
                    Redeem
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" value={betaCode} onChange={e => setBetaCode(e.target.value)} placeholder="UNCLE-BETA-XXXX" style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: '6px', fontSize: '0.85rem', background: 'var(--surface)', color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="email" value={betaEmail} onChange={e => setBetaEmail(e.target.value)} placeholder="Your email (to sign in later)" style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: '6px', fontSize: '0.85rem', background: 'var(--surface)', color: 'var(--ink)' }} onKeyDown={e => e.key === 'Enter' && handleBeta()} />
                      <button onClick={handleBeta} disabled={betaStatus === 'loading'} style={{ padding: '8px 16px', background: 'var(--ink)', color: 'var(--bg)', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                        {betaStatus === 'loading' ? '...' : 'Redeem'}
                      </button>
                    </div>
                    {betaMsg && <div style={{ fontSize: '0.8rem', color: betaStatus === 'success' ? '#22c55e' : '#ef4444' }}>{betaMsg}</div>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showPlusPaywall && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowPlusPaywall(false)}>
          <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '48px 40px', maxWidth: '460px', width: '100%', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.3)', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowPlusPaywall(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '1.2rem', color: 'var(--text-soft)', cursor: 'pointer', lineHeight: 1, padding: '4px 8px' }}>✕</button>
            <img src="/uncle-spin-hero.png" alt="JobsUncle.ai" style={{ width: 100, height: 'auto', marginBottom: '24px' }} />
            <div style={{ display: 'inline-block', background: '#6366f1', color: 'white', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', padding: '4px 12px', borderRadius: '20px', marginBottom: '16px', textTransform: 'uppercase' }}>Pro+</div>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', margin: '0 0 12px', lineHeight: 1.1 }}>Two resumes. One shot.</h2>
            <p style={{ color: 'var(--text-soft)', fontSize: '0.95rem', margin: '0 0 8px', lineHeight: 1.6 }}>
              Get a <strong style={{ color: 'var(--ink)' }}>Leadership-focused</strong> and a <strong style={{ color: 'var(--ink)' }}>Technical/Achievement-focused</strong> version &mdash; same experience, two different angles. Use whichever fits the hiring manager.
            </p>
            <p style={{ color: 'var(--text-soft)', fontSize: '0.85rem', margin: '0 0 32px' }}>Perfect if you're actively hunting.</p>
            <button onClick={() => handleUpgrade('pro_plus_monthly')} style={{ width: '100%', background: '#6366f1', color: 'white', border: 'none', padding: '16px', borderRadius: '8px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', marginBottom: '6px', letterSpacing: '0.02em' }}>
              Pro+ Monthly &mdash; $9.99/mo
            </button>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-soft)', margin: '0 0 14px' }}>Renews monthly. Cancel anytime from your account.</p>
            <button onClick={() => handleUpgrade('pro_plus_annual')} style={{ width: '100%', background: 'var(--ink)', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', marginBottom: '6px', letterSpacing: '0.02em' }}>
              Pro+ Annual &mdash; $79.99/yr <span style={{ opacity: 0.7, fontSize: '0.8rem' }}>(save 33%)</span>
            </button>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-soft)', margin: '0 0 12px' }}>Renews annually. Cancel anytime from your account.</p>
            <button onClick={() => setShowPlusPaywall(false)} style={{ background: 'none', border: 'none', color: 'var(--text-soft)', fontSize: '0.85rem', cursor: 'pointer', padding: '8px' }}>
              Maybe later
            </button>
          </div>
        </div>
      )}
      {showEmailGate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '48px 40px', maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.35)' }}>
            <img src="/uncle-spin-logo.png" alt="JobsUncle.ai" style={{ width: 64, height: 'auto', marginBottom: '20px' }} />
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.9rem', margin: '0 0 10px', lineHeight: 1.1 }}>Your first resume is ready.</h2>
            <p style={{ color: 'var(--text-soft)', fontSize: '0.9rem', margin: '0 0 28px', lineHeight: 1.65 }}>
              Enter your email to unlock <strong style={{ color: 'var(--ink)' }}>2 more free resumes.</strong><br />No password. No credit card. Just your email.
            </p>
            <input
              type="email"
              value={gateEmail}
              onChange={e => setGateEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEmailGate()}
              placeholder="you@email.com"
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '0.95rem', background: 'var(--bg)', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box', marginBottom: '12px' }}
            />
            {gateMsg && <p style={{ color: '#ef4444', fontSize: '0.82rem', margin: '0 0 10px' }}>{gateMsg}</p>}
            <button
              onClick={handleEmailGate}
              disabled={gateStatus === 'loading'}
              style={{ width: '100%', background: 'var(--accent)', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.02em' }}
            >
              {gateStatus === 'loading' ? 'Saving…' : 'Unlock 2 more free resumes'}
            </button>
            <p style={{ marginTop: '16px', fontSize: '0.78rem', color: 'var(--text-soft)' }}>We don't spam. Ever. Unsubscribe anytime.</p>
          </div>
        </div>
      )}

      <Head>
        <title>JobsUncle.ai &mdash; Your resume, tailored to every job.</title>
        <meta name="description" content="Upload your LinkedIn PDF, paste a job description, get a bespoke resume and cover letter in under a minute." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="JobsUncle.ai &mdash; Your resume, tailored to every job." />
        <meta property="og:description" content="Upload your resume or LinkedIn PDF, paste the job description &mdash; get a tailored resume, cover letter, recruiter gap analysis, and a hiring manager DM in under a minute." />
        <meta property="og:image" content="https://res.cloudinary.com/dbyzesuya/image/upload/og-image_uqdfh0.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content="https://www.jobsuncle.ai" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://res.cloudinary.com/dbyzesuya/image/upload/og-image_uqdfh0.png" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🤵</text></svg>" />
      </Head>

      <header className="header">
        <div className="logo">
          <img src="/uncle-spin-logo.png" alt="Uncle Spin" className="logo-icon" />
          <span className="logo-text">JobsUncle.ai</span>
          <span className="header-nav-links">
            <a href="/about" className="header-nav-link" style={{ color: 'var(--text-soft)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.02em', marginLeft: '1.5rem' }}>Our Story</a>
            <a href="/example" className="header-nav-link" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 700, marginLeft: '1.25rem', border: '1.5px solid var(--accent)', borderRadius: '20px', padding: '3px 10px', letterSpacing: '0.02em' }}>See an example</a>
            <a href="/faq" className="header-nav-link" style={{ color: 'var(--text-soft)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.02em', marginLeft: '1.25rem' }}>FAQ</a>
          </span>
        </div>
        <div className="header-right">
          {accessLevel === 'pro_plus' && (
            <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#6366f1', color: 'white', borderRadius: '20px', padding: '3px 10px', letterSpacing: '0.04em', marginRight: '0.75rem' }}>Pro+ Active</span>
          )}
          {accessLevel === 'paid' && (
            <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'var(--accent)', color: 'white', borderRadius: '20px', padding: '3px 10px', letterSpacing: '0.04em', marginRight: '0.75rem' }}>Pro Active</span>
          )}
          {isPaid && (
            <a onClick={() => setShowManageModal(true)} style={{ color: 'var(--text-soft)', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.02em', marginRight: '1.25rem', cursor: 'pointer' }}>Manage Subscription</a>
          )}
          {!isPaid && (
            <a href="#signin" onClick={e => { e.preventDefault(); setShowSignIn(true) }} className="header-member-signin" style={{ color: 'var(--text-soft)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.02em', marginRight: '1.25rem', cursor: 'pointer' }}>Member Sign In</a>
          )}
          <span className="header-tagline-inline" style={{ fontSize: '0.85rem', color: 'var(--ink)', fontWeight: 700, letterSpacing: '0.02em' }}>Resumes for the AI age.</span>
        </div>
      </header>

      {/* MOBILE-ONLY NAV BAR */}
      {!isPaid && (
        <div className="mobile-signin-bar" style={{ display: 'none' }}>
          <a onClick={e => { e.preventDefault(); setShowSignIn(true) }} style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'none' }}>Member Sign In</a>
          <a href="/faq" style={{ color: 'var(--text-soft)', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none' }}>FAQ</a>
          <a href="/about" style={{ color: 'var(--text-soft)', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none' }}>Our Story</a>
        </div>
      )}

      <div className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <p className="hero-eyebrow">AI Resume Intelligence</p>
            <h1>Your resume, <em>tailored</em><br />to every job.</h1>
          </div>
          <div className="hero-mascot">
            <img src="/uncle-spin-hero.png" alt="Uncle Spin" className="mascot-img" />
          </div>
        </div>
      </div>

      {/* COUNTER BAND */}
      {resumeCount !== null && (
        <div style={{ background: 'var(--accent)', padding: '1.25rem 2rem', textAlign: 'center', overflow: 'hidden' }}>
          <span style={{
            display: 'inline-block',
            color: 'white',
            fontFamily: 'Inter',
            fontWeight: 800,
            fontSize: '2rem',
            letterSpacing: '-0.02em',
          }}>{resumeCount.toLocaleString()}</span>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'Inter', fontWeight: 500, fontSize: '0.85rem', marginLeft: '10px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>resumes tailored and counting</span>
        </div>
      )}

      {/* TESTIMONIAL */}
      <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '1.5rem 2rem', textAlign: 'center' }}>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.15rem', fontStyle: 'italic', color: 'var(--ink)', margin: '0 0 8px' }}>"The results are solid. I like what I got back."</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-soft)', fontWeight: 600, margin: 0 }}>&mdash; B.C., ICF Certified Career Coach</p>
      </div>

      <div className="how-section">
        <div className="how-title">How it works</div>
        <div className="how-items">
          <div className="how-item">
            <div className="how-num">01</div>
            <div className="how-label">Upload your resume or LinkedIn PDF &mdash; your full career in one file</div>
          </div>
          <div className="how-item">
            <div className="how-num">02</div>
            <div className="how-label">Paste the job description &mdash; any role, any industry</div>
          </div>
          <div className="how-item">
            <div className="how-num">03</div>
            <div className="how-label">Download a tailored resume, cover letter, recruiter & ATS analysis, and a hiring manager DM</div>
          </div>
        </div>
        <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-soft)', marginTop: '1rem', letterSpacing: '0.03em' }}>Nothing is stored. Ever.</p>
      </div>

      <div className="app-container">

        {!results && (
          <>
            <div className="steps" id="get-started">
              {/* STEP 1 */}
              <div className={`step-card ${pdfFile ? 'complete' : 'active'}`}>
                <div className="step-number">Step 01</div>
                <div className="step-title">Your Resume or LinkedIn PDF</div>
                <p className="step-desc">
                  Upload your existing resume as a PDF, or export your LinkedIn profile as a PDF. Either works.
                </p>
                <div
                  className={`upload-zone ${dragover ? 'dragover' : ''} ${pdfFile ? 'has-file' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragover(true) }}
                  onDragLeave={() => setDragover(false)}
                >
                  {pdfFile ? (
                    <>
                      <div className="upload-icon">✓</div>
                      <div className="upload-filename">{pdfFile.name}</div>
                    </>
                  ) : (
                    <>
                      <img src="/uncle-spin-logo.png" className="upload-mascot" alt="JobsUncle.ai" />
                      <div className="upload-label">Drop PDF here or click to browse</div>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="file-input"
                  onChange={(e) => handleFile(e.target.files[0])}
                />
              </div>

              {/* STEP 2 */}
              <div className={`step-card ${jobDescription.trim().length > 50 ? 'complete' : pdfFile ? 'active' : ''}`}>
                <div className="step-number">Step 02</div>
                <div className="step-title">The Job Description</div>
                <p className="step-desc">
                  Paste the full job posting. The more detail, the sharper the match.
                </p>
                <textarea
                  className="job-textarea"
                  placeholder="Paste the complete job description here &mdash; title, responsibilities, requirements, the works..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>
            </div>

            {error && <div className="error-msg">{error}</div>}

            {/* DUAL VERSION TOGGLE &mdash; Pro+ users only */}
            {isPlusUser && (
              <div style={{ margin: '1.5rem 0 0', padding: '1.25rem 1.5rem', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)' }}>Dual Resume Versions</span>
                    <span style={{ background: '#6366f1', color: 'white', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase' }}>Pro+</span>
                  </div>
                  <p style={{ fontFamily: 'Inter', fontSize: '0.75rem', color: 'var(--text-soft)', margin: 0 }}>Get a Leadership-focused <em>and</em> a Technical/Achievement-focused version in one shot.</p>
                </div>
                <button
                  onClick={() => setDualVersionEnabled(!dualVersionEnabled)}
                  style={{ flexShrink: 0, padding: '8px 20px', background: dualVersionEnabled ? '#6366f1' : 'transparent', color: dualVersionEnabled ? 'white' : 'var(--text-soft)', border: `1.5px solid ${dualVersionEnabled ? '#6366f1' : 'var(--border)'}`, borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  {dualVersionEnabled ? '✓ Enabled' : 'Enable'}
                </button>
              </div>
            )}

            <button
              className={`generate-btn ${loading ? 'loading' : ''}`}
              onClick={handleGenerate}
              disabled={!canGenerate || loading}
            >
              {loading ? 'Working on it...' : dualVersionEnabled && isPlusUser ? 'Generate Dual Resume Package →' : 'Generate Resume Package →'}
            </button>

            {/* RESTORE + BETA &mdash; visible below generate, not buried */}
            {!isPaid && (
              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {/* DUAL RESUME &mdash; Pro+ upsell card */}
                <div style={{ padding: '1rem 1.5rem', background: 'var(--surface)', border: '1.5px solid #6366f1', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--ink)', fontWeight: 600 }}>Dual Resume Versions</span>
                        <span style={{ background: '#6366f1', color: 'white', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase' }}>Pro+</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>Leadership <em>and</em> Technical versions &mdash; two shots at the same role.</div>
                    </div>
                    <button onClick={() => setShowPlusPaywall(true)} style={{ flexShrink: 0, padding: '6px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                      Upgrade to Pro+
                    </button>
                  </div>
                </div>

                {/* BETA CODE */}
                <div style={{ padding: '1rem 1.5rem', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-soft)', fontWeight: 500 }}>Got a beta code?</div>
                    {!showBeta ? (
                      <button onClick={() => setShowBeta(true)} style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: '20px', color: 'var(--ink)', fontSize: '0.8rem', fontWeight: 600, padding: '6px 16px', cursor: 'pointer' }}>
                        Redeem
                      </button>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input type="text" value={betaCode} onChange={e => setBetaCode(e.target.value)} placeholder="UNCLE-BETA-XXXX" style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: '6px', fontSize: '0.85rem', background: 'var(--surface)', color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input type="email" value={betaEmail} onChange={e => setBetaEmail(e.target.value)} placeholder="Your email (to sign in later)" style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: '6px', fontSize: '0.85rem', background: 'var(--surface)', color: 'var(--ink)' }} onKeyDown={e => e.key === 'Enter' && handleBeta()} />
                          <button onClick={handleBeta} disabled={betaStatus === 'loading'} style={{ padding: '8px 16px', background: 'var(--ink)', color: 'var(--bg)', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                            {betaStatus === 'loading' ? '...' : 'Redeem'}
                          </button>
                        </div>
                        {betaMsg && <div style={{ fontSize: '0.8rem', color: betaStatus === 'success' ? '#22c55e' : '#ef4444' }}>{betaMsg}</div>}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </>
        )}

        {loading && (
          <div className="loading-state">
            <div className="loading-spinner" />
            <div className="loading-text">Your uncle is on it.</div>
            <div className="loading-sub">Analyzing your experience, matching it to the role...</div>
          </div>
        )}

        {results && (
          <>
            <div className="results">
              <div className="results-header">
                <div className="results-title">Your tailored documents</div>
                <div className="results-badge">Ready to download</div>
              </div>

              <div className="result-section">
                <div className="result-section-title">Resume</div>
                {results.dualVersion ? (
                  <>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                      <button
                        onClick={() => setActiveResume('a')}
                        style={{ padding: '6px 16px', background: activeResume === 'a' ? '#6366f1' : 'transparent', color: activeResume === 'a' ? 'white' : 'var(--text-soft)', border: `1.5px solid ${activeResume === 'a' ? '#6366f1' : 'var(--border)'}`, borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Version A &mdash; Leadership
                      </button>
                      <button
                        onClick={() => setActiveResume('b')}
                        style={{ padding: '6px 16px', background: activeResume === 'b' ? '#6366f1' : 'transparent', color: activeResume === 'b' ? 'white' : 'var(--text-soft)', border: `1.5px solid ${activeResume === 'b' ? '#6366f1' : 'var(--border)'}`, borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Version B &mdash; Technical
                      </button>
                    </div>
                    <div className="result-content" dangerouslySetInnerHTML={{__html: renderMarkdown(activeResume === 'a' ? results.resumeA : results.resumeB)}} />
                  </>
                ) : (
                  <div className="result-content" dangerouslySetInnerHTML={{__html: renderMarkdown(results.resume)}} />
                )}
              </div>

              <div className="result-section">
                <div className="result-section-title">Cover Letter</div>
                <div className="result-content" dangerouslySetInnerHTML={{__html: renderMarkdown(results.coverLetter)}} />
              </div>

              {results.recruiterNotes && (
                <div className="result-section" style={{ borderLeft: '3px solid #f59e0b', background: 'rgba(245,158,11,0.05)' }}>
                  <div className="result-section-title">Recruiter & ATS Analysis</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-soft)', marginBottom: '12px' }}>ATS compatibility check plus honest gaps a recruiter would flag &mdash; and how to own them.</div>
                  <div className="result-content" dangerouslySetInnerHTML={{__html: renderMarkdown(results.recruiterNotes)}} />
                </div>
              )}

              {results.hiringManagerDM && (
                <div className="result-section" style={{ borderLeft: '3px solid #6366f1', background: 'rgba(99,102,241,0.05)' }}>
                  <div className="result-section-title">Hiring Manager DM</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-soft)', marginBottom: '12px' }}>Skip the line. Send this directly to the hiring manager on LinkedIn or email.</div>
                  <div className="result-content" dangerouslySetInnerHTML={{__html: renderMarkdown(results.hiringManagerDM)}} />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(stripMarkdown(results.hiringManagerDM))
                      setDmCopied(true)
                      setTimeout(() => setDmCopied(false), 2000)
                    }}
                    style={{ marginTop: '12px', padding: '8px 20px', background: dmCopied ? '#22c55e' : '#6366f1', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                  >
                    {dmCopied ? '✓ Copied!' : 'Copy DM'}
                  </button>
                </div>
              )}

              {/* PURPOSE-DRIVEN DOWNLOAD SECTION */}
              <div className="download-section">
                <div className="download-section-header">
                  <span className="download-section-title">Download your documents</span>
                  <span className="download-section-sub">Three formats. Each built for a different situation.</span>
                </div>

                {/* FORMAT CARDS */}
                <div className="format-cards">

                  {/* TXT */}
                  <div className="format-card">
                    <div className="format-badge txt-badge">TXT</div>
                    <div className="format-purpose">Paste into job portals</div>
                    <div className="format-desc">Plain text. No formatting. Exactly what ATS systems and online job applications expect.</div>
                    <div className="format-btns">
                      <button className="format-btn" onClick={() => downloadTxt(results.resume, 'Resume')}>
                        Resume
                      </button>
                      <button className="format-btn" onClick={() => downloadTxt(results.coverLetter, 'Cover_Letter')}>
                        Cover Letter
                      </button>
                    </div>
                  </div>

                  {/* DOCX */}
                  <div className="format-card format-card-featured">
                    <div className="format-badge docx-badge">DOCX</div>
                    <div className="format-purpose">Send to a human</div>
                    <div className="format-desc">A real Word document. Edit in Word or Google Docs, tweak the wording, make it yours.</div>
                    <div className="format-btns">
                      <button
                        className="format-btn format-btn-featured"
                        onClick={() => downloadDocx('resume')}
                        disabled={docxLoading}
                      >
                        {docxLoading ? '...' : 'Resume'}
                      </button>
                      <button
                        className="format-btn format-btn-featured"
                        onClick={() => downloadDocx('cover')}
                        disabled={docxLoading}
                      >
                        {docxLoading ? '...' : 'Cover Letter'}
                      </button>
                    </div>
                  </div>

                  {/* PDF */}
                  <div className="format-card">
                    <div className="format-badge pdf-badge">PDF</div>
                    <div className="format-purpose">Print-ready version</div>
                    <div className="format-desc">Looks exactly right on paper or screen. Nothing shifts. Nothing reformats. Just print.</div>
                    <div className="format-btns">
                      <button className="format-btn" onClick={() => downloadPdf(results.resume, 'Resume')}>
                        Resume
                      </button>
                      <button className="format-btn" onClick={() => downloadPdf(results.coverLetter, 'Cover_Letter')}>
                        Cover Letter
                      </button>
                    </div>
                  </div>

                </div>

                {error && <div className="error-msg" style={{marginTop: '1rem'}}>{error}</div>}
              </div>
            </div>

            {/* FEEDBACK */}
            <div className="feedback-section">
              {!feedbackSent ? (
                <>
                  <div className="feedback-question">Did this look like a real resume you'd actually send?</div>
                  <div className="feedback-options">
                    {['yes', 'kinda', 'no'].map(opt => (
                      <button
                        key={opt}
                        className={`feedback-btn ${feedback === opt ? 'selected' : ''}`}
                        onClick={() => setFeedback(opt)}
                      >
                        {opt === 'yes' ? '👍 Yes' : opt === 'kinda' ? '🤔 Kind of' : '👎 No'}
                      </button>
                    ))}
                  </div>
                  {feedback && (
                    <>
                      <textarea
                        className="feedback-text"
                        placeholder="Anything specific? (optional)"
                        value={feedbackText}
                        onChange={e => setFeedbackText(e.target.value)}
                        rows={2}
                      />
                      <button className="feedback-submit" onClick={() => {
                        fetch('/api/feedback', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ rating: feedback, comment: feedbackText })
                        }).catch(() => {})
                        setFeedbackSent(true)
                      }}>
                        Send feedback
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="feedback-thanks">Thanks &mdash; that helps. 🙏</div>
              )}
            </div>

            {!isPlusUser && (
              <div style={{ margin: '1.5rem 0 0', padding: '1.25rem 1.5rem', background: 'rgba(99,102,241,0.05)', border: '1.5px solid #6366f1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)' }}>Want two versions?</span>
                    <span style={{ background: '#6366f1', color: 'white', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase' }}>Pro+</span>
                  </div>
                  <p style={{ fontFamily: 'Inter', fontSize: '0.75rem', color: 'var(--text-soft)', margin: 0 }}>Upgrade to get a Leadership <em>and</em> Technical version &mdash; two shots at the same role.</p>
                </div>
                <button
                  onClick={() => setShowPlusPaywall(true)}
                  style={{ flexShrink: 0, padding: '8px 20px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Upgrade to Pro+
                </button>
              </div>
            )}

            <button className="reset-btn" onClick={handleReset}>
              ← Start over with a new job
            </button>
          </>
        )}
      </div>

      <footer className="footer">
        <p>© 2026 JobsUncle.ai · Your documents are never stored · Built with AI</p>
        <p style={{ marginTop: '8px', fontSize: '0.75rem' }}>
          <a href="/privacy" style={{ color: 'var(--text-soft)', textDecoration: 'none', marginRight: '1rem' }}>Privacy Policy</a>
          <a href="/terms" style={{ color: 'var(--text-soft)', textDecoration: 'none', marginRight: '1rem' }}>Terms of Service</a>
          <a href="https://jobsuncle.promotekit.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Earn 20% — Become an Affiliate</a>
        </p>
      </footer>
    </>
  )
}
