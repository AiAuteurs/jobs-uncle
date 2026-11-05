// Universal-site tests: synthetic pages shaped like each board (not copies of their real HTML).
const fs = require('fs'), path = require('path'), assert = require('assert')
const { JSDOM } = require('jsdom')
const EXT = process.env.EXT_DIR || path.join(__dirname, '../Extension/jobsuncle-extension')
const CONTENT = fs.readFileSync(path.join(EXT, 'content.js'), 'utf8')

const JD_PARAS = [
  'We are looking for a Senior Video Editor to join our brand team.',
  'Responsibilities',
  'Edit launch films, social cuts and product demos.',
  'Own the post pipeline from ingest to delivery.',
  'Qualifications',
  '5+ years of experience with Premiere Pro and DaVinci Resolve.',
  'A reel that shows taste, pace and story.',
  'Benefits',
  'Health, dental, 401(k), and a real budget for gear.',
]
const JD_HTML = '<p>' + JD_PARAS[0] + '</p><h3>' + JD_PARAS[1] + '</h3><ul><li>' + JD_PARAS[2] + '</li><li>' + JD_PARAS[3] +
  '</li></ul><h3>' + JD_PARAS[4] + '</h3><ul><li>' + JD_PARAS[5] + '</li><li>' + JD_PARAS[6] + '</li></ul><h3>' + JD_PARAS[7] + '</h3><p>' + JD_PARAS[8] + '</p>'
const ld = (title, org, desc = JD_HTML) =>
  `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'JobPosting', title, hiringOrganization: { '@type': 'Organization', name: org }, description: desc, datePosted: '2026-11-01' })}</script>`
const jobList = n => `<ul class="results">${Array.from({ length: n }, (_, i) =>
  `<li><a href="/job/${i}">Video Editor ${i}</a><a href="/co/${i}">Company ${i}</a><span>Remote · Full-time</span><a href="/job/${i}">Easy Apply</a></li>`).join('')}</ul>`
const searchBar = `<header><nav><a href="/">Home</a><button>Easy Apply</button><button>Remote</button></nav></header>`

