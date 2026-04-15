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
            subject: "You're in. Let's get you hired.",
            html: `
              <div style="background: #000000; padding: 0; margin: 0;">
                <div style="max-width: 560px; margin: 0 auto; padding: 48px 32px;">

                  <!-- Logo -->
                  <div style="text-align: center; margin-bottom: 40px;">
                    <img src="https://jobsuncle.ai/jobsuncle-pfp.png" alt="JobsUncle.ai" style="width: 100px; height: 100px; border-radius: 50%; display: inline-block;" />
                  </div>

                  <!-- Headline -->
                  <h1 style="font-family: Georgia, serif; font-size: 28px; font-weight: 400; color: #ffffff; text-align: center; margin: 0 0 8px; letter-spacing: -0.02em; line-height: 1.2;">You're in. Let's get you hired.</h1>

                  <!-- Rule -->
                  <div style="width: 40px; height: 1px; background: #00D1FF; margin: 24px auto;"></div>

                  <!-- Body -->
                  <p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.8; color: #ffffff; margin: 0 0 20px; font-style: italic; text-align: center;">Most people send the same resume to every job<br>and wonder why they don't hear back.</p>

                  <p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.8; color: #ffffff; margin: 0 0 20px; text-align: center;">You just changed that.</p>

                  <p style="font-family: Georgia, serif; font-size: 15px; line-height: 1.8; color: #ffffff; margin: 0 0 32px; text-align: center;">JobsUncle tailors your resume to every role — the way a great creative director would. Not by stuffing in keywords. By finding the right framing for your story.</p>

                  <!-- CTA -->
                  <div style="text-align: center; margin: 40px 0;">
                    <p style="font-family: Georgia, serif; font-size: 18px; font-weight: 400; color: #ffffff; margin: 0 0 24px;">You've got <strong style="color: #00D1FF;">3 free resumes.</strong><br>Use them on jobs that matter.</p>
                    <a href="https://jobsuncle.ai" style="display: inline-block; background: #00D1FF; color: #000000; font-family: Arial, sans-serif; font-size: 15px; font-weight: 700; padding: 14px 36px; border-radius: 50px; text-decoration: none; letter-spacing: 0.01em;">Back to JobsUncle →</a>
                  </div>

                  <!-- Footer -->
                  <div style="border-top: 1px solid #222; margin-top: 48px; padding-top: 24px; text-align: center;">
                    <p style="font-family: Arial, sans-serif; font-size: 12px; color: #555; margin: 0;">We don't spam. Ever. · <a href="https://jobsuncle.ai" style="color: #00D1FF; text-decoration: none;">jobsuncle.ai</a></p>
                  </div>

                </div>
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
