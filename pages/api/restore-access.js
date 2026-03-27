// Restores paid access by email — checks KV first, falls back to Stripe live lookup
// If Stripe confirms active subscription, sets cookie and backfills KV for next time

import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

async function kvGet(url, token, key) {
  const res = await fetch(`${url}/get/${key}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const data = await res.json()
  return data.result || null
}

async function kvSet(url, token, key, value) {
  await fetch(`${url}/set/${key}/${encodeURIComponent(value)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email } = req.body
  if (!email || !email.includes('@')) {
    return res.status(400).json({ ok: false, error: 'Valid email required' })
  }

  const KV_URL = process.env.KV_REST_API_URL
  const KV_TOKEN = process.env.KV_REST_API_TOKEN
  const normalEmail = email.toLowerCase().trim()

  try {
    // ── 1. KV fast path ──────────────────────────────────────────
    const emailKey = `paid_email:${normalEmail}`
    const sessionId = await kvGet(KV_URL, KV_TOKEN, emailKey)

    if (sessionId) {
      const plusKey = `paid_plus:${sessionId}`
      const isPlus = await kvGet(KV_URL, KV_TOKEN, plusKey)
      const accessLevel = isPlus ? 'pro_plus' : 'paid'
      setAccessCookie(res, accessLevel)
      return res.json({ ok: true, access: accessLevel })
    }

    // ── 2. Stripe fallback ───────────────────────────────────────
    // KV miss — look for an active Stripe subscription by email
    const customers = await stripe.customers.list({ email: normalEmail, limit: 5 })

    if (!customers.data.length) {
      return res.json({ ok: false, error: 'No paid account found for that email.' })
    }

    let activeSubscription = null
    let isPlusSubscription = false

    for (const customer of customers.data) {
      const subs = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 5,
      })
      if (subs.data.length) {
        activeSubscription = subs.data[0]
        // All current price IDs are Pro+ tier
        const PLUS_PRICE_IDS = new Set([
          'price_1TBXuQPKP65OstAn63cUa3BN',
          'price_1TBXd5PKP65OstAnarPXF8G7',
          'price_1TBXeRPKP65OstAn4V4uRoQW',
          'price_1TBXvVPKP65OstAnCxPwIhXk',
        ])
        const priceId = activeSubscription.items.data[0]?.price?.id
        isPlusSubscription = PLUS_PRICE_IDS.has(priceId)
        break
      }
    }

    if (!activeSubscription) {
      return res.json({ ok: false, error: 'No active subscription found for that email.' })
    }

    const accessLevel = isPlusSubscription ? 'pro_plus' : 'paid'
    const subId = activeSubscription.id

    // ── 3. Backfill KV so next restore is instant ─────────────────
    try {
      await kvSet(KV_URL, KV_TOKEN, emailKey, subId)
      if (isPlusSubscription) {
        await kvSet(KV_URL, KV_TOKEN, `paid_plus:${subId}`, '1')
      }
      await kvSet(KV_URL, KV_TOKEN, `paid_session:${subId}`, normalEmail)
    } catch (kvErr) {
      console.warn('KV backfill failed (non-fatal):', kvErr.message)
    }

    setAccessCookie(res, accessLevel)
    return res.json({ ok: true, access: accessLevel })

  } catch (err) {
    console.error('restore-access error:', err)
    return res.status(500).json({ ok: false, error: 'Something went wrong. Try again.' })
  }
}

function setAccessCookie(res, accessLevel) {
  res.setHeader(
    'Set-Cookie',
    `ju_access=${accessLevel}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`
  )
}
