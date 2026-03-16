export default function Header({ isPaid = false, accessLevel = null, onSignIn, onManage }) {
  return (
    <header className="header">
      <div className="logo">
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '0', textDecoration: 'none' }}>
          <img src="/uncle-spin-logo.png" alt="Uncle Spin" className="logo-icon" />
          <span className="logo-text">JobsUncle.ai</span>
        </a>
        <span className="header-nav-links">
          <a href="/about" className="header-nav-link" style={{ color: 'var(--text-soft)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.02em', marginLeft: '1.5rem' }}>Our Story</a>
          <a href="/example" className="header-nav-link" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 700, marginLeft: '1.25rem', border: '1.5px solid var(--accent)', borderRadius: '20px', padding: '3px 10px', letterSpacing: '0.02em' }}>See an example</a>
          <a href="/faq" className="header-nav-link" style={{ color: 'var(--text-soft)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.02em', marginLeft: '1.25rem' }}>FAQ</a>
          <a href="/pricing" className="header-nav-link" style={{ color: 'var(--text-soft)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.02em', marginLeft: '1.25rem' }}>Pricing</a>
        </span>
      </div>
      <div className="header-right">
        {accessLevel === 'pro_plus' && (
          <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#6366f1', color: 'white', borderRadius: '20px', padding: '3px 10px', letterSpacing: '0.04em', marginRight: '0.75rem' }}>Pro+ Active</span>
        )}
        {accessLevel === 'paid' && (
          <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'var(--accent)', color: 'white', borderRadius: '20px', padding: '3px 10px', letterSpacing: '0.04em', marginRight: '0.75rem' }}>Pro Active</span>
        )}
        <a href="/#get-started" style={{ background: 'var(--accent)', color: '#fff', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.02em', marginRight: '1.25rem', padding: '6px 16px', borderRadius: '20px', whiteSpace: 'nowrap' }}>Build Your Resume</a>
        {isPaid && onManage && (
          <a onClick={onManage} style={{ color: 'var(--text-soft)', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.02em', marginRight: '1.25rem', cursor: 'pointer' }}>Manage Subscription</a>
        )}
        {!isPaid && onSignIn && (
          <a href="#signin" onClick={e => { e.preventDefault(); onSignIn() }} className="header-member-signin" style={{ color: 'var(--text-soft)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.02em', marginRight: '1.25rem', cursor: 'pointer' }}>Member Sign In</a>
        )}
        <span className="header-tagline-inline" style={{ fontSize: '0.85rem', color: 'var(--ink)', fontWeight: 700, letterSpacing: '0.02em' }}>Resumes for the AI age.</span>
      </div>
    </header>
  )
}
