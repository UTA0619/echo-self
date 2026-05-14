# Google Play Launch Checklist — ECHO//SELF

---

## Pre-Submission Setup

### Google Play Console
- [ ] Google Play Console account active ($25 one-time fee)
- [ ] App created: `app.echoself.android`
- [ ] App category: Health & Fitness
- [ ] Content rating questionnaire completed → Rating: Everyone 17+
- [ ] Target audience: Adults (18+)

### Store Listing Metadata
- [ ] **App Name:** ECHO//SELF (max 30 chars)
- [ ] **Short Description** (80 chars): "Your AI identity mirror. Journal. Reflect. Know your future self."
- [ ] **Full Description** (4000 chars):
  - Feature benefits, not features
  - Include keywords naturally: ai journal, self-reflection, emotional intelligence
  - Add subscription disclosure at bottom
- [ ] **App icon:** 512 × 512 px PNG (same as iOS but separate upload)
- [ ] **Feature graphic:** 1024 × 500 px (shown in Play Store header)
- [ ] **Screenshots:** Phone: 2–8 screenshots (1080 × 1920 px minimum)

### Screenshots Required
- [ ] Phone screenshots: min 2, max 8 (1080 × 1920 px)
  - Same content as iOS screenshots
- [ ] Tablet screenshots (optional but recommended for wider reach)

---

## Technical Requirements

### Android Build
- [ ] Target SDK: API 35 (Android 15)
- [ ] Minimum SDK: API 26 (Android 8.0 — Oreo)
- [ ] compileSdk: 35
- [ ] 64-bit support: Required (arm64-v8a, x86_64)
- [ ] App Bundle (AAB) format — NOT APK
- [ ] Expo EAS Build configured for AAB output
- [ ] Signed with production keystore (backed up securely!)
- [ ] Keystore backed up: ____________ (location)

### Permissions (Manifest)
- [ ] `INTERNET` — required
- [ ] `RECEIVE_BOOT_COMPLETED` — for notification scheduling
- [ ] `POST_NOTIFICATIONS` — push notifications (Android 13+, runtime request)
- [ ] `RECORD_AUDIO` — voice journal entries
- [ ] `VIBRATE` — haptic feedback
- [ ] No unnecessary permissions declared

### Push Notifications
- [ ] Firebase Cloud Messaging (FCM) configured
- [ ] `google-services.json` in correct location
- [ ] OneSignal Android integration complete
- [ ] Notification icon: monochrome PNG (white on transparent) for Android

### Google Play Billing
- [ ] Google Play Billing library integrated (v7+)
- [ ] Products created in Play Console:
  - Monthly: `pro_monthly` — $12.99/month, 14-day free trial
  - Annual: `pro_annual` — $89.99/year, 14-day free trial
- [ ] Base plan set up with regional pricing
- [ ] Subscription offer: Free trial (14 days)
- [ ] Billing tested end-to-end in test environment

---

## Play Store Compliance

### Data Safety Form
- [ ] Data Safety section completed:
  - Data collected: Name, Email, App activity, App info, Financial info (payments)
  - Data shared: None (no third-party data selling)
  - Data encrypted in transit: Yes
  - Users can request deletion: Yes (link to in-app settings)
  - Data not used for tracking: Confirmed

### Policy Compliance
- [ ] Financial features (subscription) — disclosure in description
- [ ] Health category — no medical claims made
- [ ] AI-generated content — disclosed appropriately (AI reflection, not medical advice)
- [ ] Privacy policy URL: `echoself.app/privacy`
- [ ] No misleading metadata (screenshots match actual app)

### Pre-Launch Report
- [ ] Run Pre-Launch Report in Play Console
- [ ] 0 critical crashes
- [ ] 0 accessibility failures (major)
- [ ] Security issues: 0 critical

---

## Internal & Closed Testing

- [ ] Internal testing track: team installs and tests
- [ ] Closed testing (beta): 50+ testers minimum, 2 weeks minimum
- [ ] Open testing (optional): larger beta before production
- [ ] Beta feedback addressed
- [ ] Crash-free rate > 99% on test tracks

---

## Production Release

### Release Management
- [ ] Create production release
- [ ] Country availability: Worldwide (or selected countries first)
- [ ] Rollout percentage: 10% (gradual rollout)
- [ ] Release notes (500 chars): "ECHO//SELF is here. Write. Reflect. Let AI find your patterns."

### Go-Live Checklist
- [ ] Production keystore used (not debug)
- [ ] Live Stripe keys in build
- [ ] FCM production configuration
- [ ] No test data or debug flags
- [ ] App works with Play Store licensing API

---

## Post-Launch

- [ ] Monitor Play Console → Android Vitals → Crash rate
- [ ] Monitor Play Console → Ratings & Reviews
- [ ] Respond to reviews within 24 hours (especially 1-2 star)
- [ ] Increase rollout: 10% → 50% → 100% (if metrics good after 48h)
- [ ] Target: 4.5+ star rating within first month

---

## Differences from iOS to Note

| Aspect | iOS | Android |
|---|---|---|
| Build format | IPA | AAB |
| Payment | StoreKit 2 | Google Play Billing v7 |
| Push | APNS | FCM |
| Deep links | Universal Links | App Links |
| Haptics | CoreHaptics | VibrationEffect API |
| Biometrics | Face ID / Touch ID | BiometricPrompt API |
| Review time | 24–48 hours | 3–7 days (first submission) |
