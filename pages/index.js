import { useState, useRef, useCallback, useEffect } from 'react'
import Head from 'next/head'
import Header from '../components/Header'
import ContactModal from '../components/ContactModal'
import { useRouter } from 'next/router'

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
  const router = useRouter()
  const [pdfFile, setPdfFile] = useState(null)
  const [resumeInputMode, setResumeInputMode] = useState('upload') // 'upload' | 'paste'
  const [resumeText, setResumeText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [jobDescInputMode, setJobDescInputMode] = useState('upload') // 'upload' | 'paste'
  const [jobDescFile, setJobDescFile] = useState(null)
  const jobDescFileRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [dragover, setDragover] = useState(false)
  const [docxLoading, setDocxLoading] = useState(false)
  const [activeDownloadBtn, setActiveDownloadBtn] = useState(null) // tracks last clicked btn
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
  const [showContact, setShowContact] = useState(false)
  const fileInputRef = useRef(null)

  const versionToggleRef = useRef(null)

  // Regenerate state
  const [regenerating, setRegenerating] = useState(false)
  const [regeneratedResults, setRegeneratedResults] = useState(null)
  const [activeVersion, setActiveVersion] = useState('v1')
  const [regenError, setRegenError] = useState(null)

  // ATS Cheat Sheet state
  const [atsData, setAtsData] = useState(null)
  const [atsLoading, setAtsLoading] = useState(false)
  const [atsError, setAtsError] = useState(null)
  const [atsCopied, setAtsCopied] = useState({})
  const [atsOpen, setAtsOpen] = useState(false)
  const [atsVersion, setAtsVersion] = useState(null) // 'v1' | 'v2' — which version was parsed

  // Fetch resume counter + check access via cookie on mount
  // Works in private/incognito — no localStorage dependency
  useEffect(() => {
    if (router.query.signin === 'true') {
      setShowSignIn(true)
      router.replace('/', undefined, { shallow: true })
    }
  }, [router.query.signin])

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

  const ACCEPTED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
  ]
  const ACCEPTED_EXTS = ['.pdf', '.doc', '.docx', '.txt']

  const handleFile = (file) => {
    if (file && (ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXTS.some(ext => file.name.toLowerCase().endsWith(ext)))) {
      setPdfFile(file)
      setError(null)
    } else {
      setError('Please upload a PDF, Word document (.doc/.docx), or text file (.txt).')
    }
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragover(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }, [])

  const handleGenerate = async () => {
    const hasResume = resumeInputMode === 'upload' ? !!pdfFile : resumeText.trim().length > 50
    const hasJobDesc = jobDescInputMode === 'paste' ? jobDescription.trim().length > 50 : !!jobDescFile
    if (!hasResume || !hasJobDesc) {
      setError('Please provide your resume and job description.')
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
    setRegeneratedResults(null)
    setActiveVersion('v1')

    try {
      const formData = new FormData()
      if (resumeInputMode === 'upload') {
        formData.append('resume', pdfFile)
      } else {
        const textBlob = new Blob([resumeText], { type: 'text/plain' })
        formData.append('resume', textBlob, 'resume.txt')
      }
      if (jobDescInputMode === 'paste') {
        formData.append('jobDescription', jobDescription)
      } else {
        formData.append('jobDescFile', jobDescFile)
      }
      formData.append('dualVersion', dualVersionEnabled && isPlusUser ? 'true' : 'false')

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 120000)

      let response
      try {
        response = await fetch('/api/generate', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        })
      } catch (fetchErr) {
        if (fetchErr.name === 'AbortError') {
          throw new Error('This is taking longer than expected. Please try again on a stronger connection.')
        }
        throw new Error('Connection failed. Please check your internet and try again.')
      } finally {
        clearTimeout(timeout)
      }

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

  const handleRegenerate = async () => {
    if (!results || !results.recruiterNotes) return
    setRegenerating(true)
    setRegenError(null)
    try {
      const res = await fetch('/api/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume: results.resume,
          jobDescription: jobDescription,
          recruiterNotes: results.recruiterNotes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Regeneration failed.')
      setRegeneratedResults(data)
      setActiveVersion('v2')
      setTimeout(() => {
        versionToggleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    } catch (err) {
      setRegenError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setRegenerating(false)
    }
  }

  const handleUpgrade = async (plan = 'pro') => {
    const referral = (typeof window !== 'undefined' && window.promotekit_referral) || ''
    const res = await fetch('/api/stripe-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan, referral }) })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  // TXT — stripped plain text for pasting into ATS / job portals
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

  // DOCX — real Word doc for human readers, editable in Word / Google Docs
  const downloadDocx = async (type) => {
    if (!results) return
    setDocxLoading(true)
    const activeResumeContent = regeneratedResults && activeVersion === 'v2'
      ? regeneratedResults.resume
      : (results.dualVersion ? (activeResume === 'a' ? results.resumeA : results.resumeB) : results.resume)
    const activeCoverContent = regeneratedResults && activeVersion === 'v2'
      ? regeneratedResults.coverLetter
      : results.coverLetter
    try {
      const payload = {
        resume: type === 'resume' || type === 'both' ? activeResumeContent : null,
        coverLetter: type === 'cover' || type === 'both' ? activeCoverContent : null,
        fileBaseName: results.fileBaseName
          ? `${results.fileBaseName}_${type === 'resume' ? (results.dualVersion ? `Resume_${activeResume.toUpperCase()}` : activeVersion === 'v2' ? 'Resume_V2' : 'Resume') : type === 'cover' ? activeVersion === 'v2' ? 'Cover_Letter_V2' : 'Cover_Letter' : 'Full_Package'}`
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

  // PDF — print via browser print dialog
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
    if (!betaEmail.includes('@')) { setBetaStatus('error'); setBetaMsg("Enter a valid email — you'll need it to restore access later."); return }
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
        if (typeof window !== 'undefined') {
          localStorage.setItem('ju_email_gate', '1')
          localStorage.setItem('ju_email', gateEmail)
        }
      } else {
        setGateStatus('error')
        setGateMsg('Something went wrong. Try again.')
      }
    } catch {
      setGateStatus('error')
      setGateMsg('Something went wrong. Try again.')
    }
  }

  const handleAtsCheatSheet = async () => {
    if (!results) return
    setAtsLoading(true)
    setAtsError(null)
    setAtsOpen(true)
    const resumeToUse = regeneratedResults && activeVersion === 'v2'
      ? regeneratedResults.resume
      : results.resume
    try {
      const res = await fetch('/api/parse-ats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: resumeToUse }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Parsing failed.')
      setAtsData(data)
      setAtsVersion(activeVersion)
    } catch (err) {
      setAtsError(err.message || 'Something went wrong.')
    } finally {
      setAtsLoading(false)
    }
  }

  const copyAtsField = (key, value) => {
    navigator.clipboard.writeText(value)
    setAtsCopied(prev => ({ ...prev, [key]: true }))
    setTimeout(() => setAtsCopied(prev => ({ ...prev, [key]: false })), 2000)
  }

  const handleReset = () => {
    setJobDescription('')
    setResults(null)
    setError(null)
    setRegeneratedResults(null)
    setActiveVersion('v1')
    setRegenError(null)
    setAtsData(null)
    setAtsLoading(false)
    setAtsError(null)
    setAtsOpen(false)
    setAtsCopied({})
    setAtsVersion(null)
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

  const canGenerate = (resumeInputMode === 'upload' ? !!pdfFile : resumeText.trim().length > 50) && (jobDescInputMode === 'paste' ? jobDescription.trim().length > 50 : !!jobDescFile)

  // Derive active resume/cover content for downloads
  const activeResumeForDownload = regeneratedResults && activeVersion === 'v2'
    ? regeneratedResults.resume
    : results?.resume
  const activeCoverForDownload = regeneratedResults && activeVersion === 'v2'
    ? regeneratedResults.coverLetter
    : results?.coverLetter

  return (
    <>
      <style>{`
        .format-btn-active {
          background: var(--ink) !important;
          color: var(--surface) !important;
          border-color: var(--ink) !important;
        }
        @keyframes logo-spin-pause {
          0%   { transform: rotate(0deg); }
          40%  { transform: rotate(360deg); }
          60%  { transform: rotate(360deg); }
          100% { transform: rotate(720deg); }
        }
      `}</style>

      {showContact && <ContactModal onClose={() => setShowContact(false)} />}

      {showManageModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowManageModal(false)}>
          <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '48px 40px', maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.3)', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowManageModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '1.2rem', color: 'var(--text-soft)', cursor: 'pointer', lineHeight: 1, padding: '4px 8px' }}>✕</button>
            <img src="/jobsuncle-logo.png" alt="JobsUncle.ai" style={{ width: 80, height: 'auto', marginBottom: '20px' }} />
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
            <img src="/jobsuncle-logo.png" alt="JobsUncle.ai" style={{ width: 100, height: 'auto', marginBottom: '24px' }} />
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
            <img src="/jobsuncle-logo.png" alt="JobsUncle.ai" style={{ width: 100, height: 'auto', marginBottom: '24px' }} />
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', margin: '0 0 12px', lineHeight: 1.1 }}>Your next job offer could be from this resume.</h2>
            <p style={{ color: 'var(--text-soft)', fontSize: '0.95rem', margin: '0 0 20px', lineHeight: 1.6 }}>Unlimited resumes. Every job. Every time.</p>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <button
                onClick={() => handleUpgrade('pro_monthly')}
                style={{ flex: 1, padding: '14px 12px', background: 'transparent', color: 'var(--ink)', border: '1.5px solid var(--border)', borderRadius: '10px', cursor: 'pointer', textAlign: 'center' }}
              >
                <div style={{ fontSize: '0.7rem', color: 'var(--text-soft)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Monthly</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--ink)' }}>$9.99</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-soft)' }}>per month</div>
              </button>
              <button
                onClick={() => handleUpgrade('pro')}
                style={{ flex: 1, padding: '14px 12px', background: 'var(--accent)', color: 'white', border: '2px solid var(--accent)', borderRadius: '10px', cursor: 'pointer', textAlign: 'center', position: 'relative' }}
              >
                <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#f59e0b', color: 'white', fontSize: '0.6rem', fontWeight: 700, padding: '2px 10px', borderRadius: '20px', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Best value</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Annual</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>$49.99</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)' }}>Save 58%</div>
              </button>
            </div>

            <button onClick={() => { setShowPaywall(false); setShowSignIn(true) }} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.85rem', cursor: 'pointer', padding: '8px', fontWeight: 600 }}>
              Already a member? Sign in →
            </button>
            <button onClick={() => setShowPaywall(false)} style={{ display: 'block', background: 'none', border: 'none', color: 'var(--text-soft)', fontSize: '0.85rem', cursor: 'pointer', padding: '4px', margin: '0 auto' }}>
              I'll take my chances
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
            <img src="/jobsuncle-logo.png" alt="JobsUncle.ai" style={{ width: 100, height: 'auto', marginBottom: '24px' }} />
            <div style={{ display: 'inline-block', background: '#6366f1', color: 'white', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', padding: '4px 12px', borderRadius: '20px', marginBottom: '16px', textTransform: 'uppercase' }}>Pro+</div>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', margin: '0 0 12px', lineHeight: 1.1 }}>Stop re-typing your resume into every job portal.</h2>
            <p style={{ color: 'var(--text-soft)', fontSize: '0.95rem', margin: '0 0 8px', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--ink)' }}>ATS Cheat Sheet</strong> — every field an ATS will ask for, pre-staged with one-click copy buttons. Plus <strong style={{ color: 'var(--ink)' }}>dual resume versions</strong> (Leadership + Technical) for the same role.
            </p>
            <p style={{ color: 'var(--text-soft)', fontSize: '0.85rem', margin: '0 0 32px' }}>For serious job hunters who apply to multiple roles.</p>
            <a href="/pricing" style={{ display: 'block', width: '100%', background: '#6366f1', color: 'white', border: 'none', padding: '16px', borderRadius: '8px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', marginBottom: '6px', letterSpacing: '0.02em', textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box' }}>
              See Plans →
            </a>
            <button onClick={() => setShowPlusPaywall(false)} style={{ background: 'none', border: 'none', color: 'var(--text-soft)', fontSize: '0.85rem', cursor: 'pointer', padding: '8px' }}>
              I'll take my chances
            </button>
          </div>
        </div>
      )}

      {showEmailGate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '48px 40px', maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.35)' }}>
            <img src="/jobsuncle-logo.png" alt="JobsUncle.ai" style={{ width: 64, height: 'auto', marginBottom: '20px' }} />
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
        <link rel="icon" type="image/png" href="/jobsuncle-favicon.png" />
        <link rel="apple-touch-icon" href="/jobsuncle-favicon.png" />
      </Head>

      <Header
        isPaid={isPaid}
        accessLevel={accessLevel}
        onSignIn={() => setShowSignIn(true)}
        onManage={() => setShowManageModal(true)}
        onContact={() => setShowContact(true)}
      />

      {/* MOBILE-ONLY NAV BAR */}
      {!isPaid && (
        <div className="mobile-signin-bar" style={{ display: 'none' }}>
          <a onClick={e => { e.preventDefault(); setShowSignIn(true) }} style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'none' }}>Member Sign In</a>
          <a href="/faq" style={{ color: 'var(--text-soft)', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none' }}>FAQ</a>
          <a href="/about" style={{ color: 'var(--text-soft)', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none' }}>Our Story</a>
        </div>
      )}

      <section className="hero">
        <div className="hero-center">
          <img src="/jobsuncle-logo.png" alt="JobsUncle.ai" className="hero-center-logo" />
          <h1 className="hero-headline">Your resume, <em>tailored</em><br />to every job.</h1>
          <p className="hero-sub">Upload your resume. Paste the job description. Get a tailored resume, cover letter, recruiter analysis, and hiring manager DM — in under a minute.</p>
          <div className="hero-actions">
            <a href="/#get-started" className="hero-btn-primary">Build Your Resume →</a>
            <a href="/example" className="hero-btn-ghost">See an example</a>
          </div>
          <div className="hero-proof">
            {resumeCount !== null && (
              <>
                <div className="proof-stat">
                  <span className="proof-number">{resumeCount.toLocaleString()}</span>
                  <span className="proof-label">Resumes tailored</span>
                </div>
                <div className="proof-divider"></div>
              </>
            )}
            <div className="proof-quote">
              <p>"The results are solid. I like what I got back."</p>
              <span>— B.C., ICF Certified Career Coach</span>
            </div>
          </div>
        </div>

        <div className="hero-cards">
          <div className="hero-card">
            <div className="hero-card-icon">📄</div>
            <div className="hero-card-title">Tailored Resume</div>
            <div className="hero-card-desc">Reordered and rewritten for the exact role</div>
          </div>
          <div className="hero-card">
            <div className="hero-card-icon">✉️</div>
            <div className="hero-card-title">Cover Letter</div>
            <div className="hero-card-desc">Specific to the company and job description</div>
          </div>
          <div className="hero-card">
            <div className="hero-card-icon">🎯</div>
            <div className="hero-card-title">Recruiter & ATS Analysis</div>
            <div className="hero-card-desc">Gaps, fixes, and keyword score</div>
          </div>
          <div className="hero-card">
            <div className="hero-card-icon">💬</div>
            <div className="hero-card-title">Hiring Manager DM</div>
            <div className="hero-card-desc">Skip the line, land in their inbox</div>
          </div>
        </div>
      </section>

      {/* SAMPLE OUTPUT */}
      <div className="sample-section">
        <div className="sample-label">Sample output — Camille Leon → Director, Learning Experience Design @ Meridian Learning Group</div>
        <div className="sample-resume">
          <div className="sample-resume-name">Camille Leon</div>
          <div className="sample-resume-contact">camille.leon@gmail.com · 555-000-1234 · linkedin.com/in/camillelean · San Francisco, CA</div>
          <div className="sample-divider"></div>

          <div className="sample-section-heading">Professional Summary</div>
          <p className="sample-body">Director-level Learning Experience Designer with 8+ years building outcome-driven curriculum for enterprise and K-12 contexts. IDEO U certified in human-centered instructional design with expertise in Articulate Storyline, learning analytics, and stakeholder engagement. Proven ability to translate complex business and scientific content into scalable learning experiences deployed across 200+ organizations nationally.</p>

          <div className="sample-section-heading">Experience</div>

          <div className="sample-job">
            <span className="sample-job-company">BrightPath Learning</span>
            <span className="sample-job-meta"> · Curriculum Developer (Contract) · 2020–2022</span>
          </div>
          <ul className="sample-bullets">
            <li>Authored 14 STEM learning modules using Articulate Storyline deployed across 200+ schools nationally, scoping each module to measurable learning outcomes aligned to NGSS standards</li>
            <li>Partnered with UX team to redesign course navigation and learner experience, reducing drop-off rate by 22% through friction-mapping and iterative design approaches</li>
            <li>Conducted usability testing with 40 learners, synthesized behavioral data and qualitative feedback into design recommendations adopted in next product release</li>
            <li>Developed quality standards and content review rubric used by team of 6 contract developers to ensure instructional consistency across curriculum library</li>
          </ul>

          <div className="sample-job" style={{marginTop: '16px'}}>
            <span className="sample-job-company">Roosevelt Middle School, Oakland Unified School District</span>
            <span className="sample-job-meta"> · 7th & 8th Grade Science Teacher · 2017–Present</span>
          </div>
          <ul className="sample-bullets">
            <li>Designed and delivered curriculum for 140+ learners across 5 concurrent cohorts, achieving 34% above district average on standardized assessments through outcome-mapped instructional design</li>
            <li>Built project-based learning framework adopted district-wide by 12 educators, reducing lesson development time by 40% through reusable modular architecture</li>
            <li>Analyzed learner performance data weekly using dashboards and formative assessments, identified skill gaps and adjusted content, lifting at-risk learner pass rates by 28% in a single semester</li>
            <li>Facilitated professional development workshops for 30+ educators on differentiated instruction, designing all session materials, pre/post assessments, and follow-up resources</li>
            <li>Produced 60+ original video-based learning modules during remote instruction, achieving 84% completion rate vs. 51% district average through intentional engagement design</li>
          </ul>

          <a href="/example" className="sample-see-more">See full output including cover letter, ATS analysis & hiring manager DM →</a>
        </div>
      </div>

      {/* TICKER STRIP */}
      <div className="ticker">
        <div className="ticker-item">
          <span className="ticker-num">&lt; 60s</span>
          <span className="ticker-label">Generation time</span>
        </div>
        <span className="ticker-sep">·</span>
        <div className="ticker-item">
          <span className="ticker-num">4</span>
          <span className="ticker-label">Documents per run</span>
        </div>
        <span className="ticker-sep">·</span>
        <div className="ticker-item">
          <span className="ticker-num">Any industry</span>
          <span className="ticker-label">Works across all roles</span>
        </div>
        <span className="ticker-sep">·</span>
        <div className="ticker-item">
          <span className="ticker-num">No account</span>
          <span className="ticker-label">3 free resumes, no login</span>
        </div>
      </div>

      <div className="how-section">
        <div className="how-title">How it works</div>
        <div className="how-items">
          <div className="how-item">
            <div className="how-num">01</div>
            <div className="how-label">Upload your resume &mdash; PDF, Word doc, or LinkedIn export</div>
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
        <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-soft)', marginTop: '1rem', letterSpacing: '0.03em' }}>Your resume and documents are never stored.</p>
      </div>

      <div className="app-container">

        {!results && (
          <>
            <div className="steps" id="get-started">
              {/* STEP 1 */}
              <div className={`step-card ${(resumeInputMode === 'upload' ? pdfFile : resumeText.trim().length > 50) ? 'complete' : 'active'}`}>
                <div className="step-number">Step 01</div>
                <div className="step-title">Your Resume</div>

                {/* TOGGLE */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <button
                    onClick={() => setResumeInputMode('upload')}
                    style={{ flex: 1, padding: '8px 12px', background: resumeInputMode === 'upload' ? 'var(--accent)' : 'transparent', color: resumeInputMode === 'upload' ? '#fff' : 'var(--text-soft)', border: '1.5px solid var(--border)', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Upload file
                  </button>
                  <button
                    onClick={() => setResumeInputMode('paste')}
                    style={{ flex: 1, padding: '8px 12px', background: resumeInputMode === 'paste' ? 'var(--accent)' : 'transparent', color: resumeInputMode === 'paste' ? '#fff' : 'var(--text-soft)', border: '1.5px solid var(--border)', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Paste text
                  </button>
                </div>

                {resumeInputMode === 'upload' ? (
                  <>
                    <p className="step-desc">Upload a PDF, Word doc (.docx), or .txt file — LinkedIn PDF works great. Or switch to <strong>Paste text</strong> to copy/paste your resume directly.</p>
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
                          <img src="/jobsuncle-logo.png" className="upload-mascot" alt="JobsUncle.ai" />
                          <div className="upload-label">Drop your resume here or click to browse</div>
                        </>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      className="file-input"
                      onChange={(e) => handleFile(e.target.files[0])}
                    />
                  </>
                ) : (
                  <>
                    <p className="step-desc">Copy your resume text and paste it below. Works great on mobile.</p>
                    <textarea
                      className="job-textarea"
                      placeholder="Paste your full resume here — work history, skills, education, the works..."
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      style={{ minHeight: '200px' }}
                    />
                  </>
                )}
              </div>

              {/* STEP 2 */}
              <div className={`step-card ${(jobDescInputMode === 'paste' ? jobDescription.trim().length > 50 : !!jobDescFile) ? 'complete' : (resumeInputMode === 'upload' ? pdfFile : resumeText.trim().length > 50) ? 'active' : ''}`}>
                <div className="step-number">Step 02</div>
                <div className="step-title">The Job Description</div>

                {/* TOGGLE */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <button
                    onClick={() => setJobDescInputMode('upload')}
                    style={{ flex: 1, padding: '8px 12px', background: jobDescInputMode === 'upload' ? 'var(--accent)' : 'transparent', color: jobDescInputMode === 'upload' ? '#fff' : 'var(--text-soft)', border: '1.5px solid var(--border)', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Upload file
                  </button>
                  <button
                    onClick={() => setJobDescInputMode('paste')}
                    style={{ flex: 1, padding: '8px 12px', background: jobDescInputMode === 'paste' ? 'var(--accent)' : 'transparent', color: jobDescInputMode === 'paste' ? '#fff' : 'var(--text-soft)', border: '1.5px solid var(--border)', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Paste text
                  </button>
                </div>

                {jobDescInputMode === 'paste' ? (
                  <>
                    <p className="step-desc">Paste the full job posting from LinkedIn, Indeed, or any job board. The more detail, the sharper the match.</p>
                    <textarea
                      className="job-textarea"
                      placeholder="Paste the complete job description here — title, responsibilities, requirements, the works..."
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                    />
                  </>
                ) : (
                  <>
                    <p className="step-desc">Upload the job posting as a PDF, Word doc (.doc/.docx), or .txt file. Or switch to <strong>Paste text</strong> to paste directly from any job board.</p>
                    <div
                      className={`upload-zone ${jobDescFile ? 'has-file' : ''}`}
                      onClick={() => jobDescFileRef.current?.click()}
                    >
                      {jobDescFile ? (
                        <>
                          <div className="upload-icon">✓</div>
                          <div className="upload-filename">{jobDescFile.name}</div>
                        </>
                      ) : (
                        <>
                          <img src="/jobsuncle-logo.png" className="upload-mascot" alt="JobsUncle.ai" />
                          <div className="upload-label">Drop job posting here or click to browse</div>
                        </>
                      )}
                    </div>
                    <input
                      ref={jobDescFileRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      className="file-input"
                      onChange={(e) => setJobDescFile(e.target.files[0])}
                    />
                  </>
                )}
              </div>
            </div>

            {error && <div className="error-msg">{error}</div>}

            {/* DUAL VERSION TOGGLE — Pro+ users only */}
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
              {loading ? 'Making you impossible to ignore...' : dualVersionEnabled && isPlusUser ? 'Generate Dual Resume Package →' : 'Generate Resume Package →'}
            </button>

            {/* RESTORE + BETA — visible below generate, not buried */}
            {!isPaid && (
              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {/* DUAL RESUME — Pro+ upsell card */}
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
          <div className="loading-state" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div style={{ display: 'inline-block', marginBottom: '8px' }}>
              <img
                src="/jobsuncle-logo.png"
                alt=""
                style={{
                  width: 100,
                  height: 'auto',
                  animation: 'logo-spin-pause 2s ease-in-out infinite',
                  transformOrigin: 'center center',
                  display: 'block',
                }}
              />
            </div>
            <div className="loading-text" style={{ marginTop: '16px' }}>Making you impossible to ignore.</div>
            <div className="loading-sub">Tailoring every word to this role. Give us a moment.</div>
          </div>
        )}

        {results && (
          <>
            <div className="results">
              <div className="results-header">
                <div className="results-title">Your tailored documents</div>
                <div className="results-badge">Ready to download</div>
              </div>

              {/* V1 / V2 VERSION TOGGLE — appears once V2 is generated */}
              {regeneratedResults && (
                <div
                  ref={versionToggleRef}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: '8px',
                    marginBottom: '20px', padding: '14px 16px',
                    background: 'rgba(16,185,129,0.06)',
                    border: '2px solid #10b981',
                    borderRadius: '10px',
                  }}
                >
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10b981' }}>
                    ✓ Version 2 is ready — fixes applied from the recruiter analysis
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)', marginBottom: '6px' }}>
                    You're viewing Version 2 below. Switch back to compare.
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0', border: '1.5px solid var(--border)', borderRadius: '8px', overflow: 'hidden', width: 'fit-content' }}>
                    {['v1', 'v2'].map(v => (
                      <button
                        key={v}
                        onClick={() => setActiveVersion(v)}
                        style={{
                          padding: '8px 22px', border: 'none', cursor: 'pointer',
                          fontSize: '0.82rem', fontWeight: 700, transition: 'all 0.15s',
                          background: activeVersion === v ? 'var(--ink)' : 'var(--surface)',
                          color: activeVersion === v ? 'white' : 'var(--text-soft)',
                        }}
                      >
                        {v === 'v1' ? 'Version 1 — Original' : '✦ Version 2 — Fixed'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="result-section">
                <div className="result-section-title">Resume</div>
                {results.dualVersion && activeVersion === 'v1' ? (
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
                  <div className="result-content" dangerouslySetInnerHTML={{__html: renderMarkdown(
                    activeVersion === 'v2' && regeneratedResults
                      ? regeneratedResults.resume
                      : results.resume
                  )}} />
                )}
              </div>

              <div className="result-section">
                <div className="result-section-title">Cover Letter</div>
                <div className="result-content" dangerouslySetInnerHTML={{__html: renderMarkdown(
                  activeVersion === 'v2' && regeneratedResults
                    ? regeneratedResults.coverLetter
                    : results.coverLetter
                )}} />
              </div>

              {results.recruiterNotes && (
                <div className="result-section" style={{ borderLeft: '3px solid #f59e0b', background: 'rgba(245,158,11,0.05)' }}>
                  <div className="result-section-title">Recruiter &amp; ATS Analysis</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-soft)', marginBottom: '8px' }}>ATS compatibility check plus honest gaps a recruiter would flag &mdash; and how to own them.</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-soft)', marginBottom: '12px', padding: '8px 12px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '6px', lineHeight: 1.5 }}>
                    <strong>Important:</strong> This analysis is AI-generated and may contain errors. Always verify all dates, facts, and recommendations against your original resume before taking any action. JobsUncle.ai provides this as a general career tool only and accepts no liability for the accuracy of this analysis or any outcomes resulting from its use.
                  </div>
                  <div className="result-content" dangerouslySetInnerHTML={{__html: renderMarkdown(results.recruiterNotes)}} />

                  {/* REGENERATE CTA */}
                  <div style={{
                    marginTop: '20px', paddingTop: '16px',
                    borderTop: '1px solid rgba(245,158,11,0.2)',
                    display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap'
                  }}>
                    {isPaid ? (
                      <>
                        <button
                          onClick={handleRegenerate}
                          disabled={regenerating || !!regeneratedResults}
                          style={{
                            padding: '9px 22px',
                            background: regeneratedResults ? '#22c55e' : regenerating ? '#aaa' : '#f59e0b',
                            color: 'white', border: 'none', borderRadius: '6px',
                            fontSize: '0.85rem', fontWeight: 700,
                            cursor: regenerating || regeneratedResults ? 'default' : 'pointer',
                            transition: 'background 0.2s'
                          }}
                        >
                          {regeneratedResults
                            ? '✓ Version 2 ready'
                            : regenerating
                            ? '⟳ Applying fixes...'
                            : '✦ Apply fixes & regenerate'}
                        </button>
                        {!regeneratedResults && !regenerating && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>
                            Rewrites your resume applying every fix above
                          </span>
                        )}
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => { setPaywallSigninMode(false); setShowPaywall(true) }}
                          style={{
                            padding: '9px 22px', background: '#f59e0b', color: 'white',
                            border: 'none', borderRadius: '6px', fontSize: '0.85rem',
                            fontWeight: 700, cursor: 'pointer'
                          }}
                        >
                          ✦ Apply fixes &amp; regenerate
                        </button>
                        <span style={{
                          background: '#f59e0b', color: 'white', fontSize: '0.6rem', fontWeight: 700,
                          letterSpacing: '0.1em', padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase'
                        }}>Pro</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>
                          Upgrade to rewrite with fixes applied
                        </span>
                      </div>
                    )}
                    {regenError && (
                      <div style={{ width: '100%', color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>
                        {regenError}
                      </div>
                    )}

                    {regenerating && (
                      <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', padding: '12px 14px', background: 'rgba(124,92,252,0.08)', borderRadius: '8px' }}>
                        <img
                          src="/jobsuncle-logo.png"
                          alt=""
                          style={{ width: 44, height: 'auto', flexShrink: 0, animation: 'logo-spin-pause 2s ease-in-out infinite', transformOrigin: 'center center' }}
                        />
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink)' }}>Applying every fix from the analysis...</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)', marginTop: '2px' }}>Rewriting your resume and cover letter. About 15 seconds.</div>
                        </div>
                      </div>
                    )}
                  </div>
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

              {/* ATS CHEAT SHEET */}
              <div className="result-section" style={{ borderLeft: '3px solid #10b981', background: 'rgba(16,185,129,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <div className="result-section-title" style={{ margin: 0 }}>ATS Cheat Sheet</div>
                      <span style={{ background: '#6366f1', color: 'white', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase' }}>Pro+</span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-soft)' }}>Every field an ATS will ask for — pre-staged, one click to copy.</div>
                  </div>
                  {isPlusUser ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      {(!atsData || atsVersion !== activeVersion) && !atsLoading && (
                        <button
                          onClick={handleAtsCheatSheet}
                          style={{ flexShrink: 0, padding: '9px 22px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          {atsData && atsVersion !== activeVersion
                            ? `✦ Re-parse for ${activeVersion === 'v2' ? 'Version 2' : 'Version 1'}`
                            : '✦ Generate Cheat Sheet'}
                        </button>
                      )}
                      {atsData && !atsLoading && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-soft)' }}>
                          Parsed from {atsVersion === 'v2' ? '✦ Version 2 — Fixed' : 'Version 1 — Original'}
                          {atsVersion !== activeVersion && (
                            <span style={{ color: '#f59e0b', fontWeight: 700 }}> · Switch above to match</span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowPlusPaywall(true)}
                      style={{ flexShrink: 0, padding: '9px 22px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Upgrade to Pro+
                    </button>
                  )}
                </div>

                {atsLoading && (
                  <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'rgba(124,92,252,0.08)', borderRadius: '8px' }}>
                    <img
                      src="/jobsuncle-logo.png"
                      alt=""
                      style={{ width: 44, height: 'auto', flexShrink: 0, animation: 'logo-spin-pause 2s ease-in-out infinite', transformOrigin: 'center center' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink)' }}>Parsing your resume into ATS fields...</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)', marginTop: '2px' }}>Staging every field for one-click copy. Just a moment.</div>
                    </div>
                  </div>
                )}

                {atsError && (
                  <div style={{ marginTop: '12px', color: '#ef4444', fontSize: '0.82rem' }}>{atsError}</div>
                )}

                {atsData && (
                  <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                    {/* HEADLINE */}
                    {atsData.headline && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-soft)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>Headline / Title</div>
                          <div style={{ fontSize: '0.88rem', color: 'var(--ink)' }}>{atsData.headline}</div>
                        </div>
                        <button onClick={() => copyAtsField('headline', atsData.headline)} style={{ flexShrink: 0, padding: '5px 14px', background: atsCopied.headline ? '#22c55e' : 'var(--accent)', color: 'white', border: 'none', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>
                          {atsCopied.headline ? '✓' : 'Copy'}
                        </button>
                      </div>
                    )}

                    {/* SUMMARY */}
                    {atsData.summary && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 14px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-soft)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>Summary</div>
                          <div style={{ fontSize: '0.88rem', color: 'var(--ink)', lineHeight: 1.5 }}>{atsData.summary}</div>
                        </div>
                        <button onClick={() => copyAtsField('summary', atsData.summary)} style={{ flexShrink: 0, padding: '5px 14px', background: atsCopied.summary ? '#22c55e' : 'var(--accent)', color: 'white', border: 'none', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>
                          {atsCopied.summary ? '✓' : 'Copy'}
                        </button>
                      </div>
                    )}

                    {/* SKILLS */}
                    {atsData.skills && atsData.skills.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 14px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-soft)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Skills (comma-separated for ATS)</div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--ink)', lineHeight: 1.6 }}>{atsData.skills.join(', ')}</div>
                        </div>
                        <button onClick={() => copyAtsField('skills', atsData.skills.join(', '))} style={{ flexShrink: 0, padding: '5px 14px', background: atsCopied.skills ? '#22c55e' : 'var(--accent)', color: 'white', border: 'none', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>
                          {atsCopied.skills ? '✓' : 'Copy'}
                        </button>
                      </div>
                    )}

                    {/* EMPLOYMENT */}
                    {atsData.employment && atsData.employment.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-soft)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Employment History</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {atsData.employment.map((job, i) => (
                            <div key={i} style={{ padding: '12px 14px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink)' }}>{job.employer}</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-soft)' }}>
                                  {job.startMonth} {job.startYear} — {job.current ? 'Present' : `${job.endMonth} ${job.endYear}`}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-soft)', fontWeight: 600, marginBottom: '2px' }}>Job Title</div>
                                  <div style={{ fontSize: '0.85rem', color: 'var(--ink)' }}>{job.title}</div>
                                </div>
                                <button onClick={() => copyAtsField(`title_${i}`, job.title)} style={{ flexShrink: 0, padding: '4px 12px', background: atsCopied[`title_${i}`] ? '#22c55e' : 'var(--accent)', color: 'white', border: 'none', borderRadius: '5px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>
                                  {atsCopied[`title_${i}`] ? '✓' : 'Copy'}
                                </button>
                              </div>
                              {job.description && (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-soft)', fontWeight: 600, marginBottom: '2px' }}>Description</div>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--ink)', lineHeight: 1.5 }}>{job.description}</div>
                                  </div>
                                  <button onClick={() => copyAtsField(`desc_${i}`, job.description)} style={{ flexShrink: 0, padding: '4px 12px', background: atsCopied[`desc_${i}`] ? '#22c55e' : 'var(--accent)', color: 'white', border: 'none', borderRadius: '5px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>
                                    {atsCopied[`desc_${i}`] ? '✓' : 'Copy'}
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* EDUCATION */}
                    {atsData.education && atsData.education.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-soft)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Education</div>
                        {atsData.education.map((edu, i) => (
                          <div key={i} style={{ padding: '12px 14px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink)', marginBottom: '2px' }}>{edu.school}</div>
                              <div style={{ fontSize: '0.82rem', color: 'var(--text-soft)' }}>{edu.degree}{edu.field ? ` · ${edu.field}` : ''}{edu.year ? ` · ${edu.year}` : ''}</div>
                            </div>
                            <button onClick={() => copyAtsField(`edu_${i}`, `${edu.school}${edu.degree ? ` | ${edu.degree}` : ''}${edu.field ? ` in ${edu.field}` : ''}${edu.year ? ` | ${edu.year}` : ''}`)} style={{ flexShrink: 0, padding: '5px 14px', background: atsCopied[`edu_${i}`] ? '#22c55e' : 'var(--accent)', color: 'white', border: 'none', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>
                              {atsCopied[`edu_${i}`] ? '✓' : 'Copy'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                )}
              </div>

              {/* PURPOSE-DRIVEN DOWNLOAD SECTION */}
              <div className="download-section">
                <div className="download-section-header">
                  <span className="download-section-title">Download your documents</span>
                  <span className="download-section-sub">
                    {regeneratedResults
                      ? `Three formats. Downloading ${activeVersion === 'v2' ? 'Version 2 — Fixed' : 'Version 1 — Original'}.`
                      : 'Three formats. Each built for a different situation.'}
                  </span>
                </div>

                {/* FORMAT CARDS */}
                <div className="format-cards">

                  {/* TXT */}
                  <div className="format-card">
                    <div className="format-badge txt-badge">TXT</div>
                    <div className="format-purpose">Paste into job portals</div>
                    <div className="format-desc">Plain text. No formatting. Exactly what ATS systems and online job applications expect.</div>
                    <div className="format-btns">
                      <button className={`format-btn${activeDownloadBtn === 'txt-resume' ? ' format-btn-active' : ''}`} onClick={() => { setActiveDownloadBtn('txt-resume'); downloadTxt(activeResumeForDownload, activeVersion === 'v2' ? 'Resume_V2' : 'Resume') }}>
                        Resume
                      </button>
                      <button className={`format-btn${activeDownloadBtn === 'txt-cover' ? ' format-btn-active' : ''}`} onClick={() => { setActiveDownloadBtn('txt-cover'); downloadTxt(activeCoverForDownload, activeVersion === 'v2' ? 'Cover_Letter_V2' : 'Cover_Letter') }}>
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
                        className={`format-btn format-btn-featured${activeDownloadBtn === 'docx-resume' ? ' format-btn-active' : ''}`}
                        onClick={() => { setActiveDownloadBtn('docx-resume'); downloadDocx('resume') }}
                        disabled={docxLoading}
                      >
                        {docxLoading ? '...' : 'Resume'}
                      </button>
                      <button
                        className={`format-btn format-btn-featured${activeDownloadBtn === 'docx-cover' ? ' format-btn-active' : ''}`}
                        onClick={() => { setActiveDownloadBtn('docx-cover'); downloadDocx('cover') }}
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
                      <button className={`format-btn${activeDownloadBtn === 'pdf-resume' ? ' format-btn-active' : ''}`} onClick={() => { setActiveDownloadBtn('pdf-resume'); downloadPdf(activeResumeForDownload, activeVersion === 'v2' ? 'Resume_V2' : 'Resume') }}>
                        Resume
                      </button>
                      <button className={`format-btn${activeDownloadBtn === 'pdf-cover' ? ' format-btn-active' : ''}`} onClick={() => { setActiveDownloadBtn('pdf-cover'); downloadPdf(activeCoverForDownload, activeVersion === 'v2' ? 'Cover_Letter_V2' : 'Cover_Letter') }}>
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
                        const storedEmail = typeof window !== 'undefined' ? localStorage.getItem('ju_email') || '' : ''
                        fetch('/api/feedback', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ rating: feedback, comment: feedbackText, email: storedEmail })
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
                    <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)' }}>ATS Cheat Sheet + Dual Versions</span>
                    <span style={{ background: '#6366f1', color: 'white', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase' }}>Pro+</span>
                  </div>
                  <p style={{ fontFamily: 'Inter', fontSize: '0.75rem', color: 'var(--text-soft)', margin: 0 }}>Pre-staged copy fields for every ATS form. Plus Leadership <em>and</em> Technical resume versions.</p>
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
        <p>© 2026 JobsUncle.ai · Your resume and documents are never stored · Built with AI</p>
        <p style={{ marginTop: '8px', fontSize: '0.75rem' }}>
          <a href="/privacy" style={{ color: 'var(--text-soft)', textDecoration: 'none', marginRight: '1rem' }}>Privacy Policy</a>
          <a href="/terms" style={{ color: 'var(--text-soft)', textDecoration: 'none', marginRight: '1rem' }}>Terms of Service</a>
          <a href="https://jobsuncle.promotekit.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Earn 20% — Become an Affiliate</a>
        </p>
      </footer>
    </>
  )
}
