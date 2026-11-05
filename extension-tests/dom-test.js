// DOM test: fake LinkedIn two-pane + /jobs/view/ markup, no LinkedIn class names on our critical path.
const fs = require('fs')
const assert = require('assert')
const { JSDOM } = require('jsdom')
const { KREA_JD } = require('./fixtures')

const CONTENT = fs.readFileSync(require('path').join(process.env.EXT_DIR || require('path').join(__dirname, '../Extension/jobsuncle-extension'), 'content.js'), 'utf8')
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const jdHtml = KREA_JD.split('\n').map(l => `<p>${esc(l) || '<br>'}</p>`).join('')

const topCard = (applyLabel) => `
  <div class="obfuscated-a1">
    <div><a href="https://www.linkedin.com/company/krea/life">Krea</a></div>
    <h1>Creative Lead</h1>
    <div>San Francisco, CA · 2 days ago</div>
    <div class="x9" style="display:flex">
      <div><button aria-label="${applyLabel} to Creative Lead at Krea"><span>${applyLabel}</span></button></div>
      <button aria-label="Save Creative Lead at Krea"><span>Save</span></button>
    </div>
    <div class="carousel" style="display:flex;overflow:hidden">
      <span>Job match is high</span>
      <button>Show match details</button><button>Tailor my resume</button>
      <button>Help me stand out</button><button>Create cover letter</button>
    </div>
  </div>`

const descAndAfter = `
  <div class="obfuscated-b2">
    <h2>About the job</h2>
    <div><span>${jdHtml}</span></div>
    <button>… more</button>
  </div>
  <div><h2>Benefits found in job post</h2><ul><li>Medical insurance</li></ul></div>
  <div><h2>About the company</h2><a href="https://www.linkedin.com/company/krea/">Krea</a></div>`

const leftList = `<ul>${Array.from({ length: 30 }, (_, i) =>
  `<li><div>Job card ${i}</div><div>Company ${i}</div><button aria-label="Save job ${i}">Save</button><span>Easy Apply</span></li>`).join('')}</ul>`

const BULLETS_URL = 'https://www.linkedin.com/jobs/view/5555/'
const TRUNCATED_URL = 'https://www.linkedin.com/jobs/search/?currentJobId=999&keywords=video'
const PAGES = {
  'https://www.linkedin.com/jobs/search/?currentJobId=4123&keywords=creative%20lead':
    `<header><button>Easy Apply</button><span>Date posted</span></header>
     <div style="display:flex"><div class="left">${'<div>99+ results</div>' + leftList}</div>
     <div class="right" style="overflow-y:auto">${topCard('Easy Apply')}${descAndAfter}</div></div>`,
  'https://www.linkedin.com/jobs/view/4123/':
    `<main>${topCard('Apply')}${descAndAfter}</main>`,
  // Description with a real <ul> list (LinkedIn's bullets are CSS markers, not text)
  [BULLETS_URL]:
    `<main>${topCard('Apply')}<div><h2>About the job</h2><div><p>${esc(KREA_JD.split('\n')[0])}</p><p>What You Will Work On</p><ul><li>Edit short-form videos for TikTok, Instagram Reels, and YouTube Shorts</li><li>Grab attention in the first second and keep people watching to the end</li></ul><p>Full-time. San Francisco preferred, remote work possible. Competitive salary and stock in the company.</p></div></div><div><h2>About the company</h2></div></main>`,
  // Description truncated in the DOM until "… more" is clicked
  [TRUNCATED_URL]:
    `<main>${topCard('Apply')}<div><h2>About the job</h2><div id="d"><p>${esc(KREA_JD.split('\n')[0])}</p><p>You will turn raw footage into short videos people… <button id="m">more</button></p></div></div>
     <div><h2>About the company</h2></div></main>`,
}

