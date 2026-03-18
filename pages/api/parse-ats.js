// pages/api/parse-ats.js
// Parses a generated resume into structured ATS-ready fields
// Gated at Pro+ tier (frontend-enforced)

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { resume } = req.body
  if (!resume) return res.status(400).json({ error: 'Missing resume.' })

  const systemPrompt = `You are a resume parser. Extract structured data from a resume and return ONLY valid JSON with no markdown fences, no preamble, no commentary.

CRITICAL RULES:
- Extract ONLY information explicitly stated in the resume
- Do not infer, assume, or fabricate any data
- Do not list a company as an employer if the resume shows them as a client or project credit
- Do not invent metrics, dates, or titles not present in the resume
- If a field has no data in the resume, omit it or use an empty string — never guess`

  const userPrompt = `Parse this resume into structured ATS fields. Extract ONLY what is explicitly stated.

IMPORTANT: For employment history, only list companies where the person was directly employed or contracted. If a company appears as a client, project credit, or brand worked on — do NOT list them as an employer.

For education: always extract the graduation year if present. If only a start year is present, use that. Never leave year empty if any year appears near the education entry.

Return ONLY this exact JSON shape:

{
  "headline": "job title / professional headline — never include AI filmmaker, AI director, or any AI identity framing",
  "summary": "2-3 sentence professional summary",
  "skills": ["skill1", "skill2", "skill3"],
  "employment": [
    {
      "employer": "Company Name",
      "title": "Job Title",
      "startMonth": "Jan",
      "startYear": "2024",
      "endMonth": "Mar",
      "endYear": "2025",
      "current": false,
      "description": "2-3 sentence description of role and achievements"
    }
  ],
  "education": [
    {
      "school": "School Name",
      "degree": "Bachelor's",
      "field": "Film and Television",
      "year": "1995"
    }
  ]
}

RESUME:
${resume}

Return ONLY the JSON. No markdown, no preamble, no trailing punctuation in field values.`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    })

    const raw = message.content[0]?.text || ''
    const clean = raw.replace(/```json|```/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(clean)
    } catch {
      const jsonMatch = clean.match(/\{[\s\S]*\}/)
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
      else throw new Error('Could not parse ATS data.')
    }

    return res.status(200).json(parsed)
  } catch (err) {
    console.error('parse-ats error:', err)
    return res.status(500).json({ error: err.message || 'Parsing failed.' })
  }
}
