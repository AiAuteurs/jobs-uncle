import Stripe from 'stripe'
const { authorize } = require('../../../lib/admin/auth.cjs')
const { loadUsers, consent, subscription, csvCell } = require('../../../lib/admin/data.cjs')

export default async function handler(req, res) {
  if (!authorize(req, res)) return res.end('Admin authorization required')
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).end() }
  try {
    const report = await loadUsers()
    const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 254).toLowerCase() : ''
    const filtered = report.users.filter(user => user.email.includes(q))
    const page = Math.max(1, Math.min(Math.ceil(filtered.length / 25) || 1, Number.parseInt(req.query.page, 10) || 1))
    const exporting = req.query.export === 'csv'
    // Export is a full filtered list, not just the visible page. No billing is inferred.
    const selected = exporting ? filtered : filtered.slice((page - 1) * 25, page * 25)
    const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 8000, maxNetworkRetries: 0 }) : null
    const rows = []
    for (let i = 0; i < selected.length; i += 5) {
      rows.push(...await Promise.all(selected.slice(i, i + 5).map(async user => ({ ...user,
        marketingConsent: await consent(user.email),
        subscription: exporting ? 'not checked (see dashboard for live Stripe status)' : await subscription(user.email, stripe),
      }))))
    }
    if (exporting) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', 'attachment; filename="jobsuncle-customers.csv"')
      const columns = ['email', 'createdAt', 'verified', 'marketingConsent', 'subscription']
      return res.send([columns.map(csvCell).join(','), ...rows.map(row => columns.map(key => csvCell(row[key])).join(','))].join('\r\n'))
    }
    return res.json({ rows, page, pages: Math.ceil(filtered.length / 25) || 1, matches: filtered.length,
      total: report.total, verified: report.verified, dates: report.dates, malformed: report.malformed, undated: report.undated, checkedAt: new Date().toISOString() })
  } catch { return res.status(503).json({ error: 'Customer reporting unavailable. No partial totals displayed.' }) }
}
