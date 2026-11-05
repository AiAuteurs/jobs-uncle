import crypto from 'crypto'
import { welcomeEmail } from '../../lib/emailTemplates'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email } = req.body
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Invalid email' })

  const normalized = email.toLowerCase().trim()
  const token = crypto.createHash('sha256').update(normalized + (process.env.COOKIE_SECRET || 'ju_secret_salt')).digest('hex').slice(0, 32)
  const kvKey = `email_gate:${token}`

  const KV_URL = process.env.KV_REST_API_URL
  const KV_TOKEN = process.env.KV_REST_API_TOKEN
  const RESEND_API = process.env.RESEND_API

  try {
    const getRes = await fetch(`${KV_URL}/get/${kvKey}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    })
    const getData = await getRes.json()

    const isNew = !getData.result

    if (isNew) {
      await fetch(`${KV_URL}/set/${kvKey}/${encodeURIComponent(normalized)}/ex/7776000`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` }
      })
    }

    const isProd = process.env.NODE_ENV === 'production'
    const cookieVal = `ju_email_token=${token}; Path=/; Max-Age=${60 * 60 * 24 * 90}; SameSite=Lax${isProd ? '; Secure; HttpOnly' : ''}`
    res.setHeader('Set-Cookie', cookieVal)

    // Send emails only for new registrations
    if (isNew && RESEND_API) {
      const emailPromises = [
        // Welcome email to user
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Oni from JobsUncle <oni@jobsuncle.ai>',
            to: normalized,
            ...welcomeEmail(),
          }),
        }),

        // Notification to you
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'JobsUncle Signups <oni@jobsuncle.ai>',
            to: 'jobsuncleai@gmail.com',
            subject: `New signup: ${normalized}`,
            html: `<p>New email gate registration:</p><p><strong>${normalized}</strong></p><p style="color:#999;font-size:12px;">${new Date().toISOString()}</p>`,
          }),
        }),
      ]

      // Fire and forget — don't block the response
      Promise.all(emailPromises).catch(err => console.error('Resend error:', err))
    }

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('register-email error:', err)
    res.status(500).json({ error: 'Failed to register email' })
  }
}
