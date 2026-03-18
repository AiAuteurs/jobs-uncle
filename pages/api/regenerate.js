// pages/api/regenerate.js
// Applies recruiter analysis fixes to produce an improved resume + cover letter
// Frontend-gated at Pro tier — server-side KV hardening can be added once build is stable

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // ── Parse body ────────────────────────────────────────────────────────────
  const { resume, jobDescription, recruiterNotes } = req.body

  if (!resume || !jobDescription || !recruiterNotes) {
    return res.status(400).json({ error: 'Missing required fields.' })
  }

  // ── Prompt ────────────────────────────────────────────────────────────────
  const systemPrompt = `You are a professional resume writer and career strategist. 
You receive a resume, a job description, and a recruiter/ATS analysis that identifies gaps. 
Your job is to produce an improved Version 2 resume and cover letter that directly addresses every issue flagged in the analysis.

Rules:
- Apply ALL flagged fixes from the recruiter analysis
- Mirror the job description's exact language and keywords where natural
- Do not fabricate experience, titles, companies, or dates
- Keep the same factual career history — only reframe, reorder, and strengthen the language
- The cover letter should be rewritten to reflect the improved positioning
- Output ONLY valid JSON with keys: resume, coverLetter
- No markdown fences, no preamble, no commentary outside the JSON`

  const userPrompt = `JOB DESCRIPTION:
${jobDescription}

ORIGINAL RESUME:
${resume}

RECRUITER & ATS ANALYSIS (apply all fixes):
${recruiterNotes}

Produce an improved Version 2 resume and cover letter that addresses every issue flagged above. Return ONLY JSON: { "resume": "...", "coverLetter": "..." }`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    })

    const raw = message.content[0]?.text || ''
    const clean = raw.replace(/```json|```/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(clean)
    } catch {
      // Fallback: try to extract JSON object
      const jsonMatch = clean.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Could not parse regenerated output.')
      }
    }

    if (!parsed.resume || !parsed.coverLetter) {
      throw new Error('Incomplete regeneration output.')
    }

    return res.status(200).json({
      resume: parsed.resume,
      coverLetter: parsed.coverLetter,
    })
  } catch (err) {
    console.error('Regenerate error:', err)
    return res.status(500).json({ error: err.message || 'Regeneration failed. Please try again.' })
  }
}
