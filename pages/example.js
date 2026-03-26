import Head from 'next/head'
import Header from '../components/Header'
import { useState } from 'react'

const RESUME = `Riley Okafor
Head of Human Experience
riley.okafor@mailbox.io · (555) 203-7841 · linkedin.com/in/rileyo · Portland, OR

Summary
Culture strategist who designed onboarding systems reducing time-to-productivity by 34% at high-growth company. Built belonging and inclusion programs across distributed teams spanning 9 time zones. Known for translating ambiguous culture mandates into measurable workflow improvements.

Distributed Team Experience & Integration
• Designed company-wide onboarding program reducing time-to-productivity by 34% across 6 departments — Meridian Works
• Partnered with CEO to design annual offsite for 140-person distributed team across 9 time zones — seamless integration across regions
• Built peer mentorship system adopted by 89% of new hires in first quarter, creating belonging pathways for remote workforce
• Created journey mapping frameworks deployed across 14 client engagements for distributed professional services teams — Bright Arc Consulting

Executive Facilitation & Change Management
• Led cross-functional facilitation for 3 organizational restructures affecting 200+ employees at fast-scaling SaaS company
• Facilitated leadership retreats for C-suite teams at 8 mid-market companies, designing strategic alignment sessions
• Managed 3 junior facilitators while growing consulting practice revenue 40% in 18 months
• Built coalition of 40 community partners to support large-scale program transitions — Roosevelt Unified School District

Skills
Facilitation & Change Management: Cross-functional facilitation, executive retreat design, organizational restructure leadership
Culture Systems: Onboarding workflow design, peer mentorship programs, pulse survey design, OKR alignment
Measurement & Analysis: Culture metrics, belonging signals, leadership briefings, journey mapping
Software Integration: Figma, Notion, Lattice, Miro

Employment History
Meridian Works | Head of Culture & Experience | 2021–Present
Bright Arc Consulting | Experience Design Lead | 2018–2021
Roosevelt Unified School District | Program Coordinator | 2015–2018

Education
Education details available upon request`

const COVER_LETTER = `Riley Okafor · riley.okafor@mailbox.io · (555) 203-7841

Vela's approach to culture as infrastructure, not perk, hits exactly right. Too many companies treat human experience as an afterthought — you're building it as a product. That's the difference between culture that scales and culture that breaks.

I've designed onboarding systems that cut time-to-productivity by 34% at a high-growth company, and I've run offsites for 140-person distributed teams across 9 time zones. At Bright Arc, I built culture measurement frameworks that gave leadership real signals instead of vanity metrics — the kind that actually drive policy changes, not eye rolls. I know the difference between facilitation that lands and facilitation that wastes everyone's time. This work is deeply systems-driven, but it's never cold about it.

The direct CEO reporting structure tells me this role has real influence. I'm ready to own the experience of working at Vela from day one.`

const DM = `I built onboarding systems that reduced time-to-productivity by 34% at a distributed company, and I've facilitated leadership retreats for C-suite teams at 8 companies. Your Head of Human Experience role caught my attention because you're treating culture as infrastructure, not a perk. I've spent years designing the exact systems Vela needs — from 90-day integration workflows to pulse survey programs that drive actual policy changes. Worth a conversation about how this translates to your 180-person distributed team?`

const RECRUITER_NOTES = [
  {
    flag: 'Missing key requirement',
    detail: '"Distributed company" experience isn\'t explicitly called out despite having it at Meridian Works.',
    fix: 'Lead with "distributed team" language in summary and highlight the "140-person distributed team across 9 time zones" work prominently.',
  },
  {
    flag: 'Weak positioning for executive facilitation',
    detail: '"C-suite teams at 8 mid-market companies" is buried and undersold.',
    fix: 'Create dedicated competency block for executive facilitation and expand this credential with more specifics.',
  },
  {
    flag: 'ATS keyword gaps',
    detail: '"Workflow," "software," "integration," and "inclusion" appear in JD but missing from resume.',
    fix: 'Work "workflow" into onboarding systems description, add "inclusion" to belonging programs work, reference "software" integration naturally.',
  },
  {
    flag: 'Missing psychological safety credential',
    detail: 'JD specifically calls this out but resume does not mention it.',
    fix: 'Reframe "belonging programs" or culture work to include psychological safety language if truthful to the actual work done.',
  },
  {
    flag: 'Metrics could be stronger',
    detail: 'Some good numbers but need more impact-focused framing.',
    fix: 'Reframe "89% adoption" and "34% productivity improvement" as business outcomes, not just participation rates.',
  },
]

