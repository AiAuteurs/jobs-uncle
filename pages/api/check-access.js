// Checks if a user has paid access or free resumes remaining
// Cookie-first (works in private/incognito), then KV sessionId, then free tier

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const FREE_LIMIT = 3

  const { email, sessionId } = req.body
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress
  const key = email ? `user:${email}` : `ip:${ip}`

  const KV_URL = process.env.KV_REST_API_URL
  const KV_TOKEN = process.env.KV_REST_API_TOKEN

  try {
    // 1. Cookie check — works in private/incognito, set by verify-session after payment
    const cookies = req.headers.cookie || ''
    const cookieAccess = cookies.match(/ju_access=([^;]+)/)?.[1]
    if (cookieAccess === 'pro_plus') return res.json({ access: 'pro_plus', resumesLeft: 999 })
    if (cookieAccess === 'paid') return res.json({ access: 'paid', resumesLeft: 999 })

    // 2. KV sessionId check — fallback for users who paid before cookie rollout
    if (sessionId) {
      const plusKey = `paid_plus:${sessionId}`
      const plusRes = await fetch(`${KV_URL}/get/${plusKey}`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` }
      })
      const plusData = await plusRes.json()
      if (plusData.result) return res.json({ access: 'pro_plus', resumesLeft: 999 })

      const paidKey = `paid:${sessionId}`
      const paidRes = await fetch(`${KV_URL}/get/${paidKey}`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` }
      })
      const paidData = await paidRes.json()
      if (paidData.result) return res.json({ access: 'paid', resumesLeft: 999 })
    }

    // 3. Free tier usage check
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
