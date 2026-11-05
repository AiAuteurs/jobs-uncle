const fs = require('fs'), assert = require('assert'), { JSDOM } = require('jsdom')
const BRIDGE = fs.readFileSync(require('path').join(__dirname, '../Extension/jobsuncle-extension/jobsuncle-bridge.js'), 'utf8')
const wait = ms => new Promise(r => setTimeout(r, ms))

async function run(pageFirst, url = 'https://jobsuncle.ai/?src=ext', age = 0) {
  const w = new JSDOM('<body></body>', { url, runScripts: 'outside-only' }).window
  let store = { ju_pending_job: { title: 'Creative Lead', company: 'Krea', description: 'x'.repeat(200), ts: Date.now() - age } }
  w.chrome = { storage: { local: {
    get: k => Promise.resolve({ [k]: store[k] }),
    remove: k => { delete store[k]; return Promise.resolve() } } } }
  const got = []
  const page = () => {   // same logic as the index.js effect
    w.addEventListener('message', e => {
      const d = e.data
      if (!d || d.source !== 'jobsuncle-ext' || d.type !== 'JU_JOB') return
      w.postMessage({ source: 'jobsuncle-page', type: 'JU_ACK' }, w.location.origin)
      got.push(d.job)
    })
    w.postMessage({ source: 'jobsuncle-page', type: 'JU_PAGE_READY' }, w.location.origin)
  }
  // jsdom leaves e.origin '' and e.source null; give it browser semantics
  const orig = w.postMessage.bind(w)
  w.postMessage = (data, target) => {
    const ev = new w.MessageEvent('message', { data, origin: w.location.origin, source: w })
    setTimeout(() => w.dispatchEvent(ev), 0)
  }
  const code = BRIDGE
  if (pageFirst) { page(); await wait(10); w.eval(code) } else { w.eval(code); await wait(700); page() }
  await wait(1200)
  return { got, store }
}

;(async () => {
  let r = await run(true);  assert(r.got.length >= 1 && !r.store.ju_pending_job); console.log('  ✓ page hydrated before bridge → delivered, storage cleared')
  r = await run(false);     assert(r.got.length >= 1 && !r.store.ju_pending_job); console.log('  ✓ bridge before page hydrated → delivered on retry/READY, storage cleared')
  r = await run(true, 'https://jobsuncle.ai/'); assert(r.got.length === 0 && r.store.ju_pending_job); console.log('  ✓ no ?src=ext → bridge does nothing')
  r = await run(true, undefined, 11 * 60 * 1000); assert(r.got.length === 0 && !r.store.ju_pending_job); console.log('  ✓ stale (>10 min) job discarded')
  process.exit(0)
})().catch(e => { console.error('FAIL', e); process.exit(1) })
