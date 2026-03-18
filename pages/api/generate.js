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

  const resumeInstructions = dualVersion ? `
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
- Lead with a punchy 2-3 sentence professional summary that speaks directly to THIS role
- Highlight only the experience most relevant to this specific job
- Use strong action verbs and concrete results where possible
- Turn bullet points into achievement-focused statements — add metrics wherever the background supports it
- Do NOT include an objective statement
- Format cleanly with clear sections: Summary, Experience, Skills, Education
- Keep it to one page worth of content
- Mirror keywords and phrases from the job description naturally throughout — optimize for ATS without sounding robotic
- If there are employment gaps in the profile, reframe them confidently as growth, skill-building, or intentional transition
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
- Identify 3-5 specific things that would stop you from reaching out — be honest and direct, not diplomatic
- For EVERY issue you flag, immediately follow it with a concrete "Fix:" suggestion — exactly what to change, add, reword, or remove
- CRITICAL: Only flag employment date overlaps or gaps if you can verify them with absolute certainty from the data provided. Do NOT infer or assume overlaps — if dates are ambiguous, do not flag them. A false date flag can seriously harm someone's confidence and career.
- If there are clear verified employment gaps, flag them and give exact reframe language to use
- Format as a bulleted list. Each bullet = the problem, followed by "Fix:" on a new line with the specific solution
- Keep it under 200 words total
- Tone: tough but constructive — like a mentor who wants them to get the job

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
