-- Migration 014: Eidolon autonomy guardrails (Doctrine D6 — Bounded Autonomy)
-- The overnight engine acts alone; these columns bound HOW it may act. Until now
-- only `auto_strategy` existed, so the server fell back to conservative defaults
-- (see backend/supabase/functions/_shared/guardrails.ts). These columns let a
-- player tune the bounds. The Dart UI to edit them is the client half (owed).
--
-- Conservative defaults: absent/unset values must never widen autonomy.
--
-- See: docs/governance/CONSTITUTION.md (D6), docs/governance/ONTOLOGY.md (ONT-2),
--      docs/governance/phases/PHASE_A.md (A-2)

alter table public.eidolons
  add column risk_tolerance  smallint not null default 40
    check (risk_tolerance between 0 and 100),
  add column social_openness smallint not null default 30
    check (social_openness between 0 and 100);

comment on column public.eidolons.risk_tolerance is
  'D6: caps how dangerous a realm the Eidolon may enter unattended (0-100).';
comment on column public.eidolons.social_openness is
  'D6: threshold for engaging other players'' Eidolons unattended (0-100).';
