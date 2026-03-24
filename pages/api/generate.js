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


// ─── ATS KEYWORD MATCH SCORING ────────────────────────────────────────────────

/**
 * Extracts meaningful keywords from a job description and scores them
 * against the generated resume. No extra API call — pure JS.
 * Returns { score, matched, missing, total }
 */
function scoreKeywordMatch(resumeText, jobDescription) {
  // Stop words to ignore
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

  // Extract candidate phrases — 1 and 2 word sequences
  function extractPhrases(text) {
    const clean = text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const words = clean.split(' ').filter(w => w.length > 2 && !STOP.has(w))
    const phrases = new Set()

    // Single keywords
    words.forEach(w => phrases.add(w))

    // Two-word phrases from original cleaned text
    const allWords = clean.split(' ')
    for (let i = 0; i < allWords.length - 1; i++) {
      const w1 = allWords[i], w2 = allWords[i+1]
      if (w1.length > 2 && w2.length > 2 && !STOP.has(w1) && !STOP.has(w2)) {
        phrases.add(`${w1} ${w2}`)
      }
    }
    return phrases
  }

  // Extract JD keywords with frequency — higher freq = more important
  const jdLower = jobDescription.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
  const jdWords = jdLower.split(/\s+/).filter(w => w.length >= 5 && !STOP.has(w))
  const freq = {}
  jdWords.forEach(w => { freq[w] = (freq[w] || 0) + 1 })

  // Keep words that appear 2+ times OR are technical/tool terms
  const TECH_SIGNALS = [
    // Video / Creative
    'premiere', 'effects', 'photoshop', 'lightroom', 'resolve', 'editing',
    'video', 'instagram', 'facebook', 'reels', 'footage', 'motion',
    'graphics', 'color', 'audio', 'animation', 'dslr', 'cinema', 'broadcast',
    'documentary', 'narrative', 'generative', 'tiktok', 'asana', 'iconik',
    // General professional — works for ANY job type
    'analytics', 'strategy', 'leadership', 'communication', 'collaboration',
    'stakeholder', 'curriculum', 'instructional', 'learning', 'training',
    'assessment', 'performance', 'outcomes', 'metrics', 'reporting',
    'compliance', 'regulatory', 'healthcare', 'clinical', 'patient',
    'engineering', 'software', 'development', 'javascript', 'python',
    'typescript', 'react', 'backend', 'frontend', 'database', 'cloud',
    'aws', 'azure', 'salesforce', 'tableau', 'excel', 'powerpoint',
    'project', 'agile', 'scrum', 'product', 'research', 'data',
    'financial', 'accounting', 'revenue', 'budget', 'forecasting',
    'marketing', 'campaigns', 'seo', 'email', 'branding', 'copywriting',
    'operations', 'logistics', 'procurement', 'vendor', 'contract',
    'recruitment', 'onboarding', 'retention', 'diversity', 'inclusion',
    'management', 'enterprise', 'technical', 'platform', 'integration',
    'communications', 'content', 'design', 'workflow', 'standards',
  ]

  const jdKeywords = Object.entries(freq)
    .filter(([word, count]) => count >= 2 || TECH_SIGNALS.some(t => word.includes(t)))
    .map(([word]) => word)

  // Also extract 2-word phrases from JD
  // Single keywords only — two-word phrases have too many false negatives
  const candidates = [...new Set(jdKeywords)]
    .filter(k => k.length >= 6)
    .slice(0, 40) // cap at 40 candidates

  // Score against resume
  const resumeLower = resumeText.toLowerCase()
  const matched = []
  const missing = []

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
    if (found) {
      matched.push(kw)
    } else {
      missing.push(kw)
    }
  })

  const score = candidates.length > 0 
    ? Math.round((matched.length / candidates.length) * 100)
    : 0

  // Sort missing by JD frequency (most important first)
  const missingByImportance = missing
    .sort((a, b) => (freq[b] || 0) - (freq[a] || 0))
    .slice(0, 15) // top 15 missing

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
  const careerType = (Array.isArray(fields.careerType) ? fields.careerType[0] : fields.careerType) || 'freelance'

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
` : careerType === 'freelance' ? `
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
One line per entry. All PROTECTED jobs from the manifest must appear here.
This section's only job is to give ATS systems parseable dates and titles.

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
TITLE INTEGRITY: Never assign a title the candidate hasn't held.
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

