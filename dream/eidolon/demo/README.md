# Eidolon — playable demo

A self-contained, **backend-free** prototype of the *pivot* experience (Eidolon as a
Twin / Identity OS, not just an RPG). Built so you can actually run it and review the
feel yourself — no account, no API keys, no build step. Everything runs in the browser
and persists to `localStorage`.

## Run it

Easiest — just open the file:

```bash
open dream/eidolon/demo/index.html        # macOS
```

Or serve it (any static server):

```bash
cd dream/eidolon/demo && python3 -m http.server 4173
# then visit http://localhost:4173
```

## What to try (the review path)

1. **Create your twin** — name it, pick a temperament (this sets a Big-Five-ish
   personality that actually changes the writing).
2. **Read the morning report** — tap the card. The overnight story is generated client-
   side, grounded in your twin's personality + your reality signals.
3. **Share this morning** — see the branded share card (the viral growth loop) and the
   "share → new users" moment.
4. **Reality sync** — change steps/sleep, then tap *Sleep → next morning*. The night
   shifts with you (the Pokémon-GO-class hook).
5. **Twin depth** — watch the north-star meter climb. This is the moat: a private model
   of you that compounds and can't be copied.
6. **Tiers** (tap the chip) — Free vs **Bond**. Paying buys the *relationship* (memory,
   cognition, weekly reflection), never power (Doctrine D3).
7. **"What I noticed about you"** — the Act-2 weekly reflection (Bond only). The Twin
   becomes a mirror.

Reset anytime from the browser console: `eidolonReset()`.

## Honest scope

This is a faithful prototype of the **experience and the thesis**, not the production
Flutter app (which needs Supabase/Firebase/AI). The generated text is templated, not real
Claude output — enough to judge the feel and the loop, not the final quality bar.
