// Redeems a beta code for Pro+ access
// Each code is single-use and tracked in KV

const BETA_CODES = [
  'UNCLE-BETA-JK4M',
  'UNCLE-BETA-PW7R',
  'UNCLE-BETA-XN2T',
  'UNCLE-BETA-BQ9F',
  'UNCLE-BETA-LH3V',
  'UNCLE-BETA-DZ6C',
  'UNCLE-BETA-YG8S',
  'UNCLE-BETA-RT5A',
  'UNCLE-BETA-WE1N',
  'UNCLE-BETA-MU4K',
]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { code, email } = req.body
  if (!code) return res.status(400).json({ ok: false, error: 'No code provided' })
  if (!email || !email.includes('@')) return res.status(400).json({ ok: false, error: 'Valid email required to save your access.' })

  const normalized = code.trim().toUpperCase()
  const normalizedEmail = email.trim().toLowerCase()

  if (!BETA_CODES.includes(normalized)) {
    return res.json({ ok: false, error: 'Invalid beta code.' })
  }

  const KV_URL = process.env.KV_REST_API_URL
  const KV_TOKEN = process.env.KV_REST_API_TOKEN

  try {
    // Check if already redeemed
    const usedKey = `beta_used:${normalized}`
    const usedRes = await fetch(`${KV_URL}/get/${usedKey}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    })
    const usedData = await usedRes.json()

    if (usedData.result) {
      return res.json({ ok: false, error: 'This beta code has already been used.' })
    }

    // Mark code as used
    await fetch(`${KV_URL}/set/${usedKey}/1`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' }
    })

    // Store email → beta so restore-access works later
    await fetch(`${KV_URL}/set/paid_email:${encodeURIComponent(normalizedEmail)}/${normalized}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' }
    })

    // Set Pro+ cookie — 1 year
    res.setHeader(
      'Set-Cookie',
      `ju_access=pro_plus; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`
    )

    return res.json({ ok: true })
  } catch (err) {
    console.error('redeem-beta error:', err)
    return res.status(500).json({ ok: false, error: 'Something went wrong. Try again.' })
  }
}