CRITICAL — EDUCATION: Always include a real Education section using whatever is in the source — degree, school, field, year. Search the entire source document including the bottom, footer, and appendix-style sections — LinkedIn PDFs often bury education on the last page. If education genuinely cannot be found anywhere in the source, write "Education details available upon request" — but only as a last resort after searching thoroughly. Never default to this phrase lazily. If any degree, institution, or certification appears anywhere in the source, use it.

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
- Maximum 3 paragraphs
- Open with something specific about the company or role — not "I am writing to apply for..."
- Middle paragraph: the 2-3 specific things from their background that make them right for this role
- Close with confidence, not desperation
- Conversational but professional tone
- Do NOT use clichés or corporate filler
- Do NOT include a contact info header

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

Respond in this exact format:
${outputFormat}`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: dualVersion ? 6000 : 4500,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = message.content[0].text

    // Parse metadata
    let metadata = { candidateName: '', candidateEmail: '', candidatePhone: '', companyName: '', jobTitle: '' }
    const metaMatch = responseText.match(/===METADATA===\s*(\{[\s\S]*?\})\s*===RECRUITER_NOTES===/)
    if (metaMatch) {
      try { metadata = { ...metadata, ...JSON.parse(metaMatch[1]) } } catch (e) {}
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

    // Build contact header
    const contactParts = [metadata.candidateName, metadata.candidateEmail, metadata.candidatePhone].filter(Boolean)
    const contactHeader = contactParts.length > 0 ? contactParts.join(' · ') + '\n\n' : ''

    // Build slug
    const slug = (str) => str.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
    const fileBaseName = [slug(metadata.candidateName), slug(metadata.companyName), slug(metadata.jobTitle)]
      .filter(Boolean).join('_') || 'resume'

    if (dualVersion) {
      const resumeAMatch = responseText.match(/===RESUME_A===([\s\S]*?)===RESUME_B===/)
      const resumeBMatch = responseText.match(/===RESUME_B===([\s\S]*?)===COVER_LETTER===/)
      const coverMatch = responseText.match(/===COVER_LETTER===([\s\S]*?)===HIRING_MANAGER_DM===/)
      const dmMatch = responseText.match(/===HIRING_MANAGER_DM===([\s\S]*)$/)

      const resumeA = resumeAMatch ? resumeAMatch[1].trim() : ''
      const resumeB = resumeBMatch ? resumeBMatch[1].trim() : ''
      const rawCover = coverMatch ? coverMatch[1].trim() : ''
      const coverLetter = contactHeader + rawCover
      const hiringManagerDM = dmMatch ? dmMatch[1].trim() : ''

      // ATS keyword match scoring (score against version A)
      const atsMatch = scoreKeywordMatch(resumeA, jobDescription)

      return res.status(200).json({
        dualVersion: true,
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

      const resume = resumeMatch ? resumeMatch[1].trim() : responseText
      const rawCover = coverMatch ? coverMatch[1].trim() : ''
      const coverLetter = contactHeader + rawCover
      const hiringManagerDM = dmMatch ? dmMatch[1].trim() : ''
      const companyIntel = intelMatch ? intelMatch[1].trim() : ''

      // ATS keyword match scoring
      const atsMatch = scoreKeywordMatch(resume, jobDescription)

      return res.status(200).json({
        dualVersion: false,
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
    return res.status(500).json({ error: 'Generation failed. Please try again.' })
  }
}
