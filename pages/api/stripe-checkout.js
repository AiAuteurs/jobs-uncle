import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const PRICE_IDS = {
  pro_plus_1mo:  'price_1TBXuQPKP65OstAn63cUa3BN',  // $9.99/mo
  pro_plus_3mo:  'price_1TBXd5PKP65OstAnarPXF8G7',  // $23.97/3mo
  pro_plus_6mo:  'price_1TBXeRPKP65OstAn4V4uRoQW',  // $41.94/6mo
  pro_plus_12mo: 'price_1TBXvVPKP65OstAnCxPwIhXk',  // $49.99/yr
  // Legacy aliases
  pro:           'price_1TBXvVPKP65OstAnCxPwIhXk',  // maps to 12mo
  pro_plus_monthly: 'price_1TBXuQPKP65OstAn63cUa3BN', // maps to 1mo
  pro_plus_annual:  'price_1TBXvVPKP65OstAnCxPwIhXk', // maps to 12mo
}

// Plans where promo codes are allowed (annual-ish only)
const PROMO_ALLOWED = new Set(['pro_plus_6mo', 'pro_plus_12mo', 'pro', 'pro_plus_annual'])

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, plan, referral } = req.body

  const priceId = PRICE_IDS[plan] || PRICE_IDS.pro_plus_12mo

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan || 'pro_plus_12mo'}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing`,
      allow_promotion_codes: PROMO_ALLOWED.has(plan),
      metadata: {
        source: 'jobs_uncle',
        plan: plan || 'pro_plus_12mo',
        promotekit_referral: referral || '',
      },
    })

    res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Stripe error:', err)
    res.status(500).json({ error: err.message })
  }
}
