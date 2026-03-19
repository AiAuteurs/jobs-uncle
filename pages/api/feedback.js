export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { rating, comment, email } = req.body
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress

  const KV_URL = process.env.KV_REST_API_URL
  const KV_TOKEN = process.env.KV_REST_API_TOKEN

  const ratingEmoji = rating === 'yes' ? '👍' : rating === 'kinda' ? '🤔' : '👎'
  const ratingLabel = rating === 'yes' ? 'Yes' : rating === 'kinda' ? 'Kind of' : 'No'

  // Store in KV
  try {
    const key = `feedback:${Date.now()}:${ip}`
    const value = JSON.stringify({ rating, comment, email, ts: new Date().toISOString() })
    await fetch(`${KV_URL}/set/${key}/${encodeURIComponent(value)}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    })
  } catch (err) {
    // fail silently
  }

  // Send email notification via Resend REST API
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Oni <oni@jobsuncle.ai>',
        to: 'jobsuncle@gmail.com',
        subject: `${ratingEmoji} Resume Rating: ${ratingLabel}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #6d28d9;">New Resume Feedback</h2>
            <p><strong>Rating:</strong> ${ratingEmoji} ${ratingLabel}</p>
            ${email ? `<p><strong>User:</strong> ${email}</p>` : '<p><strong>User:</strong> Anonymous</p>'}
            ${comment ? `<p><strong>Comment:</strong> ${comment}</p>` : ''}
            <p style="color: #888; font-size: 0.8rem;">Received: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })} BKK</p>
          </div>
        `
      })
    })
  } catch (err) {
    console.error('Resend error:', err)
  }

  res.status(200).json({ ok: true })
}
