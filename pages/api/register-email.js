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

  try {
    const getRes = await fetch(`${KV_URL}/get/${kvKey}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    })
    const getData = await getRes.json()

    if (!getData.result) {
      await fetch(`${KV_URL}/set/${kvKey}/1/ex/7776000`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` }
      })
    }

    const isProd = process.env.NODE_ENV === 'production'
    const cookieVal = `ju_email_token=${token}; Path=/; Max-Age=${60 * 60 * 24 * 90}; SameSite=Lax${isProd ? '; Secure; HttpOnly' : ''}`
    res.setHeader('Set-Cookie', cookieVal)

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('register-email error:', err)
    res.status(500).json({ error: 'Failed to register email' })
  }
}
