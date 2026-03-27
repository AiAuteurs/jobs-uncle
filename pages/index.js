import { useState, useRef, useCallback, useEffect } from 'react'
import Head from 'next/head'
import Header from '../components/Header'
import ContactModal from '../components/ContactModal'
import { useRouter } from 'next/router'


// ─── CLIENT-SIDE ATS SCORER (mirrors server scoreKeywordMatch) ────────────────
function clientScoreATS(resumeText, jobDescription) {
  if (!resumeText || !jobDescription) return null
  const STOP = new Set([
    'the','and','or','of','to','a','an','in','for','with','on','at','by','from',
    'is','are','was','were','be','been','have','has','had','do','does','did',
    'will','would','could','should','may','might','this','that','these','those',
    'we','you','your','our','their','its','it','as','if','so','but','not','no',
    'use','using','used','work','working','experience','ability','strong','proven',
    'role','position','team','company','business','project','process','based',
    'well','also','very','highly','quickly','effectively','efficiently',
    'them','kind','respectful','offer','improve','variety','satisfaction','members',
    'obsessed','trust','address','connections','doctors','providers','employers',
    'plans','options','resolve','empathy','benefits','benefit','resources',
    'seeking','passionate','excited','driven','dedicated','motivated','committed',
    'looking','hybrid','onsite','remote','days','week','global','group','firm',
    'what','three','fortune','world','include','two','four','five','six',
    'like','just','make','know','want','good','great','best','first','last',
    'salary','compensation','depending','factors','competitive','financial',
    'dental','vision','insurance','matching','holidays','access','workplace',
    'category','programs','coaching','mentoring','orientation','ranging',
    'qualifications','comprehensive','preferred','required','eligible','typical',
    'colleague','colleagues','assigned','people','including','listen','provide',
    'inspiring','putting','joining','forces','ensuring','requires','assistance',
    'advocate','advocating','emotional','revenue','learning','researching','wellness',
    'wellness','revenue','leadership','training','learning','researching',
  ])
  const jdLower = jobDescription.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
  const jdWords = jdLower.split(/\s+/).filter(w => w.length >= 6 && !STOP.has(w))
  const freq = {}
  jdWords.forEach(w => { freq[w] = (freq[w] || 0) + 1 })
  const candidates = Object.entries(freq)
    .filter(([w, c]) => c >= 2)
    .map(([w]) => w)
    .filter(k => k.length >= 6)
    .slice(0, 40)
  function stem(w) {
    if (w.endsWith('ing') && w.length > 6) return w.slice(0, -3)
    if (w.endsWith('tion') && w.length > 7) return w.slice(0, -4)
    if (w.endsWith('ed') && w.length > 5) return w.slice(0, -2)
    if (w.endsWith('ly') && w.length > 5) return w.slice(0, -2)
    if (w.endsWith('s') && w.length > 5) return w.slice(0, -1)
    return w
  }
  const resumeLower = resumeText.toLowerCase()
  const resumeWords = resumeLower.split(/\s+/)
  const matched = [], missing = []
  candidates.forEach(kw => {
    const kwStem = stem(kw)
    const found = resumeLower.includes(kw) ||
      resumeLower.includes(kw.endsWith('s') ? kw.slice(0, -1) : kw + 's') ||
      resumeWords.some(w => stem(w) === kwStem)
    if (found) matched.push(kw)
    else missing.push(kw)
  })
  const score = candidates.length > 0 ? Math.round((matched.length / candidates.length) * 100) : 0
  return { score, matched: matched.slice(0, 30), missing: missing.slice(0, 15), total: candidates.length }
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── TADA AUDIO — pre-load and unlock on first interaction ────
let tadaBuffer = null
let tadaCtx = null

async function loadTada() {
  if (tadaBuffer) return
  try {
    tadaCtx = new (window.AudioContext || window.webkitAudioContext)()
    const res = await fetch('/tada.mp3')
    const arr = await res.arrayBuffer()
    tadaBuffer = await tadaCtx.decodeAudioData(arr)
  } catch(e) {}
}

function playTada() {
  try {
    if (!tadaBuffer || !tadaCtx) { new Audio('/tada.mp3').play().catch(()=>{}) ; return }
    const src = tadaCtx.createBufferSource()
    src.buffer = tadaBuffer
    src.connect(tadaCtx.destination)
    src.start(0)
  } catch(e) {}
}

function AnimatedCounter({ value }) {
  const [display, setDisplay] = useState(value)
  useEffect(() => {
    if (!value) return
    let start = value - 8
    let current = start
    const timer = setInterval(() => {
      current += 1
      setDisplay(current)
      if (current >= value) clearInterval(timer)
    }, 120)
    return () => clearInterval(timer)
  }, [value])
  return <span className="header-live-num">{display.toLocaleString()}</span>
}

// ─── BULLET DEMO ─────────────────────────────────────────────
function BulletDemo() {
  const [bullet, setBullet] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const placeholder = 'e.g. Managed a team of engineers and shipped features on time'

  const handleTailor = async () => {
    if (!bullet.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/tailor-bullet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bullet })
      })
      const data = await res.json()
      setResult(data.tailored)
    } catch {
      setResult('Something went wrong. Try again.')
    }
    setLoading(false)
  }

  return (
    <div className="bullet-demo-inner">
      <div className="bullet-demo-row">
        <textarea
          className="bullet-input"
          placeholder={placeholder}
          value={bullet}
          onChange={e => setBullet(e.target.value)}
          rows={2}
        />
        <button className="bullet-btn" onClick={handleTailor} disabled={loading || !bullet.trim()}>
          {loading ? '...' : 'Tailor it →'}
        </button>
      </div>
      {result && (
        <div className="bullet-result">
          <div className="bullet-result-label">✓ Tailored</div>
          <p>{result}</p>
        </div>
      )}
    </div>
  )
}


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
  const [activeResultTab, setActiveResultTab] = useState('resume')
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
  const [hoveredQuad, setHoveredQuad] = useState(null)
  const [otpStep, setOtpStep] = useState('email') // 'email' | 'otp'
  const [otpCode, setOtpCode] = useState(['', '', '', '', ''])
  const [otpStatus, setOtpStatus] = useState(null) // null | 'loading' | 'error'
  const [otpMsg, setOtpMsg] = useState('')
  const fileInputRef = useRef(null)

  const confettiCanvasRef = useRef(null)
  const confettiParticles = useRef([])
  const confettiRaf = useRef(null)

  const fireConfetti = useCallback(() => {
    const canvas = confettiCanvasRef.current
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const COLORS = ['#00D1FF','#ff4d4d','#ffd700','#7c3aed','#10b981','#f97316','#ec4899','#fff']
    const cx = canvas.width / 2
    for (let i = 0; i < 160; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 5 + Math.random() * 14
      confettiParticles.current.push({
        x: cx + (Math.random() - 0.5) * 200,
        y: canvas.height * 0.4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        w: 7 + Math.random() * 7, h: 4 + Math.random() * 4,
        rot: Math.random() * 360, rotV: (Math.random() - 0.5) * 16,
        life: 1, decay: 0.004 + Math.random() * 0.003,
        shape: Math.random() > 0.4 ? 'rect' : 'circle',
      })
    }
    if (!confettiRaf.current) tickConfetti()
  }, [])

  function tickConfetti() {
    const canvas = confettiCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    confettiParticles.current = confettiParticles.current.filter(p => p.life > 0)
    for (const p of confettiParticles.current) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.vx *= 0.99
      p.rot += p.rotV; p.life -= p.decay
      ctx.save()
      ctx.globalAlpha = Math.max(0, p.life)
      ctx.translate(p.x, p.y)
      ctx.rotate((p.rot * Math.PI) / 180)
      ctx.fillStyle = p.color
      if (p.shape === 'rect') ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h)
      else { ctx.beginPath(); ctx.arc(0, 0, p.w/2, 0, Math.PI*2); ctx.fill() }
      ctx.restore()
    }
    if (confettiParticles.current.length > 0) {
      confettiRaf.current = requestAnimationFrame(tickConfetti)
    } else {
      confettiRaf.current = null
    }
  }

  // Elapsed timer during generation
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  useEffect(() => {
    if (!loading) { setElapsedSeconds(0); return }
    const t = setInterval(() => setElapsedSeconds(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [loading])

  const LOADING_TIPS = [
    "70% of recruiters now say they prioritize demonstrated skills over job titles.",
    "Resumes that lead with relevant experience get 40% more callbacks than chronological ones.",
    "ATS systems scan for keyword density — your tailored resume is optimized for both bots and humans.",
    "The average recruiter spends 7 seconds on a resume. Your first 3 lines are everything.",
    "Hiring managers at Fortune 500s report seeing hundreds of identical AI resumes. Specific beats polished.",
    "A cover letter that opens with the company's own language gets read. Generic ones don't.",
    "LinkedIn profiles that match your resume get 3x more recruiter outreach.",
    "Skill-based resumes are growing 60% faster than chronological formats in 2026.",
    "The best hiring manager DM leads with a result, not a greeting.",
    "Recruiters flag resumes with unprofessional email addresses in the first pass.",
  ]
  const tipIndex = Math.floor(elapsedSeconds / 6) % LOADING_TIPS.length

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
    loadTada()
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
    loadTada()
    const hasResume = resumeInputMode === 'upload' ? !!pdfFile : resumeText.trim().length > 50
    const hasJobDesc = jobDescInputMode === 'paste' ? jobDescription.trim().length > 50 : !!jobDescFile
    if (!hasResume || !hasJobDesc) {
      setError('Please provide your resume and job description.')
      return
    }

    // JD quality check — catch LinkedIn snippets and stubs
    if (jobDescription.trim().length > 0) {
      const jd = jobDescription.trim()
      const wordCount = jd.split(/\s+/).length
      const hasResponsibilities = /responsibilit|requirement|qualif|you will|you.ll|duties|what you|about the role|about this role/i.test(jd)
      if (wordCount < 80 || !hasResponsibilities) {
        setError('That job description looks too short. It may be a LinkedIn preview — paste the full job posting including responsibilities and requirements.')
        return
      }
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
    setTimeout(() => document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)

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
      if (data.jobDescriptionText) setJobDescription(data.jobDescriptionText)
      setActiveResultTab('resume')

      // 🎉 Ta-da + confetti
      playTada()
      fireConfetti()

      // Increment counter + refresh display
      fetch('/api/counter', { method: 'POST' })
        .then(r => r.json())
        .then(d => updateCounter(d.count))
        .catch(() => {})

      // Keep usage count for paywall
      if (!isPaid) {
        fetch('/api/mark-used', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
          .catch(() => {})
      }

      // Email gate — show 3s after first resume so you capture before paywall kicks in
      const alreadySubmitted = typeof window !== 'undefined' && localStorage.getItem('ju_email_gate')
      if (!alreadySubmitted) {
        setTimeout(() => setShowEmailGate(true), 3000)
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
          resume: results.resume || (activeResume === 'b' ? results.resumeB : results.resumeA) || '',
          jobDescription: jobDescription,
          recruiterNotes: results.recruiterNotes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Regeneration failed.')
      setRegeneratedResults(data)
      setActiveVersion('v2')
      setActiveResultTab('ats')
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
    setGateMsg('')
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: gateEmail })
      })
      const data = await res.json()
      if (res.ok) {
        setGateStatus(null)
        setOtpStep('otp')
      } else {
        setGateStatus('error')
        setGateMsg(data.error || 'Something went wrong. Try again.')
      }
    } catch {
      setGateStatus('error')
      setGateMsg('Something went wrong. Try again.')
    }
  }

  const handleOtpChange = (index, val) => {
    if (!/^[0-9]?$/.test(val)) return
    const next = [...otpCode]
    next[index] = val
    setOtpCode(next)
    setOtpMsg('')
    if (val && index < 4) {
      const el = document.getElementById(`otp-${index + 1}`)
      if (el) el.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      const el = document.getElementById(`otp-${index - 1}`)
      if (el) el.focus()
    }
    if (e.key === 'Enter') handleVerifyOtp()
  }

  const handleVerifyOtp = async () => {
    const code = otpCode.join('')
    if (code.length < 5) { setOtpMsg('Enter the full 5-digit code.'); return }
    setOtpStatus('loading')
    setOtpMsg('')
    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: gateEmail, code })
      })
      const data = await res.json()
      if (res.ok && data.verified) {
        setOtpStatus('done')
        setShowEmailGate(false)
        setOtpStep('email')
        setOtpCode(['', '', '', '', ''])
        if (typeof window !== 'undefined') {
          localStorage.setItem('ju_email_gate', '1')
          localStorage.setItem('ju_email', gateEmail)
        }
      } else {
        setOtpStatus('error')
        setOtpMsg(data.error || 'Incorrect code. Try again.')
      }
    } catch {
      setOtpStatus('error')
      setOtpMsg('Something went wrong. Try again.')
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
        .tab-dropdown-mobile { display: none; }
        .tab-bar-desktop { display: flex; }
        @media (max-width: 700px) {
          .tab-dropdown-mobile { display: block !important; }
          .tab-bar-desktop { display: none !important; }
        }
        @media (max-width: 900px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            padding: 32px 20px 48px !important;
            gap: 40px !important;
          }
        }
        @media (max-width: 600px) {
          .hero-grid {
            padding: 24px 16px 40px !important;
          }
        }
        .sample-output-panel {
          background: #ffffff !important;
          color: #111111 !important;
        }
        .sample-output-panel * {
          color: #111111 !important;
        }
        .sample-output-header {
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .sample-output-badge {
          color: #ffffff !important;
          background: #111111;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .match-tag--hit {
          color: #166534 !important;
          background: #dcfce7;
          border: 1px solid #86efac;
        }
        .match-tag--miss {
          color: #991b1b !important;
          background: #fee2e2;
          border: 1px solid #fca5a5;
        }
        .sample-match-label {
          color: #6b7280 !important;
        }
        @keyframes logo-spin-pause {
          0%   { transform: rotate(0deg); }
          40%  { transform: rotate(360deg); }
          60%  { transform: rotate(360deg); }
          100% { transform: rotate(720deg); }
        }
      `}</style>

      {showContact && <ContactModal onClose={() => setShowContact(false)} />}

      {/* FULL-PAGE CONFETTI CANVAS */}
      <canvas ref={confettiCanvasRef} style={{
        position: 'fixed', inset: 0, width: '100vw', height: '100vh',
        pointerEvents: 'none', zIndex: 9999,
      }} />

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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '48px 40px', maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: '0 32px 80px rgba(0,0,0,0.45)' }}>
            <img src="/jobsuncle-logo.png" alt="JobsUncle.ai" style={{ width: 64, height: 'auto', marginBottom: '20px' }} />

            {otpStep === 'email' ? (
              <>
                <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.9rem', margin: '0 0 10px', lineHeight: 1.1 }}>Your first resume is ready.</h2>
                <p style={{ color: 'var(--text-soft)', fontSize: '0.88rem', margin: '0 0 28px', lineHeight: 1.65 }}>
                  Enter your email to unlock <strong style={{ color: 'var(--ink)' }}>2 more free resumes.</strong><br />No password. No credit card.
                </p>
                <input
                  type="email"
                  value={gateEmail}
                  onChange={e => setGateEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleEmailGate()}
                  placeholder="you@email.com"
                  autoFocus
                  style={{ width: '100%', padding: '13px 14px', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '0.95rem', background: 'var(--bg)', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box', marginBottom: '12px', textAlign: 'center' }}
                />
                {gateMsg && <p style={{ color: '#ef4444', fontSize: '0.82rem', margin: '0 0 10px' }}>{gateMsg}</p>}
                <button
                  onClick={handleEmailGate}
                  disabled={gateStatus === 'loading'}
                  style={{ width: '100%', background: 'var(--accent)', color: '#000', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer', letterSpacing: '0.01em' }}
                >
                  {gateStatus === 'loading' ? 'Sending code…' : 'Send me a code →'}
                </button>
                <p style={{ marginTop: '14px', fontSize: '0.75rem', color: 'var(--text-soft)' }}>We don't spam. Ever.</p>
              </>
            ) : (
              <>
                <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.9rem', margin: '0 0 10px', lineHeight: 1.1 }}>Check your email.</h2>
                <p style={{ color: 'var(--text-soft)', fontSize: '0.88rem', margin: '0 0 6px', lineHeight: 1.65 }}>
                  We sent a 5-digit code to
                </p>
                <p style={{ color: 'var(--ink)', fontSize: '0.88rem', fontWeight: 700, margin: '0 0 28px' }}>{gateEmail}</p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
                  {otpCode.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      autoFocus={i === 0}
                      style={{
                        width: '52px', height: '60px',
                        border: `2px solid ${digit ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: '10px',
                        fontSize: '1.6rem', fontWeight: 900, textAlign: 'center',
                        background: 'var(--bg)', color: 'var(--ink)',
                        outline: 'none',
                        transition: 'border-color 0.15s',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    />
                  ))}
                </div>
                {otpMsg && <p style={{ color: '#ef4444', fontSize: '0.82rem', margin: '0 0 12px' }}>{otpMsg}</p>}
                <button
                  onClick={handleVerifyOtp}
                  disabled={otpStatus === 'loading'}
                  style={{ width: '100%', background: 'var(--accent)', color: '#000', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer', letterSpacing: '0.01em', marginBottom: '14px' }}
                >
                  {otpStatus === 'loading' ? 'Verifying…' : 'Verify →'}
                </button>
                <button
                  onClick={() => { setOtpStep('email'); setOtpCode(['','','','','']); setOtpMsg('') }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-soft)', fontSize: '0.8rem', cursor: 'pointer', padding: '4px' }}
                >
                  Wrong email? Go back
                </button>
                <p style={{ marginTop: '10px', fontSize: '0.72rem', color: 'var(--text-soft)' }}>Code expires in 10 minutes.</p>
              </>
            )}
          </div>
        </div>
      )}

      <Head>
        <title>JobsUncle.ai &mdash; Your resume, tailored to every job.</title>
        <meta name="description" content="Upload your LinkedIn PDF, paste a job description, get a bespoke resume and cover letter in under a minute." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="JobsUncle.ai &mdash; Your resume, tailored to every job." />
        <meta property="og:description" content="Upload your resume or LinkedIn PDF, paste the job description &mdash; get a tailored resume, cover letter, recruiter gap analysis, and a hiring manager DM in under a minute." />
        <meta property="og:image" content="https://www.jobsuncle.ai/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content="https://www.jobsuncle.ai" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://www.jobsuncle.ai/og-image.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/jobsuncle-favicon-32.png?v=2" />
        <link rel="icon" type="image/png" sizes="192x192" href="/jobsuncle-favicon.png?v=2" />
        <link rel="apple-touch-icon" sizes="192x192" href="/jobsuncle-favicon.png?v=2" />
      </Head>

      <Header
        isPaid={isPaid}
        accessLevel={accessLevel}
        onSignIn={() => setShowSignIn(true)}
        onManage={() => setShowManageModal(true)}
        onContact={() => setShowContact(true)}
        resumeCount={resumeCount}
        onLogoClick={results ? () => {
          handleReset()
          setTimeout(() => document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' }), 100)
        } : null}
      />

      {/* MOBILE-ONLY NAV BAR */}
      {!isPaid && (
        <div className="mobile-signin-bar" style={{ display: 'none' }}>
          <a onClick={e => { e.preventDefault(); setShowSignIn(true) }} style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'none' }}>Member Sign In</a>
          <a href="/faq" style={{ color: 'var(--text-soft)', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none' }}>FAQ</a>
          <a href="/about" style={{ color: 'var(--text-soft)', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none' }}>Our Story</a>
        </div>
      )}

      {/* ── HERO — hidden once results exist ─────────────────────── */}
      {!results && !loading && (
      <section style={{
        maxWidth: '1200px', margin: '0 auto', padding: '40px 40px 64px',
        display: 'grid', gridTemplateColumns: '260px 1fr 400px', gap: '48px',
        alignItems: 'center',
      }} className="hero-grid">

        {/* COL 1 — logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src="/jobsuncleaiblack.png"
            alt="JobsUncle.ai"
            style={{ width: '280px', display: 'block' }}
          />
        </div>

        {/* COL 2 — headline + pills + CTA */}
        <div>
          <h1 style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 900,
            fontSize: 'clamp(1.9rem, 2.8vw, 2.8rem)', lineHeight: 1.1,
            color: '#ffffff', margin: '0 0 20px', letterSpacing: '-0.02em',
          }}>
            Tailored resumes to the job description{' '}
            <span style={{ color: '#00D1FF', whiteSpace: 'nowrap' }}>in 60 seconds.</span>
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '32px' }}>
            {['Tailored resume', 'Cover letter', 'Recruiter & ATS analysis', 'Hiring manager DM'].map(item => (
              <span key={item} style={{
                fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', fontWeight: 600,
                color: '#00D1FF', background: 'rgba(0,209,255,0.08)',
                border: '1px solid rgba(0,209,255,0.2)',
                padding: '5px 12px', borderRadius: '999px',
              }}>✓ {item}</span>
            ))}
          </div>
          <a
            href="#upload-section"
            onClick={e => { e.preventDefault(); document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' }) }}
            style={{
              display: 'inline-block', background: '#00D1FF', color: '#000',
              fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '1.05rem',
              padding: '15px 44px', borderRadius: '50px', textDecoration: 'none',
              letterSpacing: '-0.01em', boxShadow: '0 0 40px rgba(0,209,255,0.25)',
            }}
          >
            Get started free →
          </a>
          <div style={{ marginTop: '10px', fontSize: '0.75rem', color: '#555', fontFamily: 'Inter, sans-serif' }}>
            No account needed. Free to try.
          </div>
        </div>

        {/* COL 3 — 4-quad example card */}
        {!results && (
          <div style={{ position: 'relative' }} onMouseLeave={() => setHoveredQuad(null)}>
            <style>{`
              .hero-quad-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; border-radius: 16px; overflow: hidden; box-shadow: 0 32px 64px rgba(0,0,0,0.5); }
              .hero-quad-cell { background: #fff; padding: 10px 12px; position: relative; overflow: hidden; cursor: pointer; transition: background 0.15s; max-height: 200px; }
              .hero-quad-cell:hover { background: #fafafa; }
              .hero-quad-label { font-family: Inter, sans-serif; font-size: 0.55rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 7px; display: flex; align-items: center; gap: 4px; }
              .hero-quad-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
              .hero-quad-text { font-family: Georgia, serif; font-size: 0.62rem; line-height: 1.65; color: #333; }
              .hero-quad-fade { position: absolute; bottom: 0; left: 0; right: 0; height: 40px; background: linear-gradient(to bottom, transparent, #fff); }
              @keyframes hqFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
              .hero-quad-overlay { animation: hqFadeIn 0.15s ease; }
            `}</style>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', marginBottom: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.62rem', fontWeight: 600, color: '#666', letterSpacing: '0.04em' }}>Real output. Fictional candidate.</span>
              <span style={{ background: '#f59e0b', color: '#000', fontSize: '0.52rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '20px', fontFamily: 'Inter, sans-serif' }}>Example</span>
            </div>
            <div className="hero-quad-grid">
              {/* Q1 RESUME */}
              <div className="hero-quad-cell" style={{ borderLeft: '3px solid #00D1FF' }} onMouseEnter={() => setHoveredQuad('resume')}>
                <div className="hero-quad-label" style={{ color: '#00D1FF' }}><span className="hero-quad-dot" style={{ background: '#00D1FF' }} />Resume</div>
                <div className="hero-quad-text">
                  <strong style={{ fontSize: '0.66rem', color: '#111' }}>Riley Okafor</strong><br/>
                  Head of Human Experience<br/>
                  <span style={{ color: '#999', fontSize: '0.58rem' }}>riley.okafor@mailbox.io · Portland, OR</span>
                  <br/><br/>
                  Culture strategist who designed onboarding systems reducing time-to-productivity by 34%. Built belonging programs across distributed teams spanning 9 time zones.
                  <br/><br/>
                  <strong style={{ color: '#111' }}>Distributed Team Experience</strong><br/>
                  • Onboarding program, 34% faster time-to-productivity<br/>
                  • Peer mentorship adopted by 89% of new hires
                </div>
                <div className="hero-quad-fade" />
              </div>

              {/* Q2 COVER LETTER */}
              <div className="hero-quad-cell" style={{ borderLeft: '3px solid #a78bfa' }} onMouseEnter={() => setHoveredQuad('cover')}>
                <div className="hero-quad-label" style={{ color: '#a78bfa' }}><span className="hero-quad-dot" style={{ background: '#a78bfa' }} />Cover Letter</div>
                <div className="hero-quad-text">
                  Vela's approach to culture as infrastructure, not perk, hits exactly right. Too many companies treat human experience as an afterthought — you're building it as a product.<br/><br/>
                  I've designed onboarding systems that cut time-to-productivity by 34%, and run offsites for 140-person distributed teams across 9 time zones.
                </div>
                <div className="hero-quad-fade" />
              </div>

              {/* Q3 ATS SCORE */}
              <div className="hero-quad-cell" style={{ borderLeft: '3px solid #10b981' }} onMouseEnter={() => setHoveredQuad('ats')}>
                <div className="hero-quad-label" style={{ color: '#10b981' }}><span className="hero-quad-dot" style={{ background: '#10b981' }} />ATS Score</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'conic-gradient(#10b981 360deg, #e5e7eb 0deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontWeight: 900, fontSize: '0.55rem', color: '#10b981', fontFamily: 'Inter, sans-serif' }}>100%</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '0.65rem', color: '#10b981' }}>Excellent</div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.55rem', color: '#999' }}>15/15 keywords matched</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                  {['onboarding','culture','distributed','facilitation','systems','leadership','inclusion','change','workflow'].map(k => (
                    <span key={k} style={{ fontSize: '0.5rem', padding: '1px 5px', borderRadius: '999px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#059669', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>✓ {k}</span>
                  ))}
                </div>
              </div>

              {/* Q4 HIRING MANAGER DM */}
              <div className="hero-quad-cell" style={{ borderLeft: '3px solid #f59e0b' }} onMouseEnter={() => setHoveredQuad('dm')}>
                <div className="hero-quad-label" style={{ color: '#f59e0b' }}><span className="hero-quad-dot" style={{ background: '#f59e0b' }} />Hiring Manager DM</div>
                <div style={{ background: '#f8fafc', borderRadius: '6px', padding: '7px 8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#0077b5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: '#fff', fontSize: '0.4rem', fontWeight: 800, fontFamily: 'Inter, sans-serif' }}>in</span>
                    </div>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.55rem', color: '#888' }}>To: Hiring Manager, Vela</span>
                  </div>
                  <div className="hero-quad-text">I built onboarding systems that reduced time-to-productivity by 34% at a distributed company, and facilitated C-suite retreats at 8 companies. Your Head of Human Experience role caught my attention — you're treating culture as infrastructure, not a perk.</div>
                </div>
                <div className="hero-quad-fade" style={{ background: 'linear-gradient(to bottom, transparent, #fff)' }} />
              </div>
            </div>

            {/* HOVER OVERLAY */}
            {hoveredQuad && (
              <div className="hero-quad-overlay" style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                background: '#fff', borderRadius: '16px', padding: '20px', zIndex: 50,
                boxShadow: '0 24px 64px rgba(0,0,0,0.4)', border: '1px solid #e5e7eb',
                maxHeight: '420px', overflowY: 'auto',
              }}>
                {hoveredQuad === 'resume' && (
                  <div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', fontWeight: 800, color: '#00D1FF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>📄 Tailored Resume</div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', color: '#bbb', marginBottom: '12px' }}>Example output — fictional candidate Riley Okafor applying to fictional company Vela.</div>
                    <div style={{ fontFamily: 'Georgia, serif', fontSize: '0.78rem', lineHeight: 1.75, color: '#1a1a1a' }}>
                      <strong>Riley Okafor</strong> — Head of Human Experience<br/>
                      <span style={{ color: '#888', fontSize: '0.72rem' }}>riley.okafor@mailbox.io · Portland, OR</span>
                      <br/><br/>Culture strategist who designed onboarding systems reducing time-to-productivity by 34%. Built belonging and inclusion programs across distributed teams spanning 9 time zones.<br/><br/>
                      <strong>Distributed Team Experience</strong><br/>
                      • Onboarding program reducing time-to-productivity 34% across 6 departments<br/>
                      • Annual offsite for 140-person distributed team across 9 time zones<br/>
                      • Peer mentorship adopted by 89% of new hires in Q1<br/><br/>
                      <strong>Executive Facilitation & Change Management</strong><br/>
                      • Led facilitation for 3 org restructures affecting 200+ employees<br/>
                      • Leadership retreats for C-suite teams at 8 mid-market companies<br/>
                      • Grew consulting practice revenue 40% in 18 months
                    </div>
                  </div>
                )}
                {hoveredQuad === 'cover' && (
                  <div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>✉️ Cover Letter</div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', color: '#bbb', marginBottom: '12px' }}>Example output — fictional candidate Riley Okafor applying to fictional company Vela.</div>
                    <div style={{ fontFamily: 'Georgia, serif', fontSize: '0.82rem', lineHeight: 1.85, color: '#1a1a1a' }}>
                      <p style={{ margin: '0 0 14px' }}>Vela's approach to culture as infrastructure, not perk, hits exactly right. Too many companies treat human experience as an afterthought — you're building it as a product. That's the difference between culture that scales and culture that breaks.</p>
                      <p style={{ margin: '0 0 14px' }}>I've designed onboarding systems that cut time-to-productivity by 34%, and run offsites for 140-person distributed teams across 9 time zones. At Bright Arc, I built culture measurement frameworks that gave leadership real signals instead of vanity metrics.</p>
                      <p style={{ margin: 0 }}>The direct CEO reporting structure tells me this role has real influence. I'm ready to own the experience of working at Vela from day one.</p>
                    </div>
                  </div>
                )}
                {hoveredQuad === 'ats' && (
                  <div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>🎯 ATS Score</div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', color: '#bbb', marginBottom: '12px' }}>Example output — fictional candidate Riley Okafor applying to fictional company Vela.</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'conic-gradient(#10b981 360deg, #e5e7eb 0deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontWeight: 900, fontSize: '0.85rem', color: '#10b981', fontFamily: 'Inter, sans-serif' }}>100%</span>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '0.9rem', color: '#10b981' }}>Excellent</div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#888' }}>15/15 keywords matched</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {['onboarding','culture','distributed','facilitation','systems','leadership','inclusion','change','workflow','software','design','product','integration','management','department'].map(k => (
                        <span key={k} style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '999px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#059669', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>✓ {k}</span>
                      ))}
                    </div>
                  </div>
                )}
                {hoveredQuad === 'dm' && (
                  <div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>💬 Hiring Manager DM</div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', color: '#bbb', marginBottom: '12px' }}>Example output — fictional candidate Riley Okafor applying to fictional company Vela.</div>
                    <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px 16px', border: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #e5e7eb' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '5px', background: '#0077b5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ color: '#fff', fontSize: '0.55rem', fontWeight: 800, fontFamily: 'Inter, sans-serif' }}>in</span>
                        </div>
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#888' }}>To: Hiring Manager, Vela</span>
                      </div>
                      <div style={{ fontFamily: 'Georgia, serif', fontSize: '0.8rem', lineHeight: 1.8, color: '#1a1a1a' }}>
                        I built onboarding systems that reduced time-to-productivity by 34% at a distributed company, and facilitated leadership retreats for C-suite teams at 8 companies. Your Head of Human Experience role caught my attention because you're treating culture as infrastructure, not a perk. Worth a conversation about how this translates to your 180-person distributed team?
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <a href="/example" style={{ fontSize: '0.72rem', color: '#00D1FF', fontWeight: 700, textDecoration: 'none', fontFamily: 'Inter, sans-serif' }}>See full example output →</a>
            </div>
          </div>
        )}
      </section>
      )}

      {/* TESTIMONIAL — B.C. */}
      {!results && !loading && (
      <div style={{
        textAlign: 'center', padding: '28px 24px',
        borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
      }}>
        <p style={{
          fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem',
          fontStyle: 'italic', color: 'var(--ink)', margin: '0 0 8px', lineHeight: 1.5,
        }}>"The results are solid. I like what I got back."</p>
        <p style={{
          fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-soft)',
          letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0,
        }}>&mdash; B.C., ICF Certified Career Coach</p>
      </div>
      )}


            {/* ── UPLOAD SECTION ────────────────────────────────────────── */}
      {!results && (
      <section id="upload-section" style={{
        maxWidth: '760px', margin: '0 auto', padding: '0 24px 0',
      }}>
        {loading ? (
          <div style={{ 
            textAlign: 'center', 
            minHeight: 'auto',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '4rem 1rem', background: '#161616', border: '1px solid #2a2a2a', borderRadius: '16px' 
          }}>
            <img
              src="/jobsuncle-logo.png"
              alt=""
              style={{ width: 120, height: 'auto', display: 'block', margin: '0 auto 28px',
                animation: 'logo-spin-pause 2s ease-in-out infinite', transformOrigin: 'center center' }}
            />
            <div className="loading-text" style={{ marginBottom: '6px', fontSize: '1.3rem' }}>Making you impossible to ignore.</div>
            <div className="loading-sub">Tailoring every word to this role.</div>
            <div style={{
              margin: '24px auto 0',
              maxWidth: '460px',
              padding: '14px 20px',
              background: 'rgba(0,209,255,0.06)',
              border: '1px solid rgba(0,209,255,0.15)',
              borderRadius: '10px',
              transition: 'all 0.5s ease',
            }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#00D1FF', marginBottom: '6px' }}>Did you know?</div>
              <div style={{ fontSize: '0.82rem', color: '#aaa', lineHeight: 1.6, fontFamily: 'Inter, sans-serif' }}>
                {LOADING_TIPS[tipIndex]}
              </div>
            </div>
            <div style={{
              margin: '32px auto 0',
              fontFamily: 'Inter, sans-serif',
              fontSize: '5rem',
              fontWeight: 900,
              color: '#00D1FF',
              letterSpacing: '-0.04em',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }}>
              {elapsedSeconds}<span style={{ fontSize: '2.2rem', fontWeight: 600, color: '#336', marginLeft: '6px' }}>s</span>
            </div>
            <div style={{ marginTop: '10px', fontSize: '0.72rem', color: '#444', fontFamily: 'Inter, sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              elapsed
            </div>
          </div>
        ) : (
        <div style={{
          background: '#161616', border: '1px solid #2a2a2a', borderRadius: '16px',
          padding: '36px 32px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* DROP ZONE A — Resume */}
            <div className="cc-zone-block">
              <div className="cc-zone-header">
                <span className="cc-zone-heading">📄 Your Resume</span>
                <div className="cc-toggle">
                  <button className={`cc-toggle-btn ${resumeInputMode === 'upload' ? 'active' : ''}`} onClick={() => setResumeInputMode('upload')}>Upload</button>
                  <button className={`cc-toggle-btn ${resumeInputMode === 'paste' ? 'active' : ''}`} onClick={() => setResumeInputMode('paste')}>Paste</button>
                </div>
              </div>
              {resumeInputMode === 'upload' ? (
                <div
                  className={`cc-zone ${dragover ? 'cc-zone--dragover' : ''} ${pdfFile ? 'cc-zone--done' : 'cc-zone--active'}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragover(true) }}
                  onDragLeave={() => setDragover(false)}
                >
                  <div className="cc-zone-icon">{pdfFile ? '✓' : '📄'}</div>
                  <div className="cc-zone-title">{pdfFile ? pdfFile.name : 'Drop resume or click to browse'}</div>
                  <div className="cc-zone-sub">PDF, DOCX, DOC, TXT — LinkedIn PDF works great</div>
                  <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" className="file-input" onChange={(e) => handleFile(e.target.files[0])} />
                </div>
              ) : (
                <textarea className="cc-jd-input cc-jd-input--tall" placeholder="Paste your full resume here — work history, skills, education..." value={resumeText} onChange={(e) => setResumeText(e.target.value)} />
              )}
            </div>

            <div className="cc-zone-divider">+</div>

            {/* DROP ZONE B — Job Description */}
            <div className="cc-zone-block">
              <div className="cc-zone-header">
                <span className="cc-zone-heading">📋 Job Description</span>
                <div className="cc-toggle">
                  <button className={`cc-toggle-btn ${jobDescInputMode === 'upload' ? 'active' : ''}`} onClick={() => setJobDescInputMode('upload')}>Upload</button>
                  <button className={`cc-toggle-btn ${jobDescInputMode === 'paste' ? 'active' : ''}`} onClick={() => setJobDescInputMode('paste')}>Paste</button>
                </div>
              </div>
              {jobDescInputMode === 'paste' ? (
                <textarea className="cc-jd-input cc-jd-input--tall" placeholder="Paste the full job posting — title, responsibilities, requirements..." value={jobDescription} onChange={(e) => { setJobDescription(e.target.value); setError(null); }} />
              ) : (
                <div className={`cc-zone ${jobDescFile ? 'cc-zone--done' : 'cc-zone--active'}`} onClick={() => jobDescFileRef.current?.click()}>
                  <div className="cc-zone-icon">{jobDescFile ? '✓' : '📋'}</div>
                  <div className="cc-zone-title">{jobDescFile ? jobDescFile.name : 'Drop job posting or click to browse'}</div>
                  <div className="cc-zone-sub">PDF, DOCX, DOC, TXT</div>
                  <input ref={jobDescFileRef} type="file" accept=".pdf,.doc,.docx,.txt" className="file-input" onChange={(e) => setJobDescFile(e.target.files[0])} />
                </div>
              )}
            </div>

          </div>

          <button
            className={`cc-generate-btn ${canGenerate ? 'cc-generate-btn--ready' : 'cc-generate-btn--disabled'}`}
            onClick={handleGenerate}
            disabled={!canGenerate || loading}
            style={{ marginTop: '20px' }}
          >
            {canGenerate ? 'Go Win! 🍀' : 'Drop resume + paste job description to unlock'}
          </button>
        </div>
        )} {/* end loading ternary */}
      </section>
      )} {/* end !results */}


      <div className="app-container">

        {!results && (
          <>
            <div className="steps" id="get-started" style={{display: 'none'}}>
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
                      onChange={(e) => { setJobDescription(e.target.value); setError(null); }}
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

            {/* RESTORE + BETA — visible below generate, not buried */}
            {!isPaid && !loading && (
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


        {results && (
          <>
            <div className="results">
              {/* LOOKS GREAT BANNER */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '24px',
                marginBottom: '28px', padding: '20px 28px',
                background: 'linear-gradient(135deg, rgba(0,209,255,0.1) 0%, rgba(0,209,255,0.04) 100%)',
                border: '2px solid rgba(0,209,255,0.3)',
                borderRadius: '14px',
              }}>
                <img
                  src="/mascot-points.png"
                  alt=""
                  onError={e => { e.target.style.display='none' }}
                  style={{ width: '110px', flexShrink: 0, display: 'block' }}
                />
                <div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900, fontSize: '1.4rem', color: '#111111', marginBottom: '6px', letterSpacing: '-0.02em' }}>
                    Looks great. 🎉
                  </div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.88rem', color: '#444444', lineHeight: 1.6 }}>
                    Tailored to this role. Download below — or scroll down for your cover letter, recruiter analysis, and hiring manager DM.
                  </div>
                </div>
              </div>

              <div className="results-header">
                <div className="results-title">Your tailored documents</div>
                <div className="results-badge">Ready to download</div>
              </div>

              {/* RESULTS TAB BAR */}
              {(() => {
                const tabs = [
                  { key: 'resume', label: (() => { const s = (activeVersion === 'v2' && regeneratedResults) ? clientScoreATS(regeneratedResults.resume, jobDescription).score : results.atsMatch?.score; return s != null ? `📄 Resume · ${s}%` : '📄 Resume' })() },
                  { key: 'ats', label: '🎯 ATS Score' },
                  { key: 'recruiter', label: '🔍 Recruiter Analysis' },
                  { key: 'cover', label: '✉️ Cover Letter' },
                  { key: 'dm', label: '💬 Hiring Manager DM' },
                  ...(results.companyIntel ? [{ key: 'intel', label: '🏢 Company Intel' }] : []),
                ]
                return (
                  <>
                    {/* MOBILE: full-width dropdown */}
                    <div className="tab-dropdown-mobile" style={{ marginBottom: '20px' }}>
                      <select
                        value={activeResultTab}
                        onChange={e => setActiveResultTab(e.target.value)}
                        style={{
                          width: '100%', padding: '12px 16px', borderRadius: '10px',
                          border: '1.5px solid #00D1FF', background: '#111', color: '#fff',
                          fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', fontWeight: 600,
                          cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
                          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2300D1FF' stroke-width='2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
                          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: '36px',
                        }}
                      >
                        {tabs.map(({ key, label }) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                    {/* DESKTOP: tab bar */}
                    <div className="tab-bar-desktop" style={{
                      display: 'flex', gap: '0', overflowX: 'auto',
                      scrollbarWidth: 'none', msOverflowStyle: 'none',
                      borderBottom: '1px solid #2a2a2a', marginBottom: '28px',
                    }}>
                      {tabs.map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => setActiveResultTab(key)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: '11px 18px', whiteSpace: 'nowrap', flexShrink: 0,
                            fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', fontWeight: 600,
                            color: activeResultTab === key ? '#00D1FF' : '#666',
                            borderBottom: `2px solid ${activeResultTab === key ? '#00D1FF' : 'transparent'}`,
                            transition: 'color 0.15s, border-color 0.15s', marginBottom: '-1px',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                )
              })()}

              {/* V1 / V2 VERSION TOGGLE — appears once V2 is generated */}
              {regeneratedResults && (
                <div
                  ref={versionToggleRef}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: '10px',
                    marginBottom: '20px', padding: '14px 16px',
                    background: 'rgba(16,185,129,0.06)',
                    border: '2px solid #10b981',
                    borderRadius: '10px',
                  }}
                >
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10b981' }}>
                    ✓ Version 2 ready — fixes applied from the recruiter analysis
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[
                      { v: 'v1', label: 'Version 1 — Original' },
                      { v: 'v2', label: '✦ Version 2 — Fixed' },
                    ].map(({ v, label }) => (
                      <button
                        key={v}
                        onClick={() => { setActiveVersion(v); setActiveResultTab('resume'); }}
                        style={{
                          padding: '9px 20px',
                          borderRadius: '8px',
                          border: `2px solid ${activeVersion === v ? (v === 'v2' ? '#10b981' : '#555') : '#333'}`,
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          transition: 'all 0.15s',
                          background: activeVersion === v ? (v === 'v2' ? '#10b981' : '#333') : 'transparent',
                          color: activeVersion === v ? 'white' : (v === 'v2' ? '#10b981' : '#aaa'),
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeResultTab === 'resume' && regeneratedResults && activeVersion === 'v2' && (() => {
                const v2ats = clientScoreATS(regeneratedResults.resume, jobDescription)
                if (!v2ats) return null
                const v1ats = results.atsMatch
                const scoreColor = v2ats.score >= 75 ? '#10b981' : v2ats.score >= 55 ? '#f59e0b' : '#ef4444'
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', padding: '12px 16px', background: 'rgba(16,185,129,0.06)', border: '1.5px solid rgba(16,185,129,0.3)', borderRadius: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: `conic-gradient(${scoreColor} ${v2ats.score * 3.6}deg, #2a2a2a 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontWeight: 900, fontSize: '0.9rem', color: scoreColor }}>{v2ats.score}%</span>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981' }}>ATS Score — Version 2</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-soft)' }}>
                          {v1ats ? `Up from ${v1ats.score}% on Version 1` : 'Keyword match against job description'}
                        </div>
                      </div>
                    </div>
                    {v2ats.missing && v2ats.missing.length > 0 && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-soft)' }}>
                        <span style={{ color: '#ef4444', fontWeight: 600 }}>Still missing: </span>
                        {v2ats.missing.slice(0, 5).join(', ')}
                        {v2ats.missing.length > 5 ? ` +${v2ats.missing.length - 5} more` : ''}
                      </div>
                    )}
                  </div>
                )
              })()}

              {activeResultTab === 'resume' && <div id="result-resume" className="result-section">
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
              </div>}

              {activeResultTab === 'cover' && <div className="result-section">
                <div className="result-section-title">Cover Letter</div>
                <div className="result-content" dangerouslySetInnerHTML={{__html: renderMarkdown(
                  activeVersion === 'v2' && regeneratedResults
                    ? regeneratedResults.coverLetter
                    : results.coverLetter
                )}} />
              </div>}
              {/* ATS KEYWORD MATCH SCORE */}
              {activeResultTab === 'ats' && (
                (() => {
                  const activeAts = (activeVersion === 'v2' && regeneratedResults)
                    ? clientScoreATS(regeneratedResults.resume, jobDescription)
                    : results.atsMatch
                  if (!activeAts) return (
                    <div className="result-section" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-soft)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🎯</div>
                      <div style={{ fontWeight: 700, marginBottom: '8px' }}>ATS Score not available</div>
                      <div style={{ fontSize: '0.85rem' }}>Run a new generation to see your keyword match score.</div>
                    </div>
                  )
                  const atsMatch = activeAts
                  return <div id="result-ats" className="result-section" style={{ borderLeft: '3px solid #00D1FF', background: 'rgba(0,209,255,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <div className="result-section-title" style={{ margin: 0, marginBottom: '4px' }}>ATS Keyword Match {activeVersion === 'v2' && regeneratedResults ? <span style={{ fontSize: '0.65rem', background: '#10b981', color: 'white', padding: '2px 7px', borderRadius: '10px', marginLeft: '6px', fontWeight: 600 }}>v2 score</span> : null}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-soft)' }}>{activeVersion === 'v2' && regeneratedResults ? 'Scored against your fixed Version 2 resume.' : 'How well your resume matches the job description keywords — no Jobscan needed.'}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        width: '72px', height: '72px', borderRadius: '50%',
                        background: `conic-gradient(${atsMatch.score >= 75 ? '#10b981' : atsMatch.score >= 55 ? '#f59e0b' : '#ef4444'} ${atsMatch.score * 3.6}deg, #2a2a2a 0deg)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        position: 'relative',
                      }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                          <span style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '1.1rem', color: atsMatch.score >= 75 ? '#10b981' : atsMatch.score >= 55 ? '#f59e0b' : '#ef4444', lineHeight: 1 }}>{atsMatch.score}%</span>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-soft)', marginTop: '4px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {atsMatch.score >= 75 ? 'Strong' : atsMatch.score >= 55 ? 'Good' : 'Needs work'}
                      </div>
                    </div>
                  </div>

                  {/* SCORE RANGE LEGEND */}
                  <div style={{ marginBottom: '20px', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '10px' }}>Score guide</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[
                        { label: 'Poor', range: '0–40', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', active: atsMatch.score <= 40 },
                        { label: 'Needs Work', range: '41–54', color: '#f97316', bg: 'rgba(249,115,22,0.08)', active: atsMatch.score >= 41 && atsMatch.score <= 54 },
                        { label: 'Good', range: '55–74', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', active: atsMatch.score >= 55 && atsMatch.score <= 74 },
                        { label: 'Strong', range: '75–89', color: '#10b981', bg: 'rgba(16,185,129,0.08)', active: atsMatch.score >= 75 && atsMatch.score <= 89 },
                        { label: 'Excellent', range: '90+', color: '#00D1FF', bg: 'rgba(0,209,255,0.08)', active: atsMatch.score >= 90 },
                      ].map(({ label, range, color, bg, active }) => (
                        <div key={label} style={{
                          flex: 1, textAlign: 'center', padding: '6px 4px',
                          borderRadius: '6px',
                          background: active ? bg : 'transparent',
                          border: `1.5px solid ${active ? color : 'transparent'}`,
                        }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: active ? 800 : 500, color: active ? color : 'var(--text-soft)', lineHeight: 1.2 }}>{label}</div>
                          <div style={{ fontSize: '0.62rem', color: active ? color : '#555', marginTop: '2px', opacity: active ? 1 : 0.7 }}>{range}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {atsMatch.missing && atsMatch.missing.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#ef4444', marginBottom: '8px' }}>Missing keywords ({atsMatch.missing.length})</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {atsMatch.missing.map(kw => (
                          <span key={kw} style={{ padding: '3px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '999px', fontSize: '0.75rem', color: '#ef4444', fontFamily: 'Inter' }}>{kw}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {atsMatch.matched && atsMatch.matched.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#10b981', marginBottom: '8px' }}>Matched keywords ({atsMatch.matched.length})</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {atsMatch.matched.slice(0, 20).map(kw => (
                          <span key={kw} style={{ padding: '3px 10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '999px', fontSize: '0.75rem', color: '#10b981', fontFamily: 'Inter' }}>✓ {kw}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* FIT CHECK + FIX CTA */}
                  {(() => {
                    const isFitIssue = atsMatch.score < 40
                    const isFixable = atsMatch.score >= 40 && atsMatch.score < 75
                    const isStrong = atsMatch.score >= 75

                    // Pull first paragraph of recruiter notes as the fit summary
                    const fitSummary = results.recruiterNotes
                      ? results.recruiterNotes.split('\n').filter(l => l.trim().length > 60)[0] || null
                      : null

                    return (
                      <div style={{
                        marginTop: '20px', paddingTop: '16px',
                        borderTop: '1px solid var(--border)',
                      }}>
                        {/* Fit summary from recruiter notes */}
                        {fitSummary && (
                          <div style={{
                            marginBottom: '16px', padding: '12px 14px',
                            background: isFitIssue ? 'rgba(239,68,68,0.06)' : isStrong ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.06)',
                            border: `1px solid ${isFitIssue ? 'rgba(239,68,68,0.2)' : isStrong ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
                            borderRadius: '8px',
                          }}>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: isFitIssue ? '#ef4444' : isStrong ? '#10b981' : '#f59e0b', marginBottom: '6px' }}>
                              {isFitIssue ? '⚠ Possible fit issue' : isStrong ? '✓ Recruiter read' : '📋 Recruiter read'}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--ink)', lineHeight: 1.6 }}>
                              {fitSummary.replace(/\*\*/g, '').replace(/^#+\s*/, '')}
                            </div>
                            <button
                              onClick={() => setActiveResultTab('recruiter')}
                              style={{ marginTop: '8px', background: 'none', border: 'none', padding: 0, fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Read full analysis →
                            </button>
                          </div>
                        )}

                        {/* Fit warning for very low scores */}
                        {isFitIssue && (
                          <div style={{
                            marginBottom: '14px', padding: '10px 14px',
                            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                            borderRadius: '8px', fontSize: '0.8rem', color: '#ef4444', lineHeight: 1.5,
                          }}>
                            <strong>Before regenerating:</strong> a score this low often means the role requires skills or background that aren't in your resume. Rewriting won't fix a fit gap. Read the full recruiter analysis first to confirm this is worth pursuing.
                          </div>
                        )}

                        {/* Fix CTA */}
                        {!isStrong && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            {isPaid ? (
                              <>
                                <button
                                  onClick={handleRegenerate}
                                  disabled={regenerating || !!regeneratedResults}
                                  style={{
                                    padding: '10px 24px',
                                    background: regeneratedResults ? '#22c55e' : regenerating ? '#aaa' : '#f59e0b',
                                    color: 'white', border: 'none', borderRadius: '6px',
                                    fontSize: '0.88rem', fontWeight: 700,
                                    cursor: regenerating || regeneratedResults ? 'default' : 'pointer',
                                  }}
                                >
                                  {regeneratedResults ? '✓ Version 2 ready — check Resume tab' : regenerating ? '⟳ Applying fixes...' : '✦ Apply fixes & regenerate'}
                                </button>
                                {!regeneratedResults && !regenerating && (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>
                                    Rewrites your resume with missing keywords woven in
                                  </span>
                                )}
                              </>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <button
                                  onClick={() => { setPaywallSigninMode(false); setShowPaywall(true) }}
                                  style={{ padding: '10px 24px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  ✦ Apply fixes &amp; regenerate
                                </button>
                                <span style={{ background: '#f59e0b', color: 'white', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase' }}>Pro</span>
                              </div>
                            )}
                            {regenError && <div style={{ width: '100%', color: '#ef4444', fontSize: '0.8rem' }}>{regenError}</div>}
                            {regenerating && (
                              <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', padding: '14px 16px', background: '#1a1a2e', border: '1.5px solid #f59e0b', borderRadius: '8px' }}>
                                <img src="/jobsuncle-logo.png" alt="" style={{ width: 44, height: 'auto', flexShrink: 0, animation: 'logo-spin-pause 2s ease-in-out infinite' }} />
                                <div>
                                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f59e0b' }}>Applying every fix from the analysis...</div>
                                  <div style={{ fontSize: '0.78rem', color: '#ccc', marginTop: '3px' }}>Rewriting your resume and cover letter. About 15 seconds.</div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {isStrong && !regeneratedResults && (
                          <div style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 600 }}>
                            ✓ Score is strong. Move on to your Cover Letter.
                          </div>
                        )}
                      </div>
                    )
                  })()}

                </div>
                })()
              )}

              {activeResultTab === 'recruiter' && results.recruiterNotes && (
                <div id="result-recruiter" className="result-section" style={{ borderLeft: '3px solid #f59e0b', background: 'rgba(245,158,11,0.05)' }}>
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
                      <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', padding: '14px 16px', background: '#1a1a2e', border: '1.5px solid #f59e0b', borderRadius: '8px' }}>
                        <img
                          src="/jobsuncle-logo.png"
                          alt=""
                          style={{ width: 44, height: 'auto', flexShrink: 0, animation: 'logo-spin-pause 2s ease-in-out infinite', transformOrigin: 'center center' }}
                        />
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f59e0b' }}>Applying every fix from the analysis...</div>
                          <div style={{ fontSize: '0.78rem', color: '#ccc', marginTop: '3px' }}>Rewriting your resume and cover letter. About 15 seconds.</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeResultTab === 'dm' && results.hiringManagerDM && (
                <div id="result-dm" className="result-section" style={{ borderLeft: '3px solid #6366f1', background: 'rgba(99,102,241,0.05)' }}>
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
                    <div style={{ fontSize: '0.82rem', color: 'var(--ink)' }}>Every field an ATS will ask for — pre-staged, one click to copy.</div>
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

                {/* CONTACT STRIP — after downloads */}
                <div style={{
                  marginTop: '20px', padding: '14px 20px',
                  background: 'rgba(0,209,255,0.04)',
                  border: '1px solid rgba(0,209,255,0.15)',
                  borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  flexWrap: 'wrap', gap: '10px',
                }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-soft)' }}>
                    Got feedback? Questions? Something look off?
                  </div>
                  <button
                    onClick={() => setShowContact(true)}
                    style={{
                      background: 'none', border: '1.5px solid rgba(0,209,255,0.4)',
                      borderRadius: '20px', padding: '6px 18px',
                      color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Contact us →
                  </button>
                </div>
              </div>
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

            {/* CONTACT CTA */}
            <div style={{ margin: '1.5rem 0 0', textAlign: 'center', padding: '1.25rem', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-soft)' }}>Questions or feedback? </span>
              <button
                onClick={() => setShowContact(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 600, textDecoration: 'underline', padding: 0 }}
              >
                Contact us
              </button>
            </div>

            <button className="reset-btn" onClick={handleReset}>
              ← Start over with a new job
            </button>
          </>
        )}
      </div>

      {/* FEEDBACK BANNER */}
      <div style={{
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        padding: '3rem 2rem',
        textAlign: 'center',
      }}>
        <p style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: 'clamp(1.3rem, 3vw, 1.75rem)',
          fontWeight: 700,
          color: 'var(--ink)',
          lineHeight: 1.4,
          maxWidth: '600px',
          margin: '0 auto 0.75rem',
        }}>
          Getting better every day. We're listening.
        </p>
        <div style={{ maxWidth: '520px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <textarea
            placeholder="Tell us exactly what happened. Good or bad."
            rows={3}
id="inline-feedback-name"
                  placeholder="Your name"
                  style={{
                    width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: '8px', padding: '10px 14px', color: 'var(--ink)',
                    fontSize: '0.85rem', fontFamily: 'Inter, sans-serif', marginBottom: '8px',
                    boxSizing: 'border-box'
                  }}
                />
                <input
                  type="email"
                  id="inline-feedback-email"
                  placeholder="Your email"
                  style={{
                    width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: '8px', padding: '10px 14px', color: 'var(--ink)',
                    fontSize: '0.85rem', fontFamily: 'Inter, sans-serif', marginBottom: '8px',
                    boxSizing: 'border-box'
                  }}
                />
                <textarea
                  id="inline-feedback-text"
            style={{
              width: '100%', padding: '14px 16px',
              background: 'var(--surface)', border: '1.5px solid var(--border)',
              borderRadius: '10px', color: 'var(--ink)',
              fontFamily: 'Inter, sans-serif', fontSize: '0.9rem',
              lineHeight: 1.6, resize: 'vertical', outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--accent)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
          />
          <button
            onClick={async () => {
              const text = document.getElementById('inline-feedback-text').value.trim()
              if (!text) return
              try {
                await fetch('/api/contact', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      name: document.getElementById('inline-feedback-name')?.value.trim() || 'Anonymous',
                      email: document.getElementById('inline-feedback-email')?.value.trim() || 'no-email@jobsuncle.ai',
                      message: text
                    })
                })
                document.getElementById('inline-feedback-text').value = ''
                document.getElementById('inline-feedback-thanks').style.display = 'block'
              } catch {}
            }}
            style={{
              alignSelf: 'flex-end', padding: '10px 28px',
              background: 'var(--accent)', color: '#000',
              border: 'none', borderRadius: '50px',
              fontFamily: 'Inter, sans-serif', fontSize: '0.85rem',
              fontWeight: 700, cursor: 'pointer', letterSpacing: '0.02em',
            }}
          >
            Send →
          </button>
          <p id="inline-feedback-thanks" style={{ display: 'none', fontSize: '0.85rem', color: '#10b981', margin: 0 }}>Got it. Thank you.</p>
        </div>
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
