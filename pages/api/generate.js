import formidable from 'formidable'
import fs from 'fs'
import Anthropic from '@anthropic-ai/sdk'

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
  maxDuration: 300,
}

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function extractTextFromFile(filePath, mimeType, originalName) {
  const ext = (originalName || '').split('.').pop().toLowerCase()

  // TXT
  if (ext === 'txt' || mimeType === 'text/plain') {
    return fs.readFileSync(filePath, 'utf8')
  }

  // DOCX — use jszip (already in dependencies)
  if (ext === 'docx' || ext === 'doc' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword') {
    const JSZip = require('jszip')
    const buffer = fs.readFileSync(filePath)
    const zip = await JSZip.loadAsync(buffer)
    const xmlFile = zip.file('word/document.xml')
    if (!xmlFile) throw new Error('Could not find document.xml in DOCX')
    const xml = await xmlFile.async('string')
    const text = xml
      .replace(/<w:p[ >]/g, '\n<w:p ')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    return text
  }

  // PDF — default
  const buffer = fs.readFileSync(filePath)
  const pdfParse = require('pdf-parse')
  const data = await pdfParse(buffer)
  return data.text
}


// ─── ATS KEYWORD MATCH SCORING — restored original that scored 90% ─────────────

/**
 * Extracts meaningful keywords from a job description and scores them
 * against the generated resume. No extra API call — pure JS.
 * Returns { score, matched, missing, total }
 */
function scoreKeywordMatch(resumeText, jobDescription) {
  const STOP = new Set([
    'the','and','or','of','to','a','an','in','for','with','on','at','by','from',
    'is','are','was','were','be','been','being','have','has','had','do','does',
    'did','will','would','could','should','may','might','shall','can','need',
    'this','that','these','those','we','you','your','our','their','its','it',
    'as','if','so','but','not','no','nor','yet','both','either','each','more',
    'most','other','some','such','than','then','there','when','where','who',
    'which','while','about','above','after','before','between','into','through',
    'during','including','across','within','without','along','following','across',
    'behind','beyond','plus','except','up','out','around','down','off','above',
    'use','using','used','work','working','experience','ability','strong','proven',
    'demonstrated','required','preferred','including','ensure','maintain','manage',
    'support','provide','develop','create','build','apply','help','make','take',
    'give','get','set','keep','let','put','go','come','run','lead','drive',
    'multiple','various','all','any','every','many','much','few','new','own',
    'same','different','high','low','large','small','long','short','full','open',
    'role','position','team','company','business','client','project','process',
    'based','well','also','very','highly','quickly','effectively','efficiently',
    'looking','seeking','join','hybrid','onsite','remote','days','week','month',
    'year','years','global','local','group','firm','serving','located','new',
    'please','apply','must','will','able','across','within','including','ensure',
    'responsible','opportunity','ideal','candidate','qualified','preferred',
    'meridian','york','stake','stakes','location','workforce',
    'what','three','fortune','world','include','apos','two','four','five',
    'them','kind','respectful','offer','improve','variety','satisfaction','members',
    'listen','interactions','documenting','resolving','advocate','respond','caring',
    'compassionate','inspiring','joining','forces','putting','people','heart','work',
    'obsessed','trust','address','connections','doctors','providers','employers',
    'plans','options','resolve','empathy','benefits','benefit','resources',
    'welcome','colleague','colleagues','ongoing','assigned','reporting','eligible',
    'typical','anticipated','commitment','potential','adhering','willingness',
    'seeking','passionate','excited','driven','dedicated','motivated','committed',
    'salary','compensation','depending','factors','competitive','financial','equity',
    'dental','vision','insurance','matching','purchase','401k','benefits','bonus',
    'vacation','holidays','closure','hybrid','telework','agreement','internet',
    'access','workplace','category','programs','coaching','mentoring','orientation',
    'ranging','regardless','geography','relevant','performance','compliance',
    'six','seven','eight','nine','ten','like','just','make','know','want',
    'good','great','best','first','last','next','said','says','per','via',
    'clients','countries','ecosystems','academies','companies','apos',
  ])

  const TECH_SIGNALS = [
    'premiere','effects','photoshop','lightroom','resolve','editing',
    'video','instagram','facebook','reels','footage','motion',
    'graphics','color','audio','animation','dslr','cinema','broadcast',
    'documentary','narrative','generative','tiktok','asana','iconik',
    'elevenlabs','runway','midjourney','sora','pika','kling','minimax',
    'seedance','veo','topaz','mmaudio','heygen','synthesia','figma',
    'analytics','strategy','leadership','communication','collaboration',
    'stakeholder','curriculum','instructional','learning','training',
    'assessment','performance','outcomes','metrics','reporting',
    'compliance','regulatory','healthcare','clinical','patient',
    'engineering','software','development','javascript','python',
    'typescript','react','backend','frontend','database','cloud',
    'aws','azure','salesforce','tableau','excel','powerpoint',
    'project','agile','scrum','product','research','data',
    'financial','accounting','revenue','budget','forecasting',
    'marketing','campaigns','seo','email','branding','copywriting',
    'operations','logistics','procurement','vendor','contract',
    'recruitment','onboarding','retention','diversity','inclusion',
    'management','enterprise','technical','platform','integration',
    'communications','content','design','workflow','standards',
    'payments','fintech','settlement','merchant','checkout','api',
    'sql','amplitude','mixpanel','okr','gmv','arr','churn',
  ]

  const jdLower = jobDescription.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
  const jdWords = jdLower.split(/\s+/).filter(w => w.length >= 5 && !STOP.has(w))
  const freq = {}
  jdWords.forEach(w => { freq[w] = (freq[w] || 0) + 1 })

  const jdKeywords = Object.entries(freq)
    .filter(([word, count]) => count >= 2 || TECH_SIGNALS.some(t => word.includes(t)))
    .map(([word]) => word)

  const candidates = [...new Set(jdKeywords)]
    .filter(k => k.length >= 4)
    .slice(0, 40)

  const resumeLower = resumeText.toLowerCase()
  const matched = [], missing = []

  function simpleStem(w) {
    if (w.endsWith('ing') && w.length > 6) return w.slice(0, -3)
    if (w.endsWith('tion') && w.length > 7) return w.slice(0, -4)
    if (w.endsWith('ed') && w.length > 5) return w.slice(0, -2)
    if (w.endsWith('ly') && w.length > 5) return w.slice(0, -2)
    if (w.endsWith('ment') && w.length > 7) return w.slice(0, -4)
    if (w.endsWith('s') && w.length > 5) return w.slice(0, -1)
    return w
  }

  const resumeWords = resumeLower.split(/\s+/)
  candidates.forEach(kw => {
    const kwStem = simpleStem(kw)
    const found = resumeLower.includes(kw) ||
      resumeLower.includes(kw.endsWith('s') ? kw.slice(0, -1) : kw + 's') ||
      resumeWords.some(w => simpleStem(w) === kwStem)
    if (found) matched.push(kw)
    else missing.push(kw)
  })

  const score = candidates.length > 0
    ? Math.round((matched.length / candidates.length) * 100)
    : 0

  const missingByImportance = missing
    .sort((a, b) => (freq[b] || 0) - (freq[a] || 0))
    .slice(0, 15)

  return {
    score,
    matched: matched.slice(0, 30),
    missing: missingByImportance,
    total: candidates.length,
  }
}

// ─── END ATS KEYWORD MATCH ─────────────────────────────────────────────────────


/**
 * Parse all jobs from raw resume text.
 * Returns array of { employer, title, startDate, endDate, rawDateStr, lineIndex }
 * Handles formats: Jan 2020, January 2020, 01/2020, 2020, Present/Current/Now
 */
function parseJobsFromResume(resumeText) {
  const lines = resumeText.split('\n')
  const jobs = []

  const MONTH_MAP = {
    jan:1, feb:2, mar:3, apr:4, may:5, jun:6,
    jul:7, aug:8, sep:9, oct:10, nov:11, dec:12,
    january:1, february:2, march:3, april:4, june:6,
    july:7, august:8, september:9, october:10, november:11, december:12
  }

  // Matches: "Jan 2020 - Mar 2022", "2019 - Present", "Feb 2019 - Oct 2020", "Sept. 2016 - Dec 2016"
  // NOTE: Use alternation ([-–—]+|\\bto\\b) NOT a char class — char class would consume 't','o' from month names
  const DATE_RANGE_RE = /([a-z]+\.?\s*\d{4}|\d{1,2}\/\d{4}|\d{4})\s*(?:[-–—]+|to)\s*([a-z]+\.?\s*\d{4}|\d{1,2}\/\d{4}|\d{4}|present|current|now)/gi

  function parseMonthYear(str) {
    if (!str) return null
    str = str.trim().toLowerCase().replace(/\.$/, '')
    if (['present','current','now'].includes(str)) {
      const n = new Date()
      return { year: n.getFullYear(), month: n.getMonth() + 1, isPresent: true }
    }
    // "jan 2020" or "january 2020"
    const mdy = str.match(/^([a-z]+)\.?\s+(\d{4})$/)
    if (mdy) {
      const month = MONTH_MAP[mdy[1].replace(/\.$/, '')] || 1
      return { year: parseInt(mdy[2]), month, isPresent: false }
    }
    // "01/2020"
    const slash = str.match(/^(\d{1,2})\/(\d{4})$/)
    if (slash) return { year: parseInt(slash[2]), month: parseInt(slash[1]), isPresent: false }
    // bare year "2020"
    const yr = str.match(/^(\d{4})$/)
    if (yr) return { year: parseInt(yr[1]), month: 1, isPresent: false }
    return null
  }

  function toTimestamp(parsed) {
    if (!parsed) return null
    return parsed.year * 12 + (parsed.month - 1)
  }

  lines.forEach((line, lineIndex) => {
    let match
    DATE_RANGE_RE.lastIndex = 0
    while ((match = DATE_RANGE_RE.exec(line)) !== null) {
      const start = parseMonthYear(match[1])
      const end = parseMonthYear(match[2])
      if (!start) continue

      // Try to grab employer from nearby lines (look back up to 3 lines)
      let employer = ''
      for (let i = lineIndex; i >= Math.max(0, lineIndex - 3); i--) {
        const candidate = lines[i].trim()
        if (candidate && !/^\s*[-•]/.test(candidate) && candidate.length > 2 && candidate.length < 100) {
          employer = candidate
          break
        }
      }

      jobs.push({
        employer,
        rawDateStr: match[0],
        startDate: toTimestamp(start),
        endDate: end ? toTimestamp(end) : toTimestamp(start) + 1,
        isCurrentRole: end?.isPresent || false,
        startYear: start.year,
        lineIndex,
      })
    }
  })

  return jobs
}

