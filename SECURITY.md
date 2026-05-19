# Security Policy — ECHO//SELF

ECHO//SELF handles deeply personal emotional data. Security is not a feature — it is a foundational commitment.

---

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report vulnerabilities privately to: **security@echoself.app**

Include in your report:
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Any proof-of-concept (PoC) code (non-destructive only)

### Response SLA

| Severity | Acknowledgement | Initial Response | Target Resolution |
|---|---|---|---|
| Critical | 2 hours | 4 hours | 24 hours |
| High | 4 hours | 24 hours | 72 hours |
| Medium | 24 hours | 72 hours | 14 days |
| Low | 72 hours | 7 days | 30 days |

### What We Commit To

- Acknowledge receipt within stated SLA
- Keep you informed of investigation progress
- Credit you in our security acknowledgements (unless you prefer anonymity)
- Not pursue legal action for good-faith security research

---

## Supported Versions

| Version | Supported |
|---|---|
| Latest production | ✅ |
| Previous minor | ✅ (security patches only) |
| Older versions | ❌ |

---

## Security Architecture

### Authentication

- Supabase Auth with JWT tokens (RS256 signed)
- Refresh tokens rotated on every use
- Session invalidation on password change
- Apple Sign In + Google Sign In (OAuth 2.0 PKCE flow)
- No password stored in plaintext — bcrypt via Supabase Auth

### Data Protection

- All data encrypted at rest (AES-256 via Supabase/Postgres)
- All data encrypted in transit (TLS 1.3 minimum)
- User emotional data encrypted at field-level for highest sensitivity columns
- API keys stored in Supabase Vault — never in environment variables at rest
- OpenAI API calls: user data sanitized before transmission (PII stripping)

### Row Level Security

- **Every table** has RLS enabled — no exceptions
- Users can only access their own data
- AI processing functions run with service-role key in isolated Edge Functions
- RLS policies audited quarterly

### API Security

- All Edge Functions validate JWT before processing
- Rate limiting: 100 req/min per user, 10 req/min for AI endpoints
- Input validation: Zod schemas on all request bodies
- SQL injection prevention: parameterized queries only (no raw SQL construction)
- CORS restricted to known origins

### Mobile Security

- No sensitive data in AsyncStorage — use Expo SecureStore
- Certificate pinning for API calls
- Jailbreak/root detection (soft warning, not hard block)
- App backgrounding clears sensitive in-memory state

### AI Data Handling

- User data never used to train OpenAI models (Enterprise API agreement)
- Embeddings stored in user-isolated pgvector tables with RLS
- AI conversation history purged on account deletion within 24 hours
- Prompt injections mitigated: user content wrapped in isolation markers

---

## Known Security Boundaries

- Supabase Edge Functions run in isolated V8 contexts
- pgvector searches scoped to authenticated user's embeddings via RLS
- OpenAI API keys stored in Supabase Vault, rotated every 90 days

---

## Security Checklist (Release Gate)

Before every production release, the following is verified:

- [ ] No secrets in codebase (`git-secrets` scan passes)
- [ ] All new tables have RLS enabled
- [ ] New API routes have authentication middleware
- [ ] Dependency audit clean (`npm audit --audit-level=high`)
- [ ] OWASP Top 10 reviewed for new features
- [ ] Rate limiting tested on AI endpoints
- [ ] Input sanitization verified for user-supplied content

See full checklist: [docs/compliance/SECURITY_CHECKLIST.md](docs/compliance/SECURITY_CHECKLIST.md)

---

## Bug Bounty

We do not currently operate a formal bug bounty program. We acknowledge all responsible disclosures in our security hall of fame at echoself.app/security.

---

## Security Contacts

- **Primary:** security@echoself.app
- **Backup:** cto@echoself.app
- **PGP Key:** Available at echoself.app/.well-known/security.txt
