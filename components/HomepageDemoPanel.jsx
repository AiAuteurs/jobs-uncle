import { useState, useRef } from "react";

const CYAN = "#00cdd7";
const WHITE = "#ffffff";
const MUTED = "rgba(255,255,255,0.42)";

const TABS = [
  { id: "resume",    label: "📄 Resume" },
  { id: "ats",       label: "🎯 ATS Match · 90%" },
  { id: "recruiter", label: "🔍 Recruiter Notes" },
  { id: "cover",     label: "✉️ Cover Letter" },
  { id: "dm",        label: "💬 Hiring Manager DM" },
];

// ── content panes ────────────────────────────────────────────────

function ResumePane() {
  return (
    <div>
      <Label>RESUME — EXAMPLE OUTPUT</Label>
      <h3 style={{ fontFamily: "Georgia,serif", fontSize: 19, fontWeight: 700, color: WHITE, marginBottom: 3 }}>Michael Torres</h3>
      <p style={{ fontSize: 14, color: WHITE, marginBottom: 3 }}>VP of Product — Payments &amp; Growth</p>
      <p style={{ fontSize: 12, color: MUTED, marginBottom: 24 }}>michael.torres@example.com · (415) 555-0182 · San Francisco, CA</p>

      <SecTitle>Summary</SecTitle>
      <Body>Product executive leading 38-person PM organization with deep expertise scaling payment platforms from early traction to global distribution. Built $340M ARR products at Square and delivered $2.1B in incremental revenue at Stripe. Known for turning complex financial infrastructure into products that millions of businesses actually use.</Body>

      <SecTitle>Global Payments &amp; Multi-Market Operations</SecTitle>
      <Bullets items={[
        "Shipped real-time payouts across 47 markets at Stripe — reduced settlement from T+2 to instant for 2.3M merchants",
        "Increased global checkout completion from 67% to 81% across 22 markets at PayPal — drove $180M in incremental GMV",
        "Launched Stripe for Platforms with 4,200 enterprise onboards in year one — now core to 31% of Stripe's ARR",
        "Built QuickBooks Payments mobile solution with 200,000 activations annually at Intuit",
      ]} />

      <SecTitle>Product Leadership &amp; Team Building</SecTitle>
      <Bullets items={[
        "Led product organization of 38 PMs across merchant, payments, and platform pods at Stripe — owned executive OKR process and presented quarterly results directly to board",
        "Built and scaled team of 14 PMs at Square — reduced seller onboarding time 61%, largest activation driver in 2018",
        "Selected for Google's elite APM rotational program — fewer than 30 accepted globally per cohort",
      ]} />

      <SecTitle>Experimentation &amp; Growth</SecTitle>
      <Bullets items={[
        "Ran 90+ A/B experiments annually across 22 markets at PayPal with direct revenue outcomes",
        "Shipped one-touch checkout on iOS — 40M activations in first 6 months",
        "Built invoice and recurring payments from $0 to $340M ARR over 4 years at Square",
      ]} />

      <SecTitle>Skills</SecTitle>
      <Body style={{ lineHeight: 1.9 }}>Product Strategy · P&amp;L Ownership · OKRs · Payments Infrastructure · Platform Products · Go-to-Market · A/B Testing · Multi-Market Operations · Executive Communication · Board Reporting · SQL · Figma · Amplitude · Jira</Body>

      <SecTitle>Employment History</SecTitle>
      {[
        ["Stripe",  "VP of Product",                    "Mar 2020 – Present"],
        ["Square",  "Director of Product, Seller Tools", "Jan 2016 – Feb 2020"],
        ["PayPal",  "Senior Product Manager, Checkout",  "Aug 2013 – Dec 2015"],
        ["Intuit",  "Product Manager",                   "Jun 2011 – Jul 2013"],
        ["Google",  "Associate Product Manager",         "Jul 2009 – May 2011"],
      ].map(([co, role, dates]) => (
        <div key={co} style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: WHITE, minWidth: 52 }}>{co}</span>
          <span style={{ fontSize: 13, color: WHITE }}>{role}</span>
          <span style={{ fontSize: 12, color: MUTED, marginLeft: "auto" }}>{dates}</span>
        </div>
      ))}

      <SecTitle>Education</SecTitle>
      <Body>B.S. Computer Science · Stanford University · 2009</Body>
    </div>
  );
}

