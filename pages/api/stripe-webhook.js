import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN

export const config = { api: { bodyParser: false } }

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

async function kvSet(key, value, ttl = 31536000) {
  await fetch(`${KV_URL}/set/${key}/${value}/ex/${ttl}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
  })
}

async function kvDelete(key) {
  await fetch(`${KV_URL}/del/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
  })
}

async function getEmailFromCustomer(customerId) {
  try {
    const customer = await stripe.customers.retrieve(customerId)
    return customer.email || null
  } catch {
    return null
  }
}

function getAccessLevel(plan) {
  if (!plan) return 'paid'
  const isPlus = plan === 'pro_plus_monthly' || plan === 'pro_plus_annual'
  return isPlus ? 'pro_plus' : 'paid'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const sig = req.headers['stripe-signature']
  const rawBody = await getRawBody(req)

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }

  const obj = event.data.object

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const status = obj.status
        const customerId = obj.customer
        const plan = obj.metadata?.plan || null
        const accessLevel = getAccessLevel(plan)
        const email = await getEmailFromCustomer(customerId)
        if (email) {
          if (status === 'active' || status === 'trialing') {
            await kvSet(`paid_email:${email}`, accessLevel)
          } else if (status === 'canceled' || status === 'unpaid' || status === 'past_due') {
            await kvDelete(`paid_email:${email}`)
          }
        }
        break
      }
      case 'customer.subscription.deleted': {
        const email = await getEmailFromCustomer(obj.customer)
        if (email) await kvDelete(`paid_email:${email}`)
        break
      }
      case 'invoice.payment_failed': {
        const email = await getEmailFromCustomer(obj.customer)
        if (email && (obj.attempt_count || 1) >= 3) await kvDelete(`paid_email:${email}`)
        break
      }
      case 'invoice.paid': {
        const email = await getEmailFromCustomer(obj.customer)
        if (email && obj.subscription) {
          const sub = await stripe.subscriptions.retrieve(obj.subscription)
          await kvSet(`paid_email:${email}`, getAccessLevel(sub.metadata?.plan))
        }
        break
      }
    }
    res.status(200).json({ received: true })
  } catch (err) {
    res.status(500).json({ error: 'Webhook handler failed' })
  }
}
