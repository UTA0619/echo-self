# Eidolon — Game Design Document (GDD)

Version: 0.1 (Draft)
Last Updated: 2026-05-22

---

## 1. Game Overview

**Title:** Eidolon — The Soul-Bound RPG  
**Genre:** AI-driven async RPG  
**Platforms:** iOS / Android / Web (PWA)  
**Target Audience:** 18-35, mobile-first, interests in AI, self-improvement, RPG  
**One-liner:** "Your AI soul-twin keeps adventuring while you sleep."

---

## 2. Core Loop

```
Wake up
  → Check Eidolon's overnight report (dungeon progress, loot, encounters)
  → Review & guide Eidolon (personality nudges, equipment decisions)
  → Log emotion / reality data (steps, sleep, heart rate)
  → Enter dungeon yourself (semi-auto combat)
  → Discover other players' Eidolons visiting
  → Sleep → Eidolon continues autonomously
```

**Session length target:** 5-15 minutes/day (sticky daily ritual, not time sink)

---

## 3. Eidolon System

Each player has one Eidolon — a persistent AI companion with:

### 3.1 Personality (Big Five / OCEAN)
| Trait | Range | Game Effect |
|-------|-------|-------------|
| Openness | 0-100 | Exploration tendency, new dungeon bias |
| Conscientiousness | 0-100 | Auto-gear optimization, MP conservation |
| Extraversion | 0-100 | Interaction frequency with other Eidolons |
| Agreeableness | 0-100 | Guild support, passive healing |
| Neuroticism | 0-100 | Panic rate, avoidance triggers |

Personality evolves slowly based on player emotion logs and in-game events.

### 3.2 Memory System
- **Episodic:** Up to 128 events, FIFO with importance scoring
- **Semantic:** Persistent knowledge (player preferences, world lore)
- **Procedural:** Learned combat tactics and routes
- Storage: Supabase pgvector with RAG retrieval

### 3.3 Autonomous Behavior
Overnight, Eidolon makes decisions based on personality + memories:
- Chooses dungeon difficulty
- Manages inventory
- Accepts/declines social encounters
- Generates a daily narrative report for the player

---

## 4. Dungeon System

### 4.1 Generation
- Claude Haiku generates dungeon room descriptions + events at runtime
- Each dungeon has: theme, difficulty tier, special events, boss
- Generation time target: < 1.5 seconds

### 4.2 Combat (Semi-Auto)
- Player sets strategy (aggressive / balanced / defensive)
- Eidolon executes autonomously, player can intervene
- Turn-based with real-time feel (animations hide computation)
- No twitch mechanics — accessible to all players

### 4.3 Difficulty Scaling
- Adapts to player level + Eidolon personality
- Openness score unlocks experimental dungeon types

---

## 5. Reality Sync

Player's real-world data influences game stats:

| Real Data | Game Effect |
|-----------|-------------|
| Steps today | +ATK bonus (max at 10,000 steps) |
| Sleep hours | +MAX HP modifier |
| Heart rate variability | Eidolon stress/calm state |
| Emotion log (manual) | World weather, dungeon ambiance |

Data sources: HealthKit (iOS) / Health Connect (Android) — fully opt-in, privacy-first.

---

## 6. Asynchronous Social

- Other players' Eidolons can "visit" your dungeon
- Interactions: trade, duel (friendly), exchange memories
- No real-time required — all resolved at next session
- Guilds: shared world objectives, passive contributions

---

## 7. Monetization

See master spec §6. Summary:
- Free tier: 5 AI dungeons/day + ads
- Soul Pass $9.99/mo: unlimited + 600 currency/mo
- Eternal $19.99/mo: priority AI + 1500 currency/mo
- Gacha: cosmetics / story content ONLY — never power

---

## 8. Art Direction

- **Style:** Dark fantasy / cyberpunk fusion — "Hollow Knight meets Cyberpunk 2077"
- **Palette:** Deep blacks, neon purples, warm golds
- **UI:** Glassmorphism cards on dark backgrounds
- **Eidolon design:** Procedurally varied silhouettes, glowing soul core
- **Animations:** Rive for Eidolon expressions; Flame for combat

---

## 9. Audio

- **BGM:** Generative / adaptive (changes with dungeon mood)
- **SFX:** Minimal, satisfying (Hollow Knight-inspired)
- **Eidolon Voice:** ElevenLabs Flash v2.5 (optional, premium feature)
