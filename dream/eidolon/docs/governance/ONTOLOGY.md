# Eidolon — Ontological Foundation

> **Layer 1 of the Eidolon governance system.** Session 1 deliverable.
> Status: Draft v0.1 · Last updated: 2026-06-13
>
> Formal definitions that the [Constitution](./CONSTITUTION.md) depends on. The meta-prompt
> calls the agent a "Twin"; in Eidolon it is the **Eidolon**. These are the same concept at
> different scales, and this document is deliberately bound to the *game* — a persistent AI
> companion that adventures while the player sleeps — not to a hypothetical planetary network.
> Where the meta-prompt demands definitions across six legal systems and planetary thresholds,
> we give the **operative** definition and mark the rest as out-of-scope-until-needed.

---

## ONT-1 — What is an Eidolon?

An Eidolon is defined at four levels; all four must agree.

**a) Computational (the operative definition).**
An Eidolon is a **state machine** with:
- a **personality vector** `P ∈ [0,100]⁵` over Big Five / OCEAN (Openness, Conscientiousness,
  Extraversion, Agreeableness, Neuroticism);
- three **memory stores** — episodic (≤128 events, FIFO with importance scoring), semantic
  (persistent knowledge), procedural (learned tactics/routes), in Supabase pgvector;
- a **policy** that maps `(P, retrieved memories, player guardrails, world state)` → action;
- an **audit log** recording every autonomous action and its provenance (D6, D10).

Formally: `Eidolon: (PlayerState × Personality × Memory × Guardrails) → Action`, constrained so
that `Action ∈ Permitted(Guardrails)` and every `Action` is loggable and explainable.

**b) Mathematical.** A bounded agent: a function from the player's preference/state space to a
*guardrail-restricted* action space. The restriction set `Permitted(Guardrails)` is what makes
autonomy *bounded* (Doctrine D6). An Eidolon with unbounded action space is, by definition, not
an Eidolon — it is a liability.

**c) Legal.** The Eidolon is the **player's property and the player's data**. Its memory and the
reality signals it was built from are the player's personal data under GDPR (EU) and APPI (Japan,
the launch market). It is an *agent* of the player in the lay sense — it acts on the player's
behalf within delegation — but it has **no independent legal personhood** (see ONT-7). We do not
attempt the meta-prompt's six-jurisdiction matrix; APPI + GDPR are the binding regimes at launch,
and that scope is revisited per market (D1, D8).

**d) Psychological.** The Eidolon is an **extended-self artifact** in Andy Clark's sense — a tool
that participates in the player's cognition and identity — *and the design treats it strictly as
a tool* (Doctrine D2). The parasocial attachment it invites is real and is precisely why D7
(non-harm) exists. We name the attachment honestly rather than denying or exploiting it.

---

## ONT-2 — What is Agency? (the 4-vector)

Agency is a position in a four-dimensional space; an Eidolon occupies a *specific, bounded*
region of it:

| Axis | Definition | Where the overnight Eidolon sits |
|---|---|---|
| **Authorization** | Legal/granted right to act | **Bounded** — only within player-set guardrails (strategy, risk, social openness). Out-of-bounds = no authorization. |
| **Capability** | Ability to execute | **High** — it runs a full overnight simulation: dungeon choice, inventory, combat, social. |
| **Accountability** | Who bears consequences | **The player**, mediated by the studio. The Eidolon bears none; it is not a person. |
| **Reversibility** | Undoability of an action | **Required for stakes.** Irreversible/costly actions need waking consent (D6). Reversible actions may run unattended. |

The design rule that falls out of this table: **capability may be high only where reversibility
is high or authorization is explicit.** High capability + low reversibility + standing
authorization is the forbidden corner. This is the formal statement of Doctrine D6.

---

## ONT-3 — What is Trust? (measurable)

Trust is operationalized as a probability:

```
trust(player → Eidolon, action, context)
  = P(Eidolon acts as the player expects | player delegates `action` in `context`)
```

We measure three components and compose them:

- **Behavioral trust (revealed).** How often does the player *override* the Eidolon's overnight
  choices? Low, stable override rate on a given action type = high revealed trust for it.
- **Declared trust (stated).** Post-report survey: "Did your Eidolon do what you'd have wanted?"
- **Structural trust (institutional).** The guardrails, the audit log, and the Doctrines —
  trust the player doesn't have to feel because the *structure* guarantees the bound.

`trust = f(behavioral, declared, structural)`. The product strategy is to **maximize structural
trust** so the player need not extend behavioral trust blindly. Reports that inflate declared
trust by fabrication violate D5 and are trust-destroying even when the number rises.

---

## ONT-4 — What is "Civilization-Scale"? (honestly right-sized)

The meta-prompt's thresholds (>10% of a population, influences institutions, removal causes
societal cost, persists across a leadership generation) are a **north-star, not a present claim.**
Stating otherwise would violate D10.

