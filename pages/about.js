import Head from 'next/head'
import Link from 'next/link'

export default function About() {
  return (
    <>
      <Head>
        <title>Our Story — JobsUncle.ai</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header style={{ padding: '1.25rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--surface)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <img src="/uncle-spin-logo.png" alt="JobsUncle.ai" style={{ width: 32, height: 'auto' }} />
          <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink)' }}>JobsUncle.ai</span>
        </Link>
      </header>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '3rem 2rem 5rem' }}>

        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '1rem' }}>Founder's Story</p>

        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.15, marginBottom: '2rem' }}>Why I built this</h1>

        <div style={{ lineHeight: 1.9, color: 'var(--ink)', fontSize: '1rem' }}>

          <p>I built this because I hate resumes. Not the concept — the ritual. Spending hours tweaking the same document for every job, trying to guess what keywords matter, knowing the first screener is probably an algorithm anyway.</p>

          <p>I've been in the industry long enough to know that the people who get hired aren't always the most qualified. They're the ones who knew how to tell their story in the right language for that specific role.</p>

          <p style={{ fontWeight: 700, fontSize: '1.05rem' }}>So I built the uncle I wish I had.</p>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '2.5rem 0' }} />

          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem' }}>Why "Jobs Uncle"?</h2>

          <p>We wanted <strong>"Bob's Your Uncle"</strong> — a British idiom meaning "and there you have it," "it's as simple as that," <em>voilà</em>, or <em>ta-da</em>.</p>

          <p>As in: upload your resume, paste the job description, and ta-da — you have an excellently tailored resume. Bob's your uncle.</p>

          <p style={{ fontStyle: 'italic', color: 'var(--text-soft)' }}>But bobsyouruncle.ai was already taken.</p>

          <p>So we got creative. <em>Jobs</em> sounds like <em>Bobs</em>. Uncle stays. <strong>JobsUncle.</strong></p>

          <div style={{ margin: '2.5rem 0', padding: '1.5rem 2rem', background: 'var(--surface)', borderLeft: '3px solid var(--accent)', borderRadius: '0 8px 8px 0' }}>
            <p style={{ margin: 0, fontFamily: 'Cormorant Garamond, serif', fontSize: '1.15rem', lineHeight: 1.7 }}>The phrase dates to 1887, when Prime Minister Robert "Bob" Cecil appointed his nephew Arthur Balfour to a prestigious government post. Overnight, Balfour had the ultimate insider advantage. The connection. The inside track. The uncle in the business.</p>
          </div>

          <p>That's what we built. The uncle everyone deserves but not everyone has. The insider. The one who knows how the game is played.</p>

          <p style={{ fontWeight: 700, fontSize: '1.05rem' }}>Now everybody's got one.</p>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '2.5rem 0' }} />

          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem' }}>The product</h2>

          <p>Upload your resume or LinkedIn PDF. Paste the job description. Get a tailored resume, cover letter, recruiter & ATS analysis, and a hiring manager DM — in under 60 seconds.</p>

          <p>I built it for me. Maybe it's exactly what you need too.</p>

          <p style={{ color: 'var(--text-soft)', fontSize: '0.9rem', marginTop: '2rem' }}>— Michael Matassa, Founder</p>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '2.5rem 0' }} />

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '2.5rem 0' }} />

          {/* TESTIMONIAL */}
          <div style={{ padding: '1.5rem 2rem', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: '12px', marginBottom: '2.5rem' }}>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem', lineHeight: 1.7, margin: '0 0 12px', fontStyle: 'italic' }}>"The results are solid. I like what I got back."</p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-soft)', fontWeight: 600 }}>— B.C., ICF Certified Career Coach</p>
          </div>

          {/* DATA PROMISE */}
          <div style={{ background: 'rgba(34,197,94,0.08)', border: '2px solid #22c55e', borderRadius: '12px', padding: '1.5rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🔒</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>We don't store your resume.</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-soft)', lineHeight: 1.6 }}>We don't store your job description. We don't sell your data. Ever. Your documents are processed, delivered to you, and gone.</div>
          </div>

        </div>

        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1.5rem', fontSize: '0.85rem', flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: 'var(--text-soft)', textDecoration: 'none' }}>← Back to JobsUncle.ai</Link>
          <Link href="/privacy" style={{ color: 'var(--text-soft)', textDecoration: 'none' }}>Privacy Policy</Link>
          <Link href="/terms" style={{ color: 'var(--text-soft)', textDecoration: 'none' }}>Terms of Service</Link>
        </div>

      </div>
    </>
  )
}
