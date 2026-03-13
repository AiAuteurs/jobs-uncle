import formidable from 'formidable'
import fs from 'fs'
import Anthropic from '@anthropic-ai/sdk'

export const config = {
  api: {
    bodyParser: false,
  },
}

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function extractTextFromPDF(filePath) {
  const buffer = fs.readFileSync(filePath)
  const pdfParse = require('pdf-parse')
  const data = await pdfParse(buffer)
  return data.text
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const form = formidable({ maxFileSize: 10 * 1024 * 1024 }) // 10MB max

  let fields, files
  try {
    ;[fields, files] = await form.parse(req)
  } catch (err) {
    return res.status(400).json({ error: 'Failed to parse upload' })
  }

  const pdfFile = Array.isArray(files.pdf) ? files.pdf[0] : files.pdf
  const jobDescription = Array.isArray(fields.jobDescription)
    ? fields.jobDescription[0]
    : fields.jobDescription

  if (!pdfFile || !jobDescription) {
    return res.status(400).json({ error: 'Missing PDF or job description' })
  }

  let linkedinText = ''
  try {
    linkedinText = await extractTextFromPDF(pdfFile.filepath)
  } catch (err) {
    linkedinText = '[Could not extract LinkedIn PDF text automatically. Please ensure you uploaded a LinkedIn profile PDF.]'
  } finally {
    try { fs.unlinkSync(pdfFile.filepath) } catch (e) {}
  }

  const prompt = `You are an expert resume writer and career coach. You write resumes that are direct, confident, and tailored — never generic, never bloated.

A person has provided their LinkedIn profile data and a job description. Your job is to craft five things:
1. A recruiter gap analysis
2. A tailored, professional resume
3. A sharp, specific cover letter
4. A hiring manager DM
5. Metadata

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
- If there are employment gaps, flag them and suggest exactly how to reframe each one as growth, not failure
- If there are no gaps, say so briefly
- Format as a short bulleted list — plain text, no headers
- Keep it under 150 words total

RESUME REQUIREMENTS:
- Lead with a punchy 2-3 sentence professional summary that speaks directly to THIS role
- Highlight only the experience most relevant to this specific job
- Use strong action verbs and concrete results where possible
- Turn bullet points into achievement-focused statements — add metrics wherever the background supports it
- Do NOT include an objective statement
- Format cleanly with clear sections: Summary, Experience, Skills, Education
- Keep it to one page worth of content
- Mirror keywords and phrases from the job description naturally throughout — optimize for ATS without sounding robotic
- If there are employment gaps in the profile, reframe them confidently as growth, skill-building, or intentional transition — never hide them, own them
- Do NOT pad or embellish — be ruthlessly relevant

COVER LETTER REQUIREMENTS:
- Maximum 3 paragraphs
- Open with something specific about the company or role — not "I am writing to apply for..."
- Middle paragraph: the 2-3 specific things from their background that make them right for this role
- Close with confidence, not desperation — no "I look forward to hearing from you at your earliest convenience"
- Conversational but professional tone
- Do NOT use clichés or corporate filler
- Do NOT include a contact info header — that will be added separately

HIRING MANAGER DM REQUIREMENTS:
- Write a short, punchy message the candidate can DM or email directly to a hiring manager
- 3-4 sentences max
- Open with a specific hook — reference the role and one concrete thing from their background
- No desperation, no groveling, no "I hope this message finds you well"
- End with a low-pressure call to action — make it easy to say yes
- Tone: confident peer, not supplicant

METADATA REQUIREMENTS:
Extract from the LinkedIn profile and job description:
- candidateName: full name of the candidate
- candidateEmail: email address if present, else ""
- candidatePhone: phone number if present, else ""
- companyName: name of the company in the job description (short form, no Inc/LLC)
- jobTitle: the job title from the job description (2-4 words max, no special chars)

Respond in this exact format with these exact markers:

===METADATA===
{"candidateName":"...","candidateEmail":"...","candidatePhone":"...","companyName":"...","jobTitle":"..."}

===RECRUITER_NOTES===
[recruiter gap analysis here]

===RESUME===
[resume content here]

===COVER_LETTER===
[cover letter content here]

===HIRING_MANAGER_DM===
[hiring manager DM here]`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = message.content[0].text

    // Parse metadata
    let metadata = { candidateName: '', candidateEmail: '', candidatePhone: '', companyName: '', jobTitle: '' }
    const metaMatch = responseText.match(/===METADATA===\s*(\{[\s\S]*?\})\s*===RECRUITER_NOTES===/)
    if (metaMatch) {
      try { metadata = { ...metadata, ...JSON.parse(metaMatch[1]) } } catch (e) {}
    }

    // Parse all sections
    const recruiterNotesMatch = responseText.match(/===RECRUITER_NOTES===([\s\S]*?)===RESUME===/)
    const resumeMatch = responseText.match(/===RESUME===([\s\S]*?)===COVER_LETTER===/)
    const coverMatch = responseText.match(/===COVER_LETTER===([\s\S]*?)===HIRING_MANAGER_DM===/)
    const dmMatch = responseText.match(/===HIRING_MANAGER_DM===([\s\S]*)$/)

    const recruiterNotes = recruiterNotesMatch ? recruiterNotesMatch[1].trim() : ''
    const resume = resumeMatch ? resumeMatch[1].trim() : responseText

    // Build contact header for cover letter
    const contactParts = [metadata.candidateName, metadata.candidateEmail, metadata.candidatePhone].filter(Boolean)
    const contactHeader = contactParts.length > 0 ? contactParts.join(' · ') + '\n\n' : ''
    const rawCoverLetter = coverMatch ? coverMatch[1].trim() : ''
    const coverLetter = contactHeader + rawCoverLetter

    const hiringManagerDM = dmMatch ? dmMatch[1].trim() : ''

    // Build safe filename slug
    const slug = (str) => str.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
    const fileBaseName = [slug(metadata.candidateName), slug(metadata.companyName), slug(metadata.jobTitle)]
      .filter(Boolean).join('_') || 'resume'

    // Increment counter — fire and forget, never block the response
    fetch((process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000') + '/api/counter', { method: 'POST' }).catch(() => {})

    return res.status(200).json({ resume, coverLetter, recruiterNotes, hiringManagerDM, metadata, fileBaseName })
  } catch (err) {
    console.error('Claude API error:', err)
    return res.status(500).json({ error: 'Generation failed. Please try again.' })
  }
}
