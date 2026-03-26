// pages/api/verify-otp.js
// Checks OTP against KV, registers email if valid, mirrors register-email behavior

import { Redis } from '@upstash/redis'
import { Resend } from 'resend'

const redis = Redis.fromEnv()
const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, code } = req.body
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code required.' })
  }

  const normalized = email.toLowerCase().trim()
  const stored = await redis.get(`otp:${normalized}`)

  if (!stored) {
    return res.status(400).json({ error: 'Code expired or not found. Request a new one.' })
  }

  if (String(stored).trim() !== String(code).trim()) {
    return res.status(400).json({ error: 'Incorrect code. Try again.' })
  }

  // Valid — delete OTP so it can't be reused
  await redis.del(`otp:${normalized}`)

  // Register the email (same logic as register-email.js)
  try {
    const existing = await redis.get(`user:${normalized}`)
    if (!existing) {
      await redis.set(`user:${normalized}`, JSON.stringify({ email: normalized, createdAt: new Date().toISOString(), verified: true }))

      // Welcome email from Oni
      await resend.emails.send({
        from: 'Oni from JobsUncle <oni@jobsuncle.ai>',
        to: normalized,
        replyTo: 'jobsuncleai@gmail.com',
        subject: 'You\'re in. Let\'s get you hired.',
        html: `
          <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; background: #0d0d0d; color: #fff; border-radius: 16px;">
            <img src="https://jobsuncle.ai/jobsuncle-logo.png" alt="JobsUncle.ai" style="width: 80px; margin-bottom: 24px; display: block;" />
            <h2 style="font-size: 1.5rem; font-weight: 900; margin: 0 0 12px; letter-spacing: -0.02em;">You've got 3 free resumes.</h2>
            <p style="color: #888; font-size: 0.9rem; margin: 0 0 20px; line-height: 1.6;">
              Tailored to every job you apply for. No more sending the same resume everywhere and hoping.
            </p>
            <a href="https://jobsuncle.ai" style="display: inline-block; background: #00D1FF; color: #000; font-weight: 800; font-size: 0.95rem; padding: 13px 32px; border-radius: 50px; text-decoration: none; margin-bottom: 24px;">
              Back to JobsUncle →
            </a>
            <p style="color: #444; font-size: 0.75rem; margin: 0;">We don't spam. Ever.</p>
          </div>
        `,
      }).catch(() => {})
    }
  } catch (err) {
    console.error('Register error:', err)
    // Non-fatal — user is still verified
  }

  return res.status(200).json({ verified: true })
}