function ATSPane() {
  const found    = ["product","payments","growth","fintech","businesses","payment","across","markets","infrastructure","outcomes","checkout","conversion","merchant","platform","directly","products","experimentation","managing"];
  const missing  = ["annual","growing","settlement","integrations","present","quarterly","roadmap","strategy","weekly","activation","partner","compliance","velocity","results","executive"];
  return (
    <div>
      <Label>ATS KEYWORD MATCH — EXAMPLE OUTPUT</Label>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 56, fontWeight: 800, color: CYAN, lineHeight: 1 }}>90%</div>
        <p style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>resume match score against job description</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 28, marginTop: 16 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#4ade80" }}>30</div>
            <div style={{ fontSize: 11, color: MUTED }}>keywords matched</div>
          </div>
          <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#f87171" }}>4</div>
            <div style={{ fontSize: 11, color: MUTED }}>keywords missing</div>
          </div>
        </div>
      </div>
      <KwGroup label={`✓ Keywords found (${found.length})`} color="#4ade80" bg="rgba(74,222,128,0.08)" border="rgba(74,222,128,0.2)" words={found} />
      <KwGroup label={`✗ Missing keywords (${missing.length})`} color="#f87171" bg="rgba(248,113,113,0.08)" border="rgba(248,113,113,0.2)" words={missing} />
    </div>
  );
}

function RecruiterPane() {
  const gaps = [
    { gap: "Missing explicit mention of team leadership scale — JD wants 12+ PM management experience but current role shows 38 PMs which exceeds requirement but could be buried", fix: 'Lead summary with "Product executive leading 38-person PM organization" to immediately demonstrate scale' },
    { gap: 'ARR/revenue ownership could be stronger — has $2.1B incremental revenue but JD emphasizes "$100M+ ARR outcomes" language', fix: 'Reframe Stripe bullet to "Delivered $2.1B in incremental revenue through pod initiatives" and add Square\'s "$340M ARR" achievement to summary' },
    { gap: "Board presentation experience mentioned but not prominent — JD emphasizes quarterly board reporting as key responsibility", fix: 'Move "presented quarterly to board" language higher and add specific context about executive communication' },
    { gap: 'Multi-market/multi-currency experience is buried — JD calls this "strong plus" but "47 markets" at Stripe needs more prominence', fix: 'Create competency block highlighting "Global Payments & Multi-Market Operations" with the 47-market expansion and 22-market PayPal work' },
  ];
  return (
    <div>
      <Label>RECRUITER ANALYSIS — EXAMPLE OUTPUT</Label>
      <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.65, marginBottom: 24 }}>ATS compatibility check plus honest gaps a recruiter would flag — and how to own them.</p>
      {gaps.map((item, i) => (
        <div key={i} style={{ borderLeft: "2px solid rgba(255,255,255,0.1)", paddingLeft: 16, marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: WHITE, lineHeight: 1.65, marginBottom: 6 }}>• {item.gap}</p>
          <p style={{ fontSize: 13, color: CYAN, lineHeight: 1.6 }}>Fix: {item.fix}</p>
        </div>
      ))}
    </div>
  );
}

