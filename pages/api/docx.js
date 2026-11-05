import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, LevelFormat } from 'docx'

export const config = {
  api: { bodyParser: false },
}

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

// Same rules as the on-screen preview: no "---" separators, no blank gap at the top,
// first line is the name, plain-text section titles get heading style.
const SECTION_LABEL = /^(summary|professional summary|profile|about|experience|work experience|professional experience|relevant experience|employment history|employment|career history|skills|core skills|key skills|skills and tools|skills & tools|technical skills|tools|software|education|certifications?|licenses|selected work|portfolio|projects|awards|honors|publications|languages|volunteer|volunteering|interests)$/i
const RULE_LINE = /^([-*_])(\s*\1){2,}$/
const BULLET_LINE = /^[-•*–]\s+/
const sectionHeading = (content) => new Paragraph({
  children: [new TextRun({ text: content.toUpperCase(), bold: true, font: 'Calibri', size: 22, color: '1A1A18' })],
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'C8973A', space: 4 } },
  spacing: { before: 240, after: 120 },
  keepNext: true,
})

function parseResume(text) {
  const lines = text.replace(/\r/g, '').split('\n').map((l) => l.trim())
  const paragraphs = []
  let i = 0
  while (i < lines.length && (!lines[i] || RULE_LINE.test(lines[i]))) i++

  // Name on the first line, even when the AI didn't mark it with "#"
  if (i < lines.length && !/^#\s+/.test(lines[i])) {
    const name = lines[i].replace(/^#{1,3}\s+/, '').replace(/^\*\*(.+)\*\*$/, '$1')
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: name, bold: true, font: 'Calibri', size: 36, color: '1A1A18' })],
      spacing: { after: 60 },
    }))
    i++
  }
  let lastBlank = false
  const isTitleLine = (l) => l.length <= 90 && !/[.!?]$/.test(l) && !BULLET_LINE.test(l) && !RULE_LINE.test(l) &&
    !/^#{1,3}\s/.test(l) && !SECTION_LABEL.test(l.replace(/:$/, ''))
  const nextLine = (k) => { for (let j = k + 1; j < lines.length; j++) if (lines[j] && !RULE_LINE.test(lines[j])) return lines[j]; return '' }

  for (; i < lines.length; i++) {
    const line = lines[i]

    if (RULE_LINE.test(line)) continue
    if (!line) {
      if (!lastBlank) paragraphs.push(new Paragraph({ spacing: { after: 80 } }))
      lastBlank = true
      continue
    }
    lastBlank = false

    if (SECTION_LABEL.test(line.replace(/:$/, ''))) {
      paragraphs.push(sectionHeading(line.replace(/:$/, '')))
      continue
    }

    // Short title lines sitting on top of bullets = a role block: first line bold heading,
    // following lines (location, dates) as quieter detail lines.
    if (isTitleLine(line)) {
      let j = i
      while (j + 1 < lines.length && lines[j + 1] && isTitleLine(lines[j + 1])) j++
      if (BULLET_LINE.test(nextLine(j))) {
        const plain = (t) => t.replace(/\*\*(.+?)\*\*/g, '$1')
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: plain(line), bold: true, font: 'Calibri', size: 22 })],
          spacing: { before: 160, after: j > i ? 0 : 40 },
          keepNext: true,
        }))
        for (let k = i + 1; k <= j; k++) {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: plain(lines[k]), font: 'Calibri', size: 20, color: '555555' })],
            spacing: { after: k === j ? 40 : 0 },
            keepNext: true,
          }))
        }
        lastBlank = false
        i = j
        continue
      }
    }

    if (/^#\s+/.test(line)) {
      const content = line.replace(/^#\s+/, '')
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: content, bold: true, font: 'Calibri', size: 36, color: '1A1A18' })],
        spacing: { after: 60 },
      }))
      continue
    }

    if (/^##\s+/.test(line)) {
      const content = line.replace(/^##\s+/, '')
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: content.toUpperCase(), bold: true, font: 'Calibri', size: 22, color: '1A1A18' })],
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'C8973A', space: 4 } },
        spacing: { before: 240, after: 120 },
      }))
      continue
    }

    if (/^###\s+/.test(line)) {
      const content = line.replace(/^###\s+/, '')
      paragraphs.push(new Paragraph({
        children: parseInline(content),
        spacing: { before: 160, after: 40 },
      }))
      continue
    }

    if (BULLET_LINE.test(line)) {
      const content = line.replace(BULLET_LINE, '')
      paragraphs.push(new Paragraph({
        children: parseInline(content),
        numbering: { reference: 'bullets', level: 0 },
        spacing: { after: 40 },
      }))
      continue
    }

    if (/^\*\*[^*]+\*\*$/.test(line)) {
      const content = line.slice(2, -2)
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: content.toUpperCase(), bold: true, font: 'Calibri', size: 22, color: '1A1A18' })],
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'C8973A', space: 4 } },
        spacing: { before: 240, after: 120 },
      }))
      continue
    }

    paragraphs.push(new Paragraph({
      children: parseInline(line),
      spacing: { after: 80 },
    }))
  }

  return paragraphs
}

function parseCoverLetter(text) {
  const paragraphs = []
  const blocks = text.split(/\n\n+/)
  for (const block of blocks) {
    const lines = block.trim().split('\n').map((l) => l.trim()).filter(Boolean)
    const cleaned = lines.join(' ')
    if (!cleaned || /^([-*_])(\s*\1){2,}$/.test(cleaned)) continue
    // Short stacked lines (sign-off "Best," + name, contact lines) keep their line breaks;
    // wrapped prose is joined back into one flowing paragraph.
    const keepBreaks = lines.length > 1 && lines.every((l) => l.length <= 60)
    const children = keepBreaks
      ? lines.flatMap((l, i) => (i ? [new TextRun({ break: 1 }), ...parseInline(l)] : parseInline(l)))
      : parseInline(cleaned)
    paragraphs.push(new Paragraph({
      children,
      spacing: { after: 240 },
      alignment: AlignmentType.LEFT,
    }))
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

    if (coverLetter) {
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
        config: [{
          reference: 'bullets',
          levels: [{
            level: 0,
            format: LevelFormat.BULLET,
            text: '•',
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: { indent: { left: 360, hanging: 180 } },
              run: { font: 'Calibri', size: 22 },
            },
          }],
        }],
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
    return res.status(500).json({ error: 'DOCX generation failed', detail: err.message })
  }
}
