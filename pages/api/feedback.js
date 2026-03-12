export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { rating, comment } = req.body
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress

  const KV_URL = process.env.KV_REST_API_URL
  const KV_TOKEN = process.env.KV_REST_API_TOKEN

  try {
    const key = `feedback:${Date.now()}:${ip}`
    const value = JSON.stringify({ rating, comment, ts: new Date().toISOString() })
    await fetch(`${KV_URL}/set/${key}/${encodeURIComponent(value)}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    })
  } catch (err) {
    // fail silently
  }

  res.status(200).json({ ok: true })
}
