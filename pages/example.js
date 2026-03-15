import Head from 'next/head'
import Link from 'next/link'

export default function Example() {
  return (
    <>
      <Head>
        <title>See an Example — JobsUncle.ai</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <img src="/uncle-spin-logo.png" alt="JobsUncle.ai" style={{ width: 32, height: 'auto' }} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>JobsUncle.ai</span>
          </Link>
          <a href="/about" style={{ color: 'var(--text-soft)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, marginLeft: '1.5rem' }}>Our Story</a>
          <a href="/example" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, marginLeft: '1.25rem' }}>See an example</a>
          <a href="/faq" style={{ color: 'var(--text-soft)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, marginLeft: '1.25rem' }}>FAQ</a>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-soft)' }}>1. Upload your resume &nbsp;&nbsp; 2. Paste the job description &nbsp;&nbsp; 3. <em>Voila.</em></span>
      </header>

      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '3rem 2rem 5rem' }}>

        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '1rem' }}>Real Output</p>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.15, marginBottom: '0.75rem' }}>Teacher applies to Google.</h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-soft)', lineHeight: 1.7, marginBottom: '2.5rem' }}>
          Camille Leon spent 8 years teaching middle school science in Oakland. She uploaded her resume, pasted the job description for <strong>Instructional Design Lead at Google</strong>, and hit generate. Here is what came back.
        </p>

        {/* INPUT CONTEXT */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2.5rem' }}>
          <div style={{ padding: '1.25rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '0.5rem' }}>Input: Resume</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>Camille Leon</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-soft)', marginTop: '2px' }}>7th/8th Grade Science Teacher, Oakland USD · 8 years</div>
          </div>
          <div style={{ padding: '1.25rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: '0.5rem' }}>Input: Job Description</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>Instructional Design Lead</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-soft)', marginTop: '2px' }}>Google People Operations, Mountain View</div>
          </div>
        </div>

        {/* RESUME OUTPUT */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '1rem' }}>Output: Tailored Resume</div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '2rem', fontSize: '0.9rem', lineHeight: 1.75, color: 'var(--ink)' }}>
            <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '2px' }}>Camille Leon</p>
            <p style={{ color: 'var(--text-soft)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>camille.leon@gmail.com · 415-555-0192 · linkedin.com/in/camilleleon · San Francisco, CA</p>

            <p style={{ fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.4rem' }}>Summary</p>
            <p style={{ marginBottom: '1.25rem', color: 'var(--text-soft)' }}>Instructional designer and learning strategist with 8 years designing, measuring, and scaling learning programs for populations of 140+ learners. Proven track record using data to close skill gaps, driving adoption of learning frameworks across organizations, and producing digital learning content with above-average engagement. IDEO U-certified in Learning Design. Ready to bring classroom-forged systems thinking to Google-scale L&D.</p>

            <p style={{ fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.4rem' }}>Experience</p>
            <p style={{ fontWeight: 700, marginBottom: '2px' }}>Instructional Design Lead (equivalent scope) — Roosevelt Middle School, Oakland USD</p>
            <p style={{ color: 'var(--text-soft)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>2017–Present</p>
            <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-soft)', marginBottom: '1rem' }}>
              <li style={{ marginBottom: '6px' }}>Led end-to-end design of learning programs across 5 concurrent cohorts (140+ learners); mapped all curriculum to measurable outcomes, achieving 34% above district average on standardized assessments</li>
              <li style={{ marginBottom: '6px' }}>Developed a modular instructional framework adopted by 12 educators district-wide — reduced lesson development time by 40% through reusable design standards and shared component library</li>
              <li style={{ marginBottom: '6px' }}>Used weekly learning analytics to identify skill gaps and adjust content delivery; lifted at-risk learner pass rates by 28% in a single semester through data-driven iteration</li>
              <li style={{ marginBottom: '6px' }}>Designed and facilitated professional development workshops for 30+ educators; built all session materials, pre/post assessments, and follow-up resources</li>
              <li style={{ marginBottom: '6px' }}>Produced 60+ original e-learning video modules; achieved 84% completion rate vs. 51% district average through intentional engagement design and learner-centered pacing</li>
            </ul>

            <p style={{ fontWeight: 700, marginBottom: '2px' }}>Curriculum Developer (Contract) — BrightPath Learning</p>
            <p style={{ color: 'var(--text-soft)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>2020–2022</p>
            <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-soft)', marginBottom: '1rem' }}>
              <li style={{ marginBottom: '6px' }}>Authored 14 STEM learning modules deployed across 200+ schools nationally; scoped each to measurable outcomes aligned to national standards</li>
              <li style={{ marginBottom: '6px' }}>Partnered cross-functionally with UX and product teams to redesign learner experience; reduced drop-off by 22% through friction mapping and iterative testing</li>
              <li style={{ marginBottom: '6px' }}>Conducted usability testing with 40 learners; translated behavioral data and qualitative feedback into design recommendations shipped in the next product release</li>
            </ul>
          </div>
        </div>

        {/* HIRING MANAGER DM */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '1rem' }}>Output: Hiring Manager DM</div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: '0 10px 10px 0', padding: '1.5rem 2rem', fontSize: '0.9rem', lineHeight: 1.75, color: 'var(--text-soft)', fontStyle: 'italic' }}>
            "Hi [Name] — I noticed Google is expanding its L&D function. I have spent 8 years doing exactly this work at scale: designing learning systems for 140+ learners, building frameworks adopted across 12-person teams, and measuring outcome improvement with data. My completion rates run 33 points above average. I would love to bring that to Google. Worth a conversation?"
          </div>
        </div>

        {/* RECRUITER ANALYSIS TEASER */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '1rem' }}>Output: Recruiter & ATS Analysis</div>
          <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '10px', padding: '1.5rem 2rem', fontSize: '0.9rem', lineHeight: 1.75, color: 'var(--ink)' }}>
            <p style={{ marginBottom: '0.5rem' }}><strong>ATS match:</strong> Strong. Key terms present: instructional design, learning outcomes, e-learning, blended learning, cross-functional, data-driven, stakeholder.</p>
            <p style={{ marginBottom: '0.5rem' }}><strong>Gaps to own in interview:</strong> No direct tech company experience. Frame BrightPath contract as the bridge — 200 schools is Google-scale distribution.</p>
            <p style={{ margin: 0 }}><strong>Recruiter flag:</strong> Title mismatch between Teacher and Lead is the main objection. The resume reframes scope aggressively — lead with outcomes data in the first 10 seconds of any screen.</p>
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', padding: '2.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }}>
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Your uncle has seen worse resumes.</p>
          <p style={{ color: 'var(--text-soft)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Upload yours and see what comes back.</p>
          <Link href="/" style={{ display: 'inline-block', padding: '14px 32px', background: 'var(--accent)', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.02em' }}>Try it free</Link>
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