const SITES = [
  { name: 'Indeed (viewjob, stable #jobDescriptionText)', url: 'https://www.indeed.com/viewjob?jk=abc123',
    html: `${searchBar}<main><h1>Senior Video Editor</h1><div data-testid="inlineHeader-companyName"><a>Northwind Studio</a></div>
      <div class="x" style="display:flex"><button>Apply now</button><button aria-label="Save this job">♡</button></div>
      <div id="jobDescriptionText">${JD_HTML}</div></main>`,
    expect: { title: 'Senior Video Editor', source: 'selector' } },
  { name: 'Indeed (search split view ?vjk=)', url: 'https://www.indeed.com/jobs?q=video+editor&vjk=abc123',
    html: `${searchBar}<div style="display:flex"><div>${jobList(15)}</div><div style="overflow-y:auto"><h1>Senior Video Editor</h1>
      <div style="display:flex"><button>Apply now</button></div><div id="jobDescriptionText">${JD_HTML}</div></div></div>`,
    expect: { title: 'Senior Video Editor', source: 'selector' } },
  { name: 'Glassdoor (JSON-LD, hashed classes)', url: 'https://www.glassdoor.com/job-listing/senior-video-editor-JV_IC1147401_KO0,19.htm?jl=1009',
    html: `${ld('Senior Video Editor', 'Northwind Studio')}${searchBar}<div class="JobDetails_x9f2"><h1 class="heading_Q1a">Senior Video Editor</h1>
      <div class="flex_r8" style="display:flex"><button class="btn_e1">Easy Apply</button><button>Save</button></div>
      <div class="JobDetails_jobDescription__6V1w4">${JD_HTML}</div><button>Show more</button></div>`,
    expect: { title: 'Senior Video Editor', company: 'Northwind Studio', source: 'json-ld' } },
  { name: 'ZipRecruiter (JSON-LD, "1-Click Apply")', url: 'https://www.ziprecruiter.com/c/Northwind-Studio/Job/Senior-Video-Editor/-in-Los-Angeles,CA?jid=77',
    html: `${ld('Senior Video Editor', 'Northwind Studio')}<main><h1>Senior Video Editor</h1><div style="display:flex"><button>1-Click Apply</button></div><section>${JD_HTML}</section></main>`,
    expect: { company: 'Northwind Studio', source: 'json-ld' } },
  { name: 'Monster (no JSON-LD, "Quick Apply", heading anchor)', url: 'https://www.monster.com/job-openings/senior-video-editor-los-angeles-ca--4a7c',
    html: `${searchBar}<main><h1>Senior Video Editor</h1><a href="/apply" role="button">Quick Apply</a>
      <div><h2>Description</h2><div>${JD_HTML}</div></div><footer><a>About</a><a>Privacy</a></footer></main>`,
    expect: { source: 'dom' } },
  { name: 'CareerBuilder ("Apply Now", density fallback, no heading)', url: 'https://www.careerbuilder.com/job/J3T6Z96R2S9',
    html: `${searchBar}<h1>Senior Video Editor</h1><div><a class="btn" href="/apply">Apply Now</a></div><div>${jobList(4)}</div><div class="cb-col">${JD_HTML}</div>`,
    expect: { source: 'dom' } },
  { name: 'USAJOBS (Summary/Duties headings)', url: 'https://www.usajobs.gov/job/812345600',
    html: `<main><h1>Video Production Specialist</h1><div><a href="/apply" class="usajobs-button">Apply</a></div>
      <section><h2>Summary</h2><p>Join the agency media team producing public-facing video.</p>
      <h2>Duties</h2><ul><li>${JD_PARAS[2]}</li><li>${JD_PARAS[3]}</li></ul><h2>Requirements</h2><p>${JD_PARAS[5]}</p><h3>Qualifications</h3><p>${JD_PARAS[6]}</p></section></main>`,
    expect: { title: 'Video Production Specialist', source: 'dom' } },
  { name: 'FlexJobs ("Apply" link)', url: 'https://www.flexjobs.com/remote-jobs/senior-video-editor-abc',
    html: `<main><h1>Senior Video Editor</h1><a href="/apply">Apply</a><div><h2>Job Description</h2>${JD_HTML}</div></main>`,
    expect: { source: 'dom' } },
  { name: 'Greenhouse (company ATS, JSON-LD)', url: 'https://job-boards.greenhouse.io/northwind/jobs/4012345',
    html: `${ld('Senior Video Editor', 'Northwind Studio')}<div class="app-title"><h1>Senior Video Editor</h1></div><div id="content">${JD_HTML}</div><a href="#app">Apply for this job</a>`,
    expect: { source: 'json-ld', company: 'Northwind Studio' } },
  { name: 'Lever (no JSON-LD)', url: 'https://jobs.lever.co/northwind/1b2c3d',
    html: `<div class="posting-headline"><h2>Senior Video Editor</h2></div><div class="section-wrapper"><div class="section">${JD_HTML}</div></div><a class="postings-btn">Apply for this job</a>`,
    expect: { source: 'dom' } },
  { name: 'Workday (stable data-automation-id)', url: 'https://northwind.wd5.myworkdayjobs.com/en-US/careers/job/Los-Angeles/Senior-Video-Editor_R123',
    html: `<h2 data-automation-id="jobPostingHeader">Senior Video Editor</h2><a data-automation-id="adventureButton" role="button">Apply</a><div data-automation-id="jobPostingDescription">${JD_HTML}</div>`,
    expect: { source: 'selector' } },
  { name: 'JSON-LD double-escaped HTML', url: 'https://careers.example.com/jobs/88',
    html: `${ld('Senior Video Editor', 'Northwind Studio', JD_HTML.replace(/</g, '&lt;').replace(/>/g, '&gt;'))}<h1>Senior Video Editor</h1><button>Apply</button>`,
    expect: { source: 'json-ld' } },
]

const NEGATIVE = [
  { name: 'Blog post that talks about jobs (no inject)', url: 'https://someblog.com/2026/remote-work-tips',
    html: `<h1>10 remote work tips</h1><article><p>Remote, hybrid, full-time: salary and benefits matter. Responsibilities and qualifications are listed in most job descriptions. You will need skills and years of experience.</p>${'<p>Filler paragraph about working from home and productivity tips for everyone.</p>'.repeat(8)}</article>` },
  { name: 'Job search results list only (no description open)', url: 'https://www.example-jobs.com/jobs?q=editor',
    html: `${searchBar}<h1>Editor jobs</h1>${jobList(30)}` },
  { name: 'Stale JSON-LD from previous job in SPA (ignored, DOM used)', url: 'https://careers.example.com/jobs/99',
    html: `${ld('Barista', 'Coffee Co', '<p>Make coffee.</p>')}<h1>Senior Video Editor</h1><button>Apply</button><div><h2>About the role</h2>${JD_HTML}</div>`,
    expectInject: { title: 'Senior Video Editor', source: 'dom' } },
]

