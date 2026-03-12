import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  LevelFormat,
  BorderStyle,
  PageBreak,
} from 'docx'

// Parse a line that may contain **bold** spans into TextRun array
function parseInline(text) {
  const runs = []
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**')) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true, font: 'Calibri', size: 22 }))
    } else if (part) {
      runs.push(new TextRun({ text: part, font: 'Calibri', size: 22 }))
    }
  }
  return runs
}

// Convert markdown-ish resume text into docx Paragraph array
function parseResume(text) {
  const lines = text.split('\n')
  const paragraphs = []
  let inBulletBlock = false

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const line = raw.trim()

    // Skip empty lines — add spacing via paragraph spacing instead
    if (!line) {
      inBulletBlock = false
      paragraphs.push(new Paragraph({ spacing: { after: 80 } }))
      continue
    }

    // H1 — candidate name (first # or all-caps short line at top)
    if (/^#\s+/.test(line)) {
      const content = line.replace(/^#\s+/, '')
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: content, bold: true, font: 'Calibri', size: 36, color: '1A1A18' })],
          spacing: { after: 60 },
        })
      )
      continue
    }

    // H2 — section headers (## Experience, ## Skills, etc.)
    if (/^##\s+/.test(line)) {
      const content = line.replace(/^##\s+/, '')
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: content.toUpperCase(), bold: true, font: 'Calibri', size: 22, color: '1A1A18' })],
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'C8973A', space: 4 } },
          spacing: { before: 240, after: 120 },
        })
      )
      inBulletBlock = false
      continue
    }

    // H3 — job titles / company lines
    if (/^###\s+/.test(line)) {
      const content = line.replace(/^###\s+/, '')
      paragraphs.push(
        new Paragraph({
          children: parseInline(content),
          spacing: { before: 160, after: 40 },
        })
      )
      inBulletBlock = false
      continue
    }

    // Bullets — lines starting with - or • or *
    if (/^[-•*]\s+/.test(line)) {
      const content = line.replace(/^[-•*]\s+/, '')
      inBulletBlock = true
      paragraphs.push(
        new Paragraph({
          numbering: { reference: 'resume-bullets', level: 0 },
          children: parseInline(content),
          spacing: { after: 40 },
        })
      )
      continue
    }

    // Bold-only line (section header without ##) — e.g. **Skills** or **Education**
    if (/^\*\*[^*]+\*\*$/.test(line)) {
      const content = line.slice(2, -2)
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: content.toUpperCase(), bold: true, font: 'Calibri', size: 22, color: '1A1A18' })],
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'C8973A', space: 4 } },
          spacing: { before: 240, after: 120 },
        })
      )
      inBulletBlock = false
      continue
    }

    // Regular paragraph
    inBulletBlock = false
    paragraphs.push(
      new Paragraph({
        children: parseInline(line),
        spacing: { after: 80 },
      })
    )
  }

  return paragraphs
}

// Simpler parser for cover letter — just paragraphs, no special sections
function parseCoverLetter(text) {
  const paragraphs = []
  const blocks = text.split(/\n\n+/)
  for (const block of blocks) {
    const cleaned = block.trim().replace(/\n/g, ' ')
    if (!cleaned) continue
    paragraphs.push(
      new Paragraph({
        children: parseInline(cleaned),
        spacing: { after: 240 },
        alignment: AlignmentType.LEFT,
      })
    )
  }
  return paragraphs
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let body = ''
  for await (const chunk of req) body += chunk
  let payload
  try {
    payload = JSON.parse(body)
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  const { resume, coverLetter, fileBaseName = 'resume' } = payload

  if (!resume && !coverLetter) {
    return res.status(400).json({ error: 'No content provided' })
  }

  try {
    const sections = []

    // Resume section
    if (resume) {
      sections.push({
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children: parseResume(resume),
      })
    }

    // Cover letter section (new page)
    if (coverLetter && resume) {
      sections.push({
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: parseCoverLetter(coverLetter),
      })
    } else if (coverLetter && !resume) {
      sections.push({
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: parseCoverLetter(coverLetter),
      })
    }

    const doc = new Document({
      numbering: {
        config: [
          {
            reference: 'resume-bullets',
            levels: [
              {
                level: 0,
                format: LevelFormat.BULLET,
                text: '•',
                alignment: AlignmentType.LEFT,
                style: {
                  paragraph: {
                    indent: { left: 360, hanging: 240 },
                  },
                  run: { font: 'Calibri', size: 22 },
                },
              },
            ],
          },
        ],
      },
      styles: {
        default: {
          document: {
            run: { font: 'Calibri', size: 22, color: '1A1A18' },
            paragraph: { spacing: { line: 276 } },
          },
        },
      },
      sections,
    })

    const buffer = await Packer.toBuffer(doc)

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename="${fileBaseName}.docx"`)
    res.setHeader('Content-Length', buffer.length)
    return res.status(200).send(buffer)
  } catch (err) {
    console.error('DOCX generation error:', err)
    return res.status(500).json({ error: 'DOCX generation failed' })
  }
}
