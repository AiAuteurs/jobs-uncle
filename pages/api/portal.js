import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email required' })

  const normalEmail = email.toLowerCase().trim()

  try {
    // Look up customer in Stripe directly by email
    const customers = await stripe.customers.list({ email: normalEmail, limit: 5 })

    if (!customers.data.length) {
      return res.status(404).json({ error: 'No subscription found for that email.' })
    }

    // Use first customer with an active subscription
    let customerId = null
    for (const customer of customers.data) {
      const subs = await stripe.subscriptions.list({ customer: customer.id, status: 'active', limit: 1 })
      if (subs.data.length) { customerId = customer.id; break }
    }

    if (!customerId) {
      return res.status(404).json({ error: 'No active subscription found for that email.' })
    }

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
