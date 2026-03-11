import { useState, useRef, useCallback } from 'react'
import Head from 'next/head'

export default function Home() {
  const [pdfFile, setPdfFile] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [dragover, setDragover] = useState(false)
  const fileInputRef = useRef(null)

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
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const downloadTxt = (content, label) => {
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

  const downloadPdf = (content, label) => {
    const filename = results?.fileBaseName
      ? `${results.fileBaseName}_${label}`
      : label
    const win = window.open('', '_blank')
    win.document.write(`<!DOCTYPE html><html><head>
      <title>${filename}</title>
      <style>
        body { font-family: Georgia, serif; font-size: 12pt; line-height: 1.6; max-width: 680px; margin: 40px auto; padding: 0 20px; color: #111; }
        pre { white-space: pre-wrap; font-family: inherit; font-size: inherit; }
      </style>
    </head><body><pre>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
    <script>window.onload = () => { window.print(); }<\/script>
    </body></html>`)
    win.document.close()
  }

  const handleReset = () => {
    setPdfFile(null)
    setJobDescription('')
    setResults(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const canGenerate = pdfFile && jobDescription.trim().length > 50

  return (
    <>
      <Head>
        <title>Jobs Uncle — Resumes That Actually Fit</title>
        <meta name="description" content="Upload your LinkedIn PDF, paste a job description, get a bespoke resume and cover letter in under a minute." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🤵</text></svg>" />
      </Head>

      <header className="header">
        <div className="logo">
          <span className="logo-text">Jobs Uncle</span>
          <span className="logo-badge">Beta</span>
        </div>
        <span className="header-tagline">Everyone deserves an uncle in the business</span>
      </header>

      <div className="hero">
        <p className="hero-eyebrow">AI-Powered Resume Intelligence</p>
        <h1>Your resume, <em>tailored</em><br />to every job.</h1>
        <p className="hero-sub">
          Upload your resume or LinkedIn profile. Paste a job description.
          Get a bespoke resume and cover letter — built for that specific role — in under 60 seconds.
        </p>
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
                      <div className="upload-icon">📄</div>
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
                <div className="result-content">{results.resume}</div>
              </div>

              <div className="result-section">
                <div className="result-section-title">Cover Letter</div>
                <div className="result-content">{results.coverLetter}</div>
              </div>

              <div className="download-row">
                <div className="download-group">
                  <div className="download-label">Resume</div>
                  <div className="download-btns">
                    <button className="download-btn" onClick={() => downloadTxt(results.resume, 'Resume')}>↓ TXT</button>
                    <button className="download-btn secondary" onClick={() => downloadPdf(results.resume, 'Resume')}>↓ PDF</button>
                  </div>
                </div>
                <div className="download-group">
                  <div className="download-label">Cover Letter</div>
                  <div className="download-btns">
                    <button className="download-btn" onClick={() => downloadTxt(results.coverLetter, 'Cover_Letter')}>↓ TXT</button>
                    <button className="download-btn secondary" onClick={() => downloadPdf(results.coverLetter, 'Cover_Letter')}>↓ PDF</button>
                  </div>
                </div>
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
            <div className="how-label">Download, refine, send. Nothing is stored. Ever.</div>
          </div>
        </div>
      </div>

      <footer className="footer">
        <p>© 2026 Jobs Uncle · Your documents are never stored · Built with AI</p>
      </footer>
    </>
  )
}