/**
 * Tag each job as PROTECTED or DROPPABLE.
 * PROTECTED if:
 *   - The job is within the last 7 years, OR
 *   - Removing it would create a gap of more than 6 months in the timeline
 */
function tagProtectedJobs(jobs) {
  if (!jobs.length) return []

  const currentYear = new Date().getFullYear()
  const sevenYearsAgo = (currentYear - 7) * 12

  // Sort ascending by start date
  const sorted = [...jobs].sort((a, b) => a.startDate - b.startDate)

  return sorted.map((job, i) => {
    const withinSevenYears = job.startDate >= sevenYearsAgo

    // Check if removing this job creates a gap: look at previous job's end vs next job's start
    let createsGap = false
    if (i > 0 && i < sorted.length - 1) {
      const prevEnd = sorted[i - 1].endDate
      const nextStart = sorted[i + 1].startDate
      const gapWithout = nextStart - prevEnd // months gap if this job removed
      if (gapWithout > 6) createsGap = true
    } else if (i === 0 && sorted.length > 1) {
      // First job — check if gap between it and next job is large
      // (no prior job, so no gap created by removing it — unless it's the only bridge)
      createsGap = false
    } else if (i > 0 && i === sorted.length - 1) {
      // Last job — if it's not current role, removing it doesn't create a forward gap
      // but if there's a big gap before it started, it's already flagged by prev iteration
      createsGap = false
    }

    return {
      ...job,
      protected: withinSevenYears || createsGap,
      protectedReason: withinSevenYears ? '7-year rule' : createsGap ? 'fills employment gap' : null,
    }
  })
}

/**
 * Build a human-readable manifest of protected jobs to inject into the prompt.
 */
function buildJobManifest(taggedJobs) {
  if (!taggedJobs.length) return ''

  const lines = ['ALL JOBS FROM RESUME (must account for every item below):']
  taggedJobs
    .sort((a, b) => b.startDate - a.startDate) // reverse chron for readability
    .forEach(j => {
      const status = j.protected ? '🔒 PROTECTED' : '○ DROPPABLE'
      const reason = j.protectedReason ? ` (${j.protectedReason})` : ''
      lines.push(`  ${status}${reason}: ${j.employer || '[employer]'} — ${j.rawDateStr}`)
    })

  lines.push('')
  lines.push(`TOTAL JOB COUNT: ${taggedJobs.length}`)
  lines.push(`PROTECTED COUNT: ${taggedJobs.filter(j => j.protected).length}`)
  return lines.join('\n')
}

// ─── END GAP DETECTION ────────────────────────────────────────────────────────

/**
 * Auto format: pick the layout that fits the person's actual career.
 * Chronological is the safe default recruiters and ATS expect. Skills-based (hybrid)
 * only when the history really is freelance/contract: most recent work labelled
 * freelance/contract, or lots of short, overlapping engagements.
 * Returns { type: 'fulltime' | 'freelance', reason }
 */
const FREELANCE_WORDS = /\b(freelance[rd]?|free-lance|contract(or|ed)?|contract role|self[- ]employed|independent|consultant|consulting|1099|various clients|multiple clients|gig)\b/i

