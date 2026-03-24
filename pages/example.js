import Head from 'next/head'
import Link from 'next/link'

export default function Example() {
  return (
    <>
      <Head>
        <title>See an Example — JobsUncle.ai</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>

      <header style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <img src="/jobsuncle-logo.png" alt="JobsUncle.ai" style={{ width: 32, height: 'auto' }} onError={e => { e.target.src='/favicon-32x32.png' }} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>JobsUncle.ai</span>
          </Link>
          <a href="/about" className="header-nav-link" style={{ color: 'var(--text-soft)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, marginLeft: '1.5rem' }}>Our Story</a>
          <a href="/example" className="header-nav-link" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 700, marginLeft: '1.25rem', border: '1.5px solid var(--accent)', borderRadius: '20px', padding: '3px 10px' }}>See an example</a>
          <a href="/faq" className="header-nav-link" style={{ color: 'var(--text-soft)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, marginLeft: '1.25rem' }}>FAQ</a>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-soft)' }}>Resumes for the AI age.</span>
      </header>

      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '3rem 2rem 5rem' }}>

        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '1rem' }}>Real Output</p>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.15, marginBottom: '0.75rem' }}>Teacher applies to Google.</h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-soft)', lineHeight: 1.7, marginBottom: '2.5rem' }}>
          Camille Leon spent 8 years teaching middle school science in Oakland. She uploaded her resume, pasted the job description for <strong style={{ color: 'var(--ink)' }}>Instructional Design Lead at Google</strong>, and hit generate. Here is exactly what came back — in under 60 seconds.
        </p>

        {/* INPUT CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '3rem' }}>
          <div style={{ padding: '1.25rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '0.5rem' }}>Input: Resume</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>Camille Leon</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-soft)', marginTop: '3px', lineHeight: 1.5 }}>7th/8th Grade Science Teacher, Oakland USD · 8 years · IDEO U certified</div>
          </div>
          <div style={{ padding: '1.25rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '0.5rem' }}>Input: Job Description</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>Instructional Design Lead</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-soft)', marginTop: '3px', lineHeight: 1.5 }}>Google People Operations · Mountain View, CA</div>
          </div>
        </div>

        {/* RESUME */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)' }}>Output 1: Tailored Resume</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-soft)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '2px 10px' }}>Title reframed · Language matched to JD · Outcomes surfaced</div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '2rem', fontSize: '0.88rem', lineHeight: 1.8, color: 'var(--ink)', position: 'relative' }}>

            <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '2px' }}>Camille Leon</p>
            <p style={{ color: 'var(--text-soft)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>camille.leon@example.com ·  · linkedin.com/in/camille-example-only · San Francisco, CA</p>

            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.4rem' }}>Professional Summary</div>
            <p style={{ color: 'var(--text-soft)', marginBottom: '1.5rem' }}>Instructional designer with 8 years developing scalable learning experiences for diverse populations. Expert in data-driven curriculum design, learner experience optimization, and cross-functional collaboration. Proven track record building frameworks adopted across large organizations and using analytics to improve learning outcomes.</p>

            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.75rem' }}>Experience</div>

            <div style={{ position: 'relative', paddingLeft: '1rem', borderLeft: '2px solid rgba(99,102,241,0.15)', marginBottom: '1.25rem' }}>
              <div style={{ position: 'absolute', left: '-5px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }} />
              <p style={{ fontWeight: 700, marginBottom: '1px' }}>Lead Science Educator & Instructional Designer</p>
              <p style={{ color: 'var(--text-soft)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Roosevelt Middle School, Oakland USD · 2017–Present</p>
              <ul style={{ paddingLeft: '1.1rem', color: 'var(--text-soft)', margin: 0 }}>
                <li style={{ marginBottom: '5px' }}>Design and deliver blended learning programs for 140+ learners across 5 concurrent cohorts, achieving 34% above-average performance through outcome-mapped instructional design</li>
                <li style={{ marginBottom: '5px' }}>Built project-based learning framework adopted by 12 educators district-wide, reducing development time by 40% through modular architecture</li>
                <li style={{ marginBottom: '5px' }}>Analyze learner performance data weekly using dashboards and formative assessments, identifying gaps and optimizing content to improve at-risk learner outcomes by 28%</li>
                <li style={{ marginBottom: '5px' }}>Lead professional development for 30+ educators on differentiated instruction, designing session materials, assessments, and follow-up resources</li>
                <li style={{ marginBottom: '5px' }}>Produced 60+ video-based learning modules achieving 84% completion rate vs. 51% average through engagement-focused design</li>
              </ul>
            </div>

            <div style={{ position: 'relative', paddingLeft: '1rem', borderLeft: '2px solid rgba(99,102,241,0.15)', marginBottom: '1.25rem' }}>
              <div style={{ position: 'absolute', left: '-5px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }} />
              <p style={{ fontWeight: 700, marginBottom: '1px' }}>Curriculum Developer (Contract)</p>
              <p style={{ color: 'var(--text-soft)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>BrightPath Learning, Remote · 2020–2022</p>
              <ul style={{ paddingLeft: '1.1rem', color: 'var(--text-soft)', margin: 0 }}>
                <li style={{ marginBottom: '5px' }}>Designed 14 STEM learning modules deployed across 200+ schools nationally, mapping each to measurable outcomes and performance standards</li>
                <li style={{ marginBottom: '5px' }}>Collaborated with UX team to redesign learner experience, reducing drop-off rates by 22% through friction-mapping and iterative design</li>
                <li style={{ marginBottom: '5px' }}>Conducted usability testing with 40+ learners, synthesizing behavioral data into design recommendations adopted in next product release</li>
              </ul>
            </div>

            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.4rem', marginTop: '1rem' }}>Skills</div>
            <p style={{ color: 'var(--text-soft)', margin: 0 }}><strong>Instructional Design:</strong> ADDIE, backward design, blended learning, adult learning theory, UDL &nbsp;·&nbsp; <strong>Tools:</strong> Articulate Storyline, Figma, Loom, Google Workspace &nbsp;·&nbsp; <strong>Data:</strong> Learning analytics, A/B testing, formative/summative assessment design</p>

            {/* ANNOTATION */}
            <div style={{ marginTop: '1.5rem', padding: '0.75rem 1rem', background: 'rgba(99,102,241,0.06)', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600 }}>
              Note: Job title reframed from "Teacher" to "Lead Science Educator & Instructional Designer" — same role, language that reads in a corporate L&D context.
            </div>
          </div>
        </div>

        {/* COVER LETTER */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)' }}>Output 2: Cover Letter</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-soft)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '2px 10px' }}>Mirrors Google language · Connects classroom to corporate</div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '2rem', fontSize: '0.88rem', lineHeight: 1.85, color: 'var(--text-soft)' }}>
            <p style={{ marginBottom: '0.75rem' }}>Google's approach to learning — treating employee development as a product with real users, measurable outcomes, and continuous iteration — is exactly how I've approached education for the past eight years. Your focus on human-centered design in L&D aligns perfectly with my IDEO U training and classroom-forged expertise in building learning experiences that actually work.</p>
            <p style={{ marginBottom: '0.75rem' }}>My background combines the analytical rigor Google values with hands-on expertise scaling learning programs. At BrightPath Learning, I designed curriculum deployed across 200+ schools while collaborating with UX teams to optimize learner experience — reducing drop-off by 22% through data-driven iteration. In my teaching role, I built a project-based learning framework adopted district-wide and used weekly analytics to lift at-risk learner performance by 28%.</p>
            <p style={{ margin: 0 }}>I'm excited to bring this blend of instructional design expertise, data fluency, and scale experience to Google's global workforce. I'd love to discuss how my classroom-tested approach to learning design can contribute to your team's mission.</p>
          </div>
        </div>

        {/* RECRUITER ANALYSIS */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)' }}>Output 3: Recruiter & ATS Analysis</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-soft)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '2px 10px' }}>Honest gaps flagged · How to own them</div>
          </div>
          <div style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px', padding: '2rem', fontSize: '0.88rem', lineHeight: 1.8, color: 'var(--ink)' }}>
            <ul style={{ paddingLeft: '1.1rem', color: 'var(--text-soft)', margin: 0 }}>
              <li style={{ marginBottom: '8px' }}>No direct corporate L&D experience — all background is K-12 education, which doesn't translate 1:1 to adult corporate learners</li>
              <li style={{ marginBottom: '8px' }}>Contract work at BrightPath overlaps with full-time teaching role (2020–2022) — looks like a potential timeline issue, clarify in interviews</li>
              <li style={{ marginBottom: '8px' }}>Missing technology company experience entirely — Google moves fast and has unique culture/constraints</li>
              <li style={{ marginBottom: '8px' }}>Scale is impressive (200+ schools, 140+ learners) but corporate L&D operates differently than educational curriculum deployment</li>
              <li style={{ margin: 0 }}>Strong instructional design foundation and data-driven approach, but needs to better articulate how classroom expertise applies to enterprise learning</li>
            </ul>
          </div>
        </div>

        {/* HIRING MANAGER DM */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)' }}>Output 4: Hiring Manager DM</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-soft)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '2px 10px' }}>Skip the line · Send directly on LinkedIn or email</div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: '0 10px 10px 0', padding: '1.5rem 2rem', fontSize: '0.9rem', lineHeight: 1.8, color: 'var(--text-soft)', fontStyle: 'italic' }}>
            "Hi [Name], I saw the Instructional Design Lead opening and was immediately drawn to Google's product-minded approach to L&D. I've spent 8 years building data-driven learning experiences at scale — including curriculum deployed across 200+ schools and frameworks adopted district-wide. My background combines hands-on instructional design with the analytical approach Google values, plus IDEO U training in human-centered design. Would love to chat about how classroom-forged expertise in learning design could contribute to your global L&D goals."
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', padding: '2.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }}>
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--ink)' }}>This is what your resume should have been.</p>
          <p style={{ color: 'var(--text-soft)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Upload yours and find out — free.</p>
          <Link href="/" style={{ display: 'inline-block', padding: '14px 36px', background: 'var(--accent)', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.02em' }}>Try it free</Link>
        </div>

        <div style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
          <Link href="/" style={{ color: 'var(--text-soft)', textDecoration: 'none' }}>Back to JobsUncle.ai</Link>
          <Link href="/faq" style={{ color: 'var(--text-soft)', textDecoration: 'none' }}>FAQ</Link>
          <Link href="/about" style={{ color: 'var(--text-soft)', textDecoration: 'none' }}>Our Story</Link>
        </div>
      </div>
    </>
  )
}
