import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const KV_URL = process.env.KV_REST_API_URL
  const KV_TOKEN = process.env.KV_REST_API_TOKEN

  try {
    // Get email from request body or cookie-based session
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email required' })
    }

    // Look up Stripe customer ID from KV
    const customerKey = `stripe_customer:${email}`
    const kvRes = await fetch(`${KV_URL}/get/${customerKey}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    })
    const kvData = await kvRes.json()
    const customerId = kvData.result

    if (!customerId) {
      return res.status(404).json({ error: 'No subscription found for this email.' })
    }

    // Create Stripe portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/`,
    })

    return res.status(200).json({ url: portalSession.url })
  } catch (err) {
    console.error('Portal error:', err)
    return res.status(500).json({ error: err.message })
  }
}
