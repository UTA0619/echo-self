# Eidolon — Philosophy

> **Layer 1 companion to the [Ontology](./ONTOLOGY.md) and [Constitution](./CONSTITUTION.md).**
> Session 1 deliverable. Status: Draft v0.1 · 2026-06-13
>
> The *why* beneath the *what*. The Constitution says what we will and won't do; the Ontology
> says what the words mean; this says what we believe, and why an indie RPG borrowed
> civilizational language without losing its head.

---

## Why "soul-twin" is a serious idea, not a tagline

Eidolon sells a daily ritual: wake, read what your companion did while you slept, guide it,
sleep, repeat. That loop is small — 5 to 15 minutes — but the object at its center is not small.
A persistent AI that holds your personality, your memories, and your real-world signals (steps,
sleep, heart-rate variability, mood) is a **representation of you that acts without you in the
room.** Treat that casually and you are building a slot machine wearing a friend's face. Treat it
seriously and you are building one of the first mass-market answers to a question the next decade
will ask everyone: *what may an AI do on my behalf while I'm not watching?*

We chose to take it seriously. That is the entire reason this governance corpus exists for a game
that, on paper, only needs a GDD.

## The honest altitude

The source meta-prompt frames this as a "civilizational operating system" with a Parliament, a
Court, and 100-year sunset clauses. We kept the **rigor** and discarded the **costume.** Eidolon
is a studio chasing $40K/month at 25K MAU in 24 months, not a planetary institution. Pretending
otherwise would be the first violation of our own Doctrine D10 (transparency). So:

- We keep the *discipline* of writing down our commitments and testing decisions against them.
- We keep the *humility* of stating our real scale (ONT-4) instead of LARPing a republic.
- We let the grand framing be **motivation**, not **claim.** The day Eidolon actually changes how
  a culture relates to AI companions, the heavier machinery earns its place — and not before.

This is Meta-Principle 5 in practice: preserve optionality, commit only when physically required.
A six-chamber Parliament is a premature commitment. A no-power-for-pay Doctrine is not.

## The three beliefs everything else hangs on

1. **The player is the protagonist; the Eidolon is the instrument.** (→ D2, D7, ONT-7.)
   The fantasy fails the moment the companion becomes more important than the life it was meant
   to enrich. Every retention mechanic is judged against this. Dependency is not success; it is
   the failure mode that *looks* like success.

2. **Trust is structural before it is emotional.** (→ ONT-3, D6, D10.)
   We want players to trust their Eidolon overnight not because we charmed them but because the
   guardrails, the audit log, and the Doctrines make betrayal structurally hard. Feelings are
   downstream of architecture. Build the architecture so the feeling is *earned*.

3. **A thing that can hold a self must be able to die.** (→ D9, ONT-5.)
   Real deletion, dignified inheritance, no fire-sale of the self in a wind-down. A companion you
   cannot escape is not a companion; it is a captor. Designing the death well is how we prove the
   life was offered in good faith.

## The ten meta-principles, grounded

The meta-prompt's principles, restated for a game studio that has to ship:

1. **The doc is not the product.** This corpus is worthless if the overnight simulation still
   fabricates manipulative events. The system these words govern is the product. Optimize it.
2. **The system audits itself.** Each governance file ends with a self-found flaw. A governance
   system that cannot indict itself is propaganda. (See §self-audits.)
3. **Everything must be translatable.** i18n from day one is already a coding convention; the same
   applies to the *reasons* — a new hire, a player, a regulator, and a 2050 reader should all be
   able to understand why D3 exists.
4. **Constitutional > operational > tactical.** A growth tactic never overrides a Doctrine
   silently. It either complies or triggers an open amendment.
5. **Preserve optionality until commitment is required.** No Parliament before players. No power
   for pay, ever — because *that* commitment is required from day one to make the rest coherent.
6. **The environment is a player.** Platforms (Apple/Google review, gacha regulation in Japan),
   regulators (APPI/GDPR), and competitors will respond to our moves. Plans that ignore them are
   fiction. (Deferred to the Strategic Game Engine, but flagged now.)
7. **Success changes the game.** If Eidolon works, it changes how its players relate to AI
   companions — which can invalidate our own premises (reflexivity). We commit to noticing.
8. **The project's death is designed into its birth.** Sunset §5 exists on day one. "How does this
   end well?" is answered before we scale, not during the crash.
9. **Knowledge is institution, not person.** Decisions live in `AMENDMENTS.md` and ADRs, not in
   the founder's head. If a key person leaves, the *why* survives.
10. **We are building an instrument for a self — handle accordingly.** Not a civilization (yet),
    but a representation of a person that acts in their absence. That is enough weight to warrant
    every Doctrine above. The grandeur is borrowed; the responsibility is real.

## What would make us wrong

Stated plainly so it can be checked (and revisited in Session 15, Meta-Review):

- If healthy retention and D2 (anti-dependency) turn out to be **irreconcilable** — if the only
  way to hit revenue is to engineer compulsion — then either the business is wrong or a Doctrine
  is, and we say so out loud rather than quietly drifting.
- If players consistently *want* their Eidolon to do irreversible things unattended (D6 feels like
  friction, not safety), the guardrail model is mis-specified and ONT-2's "forbidden corner" needs
  rethinking — in the open.
- If "pure tool" (ONT-7) becomes empirically false as the AI substrate advances, this entire
  philosophy reopens. We would rather reopen it honestly than defend a comfortable line.

---

*This completes Session 1. Do not begin Session 2 (State Machine Specification) until the
Checkpoint below is reviewed and the open flaws are either accepted or assigned.*

### Checkpoint — Session 1

Coherence of the philosophical foundation, per v6.0 Session-1 checkpoint:
- [x] Ten Doctrines defined, each bound to a real Eidolon mechanic and testable.
- [x] Amendment / review / emergency / sunset machinery right-sized to studio scale, with a
      growth path to heavier governance named.
- [x] Ontology resolves the load-bearing ambiguities (what is an Eidolon, agency, trust, scale,
      death, collectives, personhood).
- [x] System found ≥1 real flaw in itself in each file (power concentration; trust-proxy gaming;
      erasure-vs-social-trace tension).
- [ ] **Open, owed before monetization launch:** recruit ≥1 genuinely independent reviewer with
      binding flag-off power (Constitution §3/§6). Until then, treat Core-trust decisions as
      under-checked.
- [ ] **Open, owed before social features at scale:** legal review of ONT-5 anonymized-trace
      persistence vs. GDPR/APPI erasure.
