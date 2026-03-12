// Checks if a user has paid access or free resumes remaining
// Uses Vercel KV to track free usage by email/IP

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const FREE_LIMIT = 3

  const { email, sessionId } = req.body
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress
  const key = email ? `user:${email}` : `ip:${ip}`

  const KV_URL = process.env.KV_REST_API_URL
  const KV_TOKEN = process.env.KV_REST_API_TOKEN

  try {
    // Check if paid subscriber
    if (sessionId) {
      const paidKey = `paid:${sessionId}`
      const paidRes = await fetch(`${KV_URL}/get/${paidKey}`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` }
      })
      const paidData = await paidRes.json()
      if (paidData.result) return res.json({ access: 'paid', resumesLeft: 999 })
    }

    // Check free usage
    const usageRes = await fetch(`${KV_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    })
    const usageData = await usageRes.json()
    const used = parseInt(usageData.result || '0')

    if (used < FREE_LIMIT) {
      return res.json({ access: 'free', resumesLeft: FREE_LIMIT - used, used })
    } else {
      return res.json({ access: 'none', resumesLeft: 0, used })
    }
  } catch (err) {
    // Fail open — allow the request
    return res.json({ access: 'free', resumesLeft: FREE_LIMIT, used: 0 })
  }
}