function detectCareerType(resumeText, jobs) {
  const lines = resumeText.split('\n')
  const now = new Date()
  const nowTs = now.getFullYear() * 12 + now.getMonth()
  const windowStart = nowTs - 60 // last 5 years

  // de-dupe the same date range found twice (e.g. header + body)
  const seen = new Set()
  const unique = jobs.filter(j => {
    const k = `${j.startDate}-${j.endDate}-${(j.employer || '').slice(0, 30)}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  const recent = unique.filter(j => j.endDate >= windowStart)

  if (recent.length === 0) {
    const hits = (resumeText.match(new RegExp(FREELANCE_WORDS.source, 'gi')) || []).length
    return hits >= 3
      ? { type: 'freelance', reason: 'your resume describes freelance or contract work' }
      : { type: 'fulltime', reason: 'it suits most careers and is what recruiters expect' }
  }

  const context = j => [lines[j.lineIndex - 1], lines[j.lineIndex], lines[j.lineIndex + 1], j.employer].filter(Boolean).join(' ')
  const freelanceRecent = recent.filter(j => FREELANCE_WORDS.test(context(j))).length

  let overlaps = 0
  for (let a = 0; a < recent.length; a++) {
    for (let b = a + 1; b < recent.length; b++) {
      const o = Math.min(recent[a].endDate, recent[b].endDate) - Math.max(recent[a].startDate, recent[b].startDate)
      if (o > 2) overlaps++
    }
  }
  const tenures = recent.map(j => Math.max(1, j.endDate - j.startDate)).sort((x, y) => x - y)
  const median = tenures[Math.floor(tenures.length / 2)]

  let score = 0
  if (recent.length >= 6) score++
  if (overlaps >= 2) score++
  if (recent.length >= 4 && median < 9) score++

  if (freelanceRecent / recent.length >= 0.5) {
    return { type: 'freelance', reason: 'most of your recent work is freelance or contract' }
  }
  if (score >= 2) {
    return { type: 'freelance', reason: 'your recent work is many short or overlapping engagements' }
  }
  return { type: 'fulltime', reason: 'your recent roles are steady positions' }
}

/**
 * FACT CHECK — second pass that compares generated text against the source resume.
 * Fixes claims the source doesn't support (invented causes/methods, achievements moved
 * to another job, merged projects, inflated scope) with the smallest possible edit.
 * Never throws: on any failure it returns the documents unchanged with checked: false.
 */
const FACT_CHECK_MODEL = process.env.FACT_CHECK_MODEL || 'claude-haiku-4-5'
const FACT_CHECK_TIMEOUT_MS = 45000

const numbersIn = (t) => (String(t).match(/\d[\d,.]*\s*[%xkKmMbB]?/g) || []).map(n => n.replace(/\s+/g, '').toLowerCase())

// ── Code checks that don't rely on AI judgment ──────────────────────────────
// Every achievement worth checking has a number ("3.6M views", "52% to 78%", "2.4x").
// We record where each number lives in the source (which job, or an unattached
// "Selected work" item) and whether the source explains it with a cause, then
// flag output sentences that move it or invent a "by/through/because".
const METRIC_RE = /\$?\d+(?:[.,]\d+)?\s?(?:%|[kKmMbB]\b|x\b)/g
const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?'
const DATE_RANGE_RE = new RegExp(`(?:${MONTH}\\s+)?(?:19|20)\\d{2}\\s*[–—-]\\s*(?:(?:${MONTH}\\s+)?(?:19|20)\\d{2}|present|current|now)`, 'i')
const UNATTACHED_LABEL = /^(selected work|selected projects|projects|portfolio|highlights|notable work|key projects)$/i
const OTHER_LABEL = /^(summary|professional summary|profile|about|skills|core skills|skills and tools|skills & tools|tools|software|education|certifications?|awards|languages|interests|experience|work experience|professional experience|employment history)$/i
const CAUSE_RE = /\b(by (?!friday|monday|tuesday|wednesday|thursday|saturday|sunday|the end|end of|day|week|month|quarter|year|\d)\w+|through|thanks to|because|due to|driven by|as a result of|which (?:led|drove|pushed|lifted|raised))\b/i
const STOP_TOKENS = new Set(['senior', 'junior', 'lead', 'video', 'editor', 'editing', 'growth', 'present', 'current', 'remote', 'hybrid', 'manager', 'director', 'creative', 'designer', 'producer', 'specialist', 'associate', 'head', 'the', 'and', 'inc', 'llc', 'ltd'])

const cleanLine = (l) => l.replace(/\*\*/g, '').replace(/^#{1,3}\s+/, '').replace(/^[-•*–]\s+/, '').trim()
const metricsIn = (t) => (String(t).match(METRIC_RE) || []).map(m => m.replace(/\s+/g, '').toLowerCase())
const splitSentences = (t) => String(t).replace(/\n+/g, ' \n ').split(/(?<=[.!?])\s+(?=[A-Z"“])|\n/).map(x => x.trim()).filter(Boolean)

// PDFs break sentences across lines ("…from\n38% to 61%."). Rejoin wrapped lines into
// logical lines: a new one starts at a bullet, a section title, a job header, or after a blank line.
function logicalLines(text) {
  const raw = String(text).replace(/\r/g, '').split('\n')
  const out = []
  let startNew = true
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i].trim()
    if (!r) { startNew = true; continue }
    if (/^[•●▪◦\-*–]$/.test(r)) { startNew = true; out.push('- '); startNew = false; out.isBulletPending = true; continue }
    const bare = cleanLine(r).replace(/:$/, '')
    const boundary = /^[-•●▪◦*–]\s/.test(r) || UNATTACHED_LABEL.test(bare) || OTHER_LABEL.test(bare) ||
      (r.length < 200 && DATE_RANGE_RE.test(r) && !/[.!?]$/.test(r))
    if (out.isBulletPending) { out[out.length - 1] += r; out.isBulletPending = false; startNew = false; continue }
    if (startNew || boundary || !out.length) out.push(r)
    else out[out.length - 1] += ' ' + r
    startNew = UNATTACHED_LABEL.test(bare) || OTHER_LABEL.test(bare) || (r.length < 200 && DATE_RANGE_RE.test(r) && !/[.!?]$/.test(r))
  }
  return out
}

// Walk a document line by line, tagging each line with its block: a job header, an unattached section, or other
function blocksOf(text) {
  const out = []
  let owner = { kind: 'other', header: '' }
  for (const raw of logicalLines(text)) {
    const line = cleanLine(raw)
    if (!line) continue
    const bare = line.replace(/:$/, '')
    if (UNATTACHED_LABEL.test(bare)) { owner = { kind: 'unattached', header: bare }; continue }
    if (OTHER_LABEL.test(bare)) { owner = { kind: 'other', header: bare }; continue }
    if (!/^[-•*–]\s/.test(raw.trim()) && line.length < 200 && DATE_RANGE_RE.test(line)) {
      owner = { kind: 'job', header: line }
      continue
    }
    out.push({ line, owner })
  }
  return out
}

function headerTokens(header) {
  return new Set((header.match(/[A-Z][A-Za-z&'’.-]{3,}/g) || []).map(w => w.toLowerCase()).filter(w => !STOP_TOKENS.has(w)))
}

function findSuspects(sourceResume, docs) {
  try {
    return findSuspectsUnsafe(sourceResume, docs)
  } catch (e) {
    console.error('Code checks skipped:', e?.message || e)
    return []
  }
}

function findSuspectsUnsafe(sourceResume, docs) {
  const src = blocksOf(sourceResume)
  const jobHeaders = [...new Set(src.filter(b => b.owner.kind === 'job').map(b => b.owner.header))]
  // tokens that identify exactly one job (e.g. "stillwater", "brightline", "oakland")
  const counts = {}
  jobHeaders.forEach(h => headerTokens(h).forEach(t => { counts[t] = (counts[t] || 0) + 1 }))
  const distinctive = new Map(jobHeaders.map(h => [h, [...headerTokens(h)].filter(t => counts[t] === 1)]))
  const allDistinctive = [...distinctive.values()].flat()

  // metric → where it lives in the source, and whether the source explains it
  const where = {}
  for (const b of src) {
    for (const m of metricsIn(b.line)) {
      (where[m] = where[m] || { owners: [], sentences: [] })
      where[m].owners.push(b.owner)
      splitSentences(b.line).filter(x => metricsIn(x).includes(m)).forEach(x => where[m].sentences.push(x))
    }
  }
  const tokensFor = (owner) => owner.kind === 'job' ? (distinctive.get(owner.header) || []) : []
  const sourceHasCause = (m) => (where[m]?.sentences || []).some(x => CAUSE_RE.test(x))

  // Phrase fingerprints: 3-word runs that occur in exactly one source item ("top install source",
  // "6-minute user interview"). They survive when the AI drops the number but keeps the false claim.
  const STOPW = new Set(['the', 'and', 'for', 'with', 'into', 'that', 'this', 'from', 'our', 'their', 'a', 'an', 'of', 'to', 'in', 'on', 'at', 'by', 'as', 'or', 'is', 'was', 'were', 'it'])
  const tri = (t) => {
    const w = wordsOf(t).filter(x => x.length > 1)
    const out = []
    for (let i = 0; i + 3 <= w.length; i++) {
      const g = w.slice(i, i + 3)
      if (g.filter(x => STOPW.has(x)).length >= 2) continue
      out.push(g.join(' '))
    }
    return out
  }
  const triCount = {}
  src.forEach(b => new Set(tri(b.line)).forEach(g => { triCount[g] = (triCount[g] || 0) + 1 }))
  const items = src
    .filter(b => b.owner.kind === 'job' || b.owner.kind === 'unattached')
    .map((b, idx) => {
      const prints = new Set(tri(b.line).filter(g => triCount[g] === 1))
      const named = allDistinctive.filter(t => new RegExp(`\\b${t}\\b`, 'i').test(b.line))
      return { idx, line: b.line, owner: b.owner, prints, allowed: [...new Set([...tokensFor(b.owner), ...named])] }
    })
    .filter(it => it.prints.size >= 2)
  const matchItems = (text) => {
    const g = new Set(tri(text))
    return items.filter(it => [...it.prints].filter(p => g.has(p)).length >= 2)
  }

  const suspects = []
  const seen = new Set()
  const byKey = new Map()
  const nice = (t) => t ? t.charAt(0).toUpperCase() + t.slice(1) : 'another employer'
  const label = (h) => h ? h.charAt(0).toUpperCase() + h.slice(1).toLowerCase() : 'Selected work'
  const add = (doc, text, why, plain) => {
    const k = doc + '|' + text
    const existing = byKey.get(k)
    if (existing) {
      if (!existing.why.includes(why)) existing.why += ' Also: ' + why
      if (plain && !existing.plain.includes(plain)) existing.plain += ' ' + plain
      return
    }
    const item = { doc, text, why, plain: plain || 'This may go further than your resume says.' }
    byKey.set(k, item)
    seen.add(k)
    suspects.push(item)
  }

  for (const [doc, body] of Object.entries(docs)) {
    if (!body) continue
    const isLetter = doc === 'cover'
    const units = isLetter
      ? splitSentences(body).map(t => ({ line: t, owner: null }))
      : blocksOf(body).flatMap(b => splitSentences(b.line).map(t => ({ line: t, owner: b.owner })))

    for (const u of units) {
      // phrase-based checks (work even when the number was dropped)
      const hits = matchItems(u.line)
      if (hits.length) {
        const lower = u.line.toLowerCase()
        const outTokens = (!isLetter && u.owner?.kind === 'job') ? [...headerTokens(u.owner.header)] : []
        const namedHere = allDistinctive.filter(t => new RegExp(`\\b${t}\\b`).test(lower))
        const employerHere = outTokens.length ? outTokens : namedHere
        for (const it of hits) {
          if (!employerHere.length) continue
          const ok = it.allowed.some(t => employerHere.includes(t))
          if (!ok) {
            const where = it.owner.kind === 'unattached' ? `"${it.owner.header}" with no employer` : 'a different job'
            const who = nice(employerHere.find(t => !it.allowed.includes(t)))
            add(doc, u.line, `This describes work the source lists under ${where} ("${it.line.slice(0, 60)}…"), but it is credited to ${who} here. Fix the credit (remove the employer, or remove this item if it is a duplicate); do not just delete numbers.`,
              it.owner.kind === 'unattached' ? `Your resume doesn't say this was at ${who}.` : `Your resume lists this under a different job, not ${who}.`)
          }
        }
        const kinds = new Set(hits.map(it => it.owner.kind === 'unattached' ? 'u:' + it.owner.header : 'j:' + it.owner.header))
        if (!isLetter && hits.length >= 2 && kinds.size >= 2) {
          add(doc, u.line, 'This merges two separate items from the source into one claim. Keep only what belongs to this job.', 'This combines two separate items from your resume into one.')
        }
      }
      for (const m of metricsIn(u.line)) {
        const info = where[m]
        if (!info) continue // unknown numbers are the AI fact-checker's job
        const srcOwners = info.owners
        // employers the source itself names next to this number, e.g. "(Stillwater, TikTok)" in Selected work
        const mentioned = allDistinctive.filter(t => info.sentences.some(x => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(x)))
        const srcJobTokens = [...new Set([...srcOwners.flatMap(tokensFor), ...mentioned])]
        const unattachedOnly = srcOwners.every(o => o.kind !== 'job') && srcOwners.some(o => o.kind === 'unattached') && !mentioned.length

        // 1. moved to a different job (resume)
        if (!isLetter && u.owner?.kind === 'job') {
          const outTokens = [...headerTokens(u.owner.header)]
          const matchesSource = srcJobTokens.some(t => outTokens.includes(t))
          if (unattachedOnly) add(doc, u.line, `The source lists the ${m} result under "${srcOwners.find(o => o.kind === 'unattached').header}" with no employer, but this puts it under a job. If it is also listed elsewhere in the document, this is a duplicate: remove it.`,
            `Your resume lists this under "${label(srcOwners.find(o => o.kind === 'unattached').header)}" without an employer, but here it's under a job.`)
          else if (srcJobTokens.length && !matchesSource) add(doc, u.line, `The source puts the ${m} result under a different job.`, 'Your resume credits this result to a different job.')
        }
        // 2. sentence names an employer the number doesn't belong to (cover letter, summary)
        if (isLetter || u.owner?.kind !== 'job') {
          const lower = u.line.toLowerCase()
          const named = allDistinctive.filter(t => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(lower))
          const wrong = named.filter(t => !srcJobTokens.includes(t))
          if (wrong.length && (unattachedOnly || !named.some(t => srcJobTokens.includes(t)))) {
            add(doc, u.line, unattachedOnly
              ? `The source lists the ${m} result with no employer, but this sentence ties it to ${wrong[0]}.`
              : `The source puts the ${m} result under a different job than ${wrong[0]}.`,
              unattachedOnly ? `Your resume doesn't say this was at ${nice(wrong[0])}.` : `Your resume credits this result to a different job, not ${nice(wrong[0])}.`)
          }
        }
        // 3. invented cause
        if (CAUSE_RE.test(u.line) && !sourceHasCause(m)) {
          add(doc, u.line, `This sentence explains how its result happened ("${(u.line.match(CAUSE_RE) || [''])[0]}…"), but the source never says how. Remove the explanation, keep the numbers.`,
            `Your resume doesn't say how this result happened ("${(u.line.match(CAUSE_RE) || [''])[0]}…").`)
        }
      }
    }
  }
  return suspects.slice(0, 12)
}

