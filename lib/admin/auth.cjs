const { createHash, timingSafeEqual } = require('node:crypto')

function authorize(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('Vary', 'Authorization')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'")
  const users = (process.env.ADMIN_USERNAMES || '').split(',').map(s => s.trim()).filter(Boolean)
  const hash = process.env.ADMIN_PASSWORD_SHA256 || ''
  if (!users.length || !/^[a-f0-9]{64}$/.test(hash)) {
    res.statusCode = 503
    return false
  }
  const header = req.headers.authorization || ''
  const decoded = /^Basic [A-Za-z0-9+/]+=*$/i.test(header) ? Buffer.from(header.slice(6), 'base64').toString('utf8') : ''
  const colon = decoded.indexOf(':')
  const username = decoded.slice(0, colon)
  const password = decoded.slice(colon + 1)
  const valid = timingSafeEqual(createHash('sha256').update(password).digest(), Buffer.from(hash, 'hex'))
  if (colon < 1 || !valid || !users.includes(username)) {
    res.setHeader('WWW-Authenticate', 'Basic realm="JobsUncle Admin", charset="UTF-8"')
    res.statusCode = 401
    return false
  }
  return true
}
module.exports = { authorize }
