// pages/api/verify-otp.js
// Checks OTP against KV, registers email on success
// Uses fetch REST only — no SDK packages required

import { welcomeEmail } from '../../lib/emailTemplates'

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
          ...welcomeEmail(),
        }),
      }).catch(() => {}) // fire and forget
    }
  } catch (err) {
    console.error('Register error:', err)
    // Non-fatal
  }

  return res.status(200).json({ verified: true, access: paidLevel || null })
}