const wordsOf = (t) => t.toLowerCase().replace(/[^a-z0-9%\s]/g, ' ').split(/\s+/).filter(Boolean)
function hasRepeatedPhrase(text, n = 6) {
  for (const line of String(text).split('\n')) {
    const w = wordsOf(line)
    const seen = new Set()
    for (let i = 0; i + n <= w.length; i++) {
      const k = w.slice(i, i + n).join(' ')
      if (seen.has(k)) return true
      seen.add(k)
    }
  }
  return false
}
const tidy = (t) => t
  .replace(/(?<!\.)\.\.(?!\.)/g, '.')
  .replace(/[ \t]{2,}/g, ' ')
  .replace(/ ([,.;:])/g, '$1')
  .replace(/^[-•*–]\s*$/gm, '')
  .replace(/\n{3,}/g, '\n\n')

async function factCheckDocs(sourceResume, docs) {
  const names = Object.keys(docs).filter(k => docs[k] && docs[k].trim())
  if (!names.length) return { docs, factCheck: { checked: false, fixes: [] } }

  const suspects = findSuspects(sourceResume, docs)
  const suspectBlock = suspects.length
    ? `\nAUTOMATED CHECKS flagged these sentences. Each is very likely wrong. Fix every one unless the source resume clearly and explicitly supports it:\n${suspects.map(x => `- [${x.doc}] "${x.text}" — ${x.why}`).join('\n')}\n`
    : ''
  const labels = { resume: 'TAILORED RESUME', resumeA: 'TAILORED RESUME (VERSION A)', resumeB: 'TAILORED RESUME (VERSION B)', cover: 'COVER LETTER' }
  const blocks = names.map(n => `<doc id="${n}" label="${labels[n] || n}">\n${docs[n]}\n</doc>`).join('\n\n')

  const prompt = `You are a strict fact-checker for job applications. Compare each generated document against the candidate's SOURCE RESUME and find claims the source does not support.

<source_resume>
${sourceResume.slice(0, 20000)}
</source_resume>

${blocks}

FLAG a claim when it:
- states a number, metric, date, title, employer, client, tool, or credential that is not in the source
- explains HOW or WHY a result happened ("by doing X", "because Y", "through Z", "no voiceover, no hard sell") when the source does not say so
- attaches an achievement to a different job, employer, or project than the source does, or assigns an employer to something the source lists without one (e.g. a "Selected work" item for "a fintech client")
- merges two separate projects or results into one, or ties a metric to a project the source doesn't tie it to
- inflates scope: "every", "all", "led", "owned", "made the call", "built from nothing" when the source says less (e.g. the source says "with the marketing lead")
- invents a working habit, motivation, or anecdote ("before anyone asks twice")

${suspectBlock}
DO NOT flag: rewording, tightening, reordering, summarizing, combining facts that the source states about the same job, keyword choices that are true to the source, tone, or opinions about the company in the cover letter.

For each flagged claim give the smallest fix that makes it true to the source: keep the sentence and its meaning, remove or correct only the unsupported part. If nothing true can be said, delete just that clause. "replacement" must be the full corrected version of "original" — never repeat words that come right before or after it in the document. Never fix a wrong employer or a merge by deleting the numbers and keeping the claim: fix the credit itself (remove the employer from the sentence, or remove the item). If an item duplicates another item already in the document (e.g. the same project appears under a job AND under Selected Work), set "original" to the whole duplicate bullet and "replacement" to an empty string.

Respond with ONLY a JSON object, no markdown fences:
{"fixes":[{"doc":"<doc id>","original":"<exact text copied character-for-character from that doc, at most one sentence or one bullet>","replacement":"<corrected text>","reason":"<under 15 words, plain English, addressed to the candidate, e.g. 'Your resume doesn't say this was at Brightline.'>"}]}
Maximum 12 fixes. If everything is supported, return {"fixes":[]}.`

  try {
    const call = client.messages.create({
      model: FACT_CHECK_MODEL,
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    })
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('fact-check timeout')), FACT_CHECK_TIMEOUT_MS))
    const msg = await Promise.race([call, timeout])
    const text = (msg.content || []).map(b => b.text || '').join('').replace(/```json|```/g, '').trim()
    const jsonText = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
    const parsed = JSON.parse(jsonText)
    const out = { ...docs }
    const applied = []
    const sourceNums = new Set(numbersIn(sourceResume))

    for (const f of (parsed.fixes || []).slice(0, 12)) {
      const id = f && f.doc
      const original = f && typeof f.original === 'string' ? f.original : ''
      const replacement = f && typeof f.replacement === 'string' ? f.replacement : ''
      if (!out[id] || original.length < 8) continue
      if (out[id].split(original).length !== 2) continue // must match exactly once
      if (replacement.length > original.length + 40) continue // a fix may not add new material
      if (replacement && replacement !== original && replacement.includes(original.trim())) continue // a fix may not append to the original
      // a fix may not introduce numbers that are in neither the source nor the original line
      const allowed = new Set([...sourceNums, ...numbersIn(original)])
      if (numbersIn(replacement).some(n => !allowed.has(n))) continue
      const next = tidy(out[id].replace(original, replacement))
      if (hasRepeatedPhrase(next) && !hasRepeatedPhrase(out[id])) continue // a fix may never create duplicated text
      out[id] = next
      applied.push({
        doc: id,
        before: original.trim(),
        after: replacement.trim(),
        reason: String(f.reason || '').slice(0, 140),
      })
    }
    // Re-run the code checks on the fixed text. Anything still wrong is shown to the customer, not hidden.
    const remaining = findSuspects(sourceResume, out).map(x => ({ doc: x.doc, text: x.text, reason: x.plain }))
    return { docs: out, factCheck: { checked: true, fixes: applied, flagged: suspects.length, needsReview: remaining } }
  } catch (e) {
    console.error('Fact check skipped:', e?.message || e)
    // Even without the AI pass, the code checks can still warn the customer
    let remaining = []
    try { remaining = findSuspects(sourceResume, docs).map(x => ({ doc: x.doc, text: x.text, reason: x.plain })) } catch (_) {}
    return { docs, factCheck: { checked: remaining.length > 0, fixes: [], needsReview: remaining } }
  }
}

const RATE_LIMIT = 50        // max requests per window
const RATE_WINDOW = 60 * 60 // 1 hour in seconds

