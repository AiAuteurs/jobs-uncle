// backfill-kv.js
// Run once: node backfill-kv.js
// Fixes all existing Stripe subscribers missing from KV

import Stripe from 'stripe'
import fetch from 'node-fetch'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN
const TTL = 31536000 // 1 year

async function kvSet(key, value) {
  const res = await fetch(`${KV_URL}/set/${encodeURIComponent(key)}/${value}/ex/${TTL}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  })
  const data = await res.json()
  console.log(`SET ${key} = ${value} →`, data.result)
}

async function kvGet(key) {
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  })
  const data = await res.json()
  return data.result
}

function getAccessLevel(plan) {
  if (!plan) return 'paid'
  const isPlus = plan.includes('plus') || plan.includes('annual') || plan.includes('12mo') || plan.includes('6mo')
  return isPlus ? 'pro_plus' : 'paid'
}

async function backfill() {
  console.log('Starting KV backfill from Stripe...\n')

  // Get all active subscriptions from Stripe
  const subscriptions = await stripe.subscriptions.list({
    status: 'active',
    limit: 100,
    expand: ['data.customer'],
  })

  console.log(`Found ${subscriptions.data.length} active subscriptions\n`)

  for (const sub of subscriptions.data) {
    const customer = sub.customer
    const email = typeof customer === 'string'
      ? (await stripe.customers.retrieve(customer)).email
      : customer.email

    if (!email) {
      console.log(`⚠️  No email for customer ${typeof customer === 'string' ? customer : customer.id}`)
      continue
    }

    const plan = sub.metadata?.plan || null
    const accessLevel = getAccessLevel(plan)

    // Check current KV state
    const existing = await kvGet(`paid:${email}`)

    if (existing) {
      console.log(`✓ SKIP ${email} — already has KV: ${existing}`)
    } else {
      await kvSet(`paid:${email}`, accessLevel)
      console.log(`✅ FIXED ${email} → ${accessLevel}`)
    }
  }

  console.log('\nBackfill complete.')
}

backfill().catch(console.error)
