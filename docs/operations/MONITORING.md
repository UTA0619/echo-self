# Monitoring & Observability — ECHO//SELF

---

## Stack

| Layer | Tool | Purpose |
|---|---|---|
| Error tracking | Sentry | Runtime errors, crash reports, source maps |
| Performance | Sentry Performance | API latency, p95/p99 tracking |
| Frontend vitals | Vercel Speed Insights | LCP, INP, CLS, FCP, TTFB |
| Traffic | Vercel Analytics | Page views, paths, geography |
| Logs (runtime) | Vercel Dashboard + CLI | Function invocation logs |
| Log export | Vercel Log Drains (Pro) | Forward to external platform |
| Uptime | Checkly | Synthetic monitoring, alert on downtime |
| DB metrics | Supabase Dashboard | Query performance, connection count |

---

## Sentry Configuration

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION,

  // Performance monitoring
  tracesSampleRate: process.env.NEXT_PUBLIC_APP_ENV === 'production' ? 0.1 : 1.0,

  // Session replay (masks sensitive content)
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,        // Mask all journal content
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],

  // Never capture these
  ignoreErrors: [
    'AbortError',
    'ResizeObserver loop',
    'Non-Error promise rejection',
  ],

  beforeSend(event) {
    // Strip any PII from error context
    if (event.user) {
      delete event.user.email
      delete event.user.ip_address
    }
    return event
  },
})
```

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV,
  tracesSampleRate: 0.1,

  // Structured logging for Vercel log drain
  beforeSend(event) {
    console.error(JSON.stringify({
      level: 'error',
      sentry_id: event.event_id,
      message: event.exception?.values?.[0]?.value,
      route: event.request?.url,
    }))
    return event
  },
})
```

---

## Structured Logging (All API Routes)

Follow this pattern on every API route and Edge Function:

```typescript
export async function POST(req: Request) {
  const start = Date.now()
  const requestId = req.headers.get('x-vercel-id') ?? crypto.randomUUID()

  console.log(JSON.stringify({
    level: 'info',
    msg: 'request_start',
    route: '/api/echo/session',
    requestId,
  }))

  try {
    // ... business logic ...

    console.log(JSON.stringify({
      level: 'info',
      msg: 'request_complete',
      route: '/api/echo/session',
      requestId,
      ms: Date.now() - start,
    }))

    return Response.json(result)
  } catch (err) {
    console.error(JSON.stringify({
      level: 'error',
      msg: 'request_failed',
      route: '/api/echo/session',
      requestId,
      error: err instanceof Error ? err.message : String(err),
      ms: Date.now() - start,
    }))

    Sentry.captureException(err, { extra: { requestId } })
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

---

## Vercel Log Drains (Pro)

Configure log drain to forward to external platform:

```bash
# Via Vercel CLI
curl -X POST -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.vercel.com/v1/drains?teamId=$VERCEL_TEAM_ID" \
  -d '{
    "url": "https://your-log-endpoint.example.com/logs",
    "type": "ndjson",
    "sources": ["lambda", "edge", "static"],
    "environments": ["production"]
  }'
```

Verify signature on all drain payloads:
```typescript
import { createHmac, timingSafeEqual } from 'crypto'

function verifyDrainSignature(rawBody: string, signature: string): boolean {
  const expected = createHmac('sha1', process.env.DRAIN_SECRET!).update(rawBody).digest('hex')
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}
```

---

## Alert Thresholds

| Metric | Warning | Critical | Action |
|---|---|---|---|
| Error rate (Sentry) | > 0.1% | > 1% | Page on-call |
| API P95 latency | > 2s | > 5s | Investigate |
| AI endpoint P95 | > 10s | > 30s | Check OpenAI status |
| DB connections | > 20/25 | > 24/25 | Scale connection pool |
| LCP (Speed Insights) | > 2.5s | > 4s | Performance audit |
| INP | > 200ms | > 500ms | Profile React renders |
| Stripe webhook failures | > 3/day | > 10/day | Check webhook endpoint |
| Cron job failures | > 1/day | > 3/day | Check logs |

---

## Post-Deploy Error Scan

After every production deploy, run:

```bash
# Wait 60s for traffic to arrive, then scan
sleep 60
vercel logs $DEPLOYMENT_URL --level error --since 2m --token $VERCEL_TOKEN
```

**Interpret results:**
- 0 errors → Clean deploy
- Auth/JWT errors → Check Supabase config
- 500 errors → Check Sentry for stack trace
- Timeout errors → Check `maxDuration` in `vercel.json`

---

## Uptime Monitoring (Checkly)

```javascript
// checkly.config.ts
import { defineConfig } from 'checkly'

export default defineConfig({
  projectName: 'ECHO//SELF',
  logicalId: 'echo-self-monitoring',
  checks: {
    locations: ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
    tags: ['production'],
    runtimeId: '2024.02',
  },
})
```

Synthetic checks to create:
- `GET /` — homepage loads (< 3s)
- `POST /api/health` — API responds (< 500ms)
- `GET /api/cron/health` — cron endpoint reachable

Alert channels: email + Slack #engineering

---

## Performance Audit Checklist

Run quarterly or after major releases:

1. Check Vercel Speed Insights → LCP < 2.5s, INP < 200ms, CLS < 0.1
2. Check Sentry Performance → P95 API latency < 2s
3. Run bundle analyzer: `npm run analyze`
4. Check Supabase Dashboard → slow query log (> 100ms)
5. Check pgvector index efficiency (EXPLAIN ANALYZE on similarity queries)
6. Review AI cost per user (target: < $5/user/month)
7. Run k6 load test → 100 concurrent users, no degradation
