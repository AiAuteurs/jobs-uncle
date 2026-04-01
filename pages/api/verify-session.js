import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { sessionId } = req.body
  if (!sessionId) return res.status(400).json({ ok: false, error: 'Missing sessionId' })

  const KV_URL = process.env.KV_REST_API_URL
  const KV_TOKEN = process.env.KV_REST_API_TOKEN

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return res.status(402).json({ ok: false, error: 'Payment not completed' })
    }

    const plan = session.metadata?.plan || 'pro'
    const isPlus = plan === 'pro_plus_monthly' || plan === 'pro_plus_annual'
    const accessLevel = isPlus ? 'pro_plus' : 'paid'

    // Write paid status to KV keyed by sessionId — expires in 1 year
    const paidKey = `paid:${sessionId}`
    await fetch(`${KV_URL}/set/${paidKey}/1/ex/31536000`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    })

    // Write Pro+ status if applicable
    if (isPlus) {
      const plusKey = `paid_plus:${sessionId}`
      await fetch(`${KV_URL}/set/${plusKey}/1/ex/31536000`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      })
    }

    // Key by email — store accessLevel directly so check-access can resolve without sessionId
    if (session.customer_email) {
      const emailKey = `paid_email:${session.customer_email}`
      await fetch(`${KV_URL}/set/${emailKey}/${accessLevel}/ex/31536000`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      })

      // Store Stripe customer ID for portal access
      if (session.customer) {
        const customerKey = `stripe_customer:${session.customer_email}`
        await fetch(`${KV_URL}/set/${customerKey}/${session.customer}/ex/31536000`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
        })
      }
    }

    // Set HttpOnly cookie — works in private/incognito mode, survives reloads
    res.setHeader(
      'Set-Cookie',
      `ju_access=${accessLevel}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`
    )

    return res.status(200).json({ ok: true, plan, email: session.customer_email || null })
  } catch (err) {
    console.error('verify-session error:', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
}