function CoverPane() {
  return (
    <div>
      <Label>COVER LETTER — EXAMPLE OUTPUT</Label>
      <p style={{ fontSize: 12, color: MUTED, marginBottom: 20 }}>Michael Torres · michael.torres@example.com · (415) 555-0182</p>
      {[
        "Acme Financial's approach to building infrastructure that small businesses depend on to survive resonates deeply. I've spent my career at Stripe, Square, and PayPal turning complex payment systems into products that millions of merchants actually use — exactly what your 600,000 small business customers need.",
        "Three things from my background align directly with this role. First, I've built and led large PM organizations — currently managing 38 PMs across merchant, payments, and platform at Stripe, with direct experience scaling teams through rapid growth phases. Second, I've shipped payment products that drive meaningful revenue outcomes: built Square's invoice product from $0 to $340M ARR, launched Stripe for Platforms (now 31% of ARR), and delivered $2.1B in incremental revenue. Third, I've operated across global markets — shipped real-time payouts in 47 countries and increased checkout conversion across 22 markets at PayPal.",
        "The opportunity to own payments and growth for a Series C fintech helping small businesses manage their financial operations is exactly the type of infrastructure challenge I'm built for. I know what it means to own outcomes, not just ship features.",
      ].map((p, i) => (
        <p key={i} style={{ fontFamily: "Georgia,serif", fontSize: 14, lineHeight: 1.85, color: WHITE, marginBottom: 18 }}>{p}</p>
      ))}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 20, textAlign: "center" }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 40, fontWeight: 800, color: "#f59e0b", lineHeight: 1 }}>50%</div>
        <p style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>cover letter ATS match · Pro+ repairs and rewrites to 90%+</p>
      </div>
    </div>
  );
}

function DMPane() {
  const [copied, setCopied] = useState(false);
  const text = "I led the product team that launched Stripe for Platforms — 4,200 enterprise clients in year one, now driving 31% of Stripe's ARR. Acme's approach to building financial infrastructure for small businesses who can't afford CFOs is exactly the type of outcome-driven product challenge I've been solving. Currently managing 38 PMs across payments and platform at Stripe, but the opportunity to own the full payments and growth surface at a Series C fintech is compelling. Worth a conversation about your VP Product role?";
  return (
    <div>
      <Label>HIRING MANAGER DM — EXAMPLE OUTPUT</Label>
      <p style={{ fontSize: 13, color: MUTED, marginBottom: 20, lineHeight: 1.6 }}>Skip the line. Send this directly to the hiring manager on LinkedIn or email.</p>
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 22, marginBottom: 20 }}>
        <p style={{ fontFamily: "Georgia,serif", fontSize: 15, lineHeight: 1.9, color: WHITE }}>{text}</p>
      </div>
      <button
        onClick={() => { navigator.clipboard?.writeText(text).catch(()=>{}); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        style={{ background: "transparent", border: `1px solid ${copied ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.22)"}`, borderRadius: 50, padding: "9px 20px", fontSize: 13, color: copied ? "#4ade80" : WHITE, cursor: "pointer", fontFamily: "system-ui,sans-serif", transition: "all 0.2s" }}
      >
        {copied ? "✓ Copied" : "Copy DM"}
      </button>
      <div style={{ marginTop: 24, background: "rgba(0,205,215,0.05)", border: "1px solid rgba(0,205,215,0.1)", borderRadius: 10, padding: 16 }}>
        <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7 }}><span style={{ color: CYAN, fontWeight: 600 }}>Pro tip: </span>Find the hiring manager on LinkedIn. Send as a connection note or follow-up after applying. Response rate is 3–5× higher than applying cold.</p>
      </div>
    </div>
  );
}

// ── small helpers ────────────────────────────────────────────────

const Label = ({ children }) => (
  <p style={{ fontSize: 10, letterSpacing: "0.12em", color: MUTED, marginBottom: 16, fontFamily: "system-ui,sans-serif" }}>{children}</p>
);
const SecTitle = ({ children }) => (
  <h4 style={{ fontFamily: "Georgia,serif", fontSize: 14, fontWeight: 700, color: WHITE, margin: "20px 0 8px" }}>{children}</h4>
);
const Body = ({ children, style }) => (
  <p style={{ fontSize: 13, color: WHITE, lineHeight: 1.75, fontFamily: "system-ui,sans-serif", ...style }}>{children}</p>
);
const Bullets = ({ items }) => (
  <div>
    {items.map((item, i) => (
      <div key={i} style={{ fontSize: 13, color: WHITE, lineHeight: 1.7, paddingLeft: 14, position: "relative", marginBottom: 4, fontFamily: "system-ui,sans-serif" }}>
        <span style={{ position: "absolute", left: 0, color: MUTED }}>•</span>
        {item}
      </div>
    ))}
  </div>
);
const KwGroup = ({ label, color, bg, border, words }) => (
  <div style={{ marginBottom: 18 }}>
    <p style={{ fontSize: 12, fontWeight: 600, color, marginBottom: 8, fontFamily: "system-ui,sans-serif" }}>{label}</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {words.map(w => (
        <span key={w} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 50, padding: "3px 11px", fontSize: 11, color, fontFamily: "system-ui,sans-serif" }}>{w}</span>
      ))}
    </div>
  </div>
);

