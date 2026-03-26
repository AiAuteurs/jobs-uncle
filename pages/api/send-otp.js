// pages/api/send-otp.js
// Generates a 5-digit OTP, stores in Upstash KV with 10min TTL, sends via Resend
// Uses fetch REST only — no SDK packages required

const kv = async (...cmd) => {
  const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/${cmd.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
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

  // Send via Resend REST API
  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Oni from JobsUncle <oni@jobsuncle.ai>',
        to: normalized,
        subject: `Your JobsUncle code: ${code}`,
        html: `
          <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; background: #0d0d0d; color: #fff; border-radius: 16px;">
            <img src="https://jobsuncle.ai/jobsuncle-logo.png" alt="JobsUncle.ai" style="width: 80px; margin-bottom: 24px; display: block;" />
            <h2 style="font-size: 1.4rem; font-weight: 900; margin: 0 0 12px; letter-spacing: -0.02em;">Your verification code</h2>
            <p style="color: #888; font-size: 0.9rem; margin: 0 0 28px; line-height: 1.6;">Enter this code to unlock your free resumes. It expires in 10 minutes.</p>
            <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 28px; text-align: center; margin-bottom: 24px;">
              <div style="font-size: 2.8rem; font-weight: 900; letter-spacing: 0.25em; color: #00D1FF; font-variant-numeric: tabular-nums;">${code}</div>
            </div>
            <p style="color: #555; font-size: 0.78rem; margin: 0; line-height: 1.6;">If you didn't request this, ignore this email.</p>
          </div>
        `,
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
