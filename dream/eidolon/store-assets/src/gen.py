#!/usr/bin/env python3
# Generates all HTML source files for EIDOLON store assets.
# Rendered to PNG by Chrome headless (see build.sh).
import os, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"

INDIGO = "#5B54E8"
INDIGO_DEEP = "#4842C4"
INK = "#1B1B1D"
INK2 = "#6B6B70"

# ---- brand mark: white speech bubble + indigo spark (viewBox 100x100) ----
def mark(bubble="#FFFFFF", spark=INDIGO, scale=1.0):
    return f'''<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width:{scale*100}%;height:{scale*100}%">
  <rect x="22" y="22" width="56" height="42" rx="14" fill="{bubble}"/>
  <path d="M33 57 L27 75 L49 60 Z" fill="{bubble}"/>
  <path d="M50 31 L53.2 39 L62 43 L53.2 47 L50 55 L46.8 47 L38 43 L46.8 39 Z" fill="{spark}"/>
</svg>'''

BASE_CSS = '''*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%}
body{font-family:-apple-system,"Hiragino Kaku Gothic ProN","Hiragino Sans",sans-serif;-webkit-font-smoothing:antialiased;}
'''

def html(w, h, body, extra_css="", bg="transparent"):
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>{BASE_CSS}
body{{width:{w}px;height:{h}px;background:{bg};overflow:hidden;position:relative}}
{extra_css}</style></head><body>{body}</body></html>'''

def write(name, content):
    p = SRC / name
    p.write_text(content)
    print("wrote", p.name)

# ============ 1. iOS app icon 1024 (opaque, gradient tile, no rounding) ============
grad = f"linear-gradient(145deg,{INDIGO} 0%,{INDIGO_DEEP} 100%)"
icon_body = f'''<div style="width:1024px;height:1024px;background:{grad};display:flex;align-items:center;justify-content:center">
  <div style="width:560px;height:560px">{mark()}</div>
</div>'''
write("icon_ios_1024.html", html(1024,1024, icon_body, bg="#FFFFFF"))

# ============ 2. Android Play icon 512 (opaque) ============
icon512 = f'''<div style="width:512px;height:512px;background:{grad};display:flex;align-items:center;justify-content:center">
  <div style="width:280px;height:280px">{mark()}</div>
</div>'''
write("icon_android_512.html", html(512,512, icon512, bg="#FFFFFF"))

# ============ 3. Android adaptive foreground (transparent, safe zone ~66%) ============
# 1024 canvas; glyph confined to central safe circle
fg = f'''<div style="width:1024px;height:1024px;display:flex;align-items:center;justify-content:center">
  <div style="width:470px;height:470px">{mark()}</div>
</div>'''
write("icon_adaptive_foreground_1024.html", html(1024,1024, fg, bg="transparent"))

# ============ 4. Android adaptive background (solid gradient) ============
bgtile = f'<div style="width:1024px;height:1024px;background:{grad}"></div>'
write("icon_adaptive_background_1024.html", html(1024,1024, bgtile, bg=INDIGO))

# ============ 5. Google Play feature graphic 1024 x 500 ============
feat = f'''<div style="width:1024px;height:500px;background:{grad};display:flex;align-items:center;padding:0 70px;gap:44px;position:relative;overflow:hidden">
  <div style="position:absolute;right:-120px;top:-160px;width:520px;height:520px;border-radius:50%;background:rgba(255,255,255,.06)"></div>
  <div style="position:absolute;right:40px;bottom:-180px;width:360px;height:360px;border-radius:50%;background:rgba(255,255,255,.05)"></div>
  <div style="width:150px;height:150px;flex:none">{mark()}</div>
  <div style="color:#fff;z-index:1">
    <div style="font-size:34px;letter-spacing:10px;font-weight:800;opacity:.9">EIDOLON</div>
    <div style="font-size:62px;font-weight:800;line-height:1.15;margin-top:10px">もう一人の、<br>賢いあなた。</div>
    <div style="font-size:27px;margin-top:18px;opacity:.9;font-weight:500">送る前に、ひと呼吸。あなたらしく、ちゃんと伝わる言い方に。</div>
  </div>
</div>'''
write("feature_graphic_1024x500.html", html(1024,500, feat, bg=INDIGO))

# ============ 6. Splash (1242 x 2688 portrait) ============
splash = f'''<div style="width:1242px;height:2688px;background:{grad};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:50px">
  <div style="width:360px;height:360px">{mark()}</div>
  <div style="color:#fff;font-size:58px;letter-spacing:16px;font-weight:800">EIDOLON</div>
  <div style="color:rgba(255,255,255,.85);font-size:30px;font-weight:500;letter-spacing:2px">もう一人の、賢いあなた</div>
