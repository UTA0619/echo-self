#!/usr/bin/env python3
# Post-process: flatten alpha (stores reject alpha on iOS icon), derive icon sizes.
from PIL import Image
import pathlib
R = pathlib.Path("/Users/newworld/dream/eidolon/store-assets")

def flatten(im, bg=(255,255,255)):
    if im.mode in ("RGBA","LA") or (im.mode=="P" and "transparency" in im.info):
        im = im.convert("RGBA")
        base = Image.new("RGB", im.size, bg)
        base.paste(im, mask=im.split()[-1])
        return base
    return im.convert("RGB")

# ---- iOS app icon: strip alpha, generate full set ----
master = Image.open(R/"icon/appstore_icon_1024.png")
master = flatten(master)                      # opaque, no alpha
master.save(R/"icon/appstore_icon_1024.png")  # overwrite as 24-bit
ios = R/"icon/ios"; ios.mkdir(exist_ok=True)
ios_sizes = {"20":20,"29":29,"40":40,"58":58,"60":60,"76":76,"80":80,"87":87,
             "120":120,"152":152,"167":167,"180":180,"1024":1024}
for name,s in ios_sizes.items():
    master.resize((s,s), Image.LANCZOS).save(ios/f"icon_{name}.png")

# ---- Android: Play icon (flatten), adaptive foreground (keep alpha), legacy launchers ----
play = flatten(Image.open(R/"icon/playstore_icon_512.png"))
play.save(R/"icon/playstore_icon_512.png")

fg = Image.open(R/"icon/adaptive_foreground_1024.png").convert("RGBA")  # keep transparency
bgm = flatten(Image.open(R/"icon/adaptive_background_1024.png")).convert("RGBA")
# composite for legacy square launcher
launch = Image.alpha_composite(bgm, fg).convert("RGB")
andr = R/"icon/android"; andr.mkdir(exist_ok=True)
dens = {"mdpi":48,"hdpi":72,"xhdpi":96,"xxhdpi":144,"xxxhdpi":192}
for d,s in dens.items():
    launch.resize((s,s), Image.LANCZOS).save(andr/f"ic_launcher_{d}.png")
    # round version
    m = Image.new("L",(s,s),0)
    from PIL import ImageDraw; ImageDraw.Draw(m).ellipse((0,0,s,s),fill=255)
    r = launch.resize((s,s), Image.LANCZOS).convert("RGBA"); r.putalpha(m)
    r.save(andr/f"ic_launcher_round_{d}.png")
# adaptive foreground/background at 432 (108dp @ xxxhdpi) for res/mipmap-anydpi
fg.resize((432,432),Image.LANCZOS).save(andr/"ic_launcher_foreground_432.png")
bgm.convert("RGB").resize((432,432),Image.LANCZOS).save(andr/"ic_launcher_background_432.png")

# ---- flatten feature graphic, splash, screenshots (remove alpha) ----
for p in [R/"feature/feature_graphic_1024x500.png", R/"splash/splash_1242x2688.png",
          *sorted((R/"screenshots").glob("*.png"))]:
    flatten(Image.open(p)).save(p)

# ---- report dims ----
print("== verification ==")
def show(p):
    im=Image.open(p); print(f"{im.size[0]}x{im.size[1]} {im.mode:4} {p.relative_to(R)}")
for p in [R/"icon/appstore_icon_1024.png", R/"icon/playstore_icon_512.png",
          R/"icon/adaptive_foreground_1024.png", R/"icon/adaptive_background_1024.png",
          R/"feature/feature_graphic_1024x500.png", R/"splash/splash_1242x2688.png",
          R/"screenshots/ios_6.7in_1290x2796_01.png", R/"screenshots/android_1080x2340_01.png",
          R/"icon/ios/icon_180.png", R/"icon/android/ic_launcher_xxxhdpi.png"]:
    show(p)
print("DONE")
