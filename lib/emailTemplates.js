// Shared transactional email templates (Resend `html` field).
//
// Dark-locked design. Gmail's mobile dark mode force-inverts colors, which is why
// the welcome email was showing up as a light card with a navy button. Defenses:
//  - every background is ALSO a background-image gradient (Gmail doesn't invert those)
//  - white/grey text is wrapped in the screen/difference blend pair, which Gmail's
//    inversion cancels back out (`u + .body` only matches inside Gmail)
//  - color-scheme meta tells Apple Mail / Outlook we handle dark ourselves
//  - the logo is an opaque, pre-rendered badge, so no client can flatten bad alpha

const SITE = 'https://jobsuncle.ai'
const LOGO_URL = `${SITE}/email-mark.png` // 288×288, shown at 96

const C = {
  page: '#0a0a0a',
  card: '#121212',
  line: '#262626',
  white: '#ffffff',
  muted: '#a3a3a3',
  faint: '#6b6b6b',
  cyan: '#00D1FF',
}

const FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

// solid background that survives Gmail inversion
const bg = (hex) => `background-color:${hex};background-image:linear-gradient(${hex},${hex});`

// text that survives Gmail inversion (exact for white, close for greys)
const t = (html) =>
  `<span class="gm-screen"><span class="gm-diff">${html}</span></span>`

function shell({ title, preheader, body }) {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${title}</title>
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
  img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
  a { text-decoration:none; }
  /* Gmail-only inversion cancel */
  u + .body .gm-screen { display:inline-block; background:#000; mix-blend-mode:screen; }
  u + .body .gm-diff { display:inline-block; background:#000; mix-blend-mode:difference; }
  @media (max-width: 520px) {
    .card-pad { padding: 32px 24px !important; }
    .h1 { font-size: 26px !important; }
  }
</style>
</head>
<body class="body" style="margin:0;padding:0;${bg(C.page)}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${preheader}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="${bg(C.page)}">
  <tr><td align="center" style="padding:32px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.card}"
      style="max-width:480px;${bg(C.card)}border:1px solid ${C.line};border-radius:20px;">
      <tr><td class="card-pad" style="padding:40px 36px;font-family:${FONT};">
        <img src="${LOGO_URL}" width="96" height="96" alt="JobsUncle" style="display:block;width:96px;height:96px;margin:0 0 28px;">
        ${body}
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
      <tr><td align="center" style="padding:20px 12px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${C.faint};">
        ${t(`JobsUncle.ai &middot; <a href="${SITE}" style="color:${C.faint};text-decoration:underline;">jobsuncle.ai</a>`)}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

// Dark pill with a cyan rim (nested cells: both backgrounds are gradients, so Gmail leaves them alone)
function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
  <tr><td bgcolor="${C.cyan}" style="${bg(C.cyan)}border-radius:999px;padding:2px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td bgcolor="${C.card}" style="${bg(C.card)}border-radius:999px;">
        <a href="${href}" style="display:inline-block;padding:14px 30px;font-family:${FONT};font-size:16px;line-height:20px;font-weight:800;color:${C.white};text-decoration:none;border-radius:999px;">
          ${t(label)}
        </a>
      </td>
    </tr></table>
  </td></tr>
</table>`
}

function h1(text) {
  return `<h1 class="h1" style="margin:0 0 12px;font-family:${FONT};font-size:30px;line-height:36px;font-weight:900;letter-spacing:-0.02em;color:${C.white};">${t(text)}</h1>`
}

function p(text, { color = C.muted, size = 16, mb = 24 } = {}) {
  return `<p style="margin:0 0 ${mb}px;font-family:${FONT};font-size:${size}px;line-height:${Math.round(size * 1.55)}px;color:${color};">${t(text)}</p>`
}

export function welcomeEmail() {
  return {
    subject: "You're in. Let's get you hired.",
    html: shell({
      title: "You're in.",
      preheader: 'Three free resumes, each one tailored to the job.',
      body: [
        h1('You’ve got 3 free resumes.'),
        p('Each one tailored to the job you’re applying for. No more sending the same resume everywhere and hoping.'),
        button(SITE, 'Back to JobsUncle &rarr;'),
        p('We don’t spam. Ever.', { color: C.faint, size: 13, mb: 0 }),
      ].join('\n'),
    }),
  }
}

export function otpEmail(code) {
  const safe = String(code).replace(/\D/g, '').slice(0, 8)
  return {
    subject: `Your JobsUncle code: ${safe}`,
    html: shell({
      title: 'Your JobsUncle code',
      preheader: `Your code is ${safe}. It expires in 10 minutes.`,
      body: [
        h1('Your verification code'),
        p('Enter this code to unlock your free resumes. It expires in 10 minutes.'),
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
          <tr><td bgcolor="${C.cyan}" style="${bg(C.cyan)}border-radius:14px;padding:2px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
              <td align="center" bgcolor="#0d0d0d" style="${bg('#0d0d0d')}border-radius:12px;padding:24px 12px;font-family:${FONT};font-size:40px;line-height:44px;font-weight:900;letter-spacing:0.25em;color:${C.white};font-variant-numeric:tabular-nums;">
                ${t(safe)}
              </td>
            </tr></table>
          </td></tr>
        </table>`,
        p('If you didn’t request this, ignore this email.', { color: C.faint, size: 13, mb: 0 }),
      ].join('\n'),
    }),
  }
}
