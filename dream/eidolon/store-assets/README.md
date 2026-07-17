# EIDOLON — ストア公開用アセット一式

App Store / Google Play への公開に必要な画像・アイコンをすべて生成したものです。
ブランド: インディゴ `#5B54E8` → `#4842C4` / マーク=吹き出し＋✦スパーク。
再生成は `src/gen.py`（HTML生成）→ `src/build.sh`（Chromeで PNG化）→ `src/post.py`（サイズ派生・透過処理）。

---

## App Store (iOS)

| ファイル | サイズ | 用途 |
|---|---|---|
| `icon/appstore_icon_1024.png` | 1024×1024 | **App Store 表示アイコン（必須）**。アルファ無し・角丸無し（Appleが自動処理） |
| `icon/ios/icon_*.png` | 20〜1024 | Xcode `AppIcon.appiconset` 用の各サイズ（20/29/40/58/60/76/80/87/120/152/167/180/1024） |
| `screenshots/ios_6.7in_1290x2796_01〜05.png` | 1290×2796 | **6.7型スクリーンショット（必須・最低1枚、5枚同梱）**。iPhone 15/16 Pro Max 等 |
| `splash/splash_1242x2688.png` | 1242×2688 | 起動画面（Launch Screen）用 |

> 6.7型を登録すれば他サイズは App Store Connect が自動リサイズ表示します（6.5/5.5型を個別登録も可）。iPad対応にする場合は 12.9型 2048×2732 のスクショが別途必要 — iPhone専用申請なら不要。

## Google Play (Android)

| ファイル | サイズ | 用途 |
|---|---|---|
| `icon/playstore_icon_512.png` | 512×512 | **Playストア アイコン（必須）**。32bit PNG |
| `feature/feature_graphic_1024x500.png` | 1024×500 | **フィーチャーグラフィック（必須）** |
| `screenshots/android_1080x2340_01〜05.png` | 1080×2340 | **スマホ用スクショ（必須・最低2枚、5枚同梱）** |
| `icon/adaptive_foreground_1024.png` | 1024×1024 | アダプティブアイコン前景（**透過**・セーフゾーン内） |
| `icon/adaptive_background_1024.png` | 1024×1024 | アダプティブアイコン背景（インディゴ） |
| `icon/android/ic_launcher_foreground_432.png` / `_background_432.png` | 432×432 | `mipmap-anydpi-v26` の adaptive-icon 用 |
| `icon/android/ic_launcher_{mdpi..xxxhdpi}.png` | 48〜192 | 旧端末向け正方形ランチャー |
| `icon/android/ic_launcher_round_*.png` | 48〜192 | 丸型ランチャー |

---

## スクリーンショットの内容（5枚共通・両OS）

1. **送る前に、ひと呼吸。** — 言い方相談（before → after ＋トーン出し分け）
2. **あなたの"伝え方タイプ"を診断。** — 独自タイプ（🎯 まっすぐ直球タイプ）
3. **相手ごとに、ちゃんと届く言葉に。** — 人物カード＋記憶
4. **送ったあと、どうだった？** — 学習ループ＋成長メーター
5. **毎日、伝わる自分に育つ。** — Bond（声で練習・無制限）

---

## まだ必要なもの（画像以外・別途あなたの操作が必要）

- **アプリ本体のビルド**（ネイティブ）と署名 — これらの画像を組み込む先
- Apple Developer 登録（$99/年）／Google Play Console 登録（$25 買い切り）
- プライバシーポリシーURL、年齢レーティング、アプリ説明文・キーワード
- （iOS）App Store Connect でのスクショ登録、（Android）ストア掲載情報

> これらは私が代理で申請できないため、アカウント作成後にご自身で。画像はすべてこのフォルダから登録できます。
