import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { bullet } = req.body
  if (!bullet || bullet.trim().length < 10) {
    return res.status(400).json({ error: 'Bullet too short' })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Rewrite this resume bullet point to be stronger, more specific, and results-focused. Add a metric or outcome if one is implied. Output ONLY the improved bullet — no explanation, no preamble, no quotes, no label.

Original bullet: ${bullet.trim()}`
      }]
    })

    const tailored = message.content[0]?.text?.trim() || bullet
    return res.status(200).json({ tailored })
  } catch (err) {
    console.error('tailor-bullet error:', err)
    return res.status(500).json({ error: 'Failed to tailor bullet' })
  }
}
