# ECHO モバイルアプリ — App Store / Play Store 申請手順

## 前提条件

| 必要なもの | 入手先 |
|---|---|
| Apple Developer アカウント ($99/年) | https://developer.apple.com |
| Google Play Console アカウント ($25 一回) | https://play.google.com/console |
| Expo アカウント (無料) | https://expo.dev |
| EAS CLI | `npm install -g eas-cli` |

---

## STEP 1 — EAS プロジェクト作成

```bash
cd apps/mobile
eas login                    # Expoアカウントでログイン
eas project:init             # EASプロジェクト作成 → app.json の projectId が更新される
```

`app.json` の `extra.eas.projectId` と `updates.url` を実際のIDに更新してください。

---

## STEP 2 — 環境変数の設定

```bash
cp .env.example .env
# .env を編集して Supabase URL・anon key などを入力

# EAS の秘密環境変数として登録
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://xxx.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-key"
eas secret:create --scope project --name EXPO_PUBLIC_APP_URL --value "https://echo-self.app"
```

---

## STEP 3 — eas.json の設定

`eas.json` の `submit.production` セクションを編集:

```json
"ios": {
  "appleId": "あなたのApple ID メールアドレス",
  "ascAppId": "App Store Connect の App ID (数字)",
  "appleTeamId": "Apple Developer Team ID"
}
```

---

## STEP 4 — アイコン / スプラッシュ画像の準備

| ファイル | サイズ |
|---|---|
| `assets/icon.png` | 1024×1024px (iOS・Android共通) |
| `assets/splash.png` | 1284×2778px 推奨 |
| `assets/adaptive-icon.png` | 1024×1024px (Android) |
| `assets/notification-icon.png` | 96×96px (白・透過背景) |

> **重要:** icon.png は角丸なし・透過なしの正方形にすること（App Storeが自動で角丸を付ける）

---

## STEP 5 — 本番ビルド

### iOS (App Store 用)

```bash
eas build --platform ios --profile production
```

初回は Apple ID・パスワードを聞かれ、証明書・プロビジョニングプロファイルを自動生成します。

### Android (Play Store 用)

```bash
eas build --platform android --profile production
```

---

## STEP 6 — App Store Connect 申請

### 方法A: EAS Submit (推奨・自動)

```bash
eas submit --platform ios --latest
```

### 方法B: 手動

1. https://appstoreconnect.apple.com にログイン
2. 「マイApp」→「+」で新しいApp作成
3. バンドルID: `com.echoself.app`
4. TestFlightでテスト後、審査提出

**App Store メタデータ (英語)**
- **Name:** ECHO — Memory Layer
- **Subtitle:** Identity. Memory. Future Self.
- **Keywords:** journal,memory,ai,identity,self-reflection,habit,mood,future self
- **Description:** 1文目が最重要。例:「ECHO is your AI-powered memory layer that learns who you are, tracks your emotional patterns, and shows you who you're becoming.」

---

## STEP 7 — Google Play 申請

### 方法A: EAS Submit (推奨・自動)

Google サービスアカウントキーが必要:
1. [Google Play Console](https://play.google.com/console) → 設定 → API アクセス → サービスアカウント作成
2. キーをJSON形式でダウンロード → `apps/mobile/google-service-account.json` として保存 (git管理外)
3. `eas.json` の `android.serviceAccountKeyPath` を更新

```bash
eas submit --platform android --latest
```

### リリーストラック

- `internal` → 内部テスト (自分のみ)
- `alpha` → クローズドテスト
- `beta` → オープンテスト
- `production` → 全ユーザー

---

## STEP 8 — OTA アップデート (Expo Updates)

コードのバグ修正はアプリ審査なしで即時配信できます:

```bash
eas update --branch production --message "Fix: entry submission bug"
```

> ネイティブコード (ライブラリ追加など) の変更は必ずストア再申請が必要

---

## CI/CD — GitHub Actions での自動ビルド

`.github/workflows/eas-build.yml` を作成:

```yaml
name: EAS Build
on:
  push:
    branches: [main]
    paths:
      - 'apps/mobile/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install -g eas-cli pnpm
      - run: pnpm install
      - run: eas build --platform all --profile production --non-interactive
        working-directory: apps/mobile
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

`EXPO_TOKEN` は `eas token:create` で生成して GitHub Secrets に登録。

---

## よくあるエラー

| エラー | 対処 |
|---|---|
| `bundleIdentifier already exists` | App Store Connect で既にIDが使われている → 別IDに変更 |
| `Invalid certificate` | `eas credentials` で証明書を再生成 |
| `Missing NSMicrophoneUsageDescription` | `app.json` の `infoPlist` に説明文を追加 (済み) |
| `Google Play: APK not signed` | EAS が自動で署名する。手動ビルド不要 |
