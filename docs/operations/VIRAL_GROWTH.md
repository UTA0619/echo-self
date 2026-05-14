# Viral Growth Strategy — ECHO//SELF

---

## Growth Model

ECHO//SELF grows through **emotional resonance + identity disclosure**. When the product works, users have an insight that feels too good not to share.

**Viral coefficient target:** K > 0.4 (every 10 users brings 4 new users)

---

## Viral Loops

### Loop 1: "Share My Future Self" (Primary)

**Trigger:** After viewing their 90-day future self prediction  
**Mechanic:** Generate a shareable OG card with:
- ECHO//SELF logo + dark gradient
- 1-sentence future self prediction (non-identifiable)
- "Discover your future self" CTA + referral link

**Distribution:** Native share sheet → Instagram Stories, Twitter/X, WhatsApp  
**Conversion:** Landing page shows the sender's prediction teaser → download CTA

**Implementation:**
```typescript
// app/api/referral/share/route.ts (Vercel Edge)
import { ImageResponse } from 'next/og'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const prediction = searchParams.get('p')  // encoded prediction snippet
  const referralCode = searchParams.get('r')

  return new ImageResponse(
    <div style={{ display: 'flex', flexDirection: 'column', background: '#050508',
      width: '1200px', height: '630px', padding: '80px', color: 'white' }}>
      <div style={{ fontSize: 24, opacity: 0.6, marginBottom: 40 }}>ECHO//SELF</div>
      <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1.3, maxWidth: '900px' }}>
        "{prediction}"
      </div>
      <div style={{ marginTop: 'auto', fontSize: 20, opacity: 0.6 }}>
        Discover your future self → echoself.app/{referralCode}
      </div>
    </div>,
    { width: 1200, height: 630 }
  )
}
```

**Tracking:**
```typescript
track('referral_shared', {
  channel: 'native_share' | 'copy_link',
  prediction_timeframe: '90d',
  referral_code: user.referral_code,
})
```

---

### Loop 2: Identity Insight Card

**Trigger:** After identity graph generates top 3 nodes  
**Mechanic:** Share card with your top identity node (e.g. "Core Value: Integrity")  
**Message:** "ECHO//SELF figured out my core values from my journals. What are yours?"

---

### Loop 3: Echo Session Screenshot

**Trigger:** After a particularly resonant AI message during Echo session  
**Mechanic:** "Save this moment" → blurred background card, AI message, ECHO//SELF watermark  
**Distribution:** Instagram Stories format

---

### Loop 4: Streak Milestone Share

**Trigger:** 7-day, 30-day, 100-day streak  
**Mechanic:** Animated streak card (Lottie)  
**Message:** "100 days of self-reflection with ECHO//SELF"

---

## Referral Program

### Mechanics

| Action | Reward |
|---|---|
| Refer a user who signs up | +7 days Pro trial for referrer |
| Refer a user who converts to paid | +1 month Pro free for referrer |
| Refer 5 paying users | Permanent 20% discount for referrer |
| New user uses referral code | Both get +7 days Pro |

### Referral Attribution

```sql
-- Track full referral chain
CREATE TABLE referrals (
  referrer_id UUID REFERENCES auth.users(id),
  referred_id UUID REFERENCES auth.users(id),
  referral_code TEXT,
  install_source TEXT,  -- 'instagram', 'twitter', 'direct', 'whatsapp'
  status TEXT DEFAULT 'signed_up',  -- signed_up | trialed | converted
  ...
);
```

---

## Growth Channels

### Organic Search (SEO)

Target: "journal app with AI", "AI self-reflection", "emotional intelligence app"

**Content:** Blog posts generated from anonymized, aggregated insights:
- "The 5 most common fears revealed by 10,000 journal entries"
- "What AI learned about decision-making from 1 million journal entries"

### App Store Optimization

- Primary keyword: "AI journal"
- Secondary: "self-reflection app", "emotional intelligence", "journaling AI"
- Icon: Minimalist dark gradient with echo symbol
- Screenshots: Dark, cinematic, showing AI conversation quality

### Creator Partnerships

Target: Self-development creators (YouTube, TikTok, Substack)  
Pitch: "Give your audience 3 months free — you get a 30% affiliate cut"

### Press Strategy

Pitch angle: "The AI therapist that remembers everything"  
Target: TechCrunch, Wired, Vox Mental Health coverage, Product Hunt

**Product Hunt launch strategy:**
- Launch Tuesday 12:01am PST
- Have 50 hunters pre-lined up
- First comment: founder story + demo video
- Goal: #1 Product of the Day

---

## Retention as a Growth Mechanic

Retention IS growth: D30 > 20% means users become advocates.

**Streak mechanics:**
- Daily streak counter on home screen
- Notification at 7pm if no entry that day
- Streak break → compassionate recovery message (not shame)
- Streak milestones: badges + share prompt

**Notification strategy:**
- D1: "Write your first real Echo entry" (if onboarded but no journal)
- D3: "Your Echo has noticed something about you" (curiosity hook)
- D7: "You've been reflecting for a week. Here's what's emerging."
- D14: "Your future self is starting to take shape."
- D30: "30 days in. ECHO//SELF has learned something important about you."

---

## Growth Metrics

| Metric | Week 4 | Month 3 | Month 6 |
|---|---|---|---|
| Referral rate (shares/user/month) | 0.1 | 0.2 | 0.35 |
| Referral conversion (click → sign up) | 8% | 10% | 12% |
| Viral coefficient (K) | 0.08 | 0.2 | 0.42 |
| D30 retention | 10% | 15% | 20% |
| App Store rating | 4.5+ | 4.6+ | 4.7+ |

---

## Weekly Growth Review

Every Monday, review:
1. New sign-ups (source breakdown)
2. Referral shares + conversion rate
3. D1/D7/D30 cohort retention
4. Top viral share channel this week
5. App Store review count + rating
6. Notification opt-in rate (new users this week)
