# Launch Operations Playbook — ECHO//SELF

**Target Launch:** Week 18 (App Store + Google Play simultaneous)

---

## Launch Week Timeline

### T-30 Days: Soft Prep

**Engineering:**
- [ ] TestFlight external beta live (100+ users)
- [ ] Google Play closed testing live (50+ users)
- [ ] All P0/P1 bugs fixed
- [ ] Performance targets met (LCP < 2.5s, AI < 800ms)
- [ ] Stripe LIVE mode tested end-to-end
- [ ] Push notifications live and tested

**Marketing:**
- [ ] Landing page live: echoself.app
- [ ] "Coming soon" email collection live
- [ ] Twitter/X account active with 5 posts
- [ ] Product Hunt page drafted (not published)
- [ ] App Store screenshots finalized
- [ ] Press kit ready (logo, screenshots, founder bio, product video)

---

### T-14 Days: App Submissions

- [ ] iOS build submitted to App Store review
- [ ] Android AAB submitted to Google Play review
- [ ] Reviewer demo accounts created and tested
- [ ] Submission notes drafted for reviewers

---

### T-7 Days: Pre-Launch

**Engineering:**
- [ ] Both store approvals confirmed (follow up if not received by T-5)
- [ ] Vercel Fluid Compute enabled (handles launch traffic spike)
- [ ] Supabase connection limit reviewed (increase if needed)
- [ ] OpenAI rate limit tier confirmed (Tier 2 preferred)
- [ ] Cloudflare cache rules validated
- [ ] Sentry alerts configured and tested
- [ ] On-call rotation defined for launch week

**Distribution:**
- [ ] Email list: "Launching in 7 days" campaign sent
- [ ] Influencer/creator outreach: send promo codes for free Pro
- [ ] Press outreach: exclusive to 3 top tech journalists
- [ ] Product Hunt hunter confirmed and briefed

---

### T-3 Days: Final Checks

- [ ] Full E2E test pass on production build
- [ ] Load test simulating 500 concurrent users
- [ ] Stripe webhooks verified on production
- [ ] All feature flags set correctly for launch
- [ ] Backup comms channel set up (Discord/Slack for launch team)

---

### T-1 Day: Launch Eve

- [ ] App Store manual release queued (not released yet)
- [ ] Google Play 100% rollout queued
- [ ] Social media posts drafted and scheduled
- [ ] Product Hunt page finalized (submit at midnight PT)
- [ ] Team briefed: roles, escalation path, comms channel

---

### Launch Day (Tuesday)

**12:01 AM PT:** Product Hunt submission goes live

**9:00 AM PT:**
- [ ] Manually release App Store build
- [ ] Trigger Google Play 100% rollout
- [ ] Publish social media announcement
- [ ] Send launch email to waitlist
- [ ] DM first 50 Twitter followers with personal note

**9:00 AM – 6:00 PM PT (Launch Day War Room):**
- [ ] Founder monitors: App Store reviews, Twitter mentions, Sentry
- [ ] Engineer monitors: Vercel dashboard, Supabase dashboard, PostHog funnels
- [ ] Target: respond to every review and tweet within 30 minutes

**Real-time dashboards to monitor:**
1. PostHog → Sign-ups (live count)
2. Vercel Analytics → Traffic
3. Sentry → Error rate (target < 0.1%)
4. Supabase Dashboard → Connection count, slow queries
5. App Store Connect → Downloads
6. Stripe → New subscriptions (MRR)
7. Product Hunt → Upvotes (goal: 500+ by 8 PM PT)

---

### Launch Day Escalation Matrix

| Trigger | Severity | Action |
|---|---|---|
| Error rate > 1% | P0 | Rollback deployment immediately |
| App Store/Play crashes > 0.5% | P0 | Release hotfix within 2 hours |
| AI downtime > 5 minutes | P1 | Enable fallback mode, post status update |
| Stripe outage | P1 | Disable paywall temporarily, notify users |
| DB connections maxed | P1 | Enable connection pooling, scale |
| Slow news / no traction | P2 | Push harder on Twitter, DM journalists |

---

## First Week Post-Launch

**Daily (Days 1–7):**
- [ ] Review Sentry error report
- [ ] Reply to all App Store / Play reviews
- [ ] Check D1 retention (target: 45%)
- [ ] Monitor MRR growth
- [ ] Ship any P0 bugs as hotfix

**Day 3:** Send "How's it going?" email to early users

**Day 7:**
- [ ] Full D7 retention review
- [ ] Echo session engagement analysis (PostHog)
- [ ] Top feature requests → prioritize in backlog
- [ ] First press coverage roundup
- [ ] Sprint planning for post-launch sprint

---

## 30-Day Post-Launch Review

Metrics to hit by Day 30:

| Metric | Target | Source |
|---|---|---|
| Total downloads | 5,000 | App Store / Play Console |
| MAU | 2,000 | PostHog |
| D30 retention | > 15% | PostHog cohort |
| MRR | > $2,000 | Stripe |
| Free → Pro conversion | > 8% | PostHog + Stripe |
| App Store rating | 4.5+ | App Store Connect |
| Google Play rating | 4.3+ | Play Console |
| Press mentions | 3+ | Google Alerts |

If D30 retention < 10%: Product emergency — focus on retention before growth.  
If D30 retention > 20%: Pour fuel — increase paid acquisition.

---

## Hotfix Protocol (Launch Week)

```bash
# Emergency hotfix process (< 2 hour target for P0)

# 1. Create hotfix branch from main
git checkout -b hotfix/critical-bug-description main

# 2. Fix and test locally
npm test && npm run type-check

# 3. PR → expedited review (skip normal 24h SLA)
# 4. Merge to main → auto-deploys to production

# 5. If immediate rollback needed before fix is ready:
vercel rollback --token $VERCEL_TOKEN
```

For mobile (App Store / Play Store) P0 bugs:
- Ship web fix immediately
- Mobile hotfix via Expo OTA update (if JS-only bug)
- Full store submission for native code changes (< 24h expedited review available)
