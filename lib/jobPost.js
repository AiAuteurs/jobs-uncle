// Job posts end with legal and HR boilerplate (equal opportunity, accommodations,
// "how to receive vacancy notices"). Its words aren't job requirements, but because they
// repeat, the keyword score counted them ("disability", "veteran", "employer") and told
// great candidates their match was low. Score only the job itself.
const BOILERPLATE = /equal (employment )?opportunit|\bEOE\b|affirmative action|reasonable accommodation|request (an )?accommodation|disabilit(y|ies)|\bveterans?\b|regardless of (race|age|sex|gender|religion)|gender identity|sexual orientation|protected (class|veteran|characteristic)|e-verify|job vacancy notices|spirit of inclusion|pay transparency|privacy (policy|notice)|background check/i

export function stripJobBoilerplate(jd) {
  const text = String(jd || '').replace(/\r/g, '')
  if (!text.trim()) return text
  // Drop whole paragraphs that are boilerplate, then any boilerplate sentence left inside the rest
  const paras = text.split(/\n\s*\n/)
  const kept = (paras.length > 1 ? paras.filter(p => !BOILERPLATE.test(p)) : paras)
    .map(p => p.split(/(?<=[.!?])\s+/).filter(s => !BOILERPLATE.test(s)).join(' '))
    .filter(p => p.trim())
  const out = kept.join('\n\n')
  // Never strip a post down to nothing: if it was all boilerplate-looking, score the original
  return out.trim().length >= 200 ? out : text
}
