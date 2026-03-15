// Mark a free resume as used after generation
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email } = req.body
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress
  const key = email ? `user:${email}` : `ip:${ip}`

  const KV_URL = process.env.KV_REST_API_URL
  const KV_TOKEN = process.env.KV_REST_API_TOKEN

  try {
    const incrRes = await fetch(`${KV_URL}/incr/${key}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    })
    const incrData = await incrRes.json()
    const usedCount = incrData.result || 1
    res.status(200).json({ ok: true, usedCount })
  } catch (err) {
    res.status(200).json({ ok: true, usedCount: 1 }) // fail silently
  }
}
