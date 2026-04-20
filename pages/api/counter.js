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
      // Increment global counter
      const data = await kvRequest('POST', `/incr/${COUNTER_KEY}`)
      const count = (parseInt(data.result) || 0) + SEED

      // Increment daily counter — key format: resumes_daily:2026-04-20
      const today = new Date().toISOString().slice(0, 10)
      const dailyKey = `resumes_daily:${today}`
      const dailyData = await kvRequest('POST', `/incr/${dailyKey}`)
      
      // Set 90-day TTL on first increment so old keys auto-expire
      if (parseInt(dailyData.result) === 1) {
        await kvRequest('POST', `/expire/${dailyKey}/7776000`)
      }

      return res.status(200).json({ count, today: parseInt(dailyData.result) || 0 })
    }

    if (req.method === 'GET') {
      const data = await kvRequest('GET', `/get/${COUNTER_KEY}`)
      const count = (parseInt(data.result) || 0) + SEED

      // Also return today's count
      const today = new Date().toISOString().slice(0, 10)
      const dailyData = await kvRequest('GET', `/get/resumes_daily:${today}`)
      const todayCount = parseInt(dailyData.result) || 0

      return res.status(200).json({ count, today: todayCount })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    // KV not configured yet — return seed silently
    return res.status(200).json({ count: SEED, today: 0 })
  }
}
