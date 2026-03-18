// Mark a free resume as used after generation
// Sets both a ju_uses cookie (client) and increments KV (server)
// check-access uses whichever is higher — clearing cookies works, IP shifts don't matter

const TTL_30_DAYS = 60 * 60 * 24 * 30

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email } = req.body
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress
  const key = email ? `user:${email}` : `ip:${ip}`

  const KV_URL = process.env.KV_REST_API_URL
  const KV_TOKEN = process.env.KV_REST_API_TOKEN

  // Read current cookie count so we can increment it
  const cookies = req.headers.cookie || ''
  const cookieCountRaw = cookies.match(/ju_uses=([^;]+)/)?.[1]
  const cookieCount = cookieCountRaw ? parseInt(cookieCountRaw, 10) : 0
  const newCookieCount = cookieCount + 1

  // Set ju_uses cookie — 30 day expiry, SameSite=Lax, no HttpOnly so JS can't read it
  // (intentionally readable — it's just a usage counter, not a secret)
  const cookieExpiry = new Date(Date.now() + TTL_30_DAYS * 1000).toUTCString()
  res.setHeader('Set-Cookie', `ju_uses=${newCookieCount}; Path=/; Expires=${cookieExpiry}; SameSite=Lax`)

  try {
    const incrRes = await fetch(`${KV_URL}/incr/${key}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    })
    const incrData = await incrRes.json()
    const kvCount = incrData.result || 1

    // Set 30-day TTL on first write — keys now self-expire instead of living forever
    if (kvCount === 1) {
      await fetch(`${KV_URL}/expire/${key}/${TTL_30_DAYS}`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` }
      })
    }

    const usedCount = Math.max(newCookieCount, kvCount)
    res.status(200).json({ ok: true, usedCount })
  } catch (err) {
    // KV failed — cookie still got set, fail silently
    res.status(200).json({ ok: true, usedCount: newCookieCount })
  }
}
