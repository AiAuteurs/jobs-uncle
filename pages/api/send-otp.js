// pages/api/send-otp.js
// Generates a 5-digit OTP, stores in Upstash KV with 10min TTL, sends via Resend
// Uses fetch REST only — no SDK packages required

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

  // Check if this is a new user before sending OTP
  const existingEmail = await kv('get', `paid_email:${normalized}`)
  const existingGate = await kv('get', `otp_rate:${normalized}`)
  const isNewUser = attempts === 1 // first OTP request ever = new user

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
        subject: `Your JobsUncle code: ${code}`,
        html: `
          <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; background: #0d0d0d; color: #fff; border-radius: 16px;">
            <img src="https://jobsuncle.ai/jobsuncle-pfp.png" alt="JobsUncle.ai" style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 24px; display: block;" />
            <h2 style="font-size: 1.4rem; font-weight: 900; margin: 0 0 12px; letter-spacing: -0.02em;">Your verification code</h2>
            <p style="color: #ffffff; font-size: 0.9rem; margin: 0 0 28px; line-height: 1.6;">Enter this code to unlock your free resumes. It expires in 10 minutes.</p>
            <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 28px; text-align: center; margin-bottom: 24px;">
              <div style="font-size: 2.8rem; font-weight: 900; letter-spacing: 0.25em; color: #00D1FF; font-variant-numeric: tabular-nums;">${code}</div>
            </div>
            <p style="color: #ffffff; font-size: 0.78rem; margin: 0; line-height: 1.6;">If you didn't request this, ignore this email.</p>
          </div>
        `,
      }),
    })

    if (!emailRes.ok) {
      const err = await emailRes.json()
      console.error('Resend error:', err)
      return res.status(500).json({ error: 'Failed to send code. Try again.' })
    }

    // Send welcome email for new users
    if (isNewUser) {
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Oni from JobsUncle <oni@jobsuncle.ai>',
          to: normalized,
          subject: "You're in. Let's get you hired.",
          html: `
            <div style="background: #000000; padding: 0; margin: 0;">
              <div style="max-width: 560px; margin: 0 auto; padding: 48px 32px;">
                <div style="text-align: center; margin-bottom: 40px;">
                  <img src="https://jobsuncle.ai/jobsuncle-pfp.png" alt="JobsUncle.ai" style="width: 100px; height: 100px; border-radius: 50%; display: inline-block;" />
                </div>
                <h1 style="font-family: Georgia, serif; font-size: 28px; font-weight: 400; color: #ffffff; text-align: center; margin: 0 0 8px; letter-spacing: -0.02em; line-height: 1.2;">You're in. Let's get you hired.</h1>
                <div style="width: 40px; height: 1px; background: #00D1FF; margin: 24px auto;"></div>
                <p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.8; color: #ffffff; margin: 0 0 20px; font-style: italic; text-align: center;">Most people send the same resume to every job<br>and wonder why they don't hear back.</p>
                <p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.8; color: #ffffff; margin: 0 0 20px; text-align: center;">You just changed that.</p>
                <p style="font-family: Georgia, serif; font-size: 15px; line-height: 1.8; color: #ffffff; margin: 0 0 32px; text-align: center;">JobsUncle tailors your resume to every role — the way a great creative director would. Not by stuffing in keywords. By finding the right framing for your story.</p>
                <div style="text-align: center; margin: 40px 0;">
                  <p style="font-family: Georgia, serif; font-size: 18px; color: #ffffff; margin: 0 0 24px;">You've got <strong style="color: #00D1FF;">3 free resumes.</strong><br>Use them on jobs that matter.</p>
                  <a href="https://jobsuncle.ai" style="display: inline-block; background: #00D1FF; color: #000000; font-family: Arial, sans-serif; font-size: 15px; font-weight: 700; padding: 14px 36px; border-radius: 50px; text-decoration: none;">Back to JobsUncle →</a>
                </div>
                <div style="border-top: 1px solid #222; margin-top: 48px; padding-top: 24px; text-align: center;">
                  <p style="font-family: Arial, sans-serif; font-size: 12px; color: #555; margin: 0;">We don't spam. Ever. · <a href="https://jobsuncle.ai" style="color: #00D1FF; text-decoration: none;">jobsuncle.ai</a></p>
                </div>
              </div>
            </div>
          `,
        }),
      }).catch(err => console.error('Welcome email error (non-fatal):', err))
    }
  } catch (err) {
    console.error('Send OTP error:', err)
    return res.status(500).json({ error: 'Failed to send code. Try again.' })
  }

  return res.status(200).json({ sent: true })
}
