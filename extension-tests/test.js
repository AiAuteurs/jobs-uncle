const fs = require('fs')
const assert = require('assert')
const { KREA_JD, SEARCH_VIEW_TEXT, VIEW_PAGE_TEXT, INLINE_MORE_TEXT } = require('./fixtures')

// Pull the pure functions out of content.js without running the page code
const src = fs.readFileSync(require('path').join(process.env.EXT_DIR || require('path').join(__dirname, '../Extension/jobsuncle-extension'), 'content.js'), 'utf8')
const start = src.indexOf('const MAX_JD')
const end = src.indexOf('// ── LinkedIn DOM helpers')
const pure = src.slice(start, src.indexOf('\n', start)) + '\n' +
  src.slice(src.indexOf('// ── LinkedIn JD extraction'), end)
const { extractJDFromText, capText } = new Function(pure + '\nreturn { extractJDFromText, capText }')()

let pass = 0
const t = (name, fn) => { fn(); pass++; console.log('  ✓', name) }

console.log('Text extraction')
t('search view: exact Krea JD, nothing else', () => assert.strictEqual(extractJDFromText(SEARCH_VIEW_TEXT), KREA_JD))
t('search view: no left-list / chips / stats leak', () => {
  const jd = extractJDFromText(SEARCH_VIEW_TEXT)
  for (const junk of ['99+ results', 'Job card', 'Tailor my resume', 'Tailor Resume for This Job', 'Show match details', 'applicants', 'Benefits found', 'Medical insurance'])
    assert(!jd.includes(junk), 'leaked: ' + junk)
})
t('/jobs/view/: exact Krea JD, stops at "Show less"', () => assert.strictEqual(extractJDFromText(VIEW_PAGE_TEXT), KREA_JD))
t('in-JD "About Krea", "Benefits of…", "about the company\'s" do not cut early', () => assert(extractJDFromText(SEARCH_VIEW_TEXT).endsWith('(hybrid, 3 days).')))
t('C++ and $ survive (old ?jd= path mangled "+")', () => { const jd = extractJDFromText(SEARCH_VIEW_TEXT); assert(jd.includes('C++') && jd.includes('7+ years')) })
t('inline "… more" is stripped', () => assert.strictEqual(extractJDFromText(INLINE_MORE_TEXT), 'First paragraph.\nLast line of the JD here'))
t('no anchor → empty string (caller falls back)', () => assert.strictEqual(extractJDFromText('no heading here\njust text'), ''))
t('CRLF + nbsp normalized', () => assert.strictEqual(extractJDFromText('x\r\nAbout\u00a0the job\r\nHello\r\nAbout the company'), 'Hello'))
t('cap at ~12,000 chars on a line boundary', () => {
  const big = 'About the job\n' + Array.from({ length: 2000 }, (_, i) => 'Line ' + i + ' of a very long description').join('\n')
  const jd = extractJDFromText(big)
  assert(jd.length <= 12000 && jd.length > 11000, jd.length)
  assert(/description$/.test(jd))
})

if (process.argv[2]) {
  const real = fs.readFileSync(process.argv[2], 'utf8')
  const jd = extractJDFromText(real)
  console.log('\nReal paste → ' + jd.length + ' chars\n---- first 300 ----\n' + jd.slice(0, 300) + '\n---- last 300 ----\n' + jd.slice(-300))
}
console.log(`\n${pass} text tests passed`)
