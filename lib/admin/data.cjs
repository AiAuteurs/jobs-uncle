async function redis(...command) {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_READ_ONLY_TOKEN || process.env.KV_REST_API_TOKEN
  if (!url || !token) throw new Error('Redis unavailable')
  const response = await fetch(url, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command), cache: 'no-store', signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error('Redis unavailable')
  const data = await response.json()
  if (data.error) throw new Error('Redis command failed')
  return data.result
}
function parseUser(value) {
  try {
    const user = typeof value === 'string' ? JSON.parse(value) : value
    if (!user || typeof user.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) return null
    const date = typeof user.createdAt === 'string' && Number.isFinite(Date.parse(user.createdAt)) ? new Date(user.createdAt).toISOString() : null
    return { email: user.email.trim().toLowerCase(), createdAt: date, verified: user.verified === true }
  } catch { return null }
}
async function loadUsers(command = redis) {
  let cursor = '0'
  const keys = new Set()
  let scans = 0
  do {
    const result = await command('SCAN', cursor, 'MATCH', 'user:*', 'COUNT', 100)
    if (!Array.isArray(result) || !Array.isArray(result[1])) throw new Error('Invalid scan')
    cursor = String(result[0])
    for (const key of result[1]) if (key.startsWith('user:')) keys.add(key)
    if (++scans > 10000 || keys.size > 100000) throw new Error('Reporting limit exceeded')
  } while (cursor !== '0')
  const all = [...keys]
  const users = []
  let malformed = 0
  for (let i = 0; i < all.length; i += 100) {
    const values = await command('MGET', ...all.slice(i, i + 100))
    for (const value of values) {
      if (value === null) continue // deleted during scan
      const user = parseUser(value)
      if (user) users.push(user)
      else malformed++
    }
  }
  users.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') || a.email.localeCompare(b.email))
  const dates = {}
  for (const user of users) if (user.createdAt) dates[user.createdAt.slice(0, 10)] = (dates[user.createdAt.slice(0, 10)] || 0) + 1
  return { users, total: users.length, verified: users.filter(u => u.verified).length, malformed,
    undated: users.filter(u => !u.createdAt).length, dates: Object.entries(dates).sort(([a], [b]) => a.localeCompare(b)) }
}
async function consent(email, command = redis) {
  // Separate purpose-specific record; signup and verified never imply consent.
  try {
    const raw = await command('GET', `marketing_consent:${email}`)
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (value && ['granted', 'withdrawn'].includes(value.status) && typeof value.source === 'string' && value.source.trim() && typeof value.recordedAt === 'string' && Number.isFinite(Date.parse(value.recordedAt))) return value.status
    return 'unknown'
  } catch { return 'unknown' }
}
async function subscription(email, stripe) {
  if (!stripe) return 'unknown (Stripe not configured)'
  try {
    const statuses = new Set()
    for await (const customer of stripe.customers.list({ email, limit: 100 })) {
      for await (const sub of stripe.subscriptions.list({ customer: customer.id, status: 'all', limit: 100 })) statuses.add(sub.status)
    }
    return statuses.size ? [...statuses].sort().join(', ') : 'none (confirmed by Stripe)'
  } catch { return 'unknown (Stripe unavailable)' }
}
function csvCell(value) {
  let text = String(value ?? '')
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text
  return '"' + text.replace(/"/g, '""') + '"'
}
module.exports = { redis, parseUser, loadUsers, consent, subscription, csvCell }
