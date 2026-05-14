# iOS App Store Launch Checklist — ECHO//SELF

---

## Pre-Submission (4 weeks before)

### App Store Connect Setup
- [ ] App Store Connect account active (Apple Developer Program — $99/yr)
- [ ] App record created in App Store Connect
- [ ] Bundle ID registered: `app.echoself.ios`
- [ ] App category: Health & Fitness (primary), Lifestyle (secondary)
- [ ] Age rating: 17+ (mature themes — emotional vulnerability content)
- [ ] Privacy policy URL set: `echoself.app/privacy`
- [ ] Support URL: `echoself.app/support`

### App Metadata
- [ ] **App Name:** ECHO//SELF (max 30 chars)
- [ ] **Subtitle:** Your AI Identity Mirror (max 30 chars)
- [ ] **Keywords** (100 chars max): `ai journal,self reflection,emotional intelligence,daily journal,mindfulness,future self,ai therapy`
- [ ] **Description** written (4000 chars max):
  - Lead with the emotional hook, not features
  - Include "AI-powered", "privacy-first", "journal"
  - End with subscription disclosure
- [ ] **What's New** text ready for version 1.0
- [ ] **Promotional Text** (170 chars): changeable without re-review

### Screenshots (Required)
- [ ] 6.7" iPhone screenshots (iPhone 16 Pro Max): 1290 × 2796 px
- [ ] 6.1" iPhone screenshots (iPhone 16): 1179 × 2556 px
- [ ] 12.9" iPad Pro screenshots: 2048 × 2732 px (required if universal app)
- [ ] 5-10 screenshots per device size
- [ ] Screenshots show:
  - [ ] Screen 1: Onboarding/hero moment with ECHO//SELF brand
  - [ ] Screen 2: Journal write screen with emotion chips
  - [ ] Screen 3: Echo session (AI conversation)
  - [ ] Screen 4: Identity graph / future self
  - [ ] Screen 5: Subscription / value prop

### App Preview Videos (Recommended)
- [ ] 30-second video showing core loop (journal → echo session → insight)
- [ ] Dark mode, cinematic, no voiceover — music + text overlays
- [ ] Format: MP4, 1080 × 1920px (portrait)

---

## Technical Requirements (2 weeks before)

### Build Configuration
- [ ] App version: 1.0.0 (CFBundleShortVersionString)
- [ ] Build number: 1 (CFBundleVersion)
- [ ] Deployment target: iOS 16.0 minimum
- [ ] Universal app: iPhone + iPad (or iPhone only — decide)
- [ ] Architecture: arm64 only (no i386/x86_64)
- [ ] Swift version: latest stable
- [ ] Expo SDK version: latest stable

### Capabilities
- [ ] Push Notifications capability added in Xcode
- [ ] Sign In with Apple capability added
- [ ] Microphone usage description: "ECHO//SELF uses your microphone to let you record voice journal entries."
- [ ] No camera permission requested (not needed)

### Privacy
- [ ] App Privacy labels configured in App Store Connect:
  - Data Used to Track You: NONE
  - Data Linked to You: User ID, Usage Data, Other Diagnostic Data
  - Data Not Linked to You: Crash Data
- [ ] No third-party SDKs that track across apps (no Meta SDK, etc.)
- [ ] App Tracking Transparency NOT needed (no cross-app tracking)

### In-App Purchases (Subscription)
- [ ] Monthly subscription created in App Store Connect
  - Reference Name: ECHO//SELF Pro Monthly
  - Product ID: `app.echoself.pro.monthly`
  - Price: $12.99/month (Tier 13)
  - Free Trial: 14 days
- [ ] Annual subscription created
  - Reference Name: ECHO//SELF Pro Annual
  - Product ID: `app.echoself.pro.annual`
  - Price: $89.99/year (Tier 89 or custom)
  - Free Trial: 14 days
- [ ] Subscription group created
- [ ] Subscription description (shown in Manage Subscriptions): "Full access to Echo sessions, identity graph, future self predictions, and unlimited journaling."
- [ ] StoreKit 2 integration in app
- [ ] Subscription disclosure in app description

### TestFlight
- [ ] Internal testing: team can download via TestFlight
- [ ] External beta: 200+ beta users tested for 2+ weeks
- [ ] All TestFlight feedback addressed
- [ ] Crash-free rate > 99.5% on TestFlight
- [ ] Beta users complete onboarding successfully > 80%

---

## Submission (1 week before)

### Final Build Checks
- [ ] Production API keys in build (not dev/test)
- [ ] Stripe LIVE mode keys in build
- [ ] Push notification production certificate
- [ ] No debug symbols in binary
- [ ] No localhost URLs
- [ ] No test accounts hardcoded
- [ ] App works with no internet (graceful offline state)
- [ ] App does not crash on launch × 10 times

### App Store Review Preparation
- [ ] Demo account credentials ready for reviewers:
  - Email: reviewer@echoself.app
  - Password: ReviewerAccess2026!
  - This account has Pro activated for reviewer testing
- [ ] Notes for reviewer:
  - App requires email sign-up or Apple Sign In
  - AI features require internet connection
  - Push notification permission is optional
  - Subscription can be tested in sandbox mode

### Submission
- [ ] Automatic release: OFF (manual release after monitoring)
- [ ] Phased release: ON (7-day phased rollout)
- [ ] Submit for review

---

## Post-Approval

- [ ] Monitor App Store Connect for approval (typical: 24–48 hours)
- [ ] Coordinate launch: release manually at Tuesday 10am ET
- [ ] Announce on Twitter/X, LinkedIn, Product Hunt
- [ ] Enable Phased Release monitoring
- [ ] Monitor crash rate (< 0.5% target)
- [ ] Monitor Day 1 retention
- [ ] Respond to first App Store reviews within 24 hours

---

## Rejection Recovery Plan

**Common rejection reasons and fixes:**

| Rejection | Fix | Timeline |
|---|---|---|
| 2.1 App Completeness — crashes | Fix crash, resubmit | 1–2 days |
| 3.1.1 In-App Purchase — missing disclosure | Add subscription terms | 1 day |
| 5.1.1 Privacy — missing usage description | Add plist entries | 1 day |
| 4.2 Minimum Functionality | Ensure offline state works | 2–3 days |
| 4.3 Spam | N/A — differentiated product | — |
