export default function Header({ isPaid = false, accessLevel = null, onSignIn, onManage, onContact }) {
  return (
    <header className="header">
      <div className="header-left">
        <a href="/" className="logo">
          <img src="/jobsuncle-logo.png" alt="JobsUncle.ai" className="logo-full" />
        </a>
        <nav className="header-nav">
          <a href="/about" className="header-nav-link">Our Story</a>
          <a href="/example" className="header-nav-link header-nav-pill">See an example</a>
          <a href="/faq" className="header-nav-link">FAQ</a>
          <a href="/pricing" className="header-nav-link">Pricing</a>
          {onContact && (
            <a
              href="#contact"
              className="header-nav-link"
              onClick={e => { e.preventDefault(); onContact() }}
            >Contact</a>
          )}
        </nav>
      </div>

      <div className="header-right">
        {accessLevel === 'pro_plus' && (
          <span className="header-badge header-badge--plus">Pro+ Active</span>
        )}
        {accessLevel === 'paid' && (
          <span className="header-badge header-badge--pro">Pro Active</span>
        )}

        {isPaid && onManage ? (
          <a onClick={onManage} className="header-link" style={{ cursor: 'pointer' }}>
            Manage Subscription
          </a>
        ) : !isPaid && onSignIn ? (
          <a
            href="#signin"
            className="header-link"
            onClick={e => { e.preventDefault(); onSignIn() }}
          >
            Member Sign In
          </a>
        ) : null}

        <a href="/#get-started" className="header-cta">
          Build Your Resume
        </a>

        <span className="header-tagline">Resumes for the AI age.</span>
      </div>
    </header>
  )
}