const ATS_MATCHED = ['workflow', 'software', 'distributed', 'design', 'culture', 'product', 'systems', 'onboarding', 'integration', 'department', 'leadership', 'inclusion', 'change', 'facilitation', 'management']

export default function ExamplePage() {
  const [dmCopied, setDmCopied] = useState(false)

  const copyDm = () => {
    navigator.clipboard.writeText(DM).then(() => {
      setDmCopied(true)
      setTimeout(() => setDmCopied(false), 2000)
    })
  }

  return (
    <>
      <Head>
        <title>Example Output — JobsUncle.ai</title>
        <meta name="description" content="See real JobsUncle.ai output: tailored resume, cover letter, ATS score, and hiring manager DM — all from one upload." />
        <link rel="icon" type="image/png" sizes="32x32" href="/jobsuncle-favicon-32.png?v=2" />
        <link rel="icon" type="image/png" sizes="192x192" href="/jobsuncle-favicon.png?v=2" />
        <link rel="apple-touch-icon" sizes="192x192" href="/jobsuncle-favicon.png?v=2" />
      </Head>

      <Header />

      <style>{`
        * { box-sizing: border-box; }
        .ex-wrap { max-width: 1240px; margin: 0 auto; padding: 52px 32px 100px; }
        .ex-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(0,209,255,0.08); border: 1px solid rgba(0,209,255,0.2);
          border-radius: 999px; padding: 5px 16px;
          font-size: 0.75rem; font-weight: 700; color: #00D1FF;
          font-family: Inter, sans-serif; letter-spacing: 0.06em; text-transform: uppercase;
          margin-bottom: 18px;
        }
        .ex-headline {
          font-family: Inter, sans-serif; font-weight: 900;
          font-size: clamp(1.7rem, 3vw, 2.6rem); color: #fff;
          margin: 0 0 10px; letter-spacing: -0.02em; line-height: 1.1;
        }
        .ex-sub { font-family: Inter, sans-serif; font-size: 0.92rem; color: #555; margin: 0 0 10px; }
        .ex-job-line { font-family: Inter, sans-serif; font-size: 0.78rem; color: #444; margin: 0 0 40px; }
        .ex-job-line strong { color: #777; }
        .quad-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .quad { background: #fff; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 8px 48px rgba(0,0,0,0.45); }
        .quad-head { display: flex; align-items: center; gap: 10px; padding: 13px 18px; border-bottom: 1px solid #f0f0f0; flex-shrink: 0; }
        .quad-label { font-family: Inter, sans-serif; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
        .quad-dot { width: 7px; height: 7px; border-radius: 50%; margin-left: auto; flex-shrink: 0; }
        .quad-body { padding: 20px; overflow-y: auto; flex: 1; max-height: 500px; }
        .quad-body::-webkit-scrollbar { width: 3px; }
        .quad-body::-webkit-scrollbar-thumb { background: #e0e0e0; border-radius: 4px; }
        .resume-text { font-family: Georgia, serif; font-size: 0.76rem; line-height: 1.8; color: #1a1a1a; white-space: pre-wrap; }
        .cover-text { font-family: Georgia, serif; font-size: 0.82rem; line-height: 1.85; color: #1a1a1a; white-space: pre-wrap; }
        .score-ring-wrap { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; }
        .score-bar { display: flex; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; margin-bottom: 18px; }
        .score-bar-cell { flex: 1; padding: 8px 4px; text-align: center; border-right: 1px solid #e5e7eb; }
        .score-bar-cell:last-child { border-right: none; }
        .kw-row { display: flex; flex-wrap: wrap; gap: 5px; }
        .kw-chip { font-size: 0.67rem; padding: 3px 9px; border-radius: 999px; background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.25); color: #059669; }
        .rec-item { padding: 13px 0; border-bottom: 1px solid #f3f4f6; }
        .rec-item:last-child { border-bottom: none; }
        .rec-flag { font-family: Inter, sans-serif; font-size: 0.7rem; font-weight: 800; color: #f59e0b; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 4px; }
        .rec-detail { font-family: Inter, sans-serif; font-size: 0.76rem; color: #555; margin-bottom: 4px; line-height: 1.5; }
        .rec-fix { font-family: Inter, sans-serif; font-size: 0.74rem; color: #10b981; line-height: 1.5; }
        .rec-fix::before { content: "Fix: "; font-weight: 700; }
        .dm-bubble { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px; margin-bottom: 14px; }
        .dm-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb; }
        .dm-li { width: 32px; height: 32px; border-radius: 6px; background: #0077b5; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 800; color: #fff; font-family: Inter, sans-serif; flex-shrink: 0; }
        .dm-text { font-family: Georgia, serif; font-size: 0.8rem; line-height: 1.8; color: #1a1a1a; }
        .dm-btn { background: #00D1FF; color: #000; font-family: Inter, sans-serif; font-weight: 700; font-size: 0.8rem; border: none; border-radius: 8px; padding: 9px 22px; cursor: pointer; transition: opacity 0.15s; }
        .dm-btn:hover { opacity: 0.85; }
        .dm-tip { font-family: Inter, sans-serif; font-size: 0.68rem; color: #999; margin-top: 10px; display: flex; align-items: center; gap: 5px; }
        .cta-strip { margin-top: 36px; background: rgba(0,209,255,0.04); border: 1px solid rgba(0,209,255,0.15); border-radius: 16px; padding: 30px 40px; display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
        .cta-title { font-family: Inter, sans-serif; font-weight: 800; font-size: 1.2rem; color: #fff; margin: 0 0 5px; }
        .cta-desc { font-family: Inter, sans-serif; font-size: 0.83rem; color: #555; margin: 0; }
        .cta-btn { background: #00D1FF; color: #000; font-family: Inter, sans-serif; font-weight: 800; font-size: 0.95rem; padding: 13px 34px; border-radius: 50px; text-decoration: none; white-space: nowrap; box-shadow: 0 0 30px rgba(0,209,255,0.25); flex-shrink: 0; transition: opacity 0.15s; }
        .cta-btn:hover { opacity: 0.88; }
        @media (max-width: 720px) {
          .ex-wrap { padding: 28px 16px 60px; }
          .quad-grid { grid-template-columns: 1fr; }
          .quad-body { max-height: 380px; }
          .cta-strip { flex-direction: column; align-items: flex-start; padding: 22px; }
        }
      `}</style>

      <div className="ex-wrap">

        <div className="ex-badge">Real output. No edits.</div>
        <h1 className="ex-headline">This is what JobsUncle builds you.</h1>
        <p className="ex-sub">One resume upload. One job description. Four tailored documents in 60 seconds.</p>
        <p className="ex-job-line">
          <strong>Candidate:</strong> Riley Okafor (fictional) &nbsp;&middot;&nbsp;
          <strong>Role:</strong> Head of Human Experience &nbsp;&middot;&nbsp;
          <strong>Company:</strong> Vela (fictional)
        </p>

        <div className="quad-grid">

          {/* TOP LEFT — RESUME */}
          <div className="quad">
            <div className="quad-head" style={{ borderLeft: '4px solid #00D1FF' }}>
              <span>📄</span>
              <span className="quad-label" style={{ color: '#00D1FF' }}>Tailored Resume</span>
              <span className="quad-dot" style={{ background: '#00D1FF' }} />
            </div>
            <div className="quad-body">
              <div className="resume-text">{RESUME}</div>
            </div>
          </div>

          {/* TOP RIGHT — COVER LETTER */}
          <div className="quad">
            <div className="quad-head" style={{ borderLeft: '4px solid #a78bfa' }}>
              <span>✉️</span>
              <span className="quad-label" style={{ color: '#a78bfa' }}>Cover Letter</span>
              <span className="quad-dot" style={{ background: '#a78bfa' }} />
            </div>
            <div className="quad-body">
              <div className="cover-text">{COVER_LETTER}</div>
            </div>
          </div>

          {/* BOTTOM LEFT — RECRUITER & ATS */}
          <div className="quad">
            <div className="quad-head" style={{ borderLeft: '4px solid #10b981' }}>
              <span>🎯</span>
              <span className="quad-label" style={{ color: '#10b981' }}>Recruiter & ATS Score</span>
              <span className="quad-dot" style={{ background: '#10b981' }} />
            </div>
            <div className="quad-body">
              <div className="score-ring-wrap">
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', flexShrink: 0, background: 'conic-gradient(#10b981 360deg, #e5e7eb 0deg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontWeight: 900, fontSize: '1rem', color: '#10b981', fontFamily: 'Inter, sans-serif' }}>100%</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '1rem', color: '#10b981' }}>Excellent</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#888', marginTop: '2px' }}>ATS keyword match</div>
                </div>
              </div>
              <div className="score-bar">
                {[['Poor','0–40',false],['Needs Work','41–54',false],['Good','55–74',false],['Strong','75–89',false],['Excellent','90+',true]].map(([l,r,active]) => (
                  <div key={l} className="score-bar-cell" style={{ background: active ? '#10b981' : 'transparent' }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 700, fontFamily: 'Inter, sans-serif', color: active ? '#fff' : '#bbb' }}>{l}</div>
                    <div style={{ fontSize: '0.54rem', fontFamily: 'Inter, sans-serif', color: active ? 'rgba(255,255,255,0.75)' : '#ddd' }}>{r}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.67rem', fontWeight: 800, color: '#10b981', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Matched Keywords ({ATS_MATCHED.length})</div>
                <div className="kw-row">
                  {ATS_MATCHED.map(k => <span key={k} className="kw-chip">✓ {k}</span>)}
                </div>
              </div>
              <div style={{ paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.67rem', fontWeight: 800, color: '#f59e0b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Recruiter Flags & Fixes</div>
                {RECRUITER_NOTES.map((n, i) => (
                  <div key={i} className="rec-item">
                    <div className="rec-flag">{n.flag}</div>
                    <div className="rec-detail">{n.detail}</div>
                    <div className="rec-fix">{n.fix}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* BOTTOM RIGHT — HIRING MANAGER DM */}
          <div className="quad">
            <div className="quad-head" style={{ borderLeft: '4px solid #f59e0b' }}>
              <span>💬</span>
              <span className="quad-label" style={{ color: '#f59e0b' }}>Hiring Manager DM</span>
              <span className="quad-dot" style={{ background: '#f59e0b' }} />
            </div>
            <div className="quad-body">
              <div className="dm-bubble">
                <div className="dm-header">
                  <div className="dm-li">in</div>
                  <div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', fontWeight: 700, color: '#1a1a1a' }}>LinkedIn Message</div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', color: '#999' }}>To: Hiring Manager, Vela</div>
                  </div>
                </div>
                <div className="dm-text">{DM}</div>
              </div>
              <button className="dm-btn" onClick={copyDm}>
                {dmCopied ? 'Copied!' : 'Copy DM →'}
              </button>
              <div className="dm-tip">
                <span>💡</span>
                <span>Written to the specific role and company. Not a template.</span>
              </div>
            </div>
          </div>

        </div>

        <div className="cta-strip">
          <div>
            <p className="cta-title">Your turn. Upload your resume.</p>
            <p className="cta-desc">Get all four documents tailored to your job in 60 seconds. No account needed.</p>
          </div>
          <a className="cta-btn" href="/">Get started free →</a>
        </div>

      </div>
    </>
  )
}
