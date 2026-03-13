// Restores paid access by email — checks KV, resets cookie
// Called when a returning customer has lost their cookie (cleared history, new device, etc.)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email } = req.body
  if (!email || !email.includes('@')) {
    return res.status(400).json({ ok: false, error: 'Valid email required' })
  }

  const KV_URL = process.env.KV_REST_API_URL
  const KV_TOKEN = process.env.KV_REST_API_TOKEN

  try {
    const emailKey = `paid_email:${email.toLowerCase().trim()}`
    const emailRes = await fetch(`${KV_URL}/get/${emailKey}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    })
    const emailData = await emailRes.json()
    const sessionId = emailData.result

    if (!sessionId) {
      return res.json({ ok: false, error: 'No paid account found for that email.' })
    }

    // Check if Pro+ or Pro
    const plusKey = `paid_plus:${sessionId}`
    const plusRes = await fetch(`${KV_URL}/get/${plusKey}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    })
    const plusData = await plusRes.json()
    const accessLevel = plusData.result ? 'pro_plus' : 'paid'

    // Rewrite the cookie
    res.setHeader(
      'Set-Cookie',
      `ju_access=${accessLevel}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`
    )

    return res.json({ ok: true, access: accessLevel })
  } catch (err) {
    console.error('restore-access error:', err)
    return res.status(500).json({ ok: false, error: 'Something went wrong. Try again.' })
  }
}
