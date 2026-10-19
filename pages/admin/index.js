import { useEffect, useState } from 'react'
import Head from 'next/head'

export async function getServerSideProps({ req, res }) {
  const { authorize } = require('../../lib/admin/auth.cjs')
  if (!authorize(req, res)) { res.end('Admin authorization required'); return { props: {} } }
  return { props: { authorized: true } }
}
export default function Admin({ authorized }) {
  const [data, setData] = useState(null)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!authorized) return
    const controller = new AbortController()
    setData(null); setError('')
    fetch(`/api/admin/customers?q=${encodeURIComponent(search)}&page=${page}`, { cache: 'no-store', signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error('Reporting unavailable or admin authorization expired.'); return response.json() })
      .then(setData).catch(e => { if (e.name !== 'AbortError') setError(e.message) })
    return () => controller.abort()
  }, [authorized, search, page])
  if (!authorized) return null
  return <main style={{ maxWidth: 1200, margin: '40px auto', padding: 24, fontFamily: 'system-ui', color: '#eee', background: '#101820', borderRadius: 16 }}>
    <Head><title>JobsUncle — Customer administration</title><meta name="robots" content="noindex,nofollow" /></Head>
    <h1>JobsUncle customer dashboard</h1><p>Private · read-only · authorized admins only</p>
    <p>Subscriptions are checked live against Stripe. Marketing consent is separate from signup; unknown is not consent.</p>
    <form onSubmit={e => { e.preventDefault(); setSearch(query); setPage(1) }}>
      <label>Search email <input type="search" value={query} maxLength={254} onChange={e => setQuery(e.target.value)} /></label> <button>Search</button>
    </form>
    <p><a style={{ color: '#67dcff' }} href={`/api/admin/customers?export=csv&q=${encodeURIComponent(search)}`}>Export filtered customers (CSV)</a> · Export does not query Stripe; subscription field is explicitly not checked.</p>
    {error && <p role="alert">{error}</p>}
    {!data && !error && <p role="status">Loading report…</p>}
    {data && <>
      <section style={{ display: 'flex', gap: 40 }}><h2>{data.total} accounts</h2><h2>{data.verified} verified</h2></section>
      <p>{data.malformed} malformed records excluded · {data.undated} accounts without a valid date. SCAN is a live read, not an atomic snapshot.</p>
      <details><summary>Signups by date (UTC)</summary><table><thead><tr><th>Date</th><th>Accounts</th></tr></thead><tbody>{data.dates.map(([date, count]) => <tr key={date}><td>{date}</td><td>{count} <meter min="0" max={Math.max(1, ...data.dates.map(d => d[1]))} value={count} /></td></tr>)}</tbody></table></details>
      <p>{data.matches} matching accounts · Updated {data.checkedAt}</p>
      <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', textAlign: 'left', borderSpacing: '12px' }}><thead><tr>{['Email', 'Created (UTC)', 'Verified', 'Stripe subscriptions', 'Marketing consent'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{data.rows.map((user, i) => <tr key={`${user.email}-${i}`}><td>{user.email}</td><td>{user.createdAt || 'Unknown'}</td><td>{user.verified ? 'Yes' : 'No'}</td><td>{user.subscription}</td><td>{user.marketingConsent}</td></tr>)}</tbody></table></div>
      {!data.rows.length && <p>No matching accounts.</p>}
      <button disabled={data.page <= 1} onClick={() => setPage(data.page - 1)}>Previous</button> <span>Page {data.page} / {data.pages}</span> <button disabled={data.page >= data.pages} onClick={() => setPage(data.page + 1)}>Next</button>
    </>}
  </main>
}
