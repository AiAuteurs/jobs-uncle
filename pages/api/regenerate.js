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

  // ── ATS keyword injection (mirrors generate.js) ───────────────────────────
  function scoreKeywordMatch(resumeText, jd) {
    if (!resumeText || !jd) return { missing: [] }
    const STOP = new Set([
      'the','and','or','of','to','a','an','in','for','with','on','at','by','from',
      'is','are','was','were','be','been','have','has','had','do','does','did',
      'will','would','could','should','may','might','this','that','these','those',
      'we','you','your','our','their','its','it','as','if','so','but','not','no',
      'use','using','used','work','working','experience','ability','strong','proven',
      'role','position','team','company','business','project','process','based',
      'well','also','very','highly','quickly','effectively','efficiently',
    ])
    const jdLower = jd.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
    const jdWords = jdLower.split(/\s+/).filter(w => w.length >= 6 && !STOP.has(w))
    const freq = {}
    jdWords.forEach(w => { freq[w] = (freq[w] || 0) + 1 })
    const candidates = Object.entries(freq)
      .filter(([, c]) => c >= 2)
      .map(([w]) => w)
      .filter(k => k.length >= 6)
      .slice(0, 40)
    function stem(w) {
      if (w.endsWith('ing') && w.length > 6) return w.slice(0, -3)
      if (w.endsWith('tion') && w.length > 7) return w.slice(0, -4)
      if (w.endsWith('ed') && w.length > 5) return w.slice(0, -2)
      if (w.endsWith('ly') && w.length > 5) return w.slice(0, -2)
      if (w.endsWith('s') && w.length > 5) return w.slice(0, -1)
      return w
    }
    const resumeLower = resumeText.toLowerCase()
    const resumeWords = resumeLower.split(/\s+/)
    const missing = []
    candidates.forEach(kw => {
      const kwStem = stem(kw)
      const found = resumeLower.includes(kw) ||
        resumeLower.includes(kw.endsWith('s') ? kw.slice(0, -1) : kw + 's') ||
        resumeWords.some(w => stem(w) === kwStem)
      if (!found) missing.push(kw)
    })
    return { missing: missing.slice(0, 15) }
  }

  const { missing: missingKeywords } = scoreKeywordMatch(resume, jobDescription)
  const keywordBlock = missingKeywords.length > 0
    ? `\nATS KEYWORDS STILL MISSING FROM RESUME (incorporate naturally where the original resume supports it — do not fabricate context):\n${missingKeywords.join(', ')}\n`
    : ''


  // ── Prompt ────────────────────────────────────────────────────────────────
  const systemPrompt = `You are a professional resume writer and career strategist with a strict code of ethics. 
You receive a resume, a job description, and a recruiter/ATS analysis that identifies gaps.
Your job is to produce an improved Version 2 resume and cover letter using ONLY the factual content in the original resume.

ABSOLUTE RULES — violations will harm real people's careers:

NEVER FABRICATE:
- Do not invent any numbers, metrics, dollar amounts, percentages, or viewer counts that are not in the original resume
- Do not invent team sizes, headcounts, or reporting structures not stated in the original
- Do not add employers, clients, or companies not in the original resume
- Do not invent dates, titles, or roles not in the original resume
- Do not imply the person worked FOR a company that was actually a CLIENT
- If the recruiter analysis says "add metrics" but no real metrics exist in the original resume, SKIP that fix — do not make up numbers. Instead, strengthen the language around the work that is documented.

WHAT YOU CAN DO:
- Reframe and strengthen existing language to better match the job description
- Reorder bullet points to lead with the most relevant experience
- Mirror the job description's exact keywords and phrases where they accurately describe the work
- Consolidate scattered experience into clearer narratives
- Elevate the positioning of real skills and real work
- Add specificity only when that specificity is already present in the original resume

QUALITY CHECK before outputting:
- Read every bullet point you wrote — is every fact, number, and company in the original resume?
- If any bullet contains information not in the original, rewrite it to remove the fabrication
- The person will submit this resume to employers — accuracy is non-negotiable

Output ONLY valid JSON with keys: resume, coverLetter
No markdown fences, no preamble, no commentary outside the JSON`

  const userPrompt = `JOB DESCRIPTION:
${jobDescription}

ORIGINAL RESUME (the ONLY source of truth — every fact in your output must come from here):
${resume}

RECRUITER & ATS ANALYSIS (apply fixes where possible using ONLY facts from the original resume):
${recruiterNotes}

IMPORTANT: If a fix requires information not present in the original resume (e.g. "add metrics" when no metrics exist), skip that fix rather than inventing data. Strengthen the language around what IS there instead.

${keywordBlock}Produce an improved Version 2 resume and cover letter. Return ONLY JSON: { "resume": "...", "coverLetter": "..." }`

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
