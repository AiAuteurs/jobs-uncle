// Run after npm run build. Uses only synthetic customer data and ephemeral credentials.
const { spawn } = require('node:child_process')
const { createServer } = require('node:http')
const { randomBytes, createHash } = require('node:crypto')
const assert = require('node:assert/strict')
async function main() {
  const redis = createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk
    const args = JSON.parse(body)
    let result
    if (args[0] === 'SCAN') { assert.deepEqual(args.slice(2), ['MATCH', 'user:*', 'COUNT', 100]); result = ['0', Array.from({ length: 26 }, (_, i) => `user:synthetic${i}`)] }
    else if (args[0] === 'MGET') result = args.slice(1).map((_, i) => JSON.stringify({ email: i === 0 ? 'synthetic@example.com' : `synthetic${i}@example.com`, createdAt: '2026-01-01', verified: true }))
    else { assert.equal(args[0], 'GET'); assert.ok(args[1].startsWith('marketing_consent:')); result = null }
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ result }))
  })
  await new Promise(resolve => redis.listen(0, '127.0.0.1', resolve))
  const password = randomBytes(32).toString('hex')
  const app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3097'], {
    env: { ...process.env, ADMIN_USERNAMES: 'test-operator', ADMIN_PASSWORD_SHA256: createHash('sha256').update(password).digest('hex'), KV_REST_API_URL: `http://127.0.0.1:${redis.address().port}`, KV_REST_API_TOKEN: randomBytes(32).toString('hex'), STRIPE_SECRET_KEY: '' }, stdio: 'ignore',
  })
  try {
    let ready = false
    for (let i = 0; i < 100; i++) { try { await fetch('http://127.0.0.1:3097/admin'); ready = true; break } catch { await new Promise(r => setTimeout(r, 100)) } }
    assert.ok(ready, 'app starts')
    const headers = { Authorization: 'Basic ' + Buffer.from(`test-operator:${password}`).toString('base64') }
    for (const path of ['/admin', '/api/admin/customers', '/api/admin/customers?export=csv', '/_next/data/test/admin.json']) {
      const response = await fetch(`http://127.0.0.1:3097${path}`)
      assert.ok([401, 404].includes(response.status)); assert.ok(!(await response.text()).includes('synthetic@example.com'))
    }
    const page = await fetch('http://127.0.0.1:3097/admin', { headers })
    assert.equal(page.status, 200)
    const html = await page.text(); assert.ok(!html.includes('promotekit')); assert.ok(!html.includes('synthetic@example.com'))
    const report = await fetch('http://127.0.0.1:3097/api/admin/customers', { headers })
    assert.match(report.headers.get('cache-control'), /no-store/)
    const data = await report.json(); assert.equal(data.total, 26); assert.equal(data.verified, 26); assert.equal(data.rows.length, 25); assert.equal(data.pages, 2); assert.equal(data.rows[0].marketingConsent, 'unknown'); assert.match(data.rows[0].subscription, /unknown/)
    const second = await fetch('http://127.0.0.1:3097/api/admin/customers?page=2', { headers }); assert.equal((await second.json()).rows.length, 1)
    const searched = await fetch('http://127.0.0.1:3097/api/admin/customers?q=absent', { headers }); assert.equal((await searched.json()).rows.length, 0)
    const csv = await fetch('http://127.0.0.1:3097/api/admin/customers?export=csv', { headers }); assert.equal(csv.status, 200); assert.match(csv.headers.get('content-disposition'), /attachment/); assert.ok((await csv.text()).includes('synthetic@example.com'))
    assert.equal((await fetch('http://127.0.0.1:3097/api/admin/customers', { method: 'POST', headers })).status, 405)
    console.log('HTTP checks passed: admin page/API/export authorization, no tracking, no static data, search, CSV, methods, private caching.')
  } finally { app.kill(); await new Promise(resolve => redis.close(resolve)) }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
