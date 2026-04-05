// pages/api/signout.js
// Clears all JobsUncle auth cookies and redirects to home

export default function handler(req, res) {
  const expiredCookie = (name) =>
    `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`

  res.setHeader('Set-Cookie', [
    expiredCookie('ju_access'),
    expiredCookie('ju_email'),
  ])

  res.redirect(307, '/')
}