const PANES = { resume: ResumePane, ats: ATSPane, recruiter: RecruiterPane, cover: CoverPane, dm: DMPane };

// ── main component ───────────────────────────────────────────────

export default function HomepageDemoPanel() {
  const [active, setActive] = useState("resume");
  const scrollRef = useRef(null);

  const switchTab = (id) => {
    setActive(id);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const Pane = PANES[active];

  return (
    <section style={{ padding: "72px 24px", maxWidth: 740, margin: "0 auto" }}>

      {/* Eyebrow + headline */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <span style={{ fontSize: 11, letterSpacing: "0.14em", color: CYAN, fontWeight: 600, fontFamily: "system-ui,sans-serif", textTransform: "uppercase" }}>
          Example output · See what Jobsuncle generates
        </span>
        <h2 style={{ fontFamily: "Georgia,serif", fontSize: "clamp(1.7rem,3.5vw,2.3rem)", fontWeight: 800, color: WHITE, lineHeight: 1.2, margin: "12px 0 10px" }}>
          The full picture.<br />In one place.
        </h2>
        <p style={{ fontSize: 14, color: MUTED, fontFamily: "system-ui,sans-serif", lineHeight: 1.6 }}>
          Scroll through every document Jobsuncle produces — resume to hiring manager DM.
        </p>
      </div>

      {/* Privacy disclaimer */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>🔒</span>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.65, fontFamily: "system-ui,sans-serif" }}>
          <strong style={{ color: "rgba(251,191,36,0.9)", fontWeight: 600 }}>Privacy note: </strong>
          "Michael Torres" is a fictional candidate created to demonstrate Jobsuncle's output. No real resume or personal data was used. All details — name, employer, metrics — are illustrative only.
        </p>
      </div>

      {/* Panel */}
      <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden" }}>

        {/* Tabs — horizontally scrollable on mobile */}
        <div style={{ display: "flex", overflowX: "auto", borderBottom: "1px solid rgba(255,255,255,0.07)", scrollbarWidth: "none" }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              style={{
                flexShrink: 0,
                padding: "14px 18px",
                fontSize: 12,
                color: active === tab.id ? CYAN : MUTED,
                fontWeight: active === tab.id ? 600 : 400,
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${active === tab.id ? CYAN : "transparent"}`,
                cursor: "pointer",
                fontFamily: "system-ui,sans-serif",
                whiteSpace: "nowrap",
                marginBottom: -1,
                transition: "color 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable content — fixed height */}
        <div
          ref={scrollRef}
          style={{
            height: 400,
            overflowY: "auto",
            padding: 28,
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.12) transparent",
          }}
        >
          <Pane />
        </div>

        {/* Scroll nudge */}
        <div style={{ textAlign: "center", padding: "8px 0 10px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "system-ui,sans-serif" }}>
            ↑ scroll within panel to read more
          </span>
        </div>
      </div>

      {/* Stat pills */}
      <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
        {[["90%","ATS match"],["5","documents"],["30s","start to finish"]].map(([v, l]) => (
          <div key={l} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 50, padding: "8px 16px", display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: CYAN, fontFamily: "Georgia,serif" }}>{v}</span>
            <span style={{ fontSize: 11, color: MUTED, fontFamily: "system-ui,sans-serif" }}>{l}</span>
          </div>
        ))}
      </div>

    </section>
  );
}
