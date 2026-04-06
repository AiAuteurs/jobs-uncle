import crypto from 'crypto'

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
            subject: "You're already ahead.",
            html: `
              <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #111;">
                <img src="https://jobsuncle.ai/uncle-spin-hero.png" alt="Oni" style="width: 80px; height: auto; margin-bottom: 32px; display: block;" />
                <p style="font-size: 16px; line-height: 1.7; margin: 0 0 20px;">Most people send the same resume to every job and wonder why they don't hear back.</p>
                <p style="font-size: 16px; line-height: 1.7; margin: 0 0 20px;">You just changed that.</p>
                <p style="font-size: 16px; line-height: 1.7; margin: 0 0 20px;">JobsUncle tailors your resume to every role — the way a great creative director would. Not by stuffing in keywords. By finding the right framing for your story.</p>
                <p style="font-size: 16px; line-height: 1.7; margin: 0 0 32px;">You've got 3 free resumes. Use them on jobs that matter.</p>
                <p style="font-size: 15px; color: #555; margin: 0;">— Oni, the JobsUncle mascot</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;" />
                <p style="font-size: 12px; color: #999; margin: 0;"><a href="https://jobsuncle.ai" style="color: #6366f1; text-decoration: none;">jobsuncle.ai</a> · We don't spam. Ever.</p>
              </div>
            `,
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
