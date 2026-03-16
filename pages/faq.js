import Head from 'next/head'
import Link from 'next/link'

const faqs = [
  {
    q: "I don't have an old resume — can I still use this?",
    a: "Yes. Go to your LinkedIn profile, click the More button, and select Save to PDF. That is your resume. Upload it here and you are good to go."
  },
  {
    q: "What formats can I download?",
    a: "Three: TXT for pasting into job portals and ATS systems, DOCX for editing in Word or Google Docs, and PDF for sending to humans who want something that looks right on screen or paper."
  },
  {
    q: "Is my resume stored anywhere?",
    a: "No. Your documents are processed in memory and discarded immediately. Nothing is saved, logged, or used for training. Ever."
  },
  {
    q: "What is the difference between Pro and Pro+?",
    a: "Pro gives you unlimited tailored resumes, one version per job. Pro+ generates two versions of every resume: one leadership-focused, one technical/achievement-focused. Use whichever fits the hiring manager."
  },
  {
    q: "How is this different from ChatGPT?",
    a: "ChatGPT requires you to write your own prompts, copy-paste your resume, and figure out the format. JobsUncle is purpose-built for this one job: upload, paste, done. It also gives you a cover letter, recruiter gap analysis, and a hiring manager DM in the same pass."
  },
  {
    q: "Will this work for any industry?",
    a: "Yes. The AI reads the specific job description and tailors your language to match. It works as well for a nurse applying to a hospital as it does for an engineer applying to a startup."
  },
  {
    q: "What if the job is a stretch and I am not a perfect fit?",
    a: "That is exactly when this is most useful. The AI finds the transferable language in your background and frames it for the role. It will not fabricate experience, but it will surface connections you probably missed."
  },
  {
    q: "How long does it take?",
    a: "Under 60 seconds from upload to download. Resume, cover letter, recruiter analysis, and hiring manager DM, all in one pass."
  },
  {
    q: "Can I use it on mobile?",
    a: "Yes. The site works on any device. Upload your PDF, paste the job description, and download your documents."
  },
  {
    q: "How do I cancel my subscription?",
    a: "Visit your billing portal at billing.stripe.com/p/login/4gM3cx4EJfYO61j83Lf7i00, find your JobsUncle subscription, and cancel anytime — no hoops, no retention flows. Your access continues until the end of the billing period you already paid for."
  },
]

export default function FAQ() {
  return (
    <>
      <Head>
        <title>FAQ — JobsUncle.ai</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <img src="/uncle-spin-logo.png" alt="JobsUncle.ai" style={{ width: 32, height: 'auto' }} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>JobsUncle.ai</span>
          </Link>
          <a href="/about" className="header-nav-link" style={{ color: 'var(--text-soft)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, marginLeft: '1.5rem' }}>Our Story</a>
          <a href="/example" className="header-nav-link" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, marginLeft: '1.25rem' }}>See an example</a>
          <a href="/faq" className="header-nav-link" style={{ color: 'var(--text-soft)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, marginLeft: '1.25rem' }}>FAQ</a>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-soft)' }}>Resumes for the AI age.</span>
      </header>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '3rem 2rem 5rem' }}>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '1rem' }}>FAQ</p>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.15, marginBottom: '2.5rem' }}>Got questions?</h1>

        {faqs.map(({ q, a }, i) => (
          <details key={i} style={{ borderBottom: '1px solid var(--border)', padding: '1.25rem 0' }}>
            <summary style={{ cursor: 'pointer', fontFamily: 'Inter', fontWeight: 600, fontSize: '0.95rem', color: 'var(--ink)', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {q}<span style={{ color: 'var(--accent)', fontSize: '1.2rem', marginLeft: '1rem', flexShrink: 0 }}>+</span>
            </summary>
            <p style={{ margin: '0.75rem 0 0', fontSize: '0.9rem', color: 'var(--text-soft)', lineHeight: 1.75 }}>{a}</p>
          </details>
        ))}

        <div style={{ marginTop: '3rem', padding: '1.5rem 2rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px' }}>
          <p style={{ fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.5rem' }}>Still have a question?</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-soft)', margin: '0 0 1rem' }}>Something broken? Something great? Tell your uncle.</p>
          <a href="mailto:jobsuncleai@gmail.com" style={{ display: 'inline-block', padding: '10px 24px', background: 'var(--accent)', color: 'white', borderRadius: '6px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 700 }}>Get in touch</a>
        </div>

        <div style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
          <Link href="/" style={{ color: 'var(--text-soft)', textDecoration: 'none' }}>Back to JobsUncle.ai</Link>
          <Link href="/about" style={{ color: 'var(--text-soft)', textDecoration: 'none' }}>Our Story</Link>
          <Link href="/example" style={{ color: 'var(--accent)', textDecoration: 'none' }}>See an example</Link>
        </div>
      </div>
    </>
  )
}