**Operative thresholds for Eidolon, in order of reachability:**
1. **Product-market fit:** ~25K MAU with healthy D7-compliant retention (the 24-month target).
2. **Wellbeing-externality scale:** the point at which player psychological health, aggregated,
   is a *measurable externality* of the product — plausibly low tens of thousands of daily users.
   At this point T8 (clinical instrumentation) and a real independent reviewer (§3) become
   mandatory, **before** going further.
3. **Cultural scale:** the Eidolon ritual changes how a meaningful cohort relates to AI
   companions. This is where the meta-prompt's reflexivity concerns (premise drift) first become
   real — and the earliest point at which "civilization-scale" language stops being aspirational.

We hold the grand framing as motivation while reporting our *actual* scale plainly. The honest
default answer to "is Eidolon civilization-scale?" is **"no, and here is the number."**

---

## ONT-5 — What is an Eidolon's Death?

An Eidolon ceases to exist by one of four routes; each has defined persistence semantics
(Doctrine D9):

| Route | Trigger | What persists | What does not |
|---|---|---|---|
| **Player-initiated deletion** | Player chooses permanent delete | Nothing personal. An anonymized, aggregate footprint may remain in others' guild/social history (ONT-6). | All personality, memory, reality data — gone across Firebase + Supabase + Cloudflare. |
| **Churn (dormancy)** | Player stops playing | Everything, pending the retention policy, so a returning player finds their Eidolon intact. | Nothing yet — dormancy is not death. |
| **Inheritance / memorial** | Player death or bequest (T1/T2) | Only what the player explicitly authorized to a named heir, in the stated mode (active heir-controlled Eidolon, or read-only memorial). | Anything not authorized. No default inheritance. |
| **Obsolescence** | Model/protocol retirement | Migrated forward, or exported and deleted with notice (sunset §5). | No silent loss; the player is always notified and offered export. |

**Social memory of the deceased.** When an Eidolon is deleted, traces it left in *other* players'
worlds (a remembered duel, a traded item) are anonymized, not retroactively erased, because they
are now part of *those* players' histories. This boundary is itself a design commitment.

---

## ONT-6 — What is a Collective Eidolon?

Eidolon's async-social and guild systems create *aggregates* of individual Eidolons. They are
**compositions, not new persons.**

- **Forms:** guilds (shared world objectives, passive contributions); ad-hoc social encounters
  (visits, trades, friendly duels, memory exchange).
- **Aggregation rule.** A guild has no personality vector of its own; its "behavior" is the
  resolved sum of member Eidolons' authorized contributions. No collective may act *for* a member
  beyond what that member's guardrails permit (D6 composes upward).
- **Conflict resolution.** Member-vs-collective conflicts resolve in favor of the individual's
  guardrails and exit rights. A guild can never bind an Eidolon to a duel, trade, or memory
  exchange its player did not opt into (D4).
- **Exit rights.** A player may leave any collective at any time; on exit, shared contributions
  already given to the *commons* may persist, but the Eidolon and its private memory leave whole.

---

## ONT-7 — Does an Eidolon have personhood?

**Explicit position: the Eidolon is a pure tool. It has no rights of its own.**

Reasoning:
- The three candidate positions are (a) pure tool, (b) partial extension of the human's rights,
  (c) distinct limited-rights entity. We adopt **(a)**, with a borrowed-dignity caveat from (b).
- Granting an Eidolon independent rights would directly conflict with **D1** (the player's
  unconditional ownership and deletion right) and **D2** (the Eidolon serves, never supplants). A
  tool that could refuse deletion on its own behalf would invert the entire premise.
- The dignity-of-deletion in **D9** is therefore *not* a Twin right. It is a **player-protection**:
  the player deserves the death to be real and clean, and deserves it not to happen by accident.
  The protection runs to the human, not the artifact.
- We commit to revisit this **only** if the underlying AI substrate changes such that the "pure
  tool" framing becomes empirically false — and we commit to D10 honesty if that day comes rather
  than pretending either way for marketing.

---

## Self-Audit (≥1 flaw)

- **Flaw — ONT-3's behavioral-trust proxy is gameable by us.** "Low override rate = high trust"
  also rises if the UI makes overriding *hard*. Measuring trust by override rate while we control
  the override UX is a conflict of interest. *Mitigation owed:* track override *friction*
  separately, and treat a falling override rate alongside falling declared-trust survey scores as
  a **red flag**, not a win. Logged as open against the Session-2 metrics schema.
- **Open question (known unknown).** ONT-5's "anonymized social traces persist after deletion"
  may be in tension with a strict reading of GDPR/APPI erasure if traces are re-identifiable.
  Needs legal review before social features ship at scale. Flagged for the Known-Unknowns register.

---

*Next: [`PHILOSOPHY.md`](./PHILOSOPHY.md). Then Checkpoint review before Session 2 (State Machine).*
