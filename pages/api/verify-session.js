import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { sessionId } = req.body
  if (!sessionId) return res.status(400).json({ ok: false, error: 'Missing sessionId' })

  const KV_URL = process.env.KV_REST_API_URL
  const KV_TOKEN = process.env.KV_REST_API_TOKEN

  try {
    // Verify with Stripe that payment actually completed
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return res.status(402).json({ ok: false, error: 'Payment not completed' })
    }

    // Write paid status to KV — expires in 1 year (seconds)
    const paidKey = `paid:${sessionId}`
    await fetch(`${KV_URL}/set/${paidKey}/1/ex/31536000`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`,
        'Content-Type': 'application/json',
      },
    })

    // Also key by email if available for future lookup
    if (session.customer_email) {
      const emailKey = `paid_email:${session.customer_email}`
      await fetch(`${KV_URL}/set/${emailKey}/${sessionId}/ex/31536000`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${KV_TOKEN}`,
          'Content-Type': 'application/json',
        },
      })
    }

    return res.status(200).json({ ok: true, email: session.customer_email || null })
  } catch (err) {
    console.error('verify-session error:', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
}
