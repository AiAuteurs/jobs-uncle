import formidable from 'formidable'
import fs from 'fs'
import Anthropic from '@anthropic-ai/sdk'

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
  maxDuration: 60,
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


// ─── JOB GAP DETECTION ────────────────────────────────────────────────────────

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
` : `
RESUME REQUIREMENTS:

JOB INCLUSION RULES — READ BEFORE WRITING:
${jobManifest}

RULE 1 — PROTECTED JOBS (marked 🔒 above): These MUST appear in the resume.
  Do not remove, merge, or skip them under any circumstances.
  You MAY reframe bullet points to emphasize transferable skills relevant to this role.
  Even if the job seems irrelevant (e.g. warehouse, retail), it fills a real gap on the timeline.
  Removing it would create a suspicious gap that costs the applicant interviews.

RULE 2 — DROPPABLE JOBS (marked ○ above): Use judgment.
  If the job adds nothing to this application AND its removal creates no gap, you may omit it.
  If in doubt, keep it — a full timeline is safer than a tight but gappy one.

RULE 3 — 7-YEAR HARD FLOOR: Never omit any job from the last 7 years, regardless of relevance.

RULE 4 — JOB COUNT INTEGRITY: Before finalizing, count the jobs in your output.
  You must include all PROTECTED jobs. If your output has fewer jobs than the PROTECTED COUNT above, stop and add the missing ones.

AFTER applying the rules above:
- Lead with a punchy 2-3 sentence professional summary that speaks directly to THIS role
- Use strong action verbs and concrete results where possible
- Turn bullet points into achievement-focused statements — add metrics wherever the background supports it
- Do NOT include an objective statement
- Format cleanly with clear sections: Summary, Experience, Skills, Education
- Mirror keywords and phrases from the job description naturally throughout — optimize for ATS without sounding robotic
- For PROTECTED jobs that seem irrelevant to this role: reframe bullets around transferable skills (customer interaction, reliability, communication, process adherence) — do NOT fabricate skills not implied by the role
- Do NOT pad or embellish — be ruthlessly relevant
- Write in implied first person throughout — NO "I", "my", or "me" anywhere. Every bullet and sentence leads with an action verb or noun. "Led a team of 10" not "I led a team of 10"
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
`

  const now = new Date()
  const currentDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const currentYear = now.getFullYear()

  const prompt = `You are an expert resume writer and career coach. You write resumes that are direct, confident, and tailored — never generic, never bloated.

IMPORTANT CONTEXT: Today's date is ${currentDate}. The current year is ${currentYear}. Any employment dates from ${currentYear} or earlier are in the past or present — never flag them as future dates.

A person has provided their LinkedIn profile data and a job description. Your job is to craft the following:

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
- Open with a specific hook — reference the role and one concrete thing from their background
- No desperation, no groveling
- End with a low-pressure call to action
- Tone: confident peer, not supplicant

CONTACT INFO REQUIREMENTS:
- In the resume header, include name, email, phone, and LinkedIn URL if present
- CRITICAL: Never prefix the LinkedIn URL with the word "LinkedIn:" or "LinkedIn" — just include the bare URL (e.g. linkedin.com/in/matassa, NOT "LinkedIn: linkedin.com/in/matassa")
- Strip any social media labels like "LinkedIn:", "GitHub:", "Twitter:" — show only the URL itself

METADATA REQUIREMENTS:
- candidateName: full name
- candidateEmail: email if present, else ""
- candidatePhone: phone if present, else ""
- companyName: company name (short form, no Inc/LLC)
- jobTitle: job title (2-4 words max, no special chars)

Respond in this exact format:
${outputFormat}`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: dualVersion ? 5000 : 3000,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = message.content[0].text

    // Parse metadata
    let metadata = { candidateName: '', candidateEmail: '', candidatePhone: '', companyName: '', jobTitle: '' }
    const metaMatch = responseText.match(/===METADATA===\s*(\{[\s\S]*?\})\s*===RECRUITER_NOTES===/)
    if (metaMatch) {
      try { metadata = { ...metadata, ...JSON.parse(metaMatch[1]) } } catch (e) {}
    }

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

      return res.status(200).json({
        dualVersion: true,
        resumeA,
        resumeB,
        coverLetter,
        recruiterNotes,
        hiringManagerDM,
        metadata,
        fileBaseName,
      })
    } else {
      const resumeMatch = responseText.match(/===RESUME===([\s\S]*?)===COVER_LETTER===/)
      const coverMatch = responseText.match(/===COVER_LETTER===([\s\S]*?)===HIRING_MANAGER_DM===/)
      const dmMatch = responseText.match(/===HIRING_MANAGER_DM===([\s\S]*)$/)

      const resume = resumeMatch ? resumeMatch[1].trim() : responseText
      const rawCover = coverMatch ? coverMatch[1].trim() : ''
      const coverLetter = contactHeader + rawCover
      const hiringManagerDM = dmMatch ? dmMatch[1].trim() : ''

      return res.status(200).json({
        dualVersion: false,
        resume,
        coverLetter,
        recruiterNotes,
        hiringManagerDM,
        metadata,
        fileBaseName,
      })
    }
  } catch (err) {
    console.error('Claude API error:', err)
    return res.status(500).json({ error: 'Generation failed. Please try again.' })
  }
}
