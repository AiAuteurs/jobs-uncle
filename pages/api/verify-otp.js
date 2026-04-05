// pages/api/verify-otp.js
// Checks OTP against KV, registers email on success
// Uses fetch REST only — no SDK packages required

const kv = async (...cmd) => {
  const res = await fetch(`${process.env.KV_REST_API_URL}/${cmd.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
  })
  return res.json()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, code } = req.body
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code required.' })
  }

  const normalized = email.toLowerCase().trim()

  // Check OTP
  const { result: stored } = await kv('get', `otp:${normalized}`)
  if (!stored) {
    return res.status(400).json({ error: 'Code expired or not found. Request a new one.' })
  }
  if (String(stored).trim() !== String(code).trim()) {
    return res.status(400).json({ error: 'Incorrect code. Try again.' })
  }

  // Valid — delete so it can't be reused
  await kv('del', `otp:${normalized}`)

  // Set persistent email cookie so any browser can restore paid access without localStorage
  const cookieBase = `; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`
  const cookies = [`ju_email=${normalized}${cookieBase}`]

  // If this email has a paid plan, re-set the access cookie immediately
  const { result: paidLevel } = await kv('get', `paid_email:${normalized}`)
  if (paidLevel === 'pro_plus' || paidLevel === 'paid') {
    cookies.push(`ju_access=${paidLevel}${cookieBase}`)
  }

  res.setHeader('Set-Cookie', cookies)

  // Register if new user
  try {
    const { result: existing } = await kv('get', `user:${normalized}`)
    if (!existing) {
      await kv('set', `user:${normalized}`, JSON.stringify({
        email: normalized,
        createdAt: new Date().toISOString(),
        verified: true,
      }))

      // Notify Matassa
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'JobsUncle Signups <oni@jobsuncle.ai>',
          to: 'jobsuncleai@gmail.com',
          subject: `New signup: ${normalized}`,
          html: `<p>New verified user:</p><p><strong>${normalized}</strong></p><p style="color:#999;font-size:12px;">${new Date().toISOString()}</p>`,
        }),
      }).catch(() => {})

      // Welcome email
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Oni from JobsUncle <oni@jobsuncle.ai>',
          to: normalized,
          replyTo: 'jobsuncleai@gmail.com',
          subject: "You're in. Let's get you hired.",
          html: `
            <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; background: #0d0d0d; color: #fff; border-radius: 16px;">
              <img src="https://jobsuncle.ai/jobsuncle-logo.png" alt="JobsUncle.ai" style="width: 80px; margin-bottom: 24px; display: block;" />
              <h2 style="font-size: 1.4rem; font-weight: 900; margin: 0 0 12px; letter-spacing: -0.02em;">You've got 3 free resumes.</h2>
              <p style="color: #888; font-size: 0.9rem; margin: 0 0 20px; line-height: 1.6;">
                Tailored to every job you apply for. No more sending the same resume everywhere and hoping.
              </p>
              <a href="https://jobsuncle.ai" style="display: inline-block; background: #00D1FF; color: #000; font-weight: 800; font-size: 0.95rem; padding: 13px 32px; border-radius: 50px; text-decoration: none; margin-bottom: 24px;">
                Back to JobsUncle →
              </a>
              <p style="color: #444; font-size: 0.75rem; margin: 0;">We don't spam. Ever.</p>
            </div>
          `,
        }),
      }).catch(() => {}) // fire and forget
    }
  } catch (err) {
    console.error('Register error:', err)
    // Non-fatal
  }

  return res.status(200).json({ verified: true, access: paidLevel || null })
}
