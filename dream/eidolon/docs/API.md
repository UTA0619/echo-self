# Eidolon — API Reference

Version: 0.1
Last Updated: 2026-05-22

All client requests must include a Firebase ID token in the `Authorization` header:
```
Authorization: Bearer <firebase_id_token>
```

---

## Supabase Edge Functions

Base URL: `https://<project>.supabase.co/functions/v1`

### POST /eidolon/respond

Generates an Eidolon response to a game event.

**Request:**
```json
{
  "eidolon_id": "uuid",
  "event_trigger": "string",
  "quest_context": "string"
}
```

**Response:**
```json
{
  "response": "string",
  "new_memory_id": "uuid",
  "personality_delta": {
    "openness": 0,
    "conscientiousness": 0,
    "extraversion": 0,
    "agreeableness": 0,
    "neuroticism": 0
  }
}
```

---

### POST /dungeon/generate

Generates a new AI dungeon.

**Request:**
```json
{
  "difficulty": 1,
  "theme": "forest|cave|ruins|void",
  "eidolon_id": "uuid"
}
```

**Response:**
```json
{
  "dungeon_id": "uuid",
  "rooms": [...],
  "boss": {...},
  "narrative_intro": "string"
}
```

---

### POST /reality/sync

Syncs real-world health data to game stats.

**Request:**
```json
{
  "steps": 8500,
  "sleep_hours": 7.5,
  "hrv_score": 65,
  "emotion": "neutral|happy|anxious|tired|energized"
}
```

**Response:**
```json
{
  "stat_bonuses": {
    "atk_bonus": 0.85,
    "hp_modifier": 1.1,
    "eidolon_mood": "calm"
  },
  "world_weather": "clear|storm|fog|aurora"
}
```

---

## Firebase Cloud Functions

Base URL: `https://us-central1-<project>.cloudfunctions.net`

### POST /gacha/pull

Executes a gacha pull.

**Request:**
```json
{
  "pool_id": "string",
  "count": 1
}
```

**Response:**
```json
{
  "results": [
    {
      "item_id": "string",
      "rarity": "common|rare|epic|legendary",
      "type": "skin|story|cosmetic"
    }
  ],
  "currency_spent": 300,
  "pity_counter": 42
}
```

---

### POST /subscription/verify

Verifies RevenueCat subscription status.

**Request:**
```json
{
  "revenuecat_customer_id": "string"
}
```

**Response:**
```json
{
  "tier": "free|soul_pass|eternal",
  "expires_at": "ISO8601",
  "features": {
    "unlimited_dungeons": false,
    "no_ads": false,
    "monthly_currency": 0,
    "cloud_saves": 1
  }
}
```
