// Checks if a user has paid access or free resumes remaining
// Priority: paid cookie → email KV lookup → sessionId KV lookup → free cookie count → free KV count

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const FREE_LIMIT = 3

  const { email, sessionId } = req.body
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress
  const key = email ? `user:${email}` : `ip:${ip}`

  const KV_URL = process.env.KV_REST_API_URL
  const KV_TOKEN = process.env.KV_REST_API_TOKEN

  try {
    const cookies = req.headers.cookie || ''

    // 1. Paid cookie — fastest path, set by verify-session after payment
    const cookieAccess = cookies.match(/ju_access=([^;]+)/)?.[1]
    if (cookieAccess === 'pro_plus') return res.json({ access: 'pro_plus', resumesLeft: 999 })
    if (cookieAccess === 'paid') return res.json({ access: 'paid', resumesLeft: 999 })

    // Resolve email: body → ju_email cookie → ju_email_token KV lookup
    const cookieEmail = cookies.match(/ju_email=([^;]+)/)?.[1]
    const emailToken = cookies.match(/ju_email_token=([^;]+)/)?.[1]
    let tokenEmail = null
    if (!email && !cookieEmail && emailToken) {
      const tokenRes = await fetch(`${KV_URL}/get/email_gate:${emailToken}`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` }
      })
      const tokenVal = (await tokenRes.json()).result
      if (tokenVal) tokenEmail = decodeURIComponent(tokenVal)
    }
    const resolvedEmail = email || cookieEmail || tokenEmail

    // 2. Email KV lookup — permanent paid access for returning users who lost their cookie
    // This is the fix for users who paid, closed the browser, and came back later
    if (resolvedEmail) {
      const emailRes = await fetch(`${KV_URL}/get/paid_email:${resolvedEmail}`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` }
      })
      const emailAccess = (await emailRes.json()).result
      if (emailAccess === 'pro_plus') {
        // Re-set cookie so future requests are fast
        res.setHeader('Set-Cookie', `ju_access=pro_plus; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`)
        return res.json({ access: 'pro_plus', resumesLeft: 999 })
      }
      if (emailAccess === 'paid') {
        res.setHeader('Set-Cookie', `ju_access=paid; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`)
        return res.json({ access: 'paid', resumesLeft: 999 })
      }
    }

    // 3. KV sessionId — fallback for users who paid before email-KV rollout
    if (sessionId) {
      const plusRes = await fetch(`${KV_URL}/get/paid_plus:${sessionId}`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` }
      })
      if ((await plusRes.json()).result) return res.json({ access: 'pro_plus', resumesLeft: 999 })

      const paidRes = await fetch(`${KV_URL}/get/paid:${sessionId}`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` }
      })
      if ((await paidRes.json()).result) return res.json({ access: 'paid', resumesLeft: 999 })
    }

    // 4. Free tier — cookie count is primary, KV is server-side backup
    // Use whichever is higher so neither can be trivially gamed
    const cookieCountRaw = cookies.match(/ju_uses=([^;]+)/)?.[1]
    const cookieCount = cookieCountRaw ? parseInt(cookieCountRaw, 10) : 0

    const kvRes = await fetch(`${KV_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    })
    const kvCount = parseInt((await kvRes.json()).result || '0', 10)

    // Whichever is higher wins — prevents both IP-shift and cookie-clear exploits
    const used = Math.max(cookieCount, kvCount)

    if (used < FREE_LIMIT) {
      return res.json({ access: 'free', resumesLeft: FREE_LIMIT - used, used })
    } else {
      return res.json({ access: 'none', resumesLeft: 0, used })
    }
  } catch (err) {
    return res.json({ access: 'free', resumesLeft: FREE_LIMIT, used: 0 })
  }
}
