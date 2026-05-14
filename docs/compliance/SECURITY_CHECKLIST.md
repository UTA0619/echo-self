# Security Checklist — ECHO//SELF

Run this checklist before every major release and quarterly.

---

## Authentication & Session Management

- [ ] Supabase Auth JWT tokens signed with RS256
- [ ] Refresh tokens rotate on every use (enabled in Supabase)
- [ ] Session invalidation on password change
- [ ] Refresh tokens expire after 7 days of inactivity
- [ ] Apple Sign In uses PKCE flow
- [ ] Google Sign In uses PKCE flow
- [ ] OAuth state parameter validated to prevent CSRF
- [ ] No session data stored in AsyncStorage (use Expo SecureStore)

## Row Level Security

- [ ] RLS enabled on every table (`SELECT relrowsecurity FROM pg_class WHERE relname = 'TABLE'`)
- [ ] Every RLS policy tested with: user's own data ✅, other user's data ❌, anonymous ❌
- [ ] Service role key never exposed in client code
- [ ] RLS policies use `auth.uid()` (not application-level user ID)
- [ ] `SECURITY DEFINER` functions reviewed — all use explicit schema qualification

## API Security

- [ ] Every API route validates JWT (`supabase.auth.getUser()`)
- [ ] Rate limiting enforced on all AI endpoints (10 rpm/user)
- [ ] Rate limiting enforced on all general endpoints (100 rpm/user)
- [ ] Input validation with Zod on all request bodies
- [ ] SQL injection impossible (parameterized queries only — no string concatenation)
- [ ] CORS restricted to known origins (`echoself.app`, `localhost:3000`)
- [ ] `X-Content-Type-Options: nosniff` header on all API routes
- [ ] `X-Frame-Options: DENY` header on all routes
- [ ] No sensitive data in URL query parameters (use POST body)

## Secrets Management

- [ ] No secrets in git history (`git log -p | grep -i 'apikey\|secret\|password'`)
- [ ] Gitleaks pre-commit hook active
- [ ] All API keys in Vercel environment variables (not hardcoded)
- [ ] OpenAI API key has spending limit set in OpenAI dashboard
- [ ] Stripe webhook secret rotated (last rotation: ________)
- [ ] Supabase service role key never sent to client
- [ ] `.env.local` is in `.gitignore` and never committed

## Data Protection

- [ ] All data encrypted at rest (Supabase/Postgres AES-256 by default)
- [ ] All data encrypted in transit (TLS 1.3 minimum)
- [ ] User content sanitized before AI processing (PII patterns stripped)
- [ ] OpenAI Enterprise API agreement confirms data not used for training
- [ ] Audio files in Supabase Storage have signed URLs with 1-hour expiry
- [ ] Old audio files deleted after transcription (within 24 hours)

## Mobile Security

- [ ] No sensitive data in AsyncStorage
- [ ] Expo SecureStore used for tokens and sensitive values
- [ ] Network calls use HTTPS only
- [ ] Certificate pinning configured for production API calls
- [ ] Debug mode disabled in production builds
- [ ] Console logging disabled in production (`babel-plugin-transform-remove-console`)
- [ ] App does not log sensitive user content in crash reports
- [ ] Jailbreak/root detection implemented (soft warning)

## Third-Party Dependencies

- [ ] `npm audit --audit-level=high` passes (0 high/critical vulnerabilities)
- [ ] Dependencies pinned to exact versions in `package-lock.json`
- [ ] Dependabot or similar configured for automatic security PRs
- [ ] Only necessary permissions requested in App Store / Play Store manifest

## Stripe Security

- [ ] Webhook signature verification using `stripe.webhooks.constructEvent`
- [ ] Raw body preserved for signature verification (not parsed body)
- [ ] Subscription status always read from Supabase (not client-reported)
- [ ] Checkout session creation rate-limited (5/min per user)
- [ ] PCI compliance delegated to Stripe Checkout (we never handle raw card data)

## Content Safety

- [ ] OpenAI moderation endpoint runs before every AI processing call
- [ ] Crisis phrases detected and route to static response + resources
- [ ] No PII in Sentry error reports (email, name stripped in `beforeSend`)
- [ ] No journal content captured in session recordings
- [ ] PostHog session recording masks all text inputs

## Infrastructure

- [ ] Cloudflare proxy enabled (DDoS protection)
- [ ] Vercel preview deployments protected (password or Vercel auth)
- [ ] Production Supabase database not publicly accessible (service role only for migrations)
- [ ] Supabase database backup enabled (daily automatic backups)
- [ ] Vercel deployment logs don't contain sensitive values

## OWASP Top 10 Review

- [ ] A01 Broken Access Control — RLS + JWT on every route
- [ ] A02 Cryptographic Failures — TLS 1.3, AES-256 at rest
- [ ] A03 Injection — Parameterized queries, Zod input validation
- [ ] A04 Insecure Design — Threat model reviewed
- [ ] A05 Security Misconfiguration — CORS, headers, no debug in prod
- [ ] A06 Vulnerable Components — `npm audit` clean
- [ ] A07 Auth Failures — Supabase Auth, PKCE, token rotation
- [ ] A08 Data Integrity Failures — Stripe signature verification
- [ ] A09 Logging Failures — Structured logging, Sentry, no PII in logs
- [ ] A10 SSRF — No server-side URL fetching from user input

---

**Last reviewed:** ____________  
**Reviewed by:** ____________  
**Next review due:** ____________
