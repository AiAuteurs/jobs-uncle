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
  const [showPaywall, setShowPaywall] = useState(false)
  const [isPaid, setIsPaid] = useState(false)
  const fileInputRef = useRef(null)

  // Fetch resume counter on mount
  useEffect(() => {
    fetch('/api/counter')
      .then(r => r.json())
      .then(d => setResumeCount(d.count))
      .catch(() => {})

    // Check if returning paid user
    const session = localStorage.getItem('ju_session')
    if (session) setIsPaid(true)
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

      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed')
      }

      setResults(data)

      // Mark free resume as used
      if (!isPaid) {
        fetch('/api/mark-used', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }).catch(() => {})
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async () => {
    const res = await fetch('/api/stripe-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
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
    try {
      const payload = {
        resume: type === 'resume' || type === 'both' ? results.resume : null,
        coverLetter: type === 'cover' || type === 'both' ? results.coverLetter : null,
        fileBaseName: results.fileBaseName
          ? `${results.fileBaseName}_${type === 'resume' ? 'Resume' : type === 'cover' ? 'Cover_Letter' : 'Full_Package'}`
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

  const handleReset = () => {
    setJobDescription('')
    setResults(null)
    setError(null)
  }

  const canGenerate = pdfFile && jobDescription.trim().length > 50

  return (
    <>
      {showPaywall && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '48px 40px', maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}>
            <img src="/uncle-spin-hero.png" alt="JobsUncle.ai" style={{ width: 100, height: 'auto', marginBottom: '24px' }} />
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', margin: '0 0 12px', lineHeight: 1.1 }}>Your free resume is done.</h2>
            <p style={{ color: 'var(--text-soft)', fontSize: '0.95rem', margin: '0 0 32px', lineHeight: 1.6 }}>
              Upgrade to Pro for unlimited resumes, every job, forever.<br />
              <strong style={{ color: 'var(--ink)' }}>$49.99 / year.</strong> Cancel anytime.
            </p>
            <button onClick={handleUpgrade} style={{ width: '100%', background: 'var(--accent)', color: 'white', border: 'none', padding: '16px', borderRadius: '8px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', marginBottom: '12px', letterSpacing: '0.02em' }}>
              Upgrade to Pro — $49.99/yr
            </button>
            <button onClick={() => setShowPaywall(false)} style={{ background: 'none', border: 'none', color: 'var(--text-soft)', fontSize: '0.85rem', cursor: 'pointer', padding: '8px' }}>
              Maybe later
            </button>
          </div>
        </div>
      )}
      <Head>
        <title>JobsUncle.ai — Resumes That Actually Fit</title>
        <meta name="description" content="Upload your LinkedIn PDF, paste a job description, get a bespoke resume and cover letter in under a minute." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🤵</text></svg>" />
      </Head>

      <header className="header">
        <div className="logo">
          <img src="/uncle-spin-logo.png" alt="Uncle Spin" className="logo-icon" />
          <span className="logo-text">JobsUncle.ai</span>
          <span className="logo-badge">Beta</span>
        </div>
        <div className="header-right">
          {resumeCount !== null && (
            <div className="counter">
              <span className="counter-num">{resumeCount.toLocaleString()}</span>
              <span className="counter-label">resumes generated</span>
            </div>
          )}
          <span className="header-tagline">Everyone deserves an uncle in the business</span>
        </div>
      </header>

      <div className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <p className="hero-eyebrow">AI Resume Intelligence</p>
            <h1>Your resume, <em>tailored</em><br />to every job.</h1>
            <p className="hero-sub">
              Upload your resume or LinkedIn profile. Paste a job description.
              Get a bespoke resume and cover letter — built for that specific role — in under 60 seconds.
            </p>
          </div>
          <div className="hero-mascot">
            <img src="/uncle-spin-hero.png" alt="Uncle Spin" className="mascot-img" />
          </div>
        </div>
      </div>

      <div className="app-container">

        {!results && (
          <>
            <div className="steps">
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
                  placeholder="Paste the complete job description here — title, responsibilities, requirements, the works..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>
            </div>

            {error && <div className="error-msg">{error}</div>}

            <button
              className={`generate-btn ${loading ? 'loading' : ''}`}
              onClick={handleGenerate}
              disabled={!canGenerate || loading}
            >
              {loading ? 'Working on it...' : 'Generate Resume + Cover Letter →'}
            </button>
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
                <div className="result-content" dangerouslySetInnerHTML={{__html: renderMarkdown(results.resume)}} />
              </div>

              <div className="result-section">
                <div className="result-section-title">Cover Letter</div>
                <div className="result-content" dangerouslySetInnerHTML={{__html: renderMarkdown(results.coverLetter)}} />
              </div>

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

            <button className="reset-btn" onClick={handleReset}>
              ← Start over with a new job
            </button>
          </>
        )}
      </div>

      <div className="how-section">
        <div className="how-title">How it works</div>
        <div className="how-items">
          <div className="how-item">
            <div className="how-num">01</div>
            <div className="how-label">Upload your resume or LinkedIn PDF — your full career in one file</div>
          </div>
          <div className="how-item">
            <div className="how-num">02</div>
            <div className="how-label">Paste the job description — any role, any industry</div>
          </div>
          <div className="how-item">
            <div className="how-num">03</div>
            <div className="how-label">Get a resume and cover letter built for that exact job</div>
          </div>
          <div className="how-item">
            <div className="how-num">04</div>
            <div className="how-label">Download in the format that fits. Nothing is stored. Ever.</div>
          </div>
        </div>
      </div>

      <footer className="footer">
        <p>© 2026 JobsUncle.ai · Your documents are never stored · Built with AI</p>
      </footer>
    </>
  )
}
