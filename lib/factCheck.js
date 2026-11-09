// Shared by /api/generate and /api/regenerate: one tested fact-check for every document.

/**
 * FACT CHECK — second pass that compares generated text against the source resume.
 * Fixes claims the source doesn't support (invented causes/methods, achievements moved
 * to another job, merged projects, inflated scope) with the smallest possible edit.
 * Never throws: on any failure it returns the documents unchanged with checked: false.
 */
const FACT_CHECK_MODEL = process.env.FACT_CHECK_MODEL || 'claude-haiku-4-5'
const FACT_CHECK_TIMEOUT_MS = Number(process.env.FACT_CHECK_TIMEOUT_MS) || 20000 // checking may never add more than this

const numbersIn = (t) => (String(t).match(/\d[\d,.]*\s*[%xkKmMbB]?/g) || []).map(n => n.replace(/\s+/g, '').toLowerCase())

// ── Code checks that don't rely on AI judgment ──────────────────────────────
// Every achievement worth checking has a number ("3.6M views", "52% to 78%", "2.4x").
// We record where each number lives in the source (which job, or an unattached
// "Selected work" item) and whether the source explains it with a cause, then
// flag output sentences that move it or invent a "by/through/because".
const METRIC_RE = /\$?\d+(?:[.,]\d+)?\s?(?:%|[kKmMbB]\b|x\b)/g
const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?'
const DATE_RANGE_RE = new RegExp(`(?:${MONTH}\\s+)?(?:19|20)\\d{2}\\s*[–—-]\\s*(?:(?:${MONTH}\\s+)?(?:19|20)\\d{2}|present|current|now)`, 'i')
const UNATTACHED_LABEL = /^(selected work|selected projects|projects|portfolio|highlights|notable work|key projects)$/i
const OTHER_LABEL = /^(summary|professional summary|profile|about|skills|core skills|skills and tools|skills & tools|tools|software|education|certifications?|awards|languages|interests|experience|work experience|professional experience|employment history)$/i
const CAUSE_RE = /\b(by (?!friday|monday|tuesday|wednesday|thursday|saturday|sunday|the end|end of|day|week|month|quarter|year|\d)\w+|through|thanks to|because|due to|driven by|as a result of|which (?:led|drove|pushed|lifted|raised))\b/i
const STOP_TOKENS = new Set(['senior', 'junior', 'lead', 'video', 'editor', 'editing', 'growth', 'present', 'current', 'remote', 'hybrid', 'manager', 'director', 'creative', 'designer', 'producer', 'specialist', 'associate', 'head', 'the', 'and', 'inc', 'llc', 'ltd'])

