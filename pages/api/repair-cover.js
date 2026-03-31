// pages/api/repair-cover.js
// Pro+ feature — rewrites cover letter to incorporate missing ATS keywords
// Same ethics rules as regenerate.js — no fabrication

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { coverLetter, jobDescription, missingKeywords } = req.body

  if (!coverLetter || !jobDescription) {
    return res.status(400).json({ error: 'Missing required fields.' })
  }

  const keywordBlock = missingKeywords && missingKeywords.length > 0
    ? `\nATS KEYWORDS MISSING FROM COVER LETTER (weave in naturally where the content supports it — do not fabricate):\n${missingKeywords.join(', ')}\n`
    : ''

  const systemPrompt = `You are a professional cover letter editor. You receive a cover letter, a job description, and a list of missing ATS keywords.
Your job is to rewrite the cover letter to score higher on ATS systems by naturally incorporating the missing keywords — without changing the core story, fabricating experience, or making the letter sound robotic.

ABSOLUTE RULES:
- Do not invent any experience, companies, metrics, or facts not in the original letter
- Keep the writer's voice and tone intact
- Every missing keyword must be woven in naturally — not stuffed or forced
- The letter should read better than the original, not worse
- Do not add a subject line or "Dear Hiring Manager" unless it was in the original

Return ONLY the rewritten cover letter as plain text. No JSON, no markdown, no commentary.`

  const userPrompt = `JOB DESCRIPTION:
${jobDescription}

ORIGINAL COVER LETTER:
${coverLetter}
${keywordBlock}
Rewrite the cover letter to naturally incorporate the missing keywords while preserving the writer's voice and all original facts. Return only the rewritten cover letter.`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    })

    const repairedCover = message.content[0]?.text?.trim() || ''

    if (!repairedCover) {
      throw new Error('Empty response from repair.')
    }

    return res.status(200).json({ coverLetter: repairedCover })
  } catch (err) {
    console.error('Repair cover error:', err)
    return res.status(500).json({ error: err.message || 'Repair failed. Please try again.' })
  }
}
