// pages/api/counter.js
// Uses Vercel KV REST API directly — no npm package required
// Set up: Vercel Dashboard → Storage → Create KV → Link to project
// Vercel auto-injects: KV_REST_API_URL and KV_REST_API_TOKEN

const COUNTER_KEY = 'resumes_generated'
const SEED = 1247

async function kvRequest(method, path, body) {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) throw new Error('KV not configured')

  const res = await fetch(`${url}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return res.json()
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const data = await kvRequest('POST', `/incr/${COUNTER_KEY}`)
      const count = (parseInt(data.result) || 0) + SEED
      return res.status(200).json({ count })
    }

    if (req.method === 'GET') {
      const data = await kvRequest('GET', `/get/${COUNTER_KEY}`)
      const count = (parseInt(data.result) || 0) + SEED
      return res.status(200).json({ count })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    // KV not configured yet — return seed silently
    return res.status(200).json({ count: SEED })
  }
}
