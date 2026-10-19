# Customer administration

Routes: `/admin` and `/api/admin/customers`. Every request independently authenticates
on the server with HTTP Basic authentication and an explicit admin username allowlist.
Existing customer cookies are intentionally not trusted. Use HTTPS only. No public
customer API, browser Redis credentials, static customer payloads, or admin analytics.

## Activation

In the JobsUncle Vercel project Settings → Environment Variables, set server-only:

- `ADMIN_USERNAMES`: comma-separated authorized administrator usernames (not customer roles).
- `ADMIN_PASSWORD_SHA256`: lowercase SHA-256 hex digest of a unique, randomly generated
  password with at least 32 random bytes. Generate/store the password in your password
  manager, compute its digest locally using protected input, and never send either in chat.
  This shared credential is suitable only for a small trusted operator group; use a
  managed identity provider with MFA and per-person sessions for larger teams.
- Existing `KV_REST_API_URL` and `KV_REST_API_TOKEN`, preferably
  `KV_REST_API_READ_ONLY_TOKEN` instead of the write-capable token.
- Existing `STRIPE_SECRET_KEY` for live subscription reads. Missing/unreachable Stripe
  means unknown, never paid or active. No Stripe mutations occur.

Scope variables to the intended environment and redeploy. Missing admin settings deny
all access (503). Incorrect credentials return 401. Do not use NEXT_PUBLIC variables.
Never disable deployment protection to make the preview accessible.

Basic authentication is browser-managed; closing all browser sessions clears cached
credentials. Rotate the password digest and redeploy to revoke access. There is no
customer-cookie login or client-only role check. Use a password manager to generate a
high-entropy credential; the digest is not a substitute for password entropy.

## Reporting semantics

A bounded paginated SCAN with MATCH user:* deduplicates keys, then reads batches of at
most 100 records with MGET. No KEYS command. Totals exclude malformed records and show
that count. Invalid dates are listed as unknown. Dates are UTC. SCAN is not a snapshot:
concurrent signups/deletions can change counts between reports. Search is server-side;
only 25 matching users reach the browser at a time. Each report scans the full account
set for aggregate metrics; limit is 100,000 keys/10,000 SCAN calls, then fails without
partial totals. For larger datasets introduce an isolated reporting index, not KEYS.

Only displayed rows query Stripe, across all matching customers and subscription
pages. No paid:* reads. CSV exports all filtered users, protects against spreadsheet
formula injection, and labels subscriptions not checked to avoid expensive bulk billing
queries. Responses and exports are private/no-store. CSV contains personal data: handle
and delete downloaded copies under your data retention policy.

Marketing consent is read separately from `marketing_consent:<normalized-email>` as
JSON `{ "status": "granted" | "withdrawn", "source": "explicit source identifier",
"recordedAt": "ISO timestamp" }`. Missing/malformed records mean unknown, not consent.
This dashboard never writes consent or assumes consent from signup/verification.
A future explicit opt-in/withdrawal workflow must record provenance separately; none of
the existing signup, billing, or user records are changed here.

Run `node --test tests/admin.test.cjs` , `npm run build`, and `node tests/admin-http.cjs`. Local tests use mocks and
never access real customer records. Before production promotion, configure preview
credentials and verify successful login, non-admin denial, search, pagination, metrics,
CSV permissions, and Stripe connectivity in a browser. Remote HTTP verification may
not be available in the agent sandbox. No production promotion is automatic.

The framework was upgraded from Next.js 14.2.0 to 15.5.24 for known security advisories. React 18 and the Pages Router are retained. Other existing dependency advisories should be reviewed separately; no claim of a full application security audit is made.