const cleanLine = (l) => l.replace(/\*\*/g, '').replace(/^#{1,3}\s+/, '').replace(/^[-•*–]\s+/, '').trim()
const metricsIn = (t) => (String(t).match(METRIC_RE) || []).map(m => m.replace(/\s+/g, '').toLowerCase())
const splitSentences = (t) => String(t).replace(/\n+/g, ' \n ').split(/(?<=[.!?])\s+(?=[A-Z"“])|\n/).map(x => x.trim()).filter(Boolean)

// PDFs break sentences across lines ("…from\n38% to 61%."). Rejoin wrapped lines into
// logical lines: a new one starts at a bullet, a section title, a job header, or after a blank line.
function logicalLines(text) {
  const raw = String(text).replace(/\r/g, '').split('\n')
  const out = []
  let startNew = true
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i].trim()
    if (!r) { startNew = true; continue }
    if (/^[•●▪◦\-*–]$/.test(r)) { startNew = true; out.push('- '); startNew = false; out.isBulletPending = true; continue }
    const bare = cleanLine(r).replace(/:$/, '')
    const boundary = /^[-•●▪◦*–]\s/.test(r) || UNATTACHED_LABEL.test(bare) || OTHER_LABEL.test(bare) ||
      (r.length < 200 && DATE_RANGE_RE.test(r) && !/[.!?]$/.test(r))
    if (out.isBulletPending) { out[out.length - 1] += r; out.isBulletPending = false; startNew = false; continue }
    if (startNew || boundary || !out.length) out.push(r)
    else out[out.length - 1] += ' ' + r
    startNew = UNATTACHED_LABEL.test(bare) || OTHER_LABEL.test(bare) || (r.length < 200 && DATE_RANGE_RE.test(r) && !/[.!?]$/.test(r))
  }
  return out
}

// Walk a document line by line, tagging each line with its block: a job header, an unattached section, or other
function blocksOf(text) {
  const out = []
  let owner = { kind: 'other', header: '' }
  for (const raw of logicalLines(text)) {
    const line = cleanLine(raw)
    if (!line) continue
    const bare = line.replace(/:$/, '')
    if (UNATTACHED_LABEL.test(bare)) { owner = { kind: 'unattached', header: bare }; continue }
    if (OTHER_LABEL.test(bare)) { owner = { kind: 'other', header: bare }; continue }
    if (!/^[-•*–]\s/.test(raw.trim()) && line.length < 200 && DATE_RANGE_RE.test(line)) {
      owner = { kind: 'job', header: line }
      continue
    }
    out.push({ line, owner })
  }
  return out
}

function headerTokens(header) {
  return new Set((header.match(/[A-Z][A-Za-z&'’.-]{3,}/g) || []).map(w => w.toLowerCase()).filter(w => !STOP_TOKENS.has(w)))
}

export function findSuspects(sourceResume, docs) {
  try {
    return findSuspectsUnsafe(sourceResume, docs)
  } catch (e) {
    console.error('Code checks skipped:', e?.message || e)
    return []
  }
}

function findSuspectsUnsafe(sourceResume, docs) {
  const src = blocksOf(sourceResume)
  const jobHeaders = [...new Set(src.filter(b => b.owner.kind === 'job').map(b => b.owner.header))]
  // tokens that identify exactly one job (e.g. "stillwater", "brightline", "oakland")
  const counts = {}
  jobHeaders.forEach(h => headerTokens(h).forEach(t => { counts[t] = (counts[t] || 0) + 1 }))
  const distinctive = new Map(jobHeaders.map(h => [h, [...headerTokens(h)].filter(t => counts[t] === 1)]))
  const allDistinctive = [...distinctive.values()].flat()

  // metric → where it lives in the source, and whether the source explains it
  const where = {}
  for (const b of src) {
    for (const m of metricsIn(b.line)) {
      (where[m] = where[m] || { owners: [], sentences: [] })
      where[m].owners.push(b.owner)
      splitSentences(b.line).filter(x => metricsIn(x).includes(m)).forEach(x => where[m].sentences.push(x))
    }
  }
  const tokensFor = (owner) => owner.kind === 'job' ? (distinctive.get(owner.header) || []) : []
  const sourceHasCause = (m) => (where[m]?.sentences || []).some(x => CAUSE_RE.test(x))

  // Phrase fingerprints: 3-word runs that occur in exactly one source item ("top install source",
  // "6-minute user interview"). They survive when the AI drops the number but keeps the false claim.
  const STOPW = new Set(['the', 'and', 'for', 'with', 'into', 'that', 'this', 'from', 'our', 'their', 'a', 'an', 'of', 'to', 'in', 'on', 'at', 'by', 'as', 'or', 'is', 'was', 'were', 'it'])
  const tri = (t) => {
    const w = wordsOf(t).filter(x => x.length > 1)
    const out = []
    for (let i = 0; i + 3 <= w.length; i++) {
      const g = w.slice(i, i + 3)
      if (g.filter(x => STOPW.has(x)).length >= 2) continue
      out.push(g.join(' '))
    }
    return out
  }
  const triCount = {}
  src.forEach(b => new Set(tri(b.line)).forEach(g => { triCount[g] = (triCount[g] || 0) + 1 }))
  const items = src
    .filter(b => b.owner.kind === 'job' || b.owner.kind === 'unattached')
    .map((b, idx) => {
      const prints = new Set(tri(b.line).filter(g => triCount[g] === 1))
      const named = allDistinctive.filter(t => new RegExp(`\\b${t}\\b`, 'i').test(b.line))
      return { idx, line: b.line, owner: b.owner, prints, allowed: [...new Set([...tokensFor(b.owner), ...named])] }
    })
    .filter(it => it.prints.size >= 2)
  const matchItems = (text) => {
    const g = new Set(tri(text))
    return items.filter(it => [...it.prints].filter(p => g.has(p)).length >= 2)
  }

  const suspects = []
  const seen = new Set()
  const byKey = new Map()
  const nice = (t) => t ? t.charAt(0).toUpperCase() + t.slice(1) : 'another employer'
  const label = (h) => h ? h.charAt(0).toUpperCase() + h.slice(1).toLowerCase() : 'Selected work'
  const add = (doc, text, why, plain) => {
    const k = doc + '|' + text
    const existing = byKey.get(k)
    if (existing) {
      if (!existing.why.includes(why)) existing.why += ' Also: ' + why
      if (plain && !existing.plain.includes(plain)) existing.plain += ' ' + plain
      return
    }
    const item = { doc, text, why, plain: plain || 'This may go further than your resume says.' }
    byKey.set(k, item)
    seen.add(k)
    suspects.push(item)
  }

  for (const [doc, body] of Object.entries(docs)) {
    if (!body) continue
    const isLetter = doc === 'cover'
    const units = isLetter
      ? splitSentences(body).map(t => ({ line: t, owner: null }))
      : blocksOf(body).flatMap(b => splitSentences(b.line).map(t => ({ line: t, owner: b.owner })))

    for (const u of units) {
      // phrase-based checks (work even when the number was dropped)
      const hits = matchItems(u.line)
      if (hits.length) {
        const lower = u.line.toLowerCase()
        const outTokens = (!isLetter && u.owner?.kind === 'job') ? [...headerTokens(u.owner.header)] : []
        const namedHere = allDistinctive.filter(t => new RegExp(`\\b${t}\\b`).test(lower))
        const employerHere = outTokens.length ? outTokens : namedHere
        for (const it of hits) {
          if (!employerHere.length) continue
          const ok = it.allowed.some(t => employerHere.includes(t))
          if (!ok) {
            const where = it.owner.kind === 'unattached' ? `"${it.owner.header}" with no employer` : 'a different job'
            const who = nice(employerHere.find(t => !it.allowed.includes(t)))
            add(doc, u.line, `This describes work the source lists under ${where} ("${it.line.slice(0, 60)}…"), but it is credited to ${who} here. Fix the credit (remove the employer, or remove this item if it is a duplicate); do not just delete numbers.`,
              it.owner.kind === 'unattached' ? `Your resume doesn't say this was at ${who}.` : `Your resume lists this under a different job, not ${who}.`)
          }
        }
        // superlatives the source never uses for this item ("performed best", "most successful")
        const SUPER = /\b(best|top|most|biggest|highest|largest|strongest|#1|number one|record)\b/gi
        const outSupers = [...u.line.matchAll(SUPER)].map(m => m[0].toLowerCase())
        // allowed if ANY source item this sentence draws on uses the word ("same-day for most cuts")
        const srcSupers = new Set(hits.flatMap(it => [...it.line.matchAll(SUPER)].map(m => m[0].toLowerCase())))
        const added = outSupers.find(w => !srcSupers.has(w))
        if (added) add(doc, u.line, `Calls this "${added}", but the source resume doesn't describe it that way ("${hits[0].line.slice(0, 60)}…"). Remove the superlative.`, `Your resume doesn't call this "${added}".`)
        const kinds = new Set(hits.map(it => it.owner.kind === 'unattached' ? 'u:' + it.owner.header : 'j:' + it.owner.header))
        if (!isLetter && hits.length >= 2 && kinds.size >= 2) {
          add(doc, u.line, 'This merges two separate items from the source into one claim. Keep only what belongs to this job.', 'This combines two separate items from your resume into one.')
        }
      }
      for (const m of metricsIn(u.line)) {
        const info = where[m]
        if (!info) continue // unknown numbers are the AI fact-checker's job
        const srcOwners = info.owners
        // employers the source itself names next to this number, e.g. "(Stillwater, TikTok)" in Selected work
        const mentioned = allDistinctive.filter(t => info.sentences.some(x => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(x)))
        const srcJobTokens = [...new Set([...srcOwners.flatMap(tokensFor), ...mentioned])]
        const unattachedOnly = srcOwners.every(o => o.kind !== 'job') && srcOwners.some(o => o.kind === 'unattached') && !mentioned.length

        // 1. moved to a different job (resume)
        if (!isLetter && u.owner?.kind === 'job') {
          const outTokens = [...headerTokens(u.owner.header)]
          const matchesSource = srcJobTokens.some(t => outTokens.includes(t))
          if (unattachedOnly) add(doc, u.line, `The source lists the ${m} result under "${srcOwners.find(o => o.kind === 'unattached').header}" with no employer, but this puts it under a job. If it is also listed elsewhere in the document, this is a duplicate: remove it.`,
            `Your resume lists this under "${label(srcOwners.find(o => o.kind === 'unattached').header)}" without an employer, but here it's under a job.`)
          else if (srcJobTokens.length && !matchesSource) add(doc, u.line, `The source puts the ${m} result under a different job.`, 'Your resume credits this result to a different job.')
        }
        // 2. sentence names an employer the number doesn't belong to (cover letter, summary)
        if (isLetter || u.owner?.kind !== 'job') {
          const lower = u.line.toLowerCase()
          const named = allDistinctive.filter(t => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(lower))
          const wrong = named.filter(t => !srcJobTokens.includes(t))
          if (wrong.length && (unattachedOnly || !named.some(t => srcJobTokens.includes(t)))) {
            add(doc, u.line, unattachedOnly
              ? `The source lists the ${m} result with no employer, but this sentence ties it to ${wrong[0]}.`
              : `The source puts the ${m} result under a different job than ${wrong[0]}.`,
              unattachedOnly ? `Your resume doesn't say this was at ${nice(wrong[0])}.` : `Your resume credits this result to a different job, not ${nice(wrong[0])}.`)
          }
        }
        // 3. invented cause
        if (CAUSE_RE.test(u.line) && !sourceHasCause(m)) {
          add(doc, u.line, `This sentence explains how its result happened ("${(u.line.match(CAUSE_RE) || [''])[0]}…"), but the source never says how. Remove the explanation, keep the numbers.`,
            `Your resume doesn't say how this result happened ("${(u.line.match(CAUSE_RE) || [''])[0]}…").`)
        }
      }
    }
  }
  return suspects.slice(0, 12)
}

const wordsOf = (t) => t.toLowerCase().replace(/[^a-z0-9%\s]/g, ' ').split(/\s+/).filter(Boolean)
function hasRepeatedPhrase(text, n = 6) {
  for (const line of String(text).split('\n')) {
    const w = wordsOf(line)
    const seen = new Set()
    for (let i = 0; i + n <= w.length; i++) {
      const k = w.slice(i, i + n).join(' ')
      if (seen.has(k)) return true
      seen.add(k)
    }
  }
  return false
}
const tidy = (t) => t
  .replace(/(?<!\.)\.\.(?!\.)/g, '.')
  .replace(/[ \t]{2,}/g, ' ')
  .replace(/ ([,.;:])/g, '$1')
  .replace(/^[-•*–]\s*$/gm, '')
  .replace(/^([-•*–]\s.*)\n[ \t]*\n(?=[ \t]*[-•*–]\s)/gm, '$1\n') // no gap left between bullets
  .replace(/\n{3,}/g, '\n\n')

// ── Job-post echo check ─────────────────────────────────────────────────────
// The most common way AI resume tools mislead: they echo the job ad back as experience
// ("works directly with founders" because the ad says "you work with Jonathan, the founder").
// Flags resume sentences that use names, tools or roles that appear in the job post but
// nowhere in the person's own resume. Honest keyword matching (words the resume backs up)
// is untouched. Cover letters may talk about the company, so they are left to the AI check.
const ROLE_CLAIMS = /\b(co-?founders?|founders?|founding|ceo|cto|coo|cmo|y ?combinator|yc|investors?|board of directors|executives?|c-suite)\b/gi
const CAP_STOP = new Set(['the', 'you', 'your', 'our', 'we', 'what', 'why', 'how', 'who', 'this', 'that', 'and', 'for', 'with', 'about', 'job', 'role', 'full', 'part', 'time', 'remote', 'hybrid', 'senior', 'junior', 'lead', 'manager', 'title', 'company', 'english', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])

function jobPostTerms(jobDescription) {
  const terms = new Set()
  const text = String(jobDescription || '').replace(/\r/g, '')
  // Capitalised words that aren't just starting a sentence or line: names, products, tools
  for (const sentence of text.split(/(?<=[.!?])\s+|\n+/)) {
    const words = sentence.trim().replace(/^[-•*–\d.)\s]+/, '').split(/\s+/).filter(Boolean)
    // Skip Title Case headings ("What You Will Work On"): their capitals aren't names
    const capped = words.filter(w => /^[A-Z]/.test(w)).length
    if (words.length <= 8 && capped / Math.max(1, words.length) >= 0.6) continue
    words.slice(1).forEach(w => {
      const clean = w.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9+#.-]+$/g, '').replace(/[.]+$/, '')
      if (/^[A-Z][A-Za-z0-9+#.-]{2,}$/.test(clean) && !CAP_STOP.has(clean.toLowerCase())) terms.add(clean)
    })
  }
  const roles = new Set([...text.matchAll(ROLE_CLAIMS)].map(m => m[0].toLowerCase()))
  return [...[...terms].map(t => ({ term: t, exact: true })), ...[...roles].map(t => ({ term: t, exact: false }))]
}

function findJobPostEchoes(sourceResume, docs, jobDescription) {
  if (!jobDescription) return []
  const source = String(sourceResume).toLowerCase()
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const terms = jobPostTerms(jobDescription)
    .filter(t => !new RegExp(`\\b${esc(t.term.toLowerCase())}`).test(source)) // the person's resume doesn't back it up
  if (!terms.length) return []
  const out = []
  for (const [doc, body] of Object.entries(docs)) {
    if (!body || doc === 'cover') continue
    for (const b of blocksOf(body)) {
      for (const sentence of splitSentences(b.line)) {
        // names and tools must match exactly as written ("Store", not "store"); role words in any case
        const found = terms.find(t => new RegExp(`\\b${esc(t.term)}`, t.exact ? '' : 'i').test(sentence))
        const hit = found && found.term
        if (hit) {
          out.push({
            doc,
            text: sentence,
            why: `"${hit}" comes from the job description, not the source resume. Remove that claim unless the source resume supports it; keep the rest of the sentence.`,
            plain: `Your resume doesn't mention "${hit}". It comes from the job post.`,
          })
        }
      }
    }
  }
  return out.slice(0, 8)
}

async function factCheckGroup(sourceResume, docs, client, jobDescription = '') {
  const names = Object.keys(docs).filter(k => docs[k] && docs[k].trim())
  if (!names.length) return { docs, factCheck: { checked: false, fixes: [] } }

  const suspects = [...findSuspects(sourceResume, docs), ...findJobPostEchoes(sourceResume, docs, jobDescription)]
  const suspectBlock = suspects.length
    ? `\nAUTOMATED CHECKS flagged these sentences. Each is very likely wrong. Fix every one unless the source resume clearly and explicitly supports it:\n${suspects.map(x => `- [${x.doc}] "${x.text}" — ${x.why}`).join('\n')}\n`
    : ''
  const labels = { resume: 'TAILORED RESUME', resumeA: 'TAILORED RESUME (VERSION A)', resumeB: 'TAILORED RESUME (VERSION B)', cover: 'COVER LETTER' }
  const blocks = names.map(n => `<doc id="${n}" label="${labels[n] || n}">\n${docs[n]}\n</doc>`).join('\n\n')

  const prompt = `You are a strict fact-checker for job applications. Compare each generated document against the candidate's SOURCE RESUME and find claims the source does not support.

<source_resume>
${sourceResume.slice(0, 20000)}
</source_resume>
${jobDescription ? `
<job_description>
${String(jobDescription).slice(0, 8000)}
</job_description>
This job description is NOT evidence about the candidate. It is here so you can spot the most common invention: experience, relationships, tools or traits that appear in the job description but not in the source resume (for example "works directly with founders" because the job post mentions a founder). Flag those. Using the job post's words for things the source resume does support is fine.
` : ''}
${blocks}

FLAG a claim when it:
- states a number, metric, date, title, employer, client, tool, or credential that is not in the source
- explains HOW or WHY a result happened ("by doing X", "because Y", "through Z", "no voiceover, no hard sell") when the source does not say so
- attaches an achievement to a different job, employer, or project than the source does, or assigns an employer to something the source lists without one (e.g. a "Selected work" item for "a fintech client")
- merges two separate projects or results into one, or ties a metric to a project the source doesn't tie it to
- inflates scope: "every", "all", "led", "owned", "made the call", "built from nothing" when the source says less (e.g. the source says "with the marketing lead")
- invents a working habit, motivation, or anecdote ("before anyone asks twice")
- ranks or praises an item in a way the source doesn't ("the piece that performed best", "my most successful campaign")
- explains why the work succeeded ("it worked because it felt real, not like an ad") — in cover letters too; the source gives results, not reasons

${suspectBlock}
DO NOT flag: rewording, tightening, reordering, summarizing, combining facts that the source states about the same job, keyword choices that are true to the source, tone, or opinions about the company in the cover letter.

For each flagged claim give the smallest fix that makes it true to the source: keep the sentence and its meaning, remove or correct only the unsupported part. If nothing true can be said, delete just that clause. "replacement" must be the full corrected version of "original" — never repeat words that come right before or after it in the document. Never fix a wrong employer or a merge by deleting the numbers and keeping the claim: fix the credit itself (remove the employer from the sentence, or remove the item). If an item duplicates another item already in the document (e.g. the same project appears under a job AND under Selected Work), set "original" to the whole duplicate bullet and "replacement" to an empty string.

Respond with ONLY a JSON object, no markdown fences:
{"fixes":[{"doc":"<doc id>","original":"<exact text copied character-for-character from that doc, at most one sentence or one bullet>","replacement":"<corrected text>","reason":"<under 15 words, plain English, addressed to the candidate, e.g. 'Your resume doesn't say this was at Brightline.'>"}]}
Maximum 12 fixes. If everything is supported, return {"fixes":[]}.`

  try {
    const call = client.messages.create({
      model: FACT_CHECK_MODEL,
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    })
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('fact-check timeout')), FACT_CHECK_TIMEOUT_MS))
    const msg = await Promise.race([call, timeout])
    const text = (msg.content || []).map(b => b.text || '').join('').replace(/```json|```/g, '').trim()
    const jsonText = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
    const parsed = JSON.parse(jsonText)
    const out = { ...docs }
    const applied = []
    const sourceNums = new Set(numbersIn(sourceResume))

    for (const f of (parsed.fixes || []).slice(0, 12)) {
      const id = f && f.doc
      const original = f && typeof f.original === 'string' ? f.original : ''
      const replacement = f && typeof f.replacement === 'string' ? f.replacement : ''
      if (!out[id] || original.length < 8) continue
      if (out[id].split(original).length !== 2) continue // must match exactly once
      if (replacement.length > original.length + 40) continue // a fix may not add new material
      if (replacement && replacement !== original && replacement.includes(original.trim())) continue // a fix may not append to the original
      // a fix may not introduce numbers that are in neither the source nor the original line
      const allowed = new Set([...sourceNums, ...numbersIn(original)])
      if (numbersIn(replacement).some(n => !allowed.has(n))) continue
      const next = tidy(out[id].replace(original, replacement))
      if (hasRepeatedPhrase(next) && !hasRepeatedPhrase(out[id])) continue // a fix may never create duplicated text
      out[id] = next
      applied.push({
        doc: id,
        before: original.trim(),
        after: replacement.trim(),
        reason: String(f.reason || '').slice(0, 140),
      })
    }
    // Re-run the code checks on the fixed text. Anything still wrong is shown to the customer, not hidden.
    const remaining = [...findSuspects(sourceResume, out), ...findJobPostEchoes(sourceResume, out, jobDescription)].map(x => ({ doc: x.doc, text: x.text, reason: x.plain }))
    return { docs: out, factCheck: { checked: true, fixes: applied, flagged: suspects.length, needsReview: remaining } }
  } catch (e) {
    console.error('Fact check skipped:', e?.message || e)
    // Even without the AI pass, the code checks can still warn the customer
    let remaining = []
    try { remaining = [...findSuspects(sourceResume, docs), ...findJobPostEchoes(sourceResume, docs, jobDescription)].map(x => ({ doc: x.doc, text: x.text, reason: x.plain })) } catch (_) {}
    return { docs, factCheck: { checked: remaining.length > 0, fixes: [], needsReview: remaining } }
  }
}


// Guarantee a greeting and a sign-off on every cover letter, even if the model forgets.
export function finishCoverLetter(raw, metadata = {}) {
  let text = (raw || '').trim()
  if (!text) return text
  const firstLine = text.split('\n')[0].trim()
  if (!/^(hi|hello|dear|hey)\b/i.test(firstLine)) {
    const company = (metadata.companyName || '').trim()
    text = `${company ? `Hi ${company} team,` : 'Hello,'}\n\n${text}`
  }
  const name = (metadata.candidateName || '').trim()
  const CLOSING = /^(best|best regards|all the best|thanks|thank you|many thanks|cheers|sincerely|warmly|warm regards|kind regards|regards)[,!.]?$/i
  const lines = text.split('\n')
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop()
  const last = (lines[lines.length - 1] || '').trim()
  const prev = (lines[lines.length - 2] || '').trim()
  if (name && last.toLowerCase() === name.toLowerCase()) {
    if (!CLOSING.test(prev)) {
      lines.splice(lines.length - 1, 0, 'Best,')
      if (prev) lines.splice(lines.length - 2, 0, '')
    }
  } else if (!CLOSING.test(last)) {
    lines.push('', 'Best,')
    if (name) lines.push(name)
  } else if (name) {
    lines.push(name)
  }
  return lines.join('\n')
}

// Check each document in its own AI call, all at the same time: the resume and the cover
// letter are checked in parallel instead of one long call, so the extra wait is roughly halved.
export async function factCheckDocs(sourceResume, docs, client, jobDescription = '') {
  const names = Object.keys(docs).filter(k => docs[k] && String(docs[k]).trim())
  if (names.length <= 1) return factCheckGroup(sourceResume, docs, client, jobDescription)
  const results = await Promise.all(names.map(n => factCheckGroup(sourceResume, { [n]: docs[n] }, client, jobDescription)))
  const out = { ...docs }
  const merged = { checked: false, fixes: [], flagged: 0, needsReview: [] }
  results.forEach((r, i) => {
    out[names[i]] = r.docs[names[i]]
    merged.checked = merged.checked || !!r.factCheck.checked
    merged.fixes.push(...(r.factCheck.fixes || []))
    merged.flagged += r.factCheck.flagged || 0
    merged.needsReview.push(...(r.factCheck.needsReview || []))
  })
  return { docs: out, factCheck: merged }
}
