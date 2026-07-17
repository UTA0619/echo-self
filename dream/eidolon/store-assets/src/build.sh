#!/bin/bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT="/Users/newworld/dream/eidolon/store-assets"
SRC="$ROOT/src"
TMP="$(mktemp -d)"

render() { # html out W H [t=transparent]
  local html="$SRC/$1" out="$2" w="$3" h="$4" tp="$5"
  local udir="$TMP/ud_$(basename "$1" .html)"
  rm -f "$out"
  local flags=(--headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1
    --no-first-run --no-default-browser-check --disable-extensions
    --user-data-dir="$udir" --window-size="$w,$h" --screenshot="$out")
  [ "$tp" = "t" ] && flags+=(--default-background-color=00000000)
  "$CHROME" "${flags[@]}" "file://$html" >/dev/null 2>&1 &
  # wait until the screenshot file appears and its size settles
  local last=-1 cur=0 i
  for i in $(seq 1 60); do
    if [ -f "$out" ]; then
      cur=$(stat -f%z "$out" 2>/dev/null || echo 0)
      [ "$cur" -gt 0 ] && [ "$cur" = "$last" ] && break
      last=$cur
    fi
    sleep 0.3
  done
  pkill -9 -f "$udir" 2>/dev/null
  echo "  $(basename "$out")  ${cur}B"
}

echo "icons:"
render icon_ios_1024.html                 "$ROOT/icon/appstore_icon_1024.png"          1024 1024
render icon_android_512.html              "$ROOT/icon/playstore_icon_512.png"           512  512
render icon_adaptive_foreground_1024.html "$ROOT/icon/adaptive_foreground_1024.png"     1024 1024 t
render icon_adaptive_background_1024.html "$ROOT/icon/adaptive_background_1024.png"      1024 1024
echo "feature / splash:"
render feature_graphic_1024x500.html      "$ROOT/feature/feature_graphic_1024x500.png"  1024 500
render splash_1242x2688.html              "$ROOT/splash/splash_1242x2688.png"           1242 2688
echo "screenshots:"
for i in 01 02 03 04 05; do
  render "ss_ios_$i.html"     "$ROOT/screenshots/ios_6.7in_1290x2796_$i.png"  1290 2796
  render "ss_android_$i.html" "$ROOT/screenshots/android_1080x2340_$i.png"    1080 2340
done
rm -rf "$TMP"
echo "render done"
