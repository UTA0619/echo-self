# Eidolon — Developer Setup Guide

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Flutter | 3.27+ | `~/development/flutter/` |
| Dart | 3.6+ | bundled with Flutter |
| Node.js | 20+ | https://nodejs.org |
| Firebase CLI | latest | `npm i -g firebase-tools` |
| Supabase CLI | latest | `brew install supabase/tap/supabase` |
| Melos | latest | `dart pub global activate melos` |

---

## Step 1 — Clone & Bootstrap

```bash
git clone https://github.com/eidolon-studio/eidolon.git
cd eidolon
melos bootstrap
```

---

## Step 2 — Firebase Project Setup

1. Go to https://console.firebase.google.com
2. Create project: `eidolon-studio` (or your preferred name)
3. Enable these services:
   - Authentication (Email/Password + Apple + Google)
   - Firestore Database (production mode)
   - Storage
   - Remote Config
   - Crashlytics
   - Analytics
4. Download config files:
   - Android: `google-services.json` → `apps/mobile/android/app/`
   - iOS: `GoogleService-Info.plist` → `apps/mobile/ios/Runner/`
5. Get API keys from Project Settings → General

---

## Step 3 — Supabase Project Setup

1. Go to https://supabase.com and create a new project
2. Copy Project URL and anon key from Settings → API
3. Run migrations:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

4. Enable pgvector extension in SQL editor:
```sql
create extension if not exists vector;
```

5. Set Edge Function secrets:
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set OPENAI_API_KEY=sk-...
```

6. Deploy Edge Functions:
```bash
supabase functions deploy eidolon-respond
supabase functions deploy dungeon-generate
supabase functions deploy reality-sync
```

---

## Step 4 — Flutter Environment Setup

1. Copy the env template:
```bash
cp apps/mobile/.env.template.json apps/mobile/.env.development.json
```

2. Fill in all values in `.env.development.json` (never commit this file)

3. Run the app:
```bash
cd apps/mobile
flutter run --dart-define-from-file=.env.development.json
```

---

## Step 5 — RevenueCat Setup

1. Create account at https://app.revenuecat.com
2. Create App for iOS + Android
3. Add products matching `pubspec.yaml` subscription IDs:
   - `soul_pass_monthly` ($9.99)
   - `eternal_monthly` ($19.99)
4. Copy API keys to `.env.development.json`

---

## Step 6 — Sentry Setup

1. Create project at https://sentry.io
2. Copy DSN to `.env.development.json`

---

## Running Tests

```bash
# Flutter unit + widget tests
cd apps/mobile && flutter test

# Backend TypeScript tests
cd backend/functions && npm test

# All via Melos
melos run test
```

## Common Issues

| Error | Fix |
|-------|-----|
| `SUPABASE_URL empty` | Check `.env.development.json` exists and is valid JSON |
| `Firebase not initialized` | Ensure `google-services.json` / `GoogleService-Info.plist` are in place |
| `pgvector not found` | Run `create extension if not exists vector;` in Supabase SQL editor |
| `build_runner conflicts` | Run `dart run build_runner build --delete-conflicting-outputs` |