// jsdom has no layout or innerText; polyfill just enough
function setup(url, html) {
  const dom = new JSDOM(`<!doctype html><html><head><title>Creative Lead | Krea | LinkedIn</title></head><body>${html}</body></html>`,
    { url, runScripts: 'outside-only', pretendToBeVisual: true })
  const w = dom.window
  const BLOCK = new Set(['DIV', 'P', 'LI', 'UL', 'H1', 'H2', 'H3', 'H4', 'SECTION', 'MAIN', 'HEADER', 'BR'])
  const it = n => {
    if (n.nodeType === 3) return n.nodeValue
    if (n.nodeType !== 1) return ''
    let s = [...n.childNodes].map(it).join('')
    if (n.tagName === 'BUTTON' || n.tagName === 'SPAN' || n.tagName === 'A') return s
    return BLOCK.has(n.tagName) ? '\n' + s + '\n' : s
  }
  Object.defineProperty(w.HTMLElement.prototype, 'innerText', {
    get() { return it(this).replace(/\n{2,}/g, '\n').replace(/^\n|\n$/g, '') },
  })
  w.Element.prototype.getClientRects = function () { return [{}] }
  w.IntersectionObserver = class { constructor(cb) { this.cb = cb } observe() { this.cb([{ isIntersecting: true }]) } disconnect() {} }
  const sent = []
  w.chrome = { runtime: { id: 'test', getURL: p => 'chrome-extension://test/' + p, sendMessage: m => { sent.push(m); return Promise.resolve({ ok: true }) } } }
  w.eval(CONTENT)
  return { w, sent }
}

const wait = ms => new Promise(r => setTimeout(r, ms))

;(async () => {
  let pass = 0
  for (const [url, html] of Object.entries(PAGES)) {
    console.log(url === BULLETS_URL ? 'Bulleted list (bullets restored)' : url === TRUNCATED_URL ? 'Truncated description ("… more" must be clicked)' : url.includes('/view/') ? '/jobs/view/ page' : 'Two-pane search page')
    const { w, sent } = setup(url, html)
    if (url === TRUNCATED_URL) {
      w.document.getElementById('m').addEventListener('click', () => {
        w.document.getElementById('d').innerHTML = jdHtml // LinkedIn swaps in the full text
      })
    }
    await wait(1100)
    const d = w.document
    const wrap = d.getElementById('jobsuncle-wrapper')
    assert(wrap, 'button not injected'); pass++; console.log('  ✓ injected')

    const row = wrap.previousElementSibling; if (process.env.DBG) console.log('PREV:', row && row.outerHTML.slice(0,400), '\nPARENT:', wrap.parentElement.outerHTML.slice(0,200))
    assert(row.querySelector('button[aria-label^="Save Creative"]') && row.querySelector('button[aria-label*="pply to Creative"]'), 'not directly under Apply/Save')
    pass++; console.log('  ✓ own row directly under the Apply + Save row')
    assert(!wrap.closest('.carousel') && wrap.nextElementSibling.classList.contains('carousel'), 'inside/after carousel wrong')
    pass++; console.log('  ✓ outside the chip carousel (carousel is the next sibling)')
    assert.strictEqual(d.querySelector('#jobsuncle-inject-btn .ju-text').textContent, 'Tailor your resume for this job →'); pass++; console.log('  ✓ label')
    assert(d.querySelector('#jobsuncle-inject-btn .ju-mark').src.endsWith('icons/weasel-mark.png')); pass++; console.log('  ✓ weasel mark')
    assert.strictEqual(d.getElementById('jobsuncle-status').textContent, 'Creative Lead at Krea · ready'); pass++; console.log('  ✓ captured-state line: "' + d.getElementById('jobsuncle-status').textContent + '"')
    assert(sent.some(m => m.type === 'JU_JOB_STATE' && m.detected === true)); pass++; console.log('  ✓ badge message sent')

    d.getElementById('jobsuncle-inject-btn').click()
    await wait(700)
    const open = sent.find(m => m.type === 'JU_OPEN')
    assert(open, 'no JU_OPEN')
    assert.strictEqual(open.job.title, 'Creative Lead')
    assert.strictEqual(open.job.company, 'Krea')
    const norm = s => s.replace(/\n+/g, '\n')
    if (url === BULLETS_URL) {
      assert(open.job.description.includes('• Edit short-form videos for TikTok'), 'no bullet on list item')
      assert(open.job.description.includes('• Grab attention in the first second'), 'no bullet on second item')
      assert(!open.job.description.includes('• What You Will Work On'), 'bullet on a non-list line')
    } else assert.strictEqual(norm(open.job.description), norm(KREA_JD)) // polyfilled innerText drops blank lines
    pass++; console.log('  ✓ click → JU_OPEN with clean title/company and exact JD (' + open.job.description.length + ' chars)')
    assert(!w.location.href.includes('jd=')); pass++; console.log('  ✓ nothing in the URL')
  }
  console.log(`\n${pass} DOM tests passed`)
  process.exit(0)
})().catch(e => { console.error('FAIL', e); process.exit(1) })
