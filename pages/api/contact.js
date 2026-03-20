export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { name, email, message } = req.body

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields required' })
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API}`
      },
      body: JSON.stringify({
        from: 'JobsUncle <onboarding@resend.dev>',
        to: 'jobsuncleai@gmail.com',
        reply_to: email,
        subject: `📬 JobsUncle Contact: ${name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #6d28d9;">New Contact Message</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            <p><strong>Message:</strong></p>
            <blockquote style="border-left: 3px solid #6d28d9; margin: 0; padding: 12px 16px; background: #f5f3ff; border-radius: 4px;">
              ${message.replace(/\n/g, '<br/>')}
            </blockquote>
            <p style="color: #888; font-size: 0.8rem; margin-top: 16px;">Sent: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })} BKK</p>
          </div>
        `
      })
    })

    if (!response.ok) throw new Error('Resend API error')
    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Contact email error:', err)
    res.status(500).json({ error: 'Failed to send message' })
  }
}
