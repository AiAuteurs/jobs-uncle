// Keeps a long API response from being dropped by VPNs, routers and proxies that close
// connections which stay silent for about a minute. Sends a space every 10 seconds while
// the work runs, then the JSON. Browsers ignore leading spaces when reading JSON, so the
// page still reads it with response.json().
// Once started, the status is already 200, so errors go back as { error } in the body.
export function startKeepAlive(res, everyMs = 10000) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('X-Accel-Buffering', 'no')
  if (typeof res.flushHeaders === 'function') res.flushHeaders()
  let done = false
  const ping = () => { if (!done && !res.writableEnded) { try { res.write(' ') } catch (_) {} } }
  ping()
  const timer = setInterval(ping, everyMs)
  return {
    send(payload) {
      if (done) return
      done = true
      clearInterval(timer)
      try { res.end(JSON.stringify(payload)) } catch (_) {}
    },
  }
}