function setup(url, html) {
  const dom = new JSDOM(`<!doctype html><html><head><title>Senior Video Editor - Jobs</title></head><body>${html}</body></html>`,
    { url, runScripts: 'outside-only', pretendToBeVisual: true })
  const w = dom.window
  const BLOCK = new Set(['DIV', 'P', 'LI', 'UL', 'H1', 'H2', 'H3', 'H4', 'SECTION', 'MAIN', 'HEADER', 'ARTICLE', 'FOOTER', 'NAV'])
  const it = n => {
    if (n.nodeType === 3) return n.nodeValue
    if (n.nodeType !== 1 || n.tagName === 'SCRIPT' || n.tagName === 'STYLE') return ''
    const s = [...n.childNodes].map(it).join('')
    return BLOCK.has(n.tagName) ? '\n' + s + '\n' : s
  }
  Object.defineProperty(w.HTMLElement.prototype, 'innerText', { get() { return it(this).replace(/\n{2,}/g, '\n').replace(/^\n|\n$/g, '') } })
  w.Element.prototype.getClientRects = function () { return [{}] }
  w.IntersectionObserver = class { constructor(cb) { this.cb = cb } observe() { this.cb([{ isIntersecting: true }]) } disconnect() {} }
  const sent = []
  w.chrome = { runtime: { id: 't', getURL: p => 'chrome-extension://t/' + p, sendMessage: m => { sent.push(m); return Promise.resolve({ ok: true }) } } }
  w.eval(CONTENT)
  return { w, sent }
}
const wait = ms => new Promise(r => setTimeout(r, ms))

;(async () => {
  let pass = 0, fail = 0
  const check = async (name, fn) => {
    try { await fn(); pass++; console.log('  ✓', name) } catch (e) { fail++; console.log('  ✗', name, '\n     ', e.message) }
  }
  console.log('Should inject:')
  for (const site of SITES) {
    await check(site.name, async () => {
      const { w, sent } = setup(site.url, site.html)
      await wait(site.url.includes('myworkday') ? 2700 : 1400)
      const wrap = w.document.getElementById('jobsuncle-wrapper')
      assert(wrap, 'no button')
      assert(!wrap.classList.contains('ju-floating'), 'fell back to floating')
      assert(!wrap.closest('nav, header, footer'), 'landed in nav/header/footer')
      w.document.getElementById('jobsuncle-inject-btn').click()
      await wait(20)
      const job = sent.find(m => m.type === 'JU_OPEN')?.job
      assert(job, 'click sent nothing')
      for (const p of JD_PARAS.filter(x => !/^(Responsibilities|Qualifications|Benefits)$/.test(x) || site.expect.source !== 'dom' || !site.url.includes('usajobs')))
        if (!site.url.includes('usajobs') || !/senior video editor|^Benefits$|Health/.test(p))
          if (!site.url.includes('usajobs')) assert(job.description.includes(p), 'missing: ' + p)
      assert(!/Company \d|Video Editor \d|Privacy/.test(job.description), 'job-list / footer junk leaked')
      for (const [k, v] of Object.entries(site.expect)) assert.strictEqual(job[k], v, k)
      assert(job.title, 'no title')
      const where = wrap.previousElementSibling ? wrap.previousElementSibling.textContent.trim().slice(0, 30) : '(top)'
      console.log(`      → ${job.source}, "${job.title}"${job.company ? ' @ ' + job.company : ''}, ${job.description.length} chars, after "${where}"`)
    })
  }
  console.log('\nShould NOT misfire:')
  for (const site of NEGATIVE) {
    await check(site.name, async () => {
      const { w, sent } = setup(site.url, site.html)
      await wait(1400)
      const wrap = w.document.getElementById('jobsuncle-wrapper')
      if (site.expectInject) {
        assert(wrap, 'no button')
        w.document.getElementById('jobsuncle-inject-btn').click(); await wait(20)
        const job = sent.find(m => m.type === 'JU_OPEN').job
        for (const [k, v] of Object.entries(site.expectInject)) assert.strictEqual(job[k], v, k)
        assert(!job.description.includes('Make coffee'))
      } else {
        assert(!wrap, 'injected where it should not')
        assert(!sent.some(m => m.type === 'JU_JOB_STATE' && m.detected), 'badge lit')
      }
    })
  }
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})()
