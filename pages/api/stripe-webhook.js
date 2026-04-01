import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN

// Required — Stripe needs the raw body to verify the signature
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
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }

  const obj = event.data.object

  try {
    switch (event.type) {

      // ── Subscription activated or renewed ─────────────────────────────────
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const status = obj.status
        const customerId = obj.customer
        const plan = obj.metadata?.plan || null
        const accessLevel = getAccessLevel(plan)
        const email = await getEmailFromCustomer(customerId)

        if (email) {
          if (status === 'active' || status === 'trialing') {
            // Restore or update access
            await kvSet(`paid_email:${email}`, accessLevel)
            console.log(`[webhook] ${event.type} — ${email} → ${accessLevel}`)
          } else if (status === 'canceled' || status === 'unpaid' || status === 'past_due') {
            // Revoke access
            await kvDelete(`paid_email:${email}`)
            console.log(`[webhook] ${event.type} — ${email} access revoked (${status})`)
          }
        }
        break
      }

      // ── Subscription cancelled ─────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const customerId = obj.customer
        const email = await getEmailFromCustomer(customerId)

        if (email) {
          await kvDelete(`paid_email:${email}`)
          console.log(`[webhook] subscription.deleted — ${email} access revoked`)
        }
        break
      }

      // ── Payment failed ─────────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const customerId = obj.customer
        const email = await getEmailFromCustomer(customerId)
        const attemptCount = obj.attempt_count || 1

        if (email) {
          if (attemptCount >= 3) {
            // 3 failed attempts — revoke access
            await kvDelete(`paid_email:${email}`)
            console.log(`[webhook] invoice.payment_failed — ${email} access revoked after ${attemptCount} attempts`)
          } else {
            // Grace period — log but keep access
            console.log(`[webhook] invoice.payment_failed — ${email} attempt ${attemptCount}, keeping access`)
          }
        }
        break
      }

      // ── Payment succeeded (renewal) ────────────────────────────────────────
      case 'invoice.paid': {
        const customerId = obj.customer
        const email = await getEmailFromCustomer(customerId)

        if (email) {
          // Get subscription to determine plan
          const subscriptionId = obj.subscription
          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId)
            const plan = subscription.metadata?.plan || null
            const accessLevel = getAccessLevel(plan)
            await kvSet(`paid_email:${email}`, accessLevel)
            console.log(`[webhook] invoice.paid — ${email} access confirmed → ${accessLevel}`)
          }
        }
        break
      }

      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`)
    }

    res.status(200).json({ received: true })
  } catch (err) {
    console.error('[webhook] Handler error:', err)
    res.status(500).json({ error: 'Webhook handler failed' })
  }
}