</div>'''
write("splash_1242x2688.html", html(1242,2688, splash, bg=INDIGO))

# ============ 7. Marketing screenshots ============
# Each: caption band on top (warm/indigo), phone mock below with real-looking UI.

def phone(inner):
    # a rounded device panel, sized to its content, centered in the frame
    return f'''<div style="width:660px;background:#FFFFFF;border-radius:56px;box-shadow:0 44px 100px rgba(27,20,90,.30);overflow:hidden;border:1px solid rgba(0,0,0,.06)">
      <div style="padding:48px 38px 52px">{inner}</div>
    </div>'''

def head(chip="🎯 直球型", tier="Free"):
    tchip = (f'<span style="background:{INDIGO};color:#fff;border-radius:999px;padding:9px 16px;font-size:20px;font-weight:700">✦ Bond</span>'
             if tier=="Bond" else f'<span style="border:1px solid rgba(0,0,0,.14);border-radius:999px;padding:9px 16px;font-size:20px;color:{INK2}">Free</span>')
    return f'''<div style="display:flex;justify-content:space-between;align-items:center">
      <div style="display:flex;gap:12px;align-items:center">
        <div style="font-weight:800;letter-spacing:3px;font-size:22px">EIDOLON</div>
        <span style="background:#F4F4F2;border-radius:999px;padding:8px 14px;font-size:19px;font-weight:600">{chip}</span>
      </div>{tchip}
    </div>'''

def card(inner, accent=False):
    b = f"1px solid {INDIGO}" if accent else "1px solid rgba(0,0,0,.08)"
    bg = "#ECEBFB" if accent else "#FFFFFF"
    return f'<div style="border:{b};background:{bg};border-radius:22px;padding:26px 28px;margin-top:22px">{inner}</div>'

def tag(t): return f'<div style="font-size:19px;color:{INK2};font-weight:600;letter-spacing:.5px">{t}</div>'

# --- screen bodies ---
S1 = head("🎯 直球型") + card(
    tag("いまの文（そのまま）") +
    f'<div style="background:#F4F4F2;border-radius:14px;padding:20px;margin-top:12px;font-size:26px;color:{INK}">なんで既読無視するの？ずっと待ってたんだけど。</div>')
S1 += card(
    f'<div style="font-size:19px;color:{INDIGO_DEEP};font-weight:700">あなたらしい、届く言い方</div>'
    f'<div style="border:1px solid rgba(0,0,0,.14);border-radius:14px;padding:20px;margin-top:12px;font-size:26px;line-height:1.5;color:{INK}">返信を待ってたから、ちょっと寂しかったよ。忙しかった？</div>'
    f'<div style="display:flex;gap:10px;margin-top:16px"><span style="background:{INDIGO};color:#fff;border-radius:999px;padding:11px 18px;font-size:20px;font-weight:700">ちょうどよく</span>'
    f'<span style="border:1px solid rgba(0,0,0,.14);border-radius:999px;padding:11px 18px;font-size:20px;color:{INK2}">やさしめ</span>'
    f'<span style="border:1px solid rgba(0,0,0,.14);border-radius:999px;padding:11px 18px;font-size:20px;color:{INK2}">はっきり</span></div>', accent=True)

S2 = f'''<div style="text-align:center;padding:8px 0">
  <div style="font-size:20px;color:{INK2};font-weight:600">あなたの伝え方タイプ</div>
  <div style="font-size:80px;margin-top:20px">🎯</div>
  <div style="font-size:40px;font-weight:800;color:{INDIGO};margin-top:14px">まっすぐ直球タイプ</div>
  <div style="font-size:24px;color:{INK2};margin-top:12px;line-height:1.5">思ったことを、そのまま<br>まっすぐ言える人。</div>
