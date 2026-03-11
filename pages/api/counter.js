// pages/api/counter.js
// Uses Vercel KV (Redis) — add VERCEL_KV env vars in your Vercel dashboard
// npm install @vercel/kv

let kv
async function getKV() {
  if (!kv) {
    const mod = await import('@vercel/kv')
    kv = mod.kv
  }
  return kv
}

const COUNTER_KEY = 'resumes_generated'
const SEED = 1247 // Starting offset — makes it look lived-in on launch

export default async function handler(req, res) {
  // Allow cross-origin reads from the front-end
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const store = await getKV()

    if (req.method === 'POST') {
      // Called internally by /api/generate on success — increment
      const count = await store.incr(COUNTER_KEY)
      return res.status(200).json({ count: count + SEED })
    }

    if (req.method === 'GET') {
      // Called on page load to display current count
      const raw = await store.get(COUNTER_KEY)
      const count = (parseInt(raw) || 0) + SEED
      return res.status(200).json({ count })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    // If KV isn't configured yet, fail silently — don't break the app
    console.warn('Counter KV error:', err.message)
    return res.status(200).json({ count: SEED })
  }
}
