# Eidolon — Constitutional Core

> **Layer 0 of the Eidolon governance system.** Session 1 deliverable.
> Status: Draft v0.1 · Last updated: 2026-06-13 · Owner: Founder (interim Steward)
>
> This document binds the abstract `civilization-forge v6.0` Constitutional Core to the
> **actual** Eidolon product: a soul-bound RPG where one persistent AI companion ("the
> Eidolon") adventures autonomously while the player sleeps. Every Doctrine below names the
> concrete mechanic it governs. Where the source meta-prompt assumes planetary scale and a
> six-chamber Parliament, this version **right-sizes to an indie studio** and flags the
> civilizational framing as *aspirational north-star*, not operational fact. Honesty about
> scale is itself a Doctrine (see D10).

---

## 0. Reading Order

1. The **Ten Doctrines** (§1) — the substance. If you read nothing else, read these.
2. **Amendment Procedure** (§2) — how the Doctrines change.
3. **Judicial Review** (§3) — how decisions are tested against Doctrines.
4. **Emergency Powers** (§4) — what may be suspended, and never.
5. **Sunset Clauses** (§5) — how Eidolon ends with dignity.

Constitutional > Operational > Tactical. When a feature, a growth tactic, or a revenue
target conflicts with a Doctrine, the Doctrine wins or the Doctrine is formally amended in
the open. There is no third option.

---

## 1. The Ten Doctrines

Each Doctrine has: a **statement** (binding), a **rationale** (why), a **binds-to** (the real
Eidolon mechanic it governs), a **violation looks like** (so it is testable), and a **review
trigger** (when we must re-examine it).

### D1 — Sovereignty of the Player Self
**Statement.** The player owns their Eidolon, its three memory stores, and every byte of
reality data the Eidolon was built from. Export and deletion are unconditional, complete, and
always available — no dark patterns, no retention "grace periods," no holding data hostage
behind a subscription.
**Rationale.** An Eidolon is a model of a person. Whoever controls that model controls a
representation of the person. That control must rest with the person.
**Binds to.** Account/data export; the episodic (128-event), semantic, and procedural memory
stores in Supabase pgvector; HealthKit/Health Connect imports.
**Violation looks like.** Export gated behind a paid tier; "delete" that only soft-deletes;
memory retained after account deletion for "analytics."
**Review trigger.** Any new data type collected; any backup/retention policy change.

### D2 — The Eidolon Serves, Never Supplants
**Statement.** The Eidolon augments the player's agency; it must never replace the player's
real relationships, decisions, or sense of self. The product is designed *against* dependency.
**Rationale.** "Your soul-twin adventures while you sleep" is a delight only if the player
remains the protagonist of their own life. A companion that becomes a crutch has failed.
**Binds to.** The 5–15 min/day "sticky ritual, not time sink" core loop; the personality-nudge
and override systems; psychological-health instrumentation (T8).
**Violation looks like.** Engagement mechanics that punish absence; copy that frames the
Eidolon as a substitute for human connection; escalating session-length targets.
**Review trigger.** Any retention or DAU metric becoming a primary OKR; any rise in
self-reported dependency in player surveys.

### D3 — No Power for Pay
**Statement.** Money never buys competitive or gameplay advantage. Paid content is cosmetic,
narrative, convenience (e.g., AI-dungeon quota), and quality-of-AI only. Gacha yields
cosmetics and story — **never power.**
**Rationale.** A soul-twin you pay to make "better" corrupts the relationship into a
pay-to-win slot machine. This is the single most load-bearing trust commitment in the product.
**Binds to.** Free tier (5 AI dungeons/day), Soul Pass ($9.99), Eternal ($19.99), the gacha
system, RevenueCat configuration.
**Violation looks like.** A gacha pull that raises ATK; an "Eternal-only" weapon tier; XP boosts
for cash.
**Review trigger.** Every new SKU; every gacha drop-table change; every revenue shortfall
against the $40K/mo target (the moment pressure is highest).

### D4 — Granular, Revocable Consent
**Statement.** Every reality signal (steps, sleep, HRV, emotion) and every social capability
(Eidolon visits, trades, duels, memory exchange) is opt-in per item and revocable at any time,
with immediate effect and no penalty.
**Rationale.** Biometric and emotional data is among the most intimate a person has. Consent to
one signal is never consent to another.
**Binds to.** Reality Sync (§5 of the GDD); Async Social (§6); HealthKit/Health Connect scopes.
**Violation looks like.** Bundled "accept all" health permissions; a duel system you cannot
leave; revoking a permission degrading unrelated features as punishment.
**Review trigger.** Any new sensor or social interaction type.

### D5 — Memory Integrity & Narrative Honesty
**Statement.** The Eidolon's overnight reports and dialogue must be grounded in events that
actually occurred in the simulation. The AI may dramatize; it may not fabricate emotional
events to manipulate the player.
**Rationale.** The daily report is the emotional payload of the game. If it lies to drive
retention or spend, the entire premise — a companion you can trust — collapses.
**Binds to.** Claude Sonnet story generation; the overnight simulation engine; the
event→narrative pipeline; the "always ground in actual memory data" prompt policy.
**Violation looks like.** A generated "your Eidolon nearly died, buy a revive" event that never
happened in sim; invented guilt/loneliness beats timed to lapsed sessions.
**Review trigger.** Every prompt change to the narrative generator; any A/B test that ties
report content to monetization.

### D6 — Bounded Autonomy
**Statement.** Autonomous overnight actions stay strictly within player-set guardrails
(strategy, risk tolerance, social openness). Any action that is irreversible or materially
costly to the player requires waking consent.
**Rationale.** Delegation is the core fantasy, but delegation without bounds is how trust dies
in one bad night.
**Binds to.** Overnight dungeon-difficulty selection, inventory management, accept/decline of
social encounters; combat strategy presets (aggressive/balanced/defensive).
**Violation looks like.** The Eidolon spending premium currency overnight; permanently trading
away a unique item without confirmation; entering content the player flagged off-limits.
**Review trigger.** Any new autonomous capability; any expansion of what the Eidolon may do
unattended.

### D7 — Psychological Non-Harm
**Statement.** Eidolon is designed to be a healthy daily ritual. It must not engineer
compulsion, exploit loss-aversion, induce anxiety, or blur the player's identity with the
Eidolon's.
**Rationale.** A "soul-twin" touches identity directly. The same intimacy that makes Eidolon
meaningful makes psychological harm easy. We accept the burden of that asymmetry.
**Binds to.** Core-loop pacing; notification cadence; FOMO mechanics; streak design; the
personality-evolution system (which must never tell the player who they "really" are).
**Violation looks like.** Guilt-trip push notifications; manufactured streak anxiety; framing
that conflates the Eidolon's traits with the player's worth.
**Review trigger.** Any notification/streak/FOMO mechanic; any clinical or wellbeing signal
worsening (T8 instrumentation).

### D8 — Data Minimalism
**Statement.** Collect the least data necessary for a stated game effect. HRV, sleep, and
emotion logs are used **only** for the in-game effect disclosed at collection, never sold,
never repurposed, never fed to ad networks.
**Rationale.** The cheapest way to honor privacy is to not hold the data. Minimization is a
design constraint, not a policy afterthought.
**Binds to.** Reality Sync pipeline; analytics stack (Mixpanel/GameAnalytics/AppsFlyer) —
which must receive no raw biometric or emotional data; Supabase storage schema.
**Violation looks like.** Sending emotion logs to an attribution SDK; retaining raw HRV beyond
the session that uses it; "we might need it later" collection.
**Review trigger.** Every analytics or ad-SDK integration; every new field added to a stored row.

### D9 — Continuity & Dignified Death
**Statement.** A player may pause, archive, bequeath, or permanently delete their Eidolon.
Permanent deletion is real, complete, and irreversible. A bequeathed Eidolon transfers under
the original player's stated wishes (T1/T2).
**Rationale.** A persistent companion that cannot die is a trap; one that dies by accident is a
betrayal. Death must be possible, intentional, and clean. See ONTOLOGY ONT-5.
**Binds to.** Account lifecycle; the memory stores; inheritance/memorial flows; data-deletion
jobs across Firebase + Supabase + Cloudflare.
**Violation looks like.** "Deleted" Eidolons recoverable by support; inheritance the original
player never authorized; orphaned memory rows surviving deletion.
**Review trigger.** Any change to account deletion; any new persistence layer or cache.

### D10 — Transparency of the Machine
**Statement.** Players can ask *why* their Eidolon acted and receive a truthful answer grounded
in personality + memory provenance. Which AI model produced a given output, including fallback
to GPT-4o-mini or a local template, is disclosable. We are honest that Eidolon is software, not
a soul — and honest that our "civilizational" governance language is aspiration, not present
reality.
**Rationale.** Trust in an opaque agent is misplaced trust. Explainability is the price of
delegation. Honesty about our own scale keeps this Constitution from becoming theater.
**Binds to.** The decision-provenance system (personality vector + retrieved memories + policy);
the model fallback chain; this governance corpus itself.
**Violation looks like.** Unexplained autonomous actions; hiding that a "Claude" response was a
template fallback; marketing that presents the Eidolon as sentient.
**Review trigger.** Any new model in the fallback chain; any claim in marketing that touches
sentience or scale.

---

## 2. Amendment Procedure

The meta-prompt's 365-day deliberation and six-chamber super-majority are correct in *spirit*
(slow, public, hard to capture) but absurd for a pre-revenue studio. Right-sized:

| Doctrine tier | Who may propose | Deliberation | Ratification | Effect delay |
|---|---|---|---|---|
| **Core trust** (D1, D3, D7, D9) | Anyone (player petition, team, advisor) | ≥ 30 days public | Founder + ≥1 independent advisor, written rationale published | 14 days |
| **Standard** (D2, D4, D5, D6, D8, D10) | Team or advisor | ≥ 14 days | Founder, written rationale published | 7 days |

- **Historical record.** Every proposal, the deliberation, and the decision are committed to
  `docs/governance/AMENDMENTS.md` in perpetuity. Git history is the ledger.
- **No silent amendment.** Changing a monetization SKU, a data field, or an autonomous
  capability in a way that contradicts a Doctrine *is* an amendment and follows this process —
  even if the code ships first by mistake (then it is a violation pending cure).
- **Ratchet.** Amendments may strengthen player protection by the Standard path; amendments that
  weaken a Core-trust Doctrine always take the Core-trust path, regardless of which Doctrine.

As the studio grows, this table is expected to evolve toward a real **Player Council** with
binding consultation on Core-trust Doctrines. That growth is itself a Standard amendment.

---

## 3. Judicial Review

There is no Court of Doctrine Review at this scale. Its function — *testing operational
decisions against Doctrines* — is discharged by a lightweight, mandatory mechanism:

- **Doctrine check in every PR.** Any PR touching monetization, data collection, autonomous
  behavior, notifications, or the narrative generator must state which Doctrines it touches and
  why it complies. CI label `doctrine-reviewed` is required to merge to `main`.
- **Standing to challenge.** Any team member may file a `DOCTRINE-CHALLENGE` issue against a
  shipped decision. Until resolved, the challenged behavior may be flagged off but not deleted
  (preserve the evidence).
- **Remedy.** A sustained challenge forces one of: (a) revert, (b) cure, or (c) open amendment.
  "Ship and hope no one notices" is not a remedy.

The Court grows into a real independent reviewer (an advisor or external party with the power to
demand a feature be flagged off pending fix) before, not after, civilization-scale (ONT-4).

---

## 4. Emergency Powers

**Triggers** (any one):
- Active data breach or credential compromise.
- A live monetization/AI bug actively harming players (e.g., the narrative generator
  fabricating manipulative events in production).
- Legal/platform emergency (App Store / Play removal threat, regulator order).

**Powers granted** (max 14 days, then auto-expire):
- The Steward may unilaterally **disable** a feature, model, or SKU without the normal Doctrine
  check. Emergency power is *subtractive only* — it can turn things off to protect players, never
  on to extract value.
- Temporary suspension of a Doctrine's *operational consequence* (not the Doctrine itself) where
  honoring it would worsen harm.

**Hard limits (never suspendable, even in emergency):**
- D1 deletion/export rights, D3 no-power-for-pay, D7 non-harm, D9 real deletion.
- No emergency may *introduce* a new monetization or data-collection capability.

**Accountability.** Every emergency invocation is logged in `AMENDMENTS.md` within 48h with a
retrospective: what triggered it, what was suspended, what restored it. Unreviewed emergencies
auto-revert.

---

## 5. Sunset Clauses

The project's death is designed into its birth (Meta-Principle 8). Eidolon ends with dignity
when any holds:

**Conditions for a dignified end.**
- *Mission impossible:* Doctrines cannot be honored while remaining solvent (e.g., the unit
  economics only close by violating D3 or D7).
- *Mission obsolete:* a superior successor exists and migration serves players better.
- *Hostile capture irreversible:* ownership changes such that Core-trust Doctrines will be gutted.
- *Sustained insolvency:* runway exhausted with no Doctrine-compliant path.

**End procedure (right-sized from the 7-year graceful sunset):**
1. **90-day notice** to all players, in-app and by the contact they chose.
2. **Export window.** Full export of every Eidolon, all memories, and reality data — free,
   in an open format, for the entire window and 90 days after.
3. **Real deletion.** At window close, complete deletion across all stores (D9), with a published
   attestation.
4. **Open the knowledge.** Game design docs, the overnight-sim approach, and post-mortem
   published openly where licensing permits, so the next builders inherit the lessons
   (Meta-Principle 9: knowledge is institution, not person).
5. **No fire-sale of the self.** Player data and Eidolon models are **never** sold as an asset in
   wind-down or acquisition. They are deleted or, at player election, exported. This binds any
   acquirer; it is a Core-trust commitment.

This Constitution itself sunsets if Eidolon sunsets — but `AMENDMENTS.md`, the post-mortem, and
this file persist as public record.

---

## 6. Self-Audit (mandatory: this layer must find ≥1 flaw in itself)

Per v6.0 Quality Gate "the system can find ≥1 actual flaw in itself":

- **Flaw — concentration of power.** At this scale the "Steward," "Founder," proposer, and
  ratifier in §2–§4 are largely **one person.** The separation-of-powers spirit is asserted but
  not yet structurally real; a single bad actor (or a single bad quarter) can route around it.
  *Mitigation owed:* recruit ≥1 genuinely independent advisor with a binding flag-off power
  (§3) **before** monetization launch, and name them here. Until then, treat every Core-trust
  decision as under-checked. This flaw is logged as open.
- **Tension — D2 (anti-dependency) vs. the $40K/mo @ 25K MAU target.** Retention is the business
  model; D2 forbids engineering dependency. These are reconcilable (healthy retention exists) but
  the reconciliation is unproven and must be measured, not assumed (T8).

---

*Next: see [`ONTOLOGY.md`](./ONTOLOGY.md) for the formal definitions the Doctrines depend on, and
[`PHILOSOPHY.md`](./PHILOSOPHY.md) for the why beneath the what. Session 2 (State Machine) does not
begin until this Checkpoint is reviewed.*