</div>'''
S2 += card(
    tag("強み") + f'<div style="font-size:24px;line-height:1.5;margin-top:8px;color:{INK}">スピードと正直さ。物事を前に進める力がある。</div>'
    + f'<div style="height:16px"></div>' + tag("伸びしろ") + f'<div style="font-size:24px;line-height:1.5;margin-top:8px;color:{INK}">勢いが強いぶん、送る前のひと呼吸で最強になる。</div>')

S3 = head("🌙 熟考型") + card(
    f'<div style="display:flex;justify-content:space-between;align-items:center"><div style="font-size:26px;font-weight:800">田中課長</div><span style="border:1px solid rgba(0,0,0,.14);border-radius:999px;padding:8px 16px;font-size:20px;color:{INK2}">上司</span></div>'
    f'<div style="font-size:20px;color:{INK2};margin-top:12px">📝 プライドが高い。責められると黙る。</div>')
S3 += card(
    f'<div style="font-size:20px;color:{INDIGO_DEEP};font-weight:700">📇 田中課長さんの記憶</div>'
    f'<div style="font-size:23px;line-height:1.5;color:{INDIGO_DEEP};margin-top:10px">前回きつく響いた記録。今回はワンクッション多めに整えます。</div>', accent=True)
S3 += card(
    f'<div style="font-size:19px;color:{INDIGO_DEEP};font-weight:700">敬語で、届く言い方</div>'
    f'<div style="border:1px solid rgba(0,0,0,.14);border-radius:14px;padding:18px;margin-top:10px;font-size:24px;line-height:1.5;color:{INK}">方向性は賛成です。一点だけ、こう変える提案があります。ご検討いただけますか？</div>')

S4 = head("🎯 直球型") + card(
    f'<div style="font-size:24px;font-weight:700;color:{INDIGO_DEEP}">さっき 田中課長さん に送ったの、どうだった？</div>'
    f'<div style="font-size:20px;color:{INK2};margin-top:10px">結果を教えてくれると、次の言い方に活かします。</div>'
    f'<div style="display:flex;gap:12px;margin-top:20px">'
    f'<span style="flex:1;text-align:center;background:#fff;border:1px solid rgba(0,0,0,.12);border-radius:999px;padding:15px;font-size:22px">😊 うまくいった</span>'
    f'<span style="flex:1;text-align:center;background:#fff;border:1px solid rgba(0,0,0,.12);border-radius:999px;padding:15px;font-size:22px">😐 微妙</span></div>', accent=True)
S4 += card(
    f'<div style="display:flex;justify-content:space-between"><div style="font-size:20px;color:{INK2};font-weight:600">伝わる自分 · 成長</div><div style="color:{INDIGO};font-weight:700;font-size:22px">62%</div></div>'
    f'<div style="height:12px;background:#EDEDEA;border-radius:999px;margin-top:12px;overflow:hidden"><div style="width:62%;height:100%;background:{INDIGO}"></div></div>'
    f'<div style="font-size:19px;color:{INK2};margin-top:14px">🔥 立ち止まれた：14回　·　🤍 気まずさ回避：9回</div>')

S5 = f'''<div style="text-align:center;padding:6px 0 2px">
  <div style="font-size:34px;font-weight:800;line-height:1.3;color:{INK}">今日も、<span style="color:{INDIGO}">伝わる自分</span>で。</div>
</div>'''
S5 += card(
    f'<div style="font-size:24px;font-weight:700">🎙️ 声で練習・無制限相談</div>'
    f'<div style="font-size:21px;color:{INK2};margin-top:10px;line-height:1.5">難しい会話を、事前にロールプレイ。相手ごとの記憶で、毎日ちゃんと伝わる自分に。</div>'
    f'<div style="display:inline-block;margin-top:18px;background:{INDIGO};color:#fff;border-radius:999px;padding:14px 26px;font-size:23px;font-weight:700">✦ Bond をはじめる</div>', accent=True)
S5 += card(
    f'<div style="font-size:20px;color:{INK2};font-weight:600">今日のひとこと</div>'
    f'<div style="font-size:24px;line-height:1.55;margin-top:10px;color:{INK}">「正しいこと」より「伝わること」。あなたの誠実さは、優しさとセットで最強になります。</div>')

SCREENS = [
    ("送る前に、ひと呼吸。", "LINEやメール、送っていいか迷ったら。あなたらしさは残して。", S1, "#EEF0FF"),
    ("あなたの“伝え方タイプ”を診断。", "8つの質問で、あなたの言い方のクセが分かる。", S2, "#FFF3EC"),
    ("相手ごとに、ちゃんと届く言葉に。", "上司にも恋人にも。使うほど、その人専用に賢くなる。", S3, "#EEF0FF"),
    ("送ったあと、どうだった？", "結果を学んで、次の言い方に活かす。成果が見える。", S4, "#EAF6F0"),
    ("毎日、伝わる自分に育つ。", "声で練習、相手の記憶、無制限相談 ― Bondで。", S5, "#F3EFFF"),
]

def screenshot(w, h, caption, sub, ui_body, band):
    # caption fixed at top; phone centered in the remaining space
    sc = w*0.9/660
    body = f'''<div style="width:{w}px;height:{h}px;background:{band};display:flex;flex-direction:column;align-items:center;overflow:hidden">
      <div style="text-align:center;padding:{int(h*0.05)}px 70px 0;flex:none">
        <div style="font-size:{int(w*0.062)}px;font-weight:800;color:{INK};line-height:1.28">{caption}</div>
        <div style="font-size:{int(w*0.032)}px;color:{INK2};margin-top:18px;line-height:1.5;font-weight:500">{sub}</div>
      </div>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;width:100%">
        <div style="transform:scale({sc:.4f});transform-origin:center">{phone(ui_body)}</div>
      </div>
    </div>'''
    return html(w, h, body, bg=band)

for idx,(cap,sub,ui,band) in enumerate(SCREENS, 1):
    write(f"ss_ios_{idx:02d}.html", screenshot(1290,2796, cap, sub, ui, band))
    write(f"ss_android_{idx:02d}.html", screenshot(1080,2340, cap, sub, ui, band))

print("DONE")
