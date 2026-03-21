import { useState, useEffect } from 'react'

function playTick() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.06)
    gain.gain.setValueAtTime(0.07, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.18)
  } catch(e) {}
}

function AnimatedCounter({ value }) {
  const [display, setDisplay] = useState(value)
  useEffect(() => {
    if (!value) return
    let current = value - 8
    const timer = setInterval(() => {
      current += 1
      setDisplay(current)
      playTick()
      if (current >= value) clearInterval(timer)
    }, 120)
    return () => clearInterval(timer)
  }, [value])
  return <>{display.toLocaleString()}</>
}

export default function Header({ isPaid = false, accessLevel = null, onSignIn, onManage, onContact, resumeCount = null }) {
  return (
    <header className="header">
      <div className="header-left">
        <a href="/" className="logo">
          <img src="/jobsuncle-logo.png" alt="JobsUncle.ai" className="logo-full" />
        </a>
        <nav className="header-nav">
          <a href="/about" className="header-nav-link">Our Story</a>
          <a href="/example" className="header-nav-link">See an example</a>
          <a href="/faq" className="header-nav-link">FAQ</a>
          <a href="/pricing" className="header-nav-link">Pricing</a>
          {onContact && <a href="#contact" className="header-nav-link" onClick={e => { e.preventDefault(); onContact() }}>Contact</a>}
        </nav>
      </div>

      <div className="header-right">
        {resumeCount !== null && (
          <div className="header-live-count">
            <span className="header-live-dot" />
            <span className="header-live-num"><AnimatedCounter value={resumeCount} /></span>
            <span className="header-live-label">resumes tailored</span>
          </div>
        )}
        {accessLevel === 'pro_plus' && <span className="header-badge header-badge--plus">Pro+ Active</span>}
        {accessLevel === 'paid' && <span className="header-badge header-badge--pro">Pro Active</span>}
        {isPaid && onManage
          ? <a onClick={onManage} className="header-link" style={{cursor:'pointer'}}>Manage Subscription</a>
          : !isPaid && onSignIn
          ? <a href="#signin" className="header-link" onClick={e => { e.preventDefault(); onSignIn() }}>Sign In</a>
          : null}
      </div>
    </header>
  )
}