async function checkRateLimit(ip) {
  const KV_URL = process.env.KV_REST_API_URL
  const KV_TOKEN = process.env.KV_REST_API_TOKEN
  const key = `ratelimit:generate:${ip}`
  try {
    const incrRes = await fetch(`${KV_URL}/incr/${key}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    })
    const incrData = await incrRes.json()
    const count = incrData.result
    if (count === 1) {
      await fetch(`${KV_URL}/expire/${key}/${RATE_WINDOW}`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` }
      })
    }
    return count <= RATE_LIMIT
  } catch {
    return true // fail open if KV is down
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // IP rate limit
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown'
  const allowed = await checkRateLimit(ip)
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests. Please wait an hour before trying again.' })
  }

  const form = formidable({ maxFileSize: 10 * 1024 * 1024 })

  let fields, files
  try {
    ;[fields, files] = await form.parse(req)
  } catch (err) {
    return res.status(400).json({ error: 'Failed to parse upload' })
  }

  // Turnstile bot check
  const turnstileToken = Array.isArray(fields['cf-turnstile-response']) ? fields['cf-turnstile-response'][0] : fields['cf-turnstile-response']
  if (turnstileToken) {
    try {
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: turnstileToken,
          remoteip: ip
        })
      })
      const verifyData = await verifyRes.json()
      if (!verifyData.success) {
        return res.status(403).json({ error: 'Bot check failed. Please refresh and try again.' })
      }
    } catch (err) {
      // If Turnstile verification itself fails, allow through (fail open) so real users aren't blocked
      console.error('Turnstile verify error:', err)
    }
  }

  // Honeypot — bots fill hidden fields, humans don't
  const honeypot = Array.isArray(fields.website) ? fields.website[0] : fields.website
  if (honeypot) {
    return res.status(200).json({ resume: '', coverLetter: '', recruiterNotes: '', hiringManagerDM: '' }) // silent fail
  }

  const resumeFile = (() => {
    if (files.resume) return Array.isArray(files.resume) ? files.resume[0] : files.resume
    if (files.pdf) return Array.isArray(files.pdf) ? files.pdf[0] : files.pdf
    return null
  })()

  // Job description — either pasted text or uploaded file
  let jobDescription = Array.isArray(fields.jobDescription)
    ? fields.jobDescription[0]
    : fields.jobDescription

  if (!jobDescription && files.jobDescFile) {
    const jdFile = Array.isArray(files.jobDescFile) ? files.jobDescFile[0] : files.jobDescFile
    try {
      jobDescription = await extractTextFromFile(jdFile.filepath, jdFile.mimetype, jdFile.originalFilename)
    } catch (err) {
      jobDescription = ''
    }
  }

  const dualVersion = (Array.isArray(fields.dualVersion) ? fields.dualVersion[0] : fields.dualVersion) === 'true'
  // careerType is optional; the site doesn't send it. When absent, Auto decides from the resume below.
  // (It used to default to 'freelance', which made every Auto resume skills-based.)
  const careerTypeField = (Array.isArray(fields.careerType) ? fields.careerType[0] : fields.careerType) || ''
  const resumeFormat = (Array.isArray(fields.resumeFormat) ? fields.resumeFormat[0] : fields.resumeFormat) || 'auto'

  // If user manually picked a format, override careerType
  let effectiveCareerType = resumeFormat === 'chronological' ? 'fulltime'
    : resumeFormat === 'skills' ? 'freelance'
    : (careerTypeField === 'freelance' || careerTypeField === 'fulltime') ? careerTypeField
    : null // decided after the resume is parsed
  let formatReason = resumeFormat === 'auto' ? '' : 'you picked it'

  if (!resumeFile || !jobDescription) {
    return res.status(400).json({ error: 'Missing resume file or job description' })
  }

  // Validate file type
  const uploadExt = (resumeFile.originalFilename || '').split('.').pop().toLowerCase()
  const allowedExts = ['pdf', 'docx', 'txt']
  if (!allowedExts.includes(uploadExt)) {
    return res.status(400).json({ error: 'Unsupported file type. Please upload a PDF, DOCX, or TXT file.' })
  }

  let linkedinText = ''
  try {
    linkedinText = await extractTextFromFile(resumeFile.filepath, resumeFile.mimetype, resumeFile.originalFilename)
  } catch (err) {
    linkedinText = '[Could not extract resume text automatically.]'
  } finally {
    try { fs.unlinkSync(resumeFile.filepath) } catch (e) {}
  }

  if (linkedinText.length > 12000) linkedinText = linkedinText.slice(0, 12000)

  // ── Gap detection — run before prompt construction ──────────────────────────
  const parsedJobs = parseJobsFromResume(linkedinText)
  const taggedJobs = tagProtectedJobs(parsedJobs)
  const jobManifest = buildJobManifest(taggedJobs)
  if (!effectiveCareerType) {
    const decided = detectCareerType(linkedinText, parsedJobs)
    effectiveCareerType = decided.type
    formatReason = decided.reason
  }
  // ────────────────────────────────────────────────────────────────────────────

  // ── ATS keyword pre-score — inject missing keywords into prompt ──────────────
  // Score raw input resume against JD before generation. Claude then weaves
  // missing keywords in naturally — score reliably goes up on every generate.
  const preScore = scoreKeywordMatch(linkedinText, jobDescription)
  const missingKeywords = preScore.missing.slice(0, 12) // top 12 by JD frequency
  const keywordInjectionBlock = missingKeywords.length > 0 ? `
ATS KEYWORD INJECTION — CRITICAL:
These keywords appear in the job description but are missing from the source resume.
Naturally incorporate as many as possible into the resume — summary, bullets, skills — wherever they fit truthfully.
Do NOT force them awkwardly. Skip any that genuinely cannot be used honestly.
Missing keywords: ${missingKeywords.join(', ')}
` : ''
  // ────────────────────────────────────────────────────────────────────────────

  const resumeInstructions = dualVersion ? `
JOB INCLUSION RULES — READ BEFORE WRITING EITHER VERSION:
${jobManifest}

RULE 1 — PROTECTED JOBS (marked 🔒 above): Must appear in BOTH resume versions.
RULE 2 — DROPPABLE JOBS (marked ○ above): May omit only if no gap is created.
RULE 3 — 7-YEAR HARD FLOOR: Never omit any job from the last 7 years.
RULE 4 — JOB COUNT INTEGRITY: Both versions must contain all PROTECTED jobs.

RESUME VERSION A — LEADERSHIP FOCUS:
- Lead with a summary emphasizing strategic impact, team leadership, stakeholder management, and organizational outcomes
- Prioritize bullet points that show scale: team size, budget owned, cross-functional influence, executive visibility
- Frame achievements in terms of business outcomes, revenue, cost savings, org transformation
- Keywords: led, drove, spearheaded, scaled, transformed, aligned, influenced

RESUME VERSION B — TECHNICAL/ACHIEVEMENT FOCUS:
- Lead with a summary emphasizing domain expertise, measurable results, and hands-on execution
- Prioritize bullet points with hard metrics: percentages, time saved, volume handled, tools mastered
- Frame achievements in terms of outputs, efficiency, precision, and technical credibility
- Keywords: built, engineered, optimized, delivered, executed, launched, reduced, increased

Generate both versions. Each should be complete and standalone — same experience, different lens.
- Write in implied first person throughout both versions — NO "I", "my", or "me" anywhere. Every bullet leads with an action verb. "Engineered solution" not "I engineered"
` : effectiveCareerType === 'freelance' ? `
RESUME REQUIREMENTS — FREELANCE / CONTRACT CAREER:

YOUR JOB: Act as a master resume writer, not a transcriptionist. Read what you're given, extract what matters for THIS role, and build the strongest possible case in a hybrid format that reads beautifully for humans and passes ATS.

STEP 1 — READ THE INPUT:
- LONG LINKEDIN HISTORY / CLIENT DUMP: You have hours of footage. Cut a tight film. Read everything. Pick the most impressive and relevant work for this specific role. Everything else informs your writing — it doesn't go in the resume.
- CLEAN RESUME: Tailor it. Apply the hybrid format below.
- ROUGH / MIXED INPUT: Extract what's there, build the best shape, flag gaps in recruiter notes.

STEP 2 — USE THE HYBRID FORMAT (mandatory for freelance):

Pure skills resumes fail ATS. Pure job lists bury the story. The hybrid solves both.

--- PART 1: COMPETENCY BLOCKS (top half — for humans) ---
3-4 blocks grouped by skill area or content type that maps directly to THIS job description's key requirements.
Each block:
- Bold header that mirrors a key requirement from the JD
- 3-5 bullet points, each = specific work + the client/employer who received it
- NO dates in this section — the work speaks, not the timeline
- Read as proof of capability, not job descriptions

Example for a narrative editor role:
**Narrative & Long-Form Editorial**
• Rebuilt Super Bowl spot script and storytelling for Samsara — Made Studios x NASCAR champion Jesse Love
• Multi-episode TV series editor, Tastemade's Beyond The Block — large footage volumes, character-driven construction
• Mini-doc series, Golden State Warriors — interview-heavy, archive integration, broadcast delivery
• Long-form and documentary editorial for Blue Chalk Media, UPS, Bonfire Labs

Example for AI credentials:
**AI-Native Filmmaking & Emerging Workflows**
• Two-time finalist, Alibaba WAN AI Film Competition and Runway GEN-48
• Founding Member, Wonder Studios — elite AI-native creative studio backed by LocalGlobe, OpenAI, DeepMind investors
• Creative Partner, Runway ML — Bangkok Runway Meetups, generative tools integrated into professional workflows
• ByteDance Creative Partner (Dreamina) — early access before public release

--- PART 2: SKILLS ---
Tools, platforms, software. Clean categories, one line each.

--- PART 3: EMPLOYMENT HISTORY (bottom — for ATS only) ---
Bare chronological strip. Company, title, dates. NO descriptions — the work was told in Part 1.
Label: **Employment History**
Format: **Company** | Title | Dates

CONSOLIDATION RULES — READ BEFORE WRITING:
- If the same client appears multiple times (e.g. SharkNinja 3x, VML 2x), MERGE them into ONE line using the earliest start date and latest end date. Example: SharkNinja | Freelance Senior Video Editor | Mar 2023 – Jun 2025
- Cap the total list at 12 entries maximum. If more than 12 remain after merging, keep the most recognizable brands and the most recent work. Drop obscure one-month gigs from 3+ years ago.
- All PROTECTED jobs must be REPRESENTED — but multiple entries from the same employer count as one after merging.
- This section's only job is to give ATS systems parseable dates and titles. Brevity is better than an overwhelming wall of entries.

FULL STRUCTURE:
1. Contact header
2. Summary (2-3 sentences — best credential for THIS role + the differentiator + never years of experience)
3. Competency Blocks
4. Skills
5. Employment History
6. Education

JOB INCLUSION RULES:
${jobManifest}
All PROTECTED jobs must appear in the Employment History strip.

NAMED CREDENTIAL PRESERVATION: Every recognizable brand, agency, award, or festival in the source relevant to THIS role must appear by name in the competency blocks. Goodby Silverstein, Michael Bay, Disney, NVIDIA, Alibaba WAN, Wonder Studios — never genericize them.

VOICE: Write like a human. Short declarative sentences. Name the actual thing.
BANNED: "Proven expertise", "Leveraged X to drive Y", "Delivered premium anything", "Maintained brand voice", "Demonstrated technical proficiency", "Results-driven", "Strong track record"

Bold (**text**) for section headers and competency block titles only.
Implied first person — NO "I", "my", "me".
Mirror job description keywords naturally in competency blocks for ATS.
ANTI-FABRICATION: Every claim must exist in the source. Reframing allowed. Inventing is not.
REFRAMING DEFINED — what IS allowed: emphasizing the most relevant aspect of real work, using JD keywords to describe real tasks the candidate actually performed, restructuring bullet order for relevance.
REFRAMING DEFINED — what is NOT allowed: adding responsibilities the candidate didn't perform, upgrading a role's scope beyond what's stated, or using action verbs that imply a different job function than the source title. For example: if the source says "Senior Video Editor" — do NOT write "Directed video production" or "Managed budgets and vendors" unless those responsibilities are explicitly stated in the source. An Editor edits. If the JD wants a Director and the candidate is an Editor, show Director-caliber results through the editing work — never fabricate Director-level responsibilities.
TITLE INTEGRITY: Never assign a title the candidate hasn't held. Never use action verbs in bullets that imply a seniority, function, or responsibility not supported by the source.
` : `
RESUME REQUIREMENTS — FULL-TIME / IN-HOUSE CAREER:

THIS PERSON HAS A TRADITIONAL EMPLOYMENT HISTORY. Format this as a classic chronological resume.
Stability, tenure, scope, and internal growth are the story. Make those the headline.

JOB INCLUSION RULES — READ BEFORE WRITING:
${jobManifest}

RULE 1 — PROTECTED JOBS (marked 🔒): Must appear. Do not remove or merge.
RULE 2 — DROPPABLE JOBS (marked ○): Omit only if no gap is created and the role adds nothing.
RULE 3 — 7-YEAR HARD FLOOR: Never omit any job from the last 7 years.
RULE 4 — NAMED CLIENT PRESERVATION: Every recognizable brand or employer named in the source resume stays in the output by name.

VOICE — MOST IMPORTANT:
Write like a specific human being, not a LinkedIn template.
BANNED PHRASES: "Proven expertise in", "Leveraged X to drive Y", "Collaborated with cross-functional stakeholders", "Delivered premium [anything]", "Maintained brand voice", "Translated business strategy", "Demonstrated technical proficiency", "Results-driven", "Strong track record"
INSTEAD: Name the actual thing. Specific scope, specific outcomes, specific teams. Short declarative sentences.

FULL-TIME FORMATTING RULES:
- Standard reverse-chronological order
- If the source has a "Selected work", "Projects", or "Portfolio" section with items not tied to a specific job, keep them in a "Selected Work" section after Experience (see ATTRIBUTION INTEGRITY)
- Each role: 3-4 bullet points max, achievement-focused with metrics where source supports them
- Emphasize: team size, budget owned, scope of responsibility, promotions, cross-functional influence, tenure
- Frame achievements in terms of business outcomes — what changed because they were there
- Format each role as: **Company Name** | Title | Dates

SUMMARY — make them sound exceptional:
2-3 sentences. Lead with tenure + scope at the most impressive employer. Establish range. Name what makes them different from the next person with the same title.
If the candidate has skills beyond their primary role (coding, AI tools, management, product sense) — surface that combination as the differentiator.

REORDER FOR RELEVANCE: If an older role is more relevant to this job, move it up. Split into RELEVANT EXPERIENCE and ADDITIONAL EXPERIENCE if needed.

FORMAT: Summary, Experience, Skills, Education
Use markdown bold (**text**) for company names and section headers only.
Write in implied first person — NO "I", "my", or "me". Every line leads with an action verb.
Mirror job description keywords naturally for ATS — never at the expense of voice.
ANTI-FABRICATION: Every claim must come from the source resume. Reframing is allowed. Inventing is not.
CRITICAL — TITLE INTEGRITY — ZERO EXCEPTIONS: Never use "Director-level", "VP-level", "Senior-level", "Executive-level", or ANY seniority prefix in the summary or anywhere in the resume unless that EXACT title appears verbatim in the source resume. This rule has no exceptions — not even when the candidate is applying for a more senior role. If a teacher is applying for a Director role, the summary says "Learning Experience Designer" or "Curriculum Developer" — whatever they actually ARE. Frame trajectory and capability through the work, not through a title they haven't earned. A false title gets caught in the first 30 seconds of an interview and destroys all credibility. When in doubt, use the most senior title that actually appears in the source.
`

  const outputFormat = dualVersion ? `
===METADATA===
{"candidateName":"...","candidateEmail":"...","candidatePhone":"...","companyName":"...","jobTitle":"..."}

===RECRUITER_NOTES===
[recruiter gap analysis here]

===RESUME_A===
[Leadership-focused resume here]

===RESUME_B===
[Technical/Achievement-focused resume here]

===COVER_LETTER===
[cover letter here]

===HIRING_MANAGER_DM===
[hiring manager DM here]

===COMPANY_INTEL===
COMPANY INTEL
─────────────────────────────
⚡ Power center: [1 sentence]
🎯 Position your work as: [1 sentence]
🤝 Who thrives here: [1 sentence]
⚠️ Watch for: [1 sentence]
🎙️ Interview move: [1 sentence]
─────────────────────────────
` : `
===METADATA===
{"candidateName":"...","candidateEmail":"...","candidatePhone":"...","companyName":"...","jobTitle":"..."}

===RECRUITER_NOTES===
[recruiter gap analysis here]

===RESUME===
[resume content here]

===COVER_LETTER===
[cover letter content here]

===HIRING_MANAGER_DM===
[hiring manager DM here]

===COMPANY_INTEL===
COMPANY INTEL
─────────────────────────────
⚡ Power center: [1 sentence]
🎯 Position your work as: [1 sentence]
🤝 Who thrives here: [1 sentence]
⚠️ Watch for: [1 sentence]
🎙️ Interview move: [1 sentence]
─────────────────────────────
`

  const now = new Date()
  const currentDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const currentYear = now.getFullYear()

  const prompt = `You are a world-class resume writer and career strategist. Your job is to transform whatever someone gives you into a polished, compelling document that makes them look like the best hire in the room. You write with precision and confidence. You never use corporate filler. You never write generically. You make every person sound like exactly who they are — at their best.

CRITICAL — NO YEARS OF EXPERIENCE: Never write "X years of experience", "X+ years", or any numeric experience duration in the summary, cover letter, or job bullets. This invites age discrimination and actively harms the candidate. Instead use: "seasoned", "highly experienced", "veteran", "deep expertise in" — or lead directly with the work itself. The credentials speak. The number doesn't.
ONE EXCEPTION: If the job description explicitly states a minimum experience requirement (e.g. "8+ years required"), mirror that exact number once — buried in the Skills section or a single bullet only, never in the summary. This is ATS compliance, not positioning. Example: "8+ years editing narrative content" as a skills line, not a headline.

CRITICAL — ZERO FABRICATION: Every credential, company name, award, festival selection, tool, title, or achievement in your output MUST exist verbatim in the source resume. Do NOT invent, infer, or embellish ANY of the following:
- Festival selections, awards, or nominations not explicitly named in the source
- Company names, studio names, or employer names not in the source
- Tools, platforms, or technologies not listed in the source
- Titles or roles the candidate has not held
- Clients or brands not named in the source
- Any specific number, metric, or outcome not stated in the source
A fabricated credential that gets googled ends the candidacy. This rule is absolute and overrides everything else.
ATTRIBUTION INTEGRITY: Every achievement stays with the employer, client, or project the source attaches it to.
- Never move an achievement into a different job than the source puts it under.
- Never merge two separate projects, videos, campaigns, or results into one bullet or one claim. Two items in the source = two items in the output.
- If the source lists an achievement WITHOUT saying which job it happened at (for example under "Selected work", "Projects", or "Portfolio"), do NOT assign it to a job and do NOT guess the employer from context. Keep it in a "Selected Work" section, naming the client exactly as the source does (e.g. "fintech client").
- Never attach a metric to a different project than the source does. If the source gives a channel-wide or role-wide number, keep it at that level.
NO INVENTED CAUSES OR METHODS: Restate numbers exactly as given. Do not add "by doing X", "through Y", "thanks to Z", or any explanation of how or why a result happened unless the source states it. Do not invent working methods, motivations, or anecdotes. If the source only says what happened, write only what happened.
VERB FABRICATION IS FABRICATION: Using action verbs that imply responsibilities not in the source is fabrication. "Directed" when the source says "Edited" is fabrication. "Managed budgets" when no budget ownership is stated is fabrication. "Led a team" when no team leadership is in the source is fabrication. Match the candidate's actual function — elevate the OUTPUT of that function, never the implied seniority.

CRITICAL — TITLE INTEGRITY: Never write "Director-level", "VP-level", "Senior-level", "Executive-level" or any seniority prefix the candidate hasn't actually held. Check the source resume — use only titles that appear there. A teacher applying for a Director role is a teacher with Director-level capability, not a "Director-level" anything. Frame ambition through the work, never through a fabricated title.

IMPORTANT CONTEXT: Today's date is ${currentDate}. The current year is ${currentYear}. Any employment dates from ${currentYear} or earlier are in the past or present — never flag them as future dates.

A person has provided their resume or career history and a job description. Before writing anything, read the source material and identify what type of input you're working with:

TYPE A — POLISHED RESUME: Clean, already-formatted resume with clear sections. Tailor it to the role. Tighten the language. Optimize for ATS.

TYPE B — LINKEDIN PDF / LONG FREELANCE HISTORY: A dump of 20, 50, 100+ engagements. Do NOT reproduce the list. Your job is to be a master resume writer who reads the entire history, extracts the most impressive and relevant work for THIS specific job, and builds a tight, compelling narrative from the raw material. Think of it like a film editor cutting a feature from hours of footage — you find the story, kill everything that doesn't serve it. The client doesn't need every gig listed. They need the right ones, told well.

TYPE C — ROUGH NOTES / MIXED INPUT: Messy, informal, or partial information. Fill the shape with what's there, flag obvious gaps in recruiter notes.

REGARDLESS OF INPUT TYPE — your output must:
- Pass ATS for this specific job description
- Include the exact job title from the JD in the header or first summary line
- Include a location (city/country or "Remote") in the contact header
- Use exact section labels: "Summary", "Experience" or "Employment History", "Skills", "Education"
- Read like a human wrote it, not a template
- Make the candidate look like the best hire in the room
- Never fabricate, never pad, never genericize named credentials
- Never list years of experience numerically

CRITICAL — NO CREDENTIAL DUPLICATION: Every named credential, award, company, or achievement may appear ONCE in the entire resume. If it's in the summary, it cannot appear again in the competency blocks or bullets. If it's in a competency block, it cannot reappear in another block or the summary. Read your own output before finalizing — if you see the same specific credential twice, remove it from the less prominent location. The summary should reference the single most impressive credential; the body should build the story with everything else.

CRITICAL — EDUCATION: Always include a real Education section. Search the ENTIRE source — bottom, footer, appendix, last page. LinkedIn PDFs and resumes almost always have education buried at the end. If you find ANY degree, institution, certification, or coursework anywhere in the source, use it. NEVER write "Education details available upon request" — this phrase is banned. If a real degree exists in the source (e.g. "Bachelor of Arts, Film and Television | State University of New York at New Paltz"), use it exactly. Only if the source contains absolutely zero education information of any kind should you write: "B.A. equivalent professional training" or simply omit the section entirely rather than using the "available upon request" placeholder.

---
LINKEDIN PROFILE DATA:
${linkedinText}

---
JOB DESCRIPTION:
${jobDescription}

---

RECRUITER GAP ANALYSIS REQUIREMENTS:
- Act like a senior recruiter in this industry reviewing this resume for this specific role
- CRITICAL: Before analyzing, determine whether this is a freelance/contract career or a traditional in-house career. Many clients, many companies, overlapping dates, and a broad range of projects are NORMAL and expected for a successful freelancer — especially in creative, production, tech, and consulting fields. Do NOT penalize or flag these patterns as disorganization. That is how freelancing works.
- Identify 3-5 specific things that would stop you from reaching out — focus on: skills the job requires that are missing or buried, weak or absent metrics, positioning misalignment with this specific role, or ATS keywords that need strengthening
- Do NOT flag: number of clients or companies, overlapping engagement dates, or "chaotic" structure that simply reflects a legitimate freelance career
- For EVERY issue you flag, immediately follow it with a concrete "Fix:" suggestion — exactly what to change, add, reword, or remove
- ANTI-FABRICATION IN FIXES: When suggesting fixes, never recommend inventing experience the candidate doesn't have. If a gap is real (e.g. no enterprise LMS experience), the fix should be: reframe what they DO have, flag it as a gap to address in the interview, or suggest honest language. Never recommend adding "conducted client discovery sessions" or "managed enterprise stakeholders" if those activities aren't in the source resume.
- CRITICAL: Only flag employment date overlaps or gaps if you can verify them with absolute certainty from the data. Do NOT infer or assume overlaps. A false date flag can seriously harm someone's confidence and career.
- Format as a bulleted list. Each bullet = the problem, followed by "Fix:" on a new line with the specific solution
- Keep it under 200 words total
- Tone: direct and useful — like a recruiter who genuinely wants to place this person, not discourage them

${resumeInstructions}

COVER LETTER REQUIREMENTS:
- First line, on its own: a greeting. If the job description names the hiring manager, founder, or the person the candidate would work with (e.g. "You work directly with Jonathan, the founder"), write "Hi Jonathan," using their first name. If no person is named, write "Hi [Company name] team,". Never "To whom it may concern", "Dear Hiring Manager", or "Dear Sir/Madam".
- Then maximum 3 paragraphs
- First paragraph opens with something specific about the company or role — not "I am writing to apply for..."
- Middle paragraph: the 2-3 specific things from their background that make them right for this role
- Close with confidence, not desperation
- End with "Best," on its own line, then the candidate's full name on the next line
- Conversational but professional tone
- Do NOT use clichés or corporate filler
- Do NOT include a contact info header (it is added automatically)
- SAME FACT RULES AS THE RESUME: every claim, number, method, and explanation must come from the source resume. Do not invent how a result was achieved, what the candidate felt, or what they avoided ("not by chasing trends"). Keep each achievement with the job or project the source attaches it to.
- BANNED PATTERNS in the cover letter: the contrast formula "That's not X. That's Y." / "This isn't X — it's Y." / "Not X, but Y."; "genuinely"; "passionate"; "I'm excited to"; "I'd love to"; "perfect fit"; "hit the ground running". Say the point directly instead.
- Every sentence must make plain sense on first read. No mixed metaphors or stacked clauses.

HIRING MANAGER DM REQUIREMENTS:
- 3-4 sentences max
- NEVER open with "Hi there", "Hello", "Hey", or any generic greeting
- NEVER open with "I saw your [job posting/opening/listing]" — that's the generic opener every applicant uses
- Open immediately with a specific hook — lead with one concrete credential or result from their background, then connect it to the role
- No desperation, no groveling, no "I'd love to", no "Would you be open to"
- End with a single direct question or low-pressure call to action
- Tone: confident peer reaching out, not a job seeker begging

CONTACT INFO REQUIREMENTS:
- In the resume header, include name, email, phone, and LinkedIn URL if present
- ALWAYS include a location — city and country or "Remote" if no location found in source. ATS systems use location to validate candidate matches. If no location in source, use "Remote" as default.
- CRITICAL: Never prefix the LinkedIn URL with the word "LinkedIn:" or "LinkedIn" — just include the bare URL (e.g. linkedin.com/in/matassa, NOT "LinkedIn: linkedin.com/in/matassa")
- Strip any social media labels like "LinkedIn:", "GitHub:", "Twitter:" — show only the URL itself

JOB TITLE ATS MATCH — CRITICAL:
- Extract the exact job title from the job description (e.g. "Senior Video Editor", "Midweight / Senior Video Editor")
- Include this exact title as a line directly under the candidate's name in the header, OR work it naturally into the first line of the summary
- ATS systems search by job title — if the title from the JD doesn't appear in the resume, the match rate drops significantly
- This is not fabrication — it's positioning. The candidate is applying for this role.

SECTION HEADINGS — ATS CRITICAL:
- Education section MUST be labeled exactly "Education" — no variations, no styling, no alternative labels
- Experience section MUST be labeled "Experience" or "Employment History" — ATS must find these exact headings
- Summary section MUST be labeled "Summary" or "Professional Summary"
- Skills section MUST be labeled "Skills"
- These exact labels are non-negotiable for ATS parsing

METADATA REQUIREMENTS:
- candidateName: full name
- candidateEmail: email if present, else ""
- candidatePhone: phone if present, else ""
- companyName: company name (short form, no Inc/LLC)
- jobTitle: job title (2-4 words max, no special chars)

COMPANY INTEL REQUIREMENTS:
Analyze the job description for organizational power signals. Infer which function holds actual decision-making power based on language patterns, stated priorities, reporting structures, success metrics, and cultural signals in the JD — NOT what the company claims about itself. Be direct. No hedging. If the JD is thin on signals, say so briefly and give your best inference. Never fabricate specifics not in the text.

${keywordInjectionBlock}
Respond in this exact format:
${outputFormat}`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: dualVersion ? 7000 : 5500,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = message.content[0].text

    // Parse metadata
    let metadata = { candidateName: '', candidateEmail: '', candidatePhone: '', companyName: '', jobTitle: '' }
    const metaMatch = responseText.match(/===METADATA===\s*(\{[\s\S]*?\})\s*===RECRUITER_NOTES===/)
    if (metaMatch) {
      try { metadata = { ...metadata, ...JSON.parse(metaMatch[1]) } } catch (e) {}
    }
    // Clean email — strip garbage prefix before @ (e.g. 'CA' from location bleed)
    if (metadata.candidateEmail && metadata.candidateEmail.includes('@')) {
      const atIdx = metadata.candidateEmail.indexOf('@')
      const localPart = metadata.candidateEmail.slice(0, atIdx).replace(/^[^a-zA-Z0-9]+/, '')
      metadata.candidateEmail = localPart + metadata.candidateEmail.slice(atIdx)
    }

    // Notify you when someone generates a resume
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API}` },
        body: JSON.stringify({
          from: 'JobsUncle <onboarding@resend.dev>',
          to: 'jobsuncleai@gmail.com',
          subject: `📄 New Resume: ${metadata.candidateName || 'Unknown'} → ${metadata.jobTitle || 'Unknown Role'} @ ${metadata.companyName || 'Unknown'}`,
          html: `<div style="font-family:sans-serif;max-width:480px;padding:24px">
            <h2 style="color:#6d28d9">New Resume Generated</h2>
            <p><strong>Candidate:</strong> ${metadata.candidateName || 'Unknown'}</p>
            <p><strong>Email:</strong> ${metadata.candidateEmail || 'Not provided'}</p>
            <p><strong>Role:</strong> ${metadata.jobTitle || 'Unknown'} @ ${metadata.companyName || 'Unknown'}</p>
            <p style="color:#888;font-size:0.8rem">${new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })} BKK</p>
          </div>`
        })
      })
    } catch (e) { /* fail silently */ }

    // Parse recruiter notes
    const recruiterNotesMatch = dualVersion
      ? responseText.match(/===RECRUITER_NOTES===([\s\S]*?)===RESUME_A===/)
      : responseText.match(/===RECRUITER_NOTES===([\s\S]*?)===RESUME===/)
    const recruiterNotes = recruiterNotesMatch ? recruiterNotesMatch[1].trim() : ''

    // Build contact header: name · email · phone · portfolio/reel · LinkedIn
    // Links come from the generated resume's own header, so they're the candidate's real ones.
    const headerLinks = (() => {
      const resumeText = (dualVersion
        ? (responseText.match(/===RESUME_A===([\s\S]*?)===RESUME_B===/) || [])[1]
        : (responseText.match(/===RESUME===([\s\S]*?)===COVER_LETTER===/) || [])[1]) || ''
      const head = resumeText.trim().split('\n').slice(0, 6).join(' ')
      const urls = (head.match(/\b(?:https?:\/\/)?(?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s·|,;)]*)?/gi) || [])
        .filter(u => !u.includes('@') && !/@/.test(head.slice(Math.max(0, head.indexOf(u) - 1), head.indexOf(u))))
        .map(u => u.replace(/[.,]+$/, ''))
      const email = (metadata.candidateEmail || '').toLowerCase()
      const clean = [...new Set(urls)].filter(u => !email.endsWith(u.toLowerCase()) && !email.includes(u.toLowerCase()))
      const linkedin = clean.filter(u => /linkedin\.com/i.test(u))
      const other = clean.filter(u => !/linkedin\.com/i.test(u))
      return [...other.slice(0, 1), ...linkedin.slice(0, 1)]
    })()
    const contactParts = [metadata.candidateName, metadata.candidateEmail, metadata.candidatePhone, ...headerLinks].filter(Boolean)
    const contactHeader = contactParts.length > 0 ? contactParts.join(' · ') + '\n\n' : ''

    // Guarantee a greeting and a sign-off even if the model forgets
    const finishCoverLetter = (raw) => {
      let text = (raw || '').trim()
      if (!text) return text
      const firstLine = text.split('\n')[0].trim()
      if (!/^(hi|hello|dear|hey)\b/i.test(firstLine)) {
        const company = (metadata.companyName || '').trim()
        text = `${company ? `Hi ${company} team,` : 'Hello,'}\n\n${text}`
      }
      const name = (metadata.candidateName || '').trim()
      const CLOSING = /^(best|best regards|all the best|thanks|thank you|many thanks|cheers|sincerely|warmly|warm regards|kind regards|regards)[,!.]?$/i
      const lines = text.split('\n')
      while (lines.length && !lines[lines.length - 1].trim()) lines.pop()
      const last = (lines[lines.length - 1] || '').trim()
      const prev = (lines[lines.length - 2] || '').trim()
      if (name && last.toLowerCase() === name.toLowerCase()) {
        if (!CLOSING.test(prev)) {
          lines.splice(lines.length - 1, 0, 'Best,')
          if (prev) lines.splice(lines.length - 2, 0, '')
        }
      } else if (!CLOSING.test(last)) {
        lines.push('', 'Best,')
        if (name) lines.push(name)
      } else if (name) {
        lines.push(name)
      }
      return lines.join('\n')
    }

    // Build slug
    const slug = (str) => str.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
    const fileBaseName = [slug(metadata.candidateName), slug(metadata.companyName), slug(metadata.jobTitle)]
      .filter(Boolean).join('_') || 'resume'

    if (dualVersion) {
      const resumeAMatch = responseText.match(/===RESUME_A===([\s\S]*?)===RESUME_B===/)
      const resumeBMatch = responseText.match(/===RESUME_B===([\s\S]*?)===COVER_LETTER===/)
      const coverMatch = responseText.match(/===COVER_LETTER===([\s\S]*?)===HIRING_MANAGER_DM===/)
      const dmMatch = responseText.match(/===HIRING_MANAGER_DM===([\s\S]*)$/)

      const checkedDual = await factCheckDocs(linkedinText, {
        resumeA: resumeAMatch ? resumeAMatch[1].trim() : '',
        resumeB: resumeBMatch ? resumeBMatch[1].trim() : '',
        cover: coverMatch ? coverMatch[1].trim() : '',
      })
      const resumeA = checkedDual.docs.resumeA
      const resumeB = checkedDual.docs.resumeB
      const rawCover = checkedDual.docs.cover
      const factCheck = checkedDual.factCheck
      const coverLetter = contactHeader + finishCoverLetter(rawCover)
      const hiringManagerDM = dmMatch ? dmMatch[1].trim() : ''

      // ATS keyword match scoring (score against version A)
      const atsMatch = scoreKeywordMatch(resumeA, jobDescription)

      return res.status(200).json({
        dualVersion: true,
        factCheck,
        resumeA,
        resumeB,
        coverLetter,
        recruiterNotes,
        hiringManagerDM,
        atsMatch,
        metadata,
        fileBaseName,
        jobDescriptionText: jobDescription,
      })
    } else {
      const resumeMatch = responseText.match(/===RESUME===([\s\S]*?)===COVER_LETTER===/)
      const coverMatch = responseText.match(/===COVER_LETTER===([\s\S]*?)===HIRING_MANAGER_DM===/)
      const dmMatch = responseText.match(/===HIRING_MANAGER_DM===([\s\S]*?)(?:===COMPANY_INTEL===|$)/)
      const intelMatch = responseText.match(/===COMPANY_INTEL===([\s\S]*)$/)

      const checked = await factCheckDocs(linkedinText, {
        resume: resumeMatch ? resumeMatch[1].trim() : responseText,
        cover: coverMatch ? coverMatch[1].trim() : '',
      })
      const resume = checked.docs.resume
      const rawCover = checked.docs.cover
      const factCheck = checked.factCheck
      const coverLetter = contactHeader + finishCoverLetter(rawCover)
      const hiringManagerDM = dmMatch ? dmMatch[1].trim() : ''
      const companyIntel = intelMatch ? intelMatch[1].trim() : ''

      // ATS keyword match scoring
      const atsMatch = scoreKeywordMatch(resume, jobDescription)

      return res.status(200).json({
        dualVersion: false,
        factCheck,
        formatUsed: effectiveCareerType === 'freelance' ? 'skills' : 'chronological',
        formatAuto: resumeFormat === 'auto',
        formatReason,
        resume,
        coverLetter,
        recruiterNotes,
        hiringManagerDM,
        companyIntel,
        atsMatch,
        metadata,
        fileBaseName,
        jobDescriptionText: jobDescription,
      })
    }
  } catch (err) {
    console.error('Claude API error:', err)
    if (err?.error?.error?.message?.includes('credit balance is too low') || err?.message?.includes('credit balance is too low')) {
      return res.status(503).json({ error: 'Service temporarily unavailable. Please try again in a few minutes.' })
    }
    if (err?.status === 529 || err?.message?.includes('overloaded') || err?.message?.includes('529')) {
      return res.status(503).json({ error: '⏳ Anthropic (our AI provider) is experiencing high demand and is temporarily overloaded — this is not a JobsUncle issue. Please give it a few minutes and try again.' })
    }
    return res.status(500).json({ error: 'Generation failed. Please try again.' })
  }
}
