import { useState, useEffect, useRef, useCallback } from 'react'

// ── SFX ──────────────────────────────────────────────────────────────────────
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

function playPop() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    ;[0, 0.07, 0.14].forEach((offset, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'triangle'
      const freq = 520 + i * 140
      osc.frequency.setValueAtTime(freq, ctx.currentTime + offset)
      osc.frequency.exponentialRampToValueAtTime(freq * 1.6, ctx.currentTime + offset + 0.08)
      gain.gain.setValueAtTime(0.18, ctx.currentTime + offset)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.18)
      osc.start(ctx.currentTime + offset)
      osc.stop(ctx.currentTime + offset + 0.2)
    })
  } catch(e) {}
}

// ── CONFETTI ─────────────────────────────────────────────────────────────────
const COLORS = ['#00D1FF','#ff4d4d','#ffd700','#7c3aed','#10b981','#f97316','#ec4899','#ffffff']

function useConfetti() {
  const canvasRef = useRef(null)
  const particlesRef = useRef([])
  const rafRef = useRef(null)

  const fire = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const cx = canvas.width / 2
    const cy = canvas.height / 2

    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 3 + Math.random() * 8
      particlesRef.current.push({
        x: cx + (Math.random() - 0.5) * 80,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        w: 6 + Math.random() * 6,
        h: 4 + Math.random() * 4,
        rot: Math.random() * 360,
        rotV: (Math.random() - 0.5) * 14,
        life: 1,
        decay: 0.003 + Math.random() * 0.002,
        shape: Math.random() > 0.4 ? 'rect' : 'circle',
      })
    }

    if (!rafRef.current) tickLoop()
  }, [])

  function tickLoop() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    particlesRef.current = particlesRef.current.filter(p => p.life > 0)

    for (const p of particlesRef.current) {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.28
      p.vx *= 0.98
      p.rot += p.rotV
      p.life -= p.decay

      ctx.save()
      ctx.globalAlpha = Math.max(0, p.life)
      ctx.translate(p.x, p.y)
      ctx.rotate((p.rot * Math.PI) / 180)
      ctx.fillStyle = p.color
      if (p.shape === 'rect') {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      } else {
        ctx.beginPath()
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    if (particlesRef.current.length > 0) {
      rafRef.current = requestAnimationFrame(tickLoop)
    } else {
      rafRef.current = null
    }
  }

  return { canvasRef, fire }
}

// ── ANIMATED COUNTER ─────────────────────────────────────────────────────────
function AnimatedCounter({ value, onRollComplete }) {
  const [display, setDisplay] = useState(null)
  const prevRef = useRef(null)

  useEffect(() => {
    if (!value) return
    const prev = prevRef.current
    prevRef.current = value
    const start = prev !== null ? prev : value - 8
    let current = start

    const timer = setInterval(() => {
      current += 1
      setDisplay(current)
      if (current >= value) {
        clearInterval(timer)
        onRollComplete?.()
      }
    }, 120)
    return () => clearInterval(timer)
  }, [value])

  return <>{display?.toLocaleString()}</>
}

// ── HEADER ───────────────────────────────────────────────────────────────────
export default function Header({ isPaid = false, accessLevel = null, onSignIn, onManage, onContact, resumeCount = null, onLogoClick = null }) {
  const { canvasRef, fire } = useConfetti()
  const [burst, setBurst] = useState(false)

  const handleRollComplete = useCallback(() => {
    try { new Audio('/tada.mp3').play() } catch(e) {}
    fire()
    setBurst(true)
    setTimeout(() => setBurst(false), 700)
  }, [fire])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  return (
    <header style={{
      position: 'relative',
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      padding: '0 32px',
      height: '56px',
      borderBottom: '1px solid #1e1e1e',
      background: '#0d0d0d',
      zIndex: 100,
    }}>

      {/* CONFETTI CANVAS */}
      <canvas ref={canvasRef} style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 200,
      }} />

      {/* LEFT — logo + nav */}
      <nav style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <img
          src="/jobsuncleaiblack.png"
          alt="JobsUncle.ai"
          onClick={onLogoClick || undefined}
          style={{ height: '42px', width: 'auto', objectFit: 'contain', cursor: onLogoClick ? 'pointer' : 'default', marginRight: '8px', flexShrink: 0 }}
        />
        <a href="/about" style={navLink}>Our Story</a>
        <a href="/example" style={navLink}>See an example</a>
        <a href="/faq" style={navLink}>FAQ</a>
        <a href="/pricing" style={navLink}>Pricing</a>
        {onContact && (
          <a href="#contact" style={navLink} onClick={e => { e.preventDefault(); onContact() }}>Contact</a>
        )}
      </nav>

      {/* CENTER — counter pill */}
      {resumeCount !== null ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: burst ? 'rgba(0,209,255,0.1)' : 'rgba(255,255,255,0.04)',
          border: `1.5px solid ${burst ? '#00D1FF' : '#333'}`,
          borderRadius: '999px',
          padding: '6px 18px',
          transition: 'border-color 0.3s, background 0.3s',
          cursor: 'default',
          userSelect: 'none',
        }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#00D1FF', display: 'inline-block', flexShrink: 0,
            animation: 'pulse-dot 1.8s ease-in-out infinite',
          }} />
          <span style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 800,
            fontSize: '1rem', color: '#ffffff', letterSpacing: '-0.02em',
            minWidth: '3.4ch', textAlign: 'right',
          }}>
            <AnimatedCounter value={resumeCount} onRollComplete={handleRollComplete} />
          </span>
          <span style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 500,
            fontSize: '0.78rem', color: '#777', whiteSpace: 'nowrap',
          }}>
            resumes tailored
          </span>
        </div>
      ) : <div />}

      {/* RIGHT — badge + manage/signin */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end' }}>
        {accessLevel === 'pro_plus' && <span style={badge('#00D1FF', '#000')}>Pro+ Active</span>}
        {accessLevel === 'paid' && <span style={badge('#f59e0b', '#000')}>Pro Active</span>}
        {isPaid && onManage
          ? <a onClick={onManage} style={rightLink}>Manage Subscription</a>
          : !isPaid && onSignIn
          ? <a href="#signin" style={rightLink} onClick={e => { e.preventDefault(); onSignIn() }}>Sign In</a>
          : null}
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.35; transform: scale(0.65); }
        }
        @media (max-width: 860px) {
          header nav a { display: none !important; }
          header {
            grid-template-columns: auto 1fr auto !important;
            padding: 0 16px !important;
          }
          header nav img {
            height: 44px !important;
            margin-right: 0 !important;
          }
          header nav { gap: 0 !important; }
        }
      `}</style>
    </header>
  )
}

// ── STYLE TOKENS ─────────────────────────────────────────────────────────────
const navLink = {
  fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', fontWeight: 500,
  color: '#aaa', textDecoration: 'none', whiteSpace: 'nowrap',
  transition: 'color 0.15s',
}

const rightLink = {
  fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', fontWeight: 600,
  color: '#aaa', textDecoration: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
}

const badge = (bg, color) => ({
  background: bg, color,
  fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', fontWeight: 800,
  letterSpacing: '0.06em', padding: '3px 12px', borderRadius: '999px',
  whiteSpace: 'nowrap',
})
