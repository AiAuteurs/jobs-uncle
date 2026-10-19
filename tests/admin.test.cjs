const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const { authorize } = require('../lib/admin/auth.cjs')
const { parseUser, loadUsers, consent, subscription, csvCell } = require('../lib/admin/data.cjs')
const response = () => ({ headers: {}, setHeader(k, v) { this.headers[k] = v } })
test('admin fails closed, rejects customer cookies and non-admin identities', () => {
  delete process.env.ADMIN_USERNAMES; delete process.env.ADMIN_PASSWORD_SHA256
  let res = response()
  assert.equal(authorize({ headers: {} }, res), false); assert.equal(res.statusCode, 503)
  process.env.ADMIN_USERNAMES = 'operator'
  process.env.ADMIN_PASSWORD_SHA256 = createHash('sha256').update('test-password').digest('hex')
  for (const headers of [{ cookie: 'ju_email=operator; ju_access=pro_plus' }, { authorization: 'Basic ' + Buffer.from('customer:test-password').toString('base64') }, { authorization: 'Basic ' + Buffer.from('operator:wrong').toString('base64') }]) {
    res = response(); assert.equal(authorize({ headers }, res), false); assert.equal(res.statusCode, 401)
    assert.match(res.headers['Cache-Control'], /no-store/)
  }
  assert.equal(authorize({ headers: { authorization: 'Basic ' + Buffer.from('operator:test-password').toString('base64') } }, response()), true)
  delete process.env.ADMIN_USERNAMES; delete process.env.ADMIN_PASSWORD_SHA256
})
test('strict parsing of record fields', () => {
  assert.equal(parseUser('not-json'), null)
  assert.equal(parseUser('{}'), null)
  assert.deepEqual(parseUser({ email: 'A@Example.com', createdAt: 'invalid', verified: 'true' }), { email: 'a@example.com', createdAt: null, verified: false })
})
test('paginated SCAN deduplicates keys, ignores unrelated keys, aggregates UTC dates', async () => {
  const calls = []
  const result = await loadUsers(async (...args) => {
    calls.push(args)
    if (args[0] === 'SCAN') return args[1] === '0' ? ['17', ['user:a', 'paid:x']] : ['0', ['user:a', 'user:b', 'user:bad']]
    assert.deepEqual(args, ['MGET', 'user:a', 'user:b', 'user:bad'])
    return [JSON.stringify({ email: 'a@example.com', createdAt: '2026-01-01T00:00:00Z', verified: true }), JSON.stringify({ email: 'b@example.com', verified: false }), 'bad']
  })
  assert.equal(result.total, 2); assert.equal(result.verified, 1); assert.equal(result.malformed, 1); assert.equal(result.undated, 1)
  assert.deepEqual(result.dates, [['2026-01-01', 1]])
  assert.deepEqual(calls.slice(0, 2).map(c => c.slice(0, 5)), [['SCAN', '0', 'MATCH', 'user:*', 'COUNT'], ['SCAN', '17', 'MATCH', 'user:*', 'COUNT']])
  assert.ok(calls.every(c => ['SCAN', 'MGET'].includes(c[0])))
})
test('consent is separate and unknown unless explicit provenance exists', async () => {
  assert.equal(await consent('a@example.com', async (...args) => { assert.deepEqual(args, ['GET', 'marketing_consent:a@example.com']); return null }), 'unknown')
  assert.equal(await consent('a@example.com', async () => JSON.stringify({ verified: true })), 'unknown')
  assert.equal(await consent('a@example.com', async () => JSON.stringify({ status: 'granted', source: 'settings-checkbox-v1', recordedAt: '2026-01-01' })), 'granted')
})
test('subscription reports only Stripe evidence, errors remain unknown', async () => {
  const stripe = { customers: { list: async function* () { yield { id: 'cus_test' } } }, subscriptions: { list: async function* (args) { assert.equal(args.status, 'all'); yield { status: 'canceled' } } } }
  assert.equal(await subscription('a@example.com', stripe), 'canceled')
  assert.equal(await subscription('a@example.com', null), 'unknown (Stripe not configured)')
  assert.equal(await subscription('a@example.com', { customers: { list() { throw Error('offline') } } }), 'unknown (Stripe unavailable)')
})
test('CSV quotes delimiters and neutralizes spreadsheet formulas', () => {
  assert.equal(csvCell('a"b,c'), '"a""b,c"')
  for (const text of ['=CMD()', '+123', '-123', '@SUM(1)', '  =1', '\tfoo']) assert.ok(csvCell(text).startsWith('"\''))
})
test('Redis failure never yields partial report totals', async () => {
  await assert.rejects(loadUsers(async () => { throw Error('offline') }), /offline/)
})
