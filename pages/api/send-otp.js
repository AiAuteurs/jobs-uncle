// pages/api/send-otp.js
// Generates a 5-digit OTP, stores in Upstash KV with 10min TTL, sends via Resend
// Uses fetch REST only — no SDK packages required

import { otpEmail } from '../../lib/emailTemplates'

const kv = async (...cmd) => {
  const res = await fetch(`${process.env.KV_REST_API_URL}/${cmd.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
  })
  return res.json()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email } = req.body
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required.' })
  }

  const normalized = email.toLowerCase().trim()

  // Rate limit: max 3 OTP requests per email per hour
  const rateKey = `otp_rate:${normalized}`
  const { result: attempts } = await kv('incr', rateKey)
  if (attempts === 1) await kv('expire', rateKey, '3600')
  if (attempts > 3) {
    return res.status(429).json({ error: 'Too many attempts. Try again in an hour.' })
  }

  // Generate 5-digit code, store with 10 min TTL
  const code = String(Math.floor(10000 + Math.random() * 90000))
  await kv('set', `otp:${normalized}`, code, 'ex', '600')

  // Welcome email is sent by verify-otp once the user is actually registered.
  // (It used to fire here on every first OTP request per hour, i.e. to returning users too.)

  // Send via Resend REST API
  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Oni from JobsUncle <oni@jobsuncle.ai>',
        to: normalized,
        ...otpEmail(code),
      }),
    })

    if (!emailRes.ok) {
      const err = await emailRes.json()
      console.error('Resend error:', err)
      return res.status(500).json({ error: 'Failed to send code. Try again.' })
    }

  } catch (err) {
    console.error('Send OTP error:', err)
    return res.status(500).json({ error: 'Failed to send code. Try again.' })
  }

  return res.status(200).json({ sent: true })
}
