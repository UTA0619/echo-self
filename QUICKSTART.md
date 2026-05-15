# ECHO//SELF — Quick Start Guide

## 前提条件

- Node.js 20+
- pnpm 9+ (`npm i -g pnpm`)
- Expo CLI (`npm i -g expo-cli`)
- iOS: Xcode 15+ or Expo Go app
- Android: Android Studio or Expo Go app
- Supabase アカウント（無料プランで可）

---

## 1. セットアップ

```bash
# リポジトリをクローン（develop ブランチ）
git clone https://github.com/UTA0619/echo-self.git
cd echo-self
git checkout develop

# 依存関係インストール
pnpm install

# 環境変数をコピー
cp apps/mobile/.env.example apps/mobile/.env
```

---

## 2. Supabase の設定

1. [app.supabase.com](https://app.supabase.com) でプロジェクト作成
2. SQL Editor で以下のマイグレーションを順番に実行：
   ```
   packages/database/migrations/001_initial_schema.sql
   packages/database/migrations/002_match_memories.sql
   packages/database/migrations/003_streak_system.sql
   packages/database/migrations/004_pgvector_performance.sql
   packages/database/migrations/005_analytics.sql
   ```
3. Project Settings → API から `URL` と `anon key` をコピー
4. `apps/mobile/.env` に貼り付け：
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

---

## 3. アプリ起動

```bash
cd apps/mobile
npx expo start
```

- **iPhoneで試す**: Expo Go アプリ → QRコードをスキャン
- **iOS Simulator**: `i` キーを押す（Xcode 必要）
- **Android Emulator**: `a` キーを押す（Android Studio 必要）

---

## 4. Edge Functions（AI機能を使う場合）

```bash
# Supabase CLI インストール
npm i -g supabase

# ログイン
supabase login

# Edge functions を local で実行
supabase functions serve

# または Supabase プロジェクトにデプロイ
supabase functions deploy --project-ref YOUR_PROJECT_REF
```

Edge functions に必要な Secrets（Supabase Dashboard → Edge Functions → Secrets）:
```
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_test_... （Stripe使う場合）
STRIPE_WEBHOOK_SECRET=whsec_... （Stripe使う場合）
```

---

## 画面構成

```
LoginScreen         ← メールマジックリンク / Apple / Google 認証
  ↓（ログイン後）
OnboardingNavigator ← 5ステップのオンボーディング
  WelcomeScreen
  NameScreen
  EmotionalBaselineScreen
  NotificationScreen
  PaywallScreen
  ↓（完了後）
MainTabNavigator    ← 4タブ構成
  🪞 Mirror         ← 日記入力 + AIエコーレスポンス（メイン機能）
  📊 Timeline       ← 感情アーク（EPIC-04、開発中）
  🔮 Future         ← 未来の自分予測（EPIC-05、開発中）
  👤 Profile        ← 設定・プレミアム・ログアウト
```

---

## トラブルシューティング

| エラー | 解決策 |
|-------|--------|
| `EXPO_PUBLIC_SUPABASE_URL is not set` | `.env` ファイルに URL を設定 |
| `Cannot find module '@echo-self/shared-types'` | `pnpm install` を再実行 |
| iOS Simulator でアプリが落ちる | `expo start --clear` でキャッシュクリア |
| 認証メールが届かない | Supabase Dashboard → Authentication → Email Templates を確認 |
| Edge function が 401 を返す | Supabase Anon Key が正しいか確認 |
