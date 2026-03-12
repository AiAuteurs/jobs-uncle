// Mark a free resume as used after generation
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email } = req.body
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress
  const key = email ? `user:${email}` : `ip:${ip}`

  const KV_URL = process.env.KV_REST_API_URL
  const KV_TOKEN = process.env.KV_REST_API_TOKEN

  try {
    await fetch(`${KV_URL}/set/${key}/1`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    })
    res.status(200).json({ ok: true })
  } catch (err) {
    res.status(200).json({ ok: true }) // fail silently
  }
}
