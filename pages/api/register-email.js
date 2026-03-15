import { kv } from '@vercel/kv'
import { serialize } from 'cookie'
import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email } = req.body
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Invalid email' })

  const normalized = email.toLowerCase().trim()
  const token = crypto.createHash('sha256').update(normalized + process.env.COOKIE_SECRET || 'ju_secret_salt').digest('hex').slice(0, 32)
  const kvKey = `email_gate:${token}`

  try {
    const existing = await kv.get(kvKey)

    if (!existing) {
      // New email — store with count 1 (they already used one resume before gating)
      await kv.set(kvKey, { email: normalized, usedCount: 1, registeredAt: Date.now() }, { ex: 60 * 60 * 24 * 90 }) // 90 day TTL
    }

    // Set cookie so server can track this email's usage
    res.setHeader('Set-Cookie', serialize('ju_email_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 90
    }))

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('register-email error:', err)
    res.status(500).json({ error: 'Failed to register email' })
  }
}
