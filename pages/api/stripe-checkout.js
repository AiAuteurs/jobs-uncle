import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, plan } = req.body

  // plan: 'pro' | 'pro_plus_monthly' | 'pro_plus_annual'
  const planConfig = {
    pro: {
      name: 'JobsUncle Pro',
      description: 'Unlimited AI-tailored resumes, cover letters, recruiter analysis & hiring manager DMs',
      unit_amount: 4999,
      recurring: { interval: 'year' },
    },
    pro_plus_monthly: {
      name: 'JobsUncle Pro+',
      description: 'Everything in Pro + dual-version resumes (Leadership & Technical focus)',
      unit_amount: 999,
      recurring: { interval: 'month' },
    },
    pro_plus_annual: {
      name: 'JobsUncle Pro+',
      description: 'Everything in Pro + dual-version resumes (Leadership & Technical focus)',
      unit_amount: 7999,
      recurring: { interval: 'year' },
    },
  }

  const selected = planConfig[plan] || planConfig.pro
  const isAnnual = plan === 'pro' || plan === 'pro_plus_annual'

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: selected.name,
            description: selected.description,
            images: ['https://www.jobsuncle.ai/uncle-spin-logo.png'],
          },
          unit_amount: selected.unit_amount,
          recurring: selected.recurring,
        },
        quantity: 1,
      }],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan || 'pro'}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/`,
      allow_promotion_codes: isAnnual, // promo codes annual only — prevents UNCLE10 zeroing out monthly
      metadata: { source: 'jobs_uncle', plan: plan || 'pro' },
    })

    res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Stripe error:', err)
    res.status(500).json({ error: err.message })
  }
}
