# Training Block Lifecycle

Date: 2026-05-20

This document is for future Codex/ChatGPT audits of CornerIQ's weekly boxing programming lifecycle. It describes how current week plans are generated, how summaries/decisions/previews persist, how accepted previews can be materialized, how coach approval is scaffolded, and where the current implementation still stops.

## Scope Rules

- Business logic lives in deterministic engine modules and service layers, not screens.
- The system is boxing-only. It does not generate sparring, contact drills, broad fitness plans, MMA language, or unsafe weight-cut instructions.
- Manual input is first-class. Wearables can raise confidence only when fresh and consistent.
- Missing data stays unknown; it is not treated as safe or successful.
- Cycle support is optional, private, and symptom-aware.
- Safety beats performance and weight-class pressure.

## Current Week Generation

1. `resolvePerformanceState` builds a `TrainingState` from the athlete journey.
2. `resolveWeeklyTrainingPlan` creates generated support sessions around protected boxing anchors.
3. `trainingBlockEngine` resolves or preserves the active `TrainingBlock`.
4. `microcycleEngine` builds the current `TrainingMicrocycle` and seven `TrainingDayPlan` rows.
5. `planAdjustmentEngine` applies active/requested adjustments through engine-owned commands.
6. Screens read `PlanViewModel` and `TrainViewModel`; screens do not query repositories or own programming logic.

Current week remains stable during next-week preview persistence and accept/materialize actions. The roll-forward service does not mutate `state.training.dayPlans` prematurely.

## Persistence Tables

Migration `004_training_block_persistence.sql` persists:
- `training_blocks`
- `training_microcycles`
- `training_day_plans`
- `training_plan_adjustments`

Migration `005_training_block_weekly_progression.sql` persists:
- `training_week_summaries`
- `training_progression_decisions`
- `training_block_timeline_events`

Migration `006_coach_team_relationships.sql` scaffolds:
- `athlete_coach_relationships`

Migration `007_training_next_week_previews.sql` persists:
- `training_next_week_previews`
- timeline event types `next_week_preview_accepted` and `next_week_materialized`

Training projection/progression/preview rows are user-owned where applicable, RLS-protected, and treated as engine audit/progression records. They are not medical directives and should not be mutated directly by screens.

## Week Summary And Decision Persistence

`summarizeTrainingWeek` converts structured training evidence into `TrainingWeekSummary`.

It counts completed/skipped sessions, completed/partial/prescribed-only/skipped exercise rows, pain flags, RPE averages, hard days, protected anchors, generated support, under-fueling flags, high cycle symptom flags, and safety flags.

`rollForwardTrainingBlock` then produces a conservative progression decision:
- Fight week and tournament context override normal progression with taper/conserve behavior.
- Red readiness and hard safety stops push toward recovery or deload.
- Pain/professional review flags push toward `coach_review` or hold.
- Under-fueling risk holds or reduces pressure; it does not progress.
- Good completion, green readiness, and no pain can progress.
- Skipped/missed sessions repeat.
- High cycle symptoms can trim or hold optional volume without automatic deload.
- Missing history does not fake progress.

`resolveAndPersistPerformanceState` persists block, microcycle, day plans, week summary, progression decision, timeline events, and then the next-week preview.

## Next-Week Preview Persistence

`materializeNextWeekTrainingPlan` in `src/engine/training/nextWeekMaterializationEngine.ts` produces a `NextWeekTrainingMaterialization` from the latest persisted summary/decision.

The persisted row stores:
- user and training block ids;
- next week index/start/end;
- materialized phase/decision;
- volume strategy;
- generated support bias;
- hard-day cap;
- engine version;
- input hash and preview output hash;
- lifecycle status;
- full validated preview payload.

Repository rules:
- `upsertTrainingNextWeekPreview` is idempotent by user/block/week/inputHash/outputHash.
- Existing accepted/materialized lifecycle state is not downgraded by an identical resolve.
- `supersedePreviewsForBlock` supersedes older preview/accepted rows when a new preview wins.
- Repository methods validate preview payloads with Zod and do not decide programming logic.

Primary files:
- `supabase/migrations/007_training_next_week_previews.sql`
- `src/services/supabase/trainingNextWeekPreviewRepository.ts`
- `src/services/engine/resolveAndPersistPerformanceState.ts`

## Accept And Materialize Lifecycle

`src/services/training/materializeNextWeekTrainingPlan.ts` is the safe roll-forward service.

Modes:
- `preview_only`: loads the preview for display; no writes.
- `accept_preview`: marks preview accepted and appends `next_week_preview_accepted`; no future sessions/day plans are created.
- `materialize_if_week_boundary`: materializes only when `asOfDate >= preview.weekStartDate`, unless a test override is explicitly supplied.

Safety gates:
- Wrong-user or wrong-block previews are rejected.
- `superseded` and `rejected` previews are rejected.
- `hold_for_review` requires explicit review approval.
- Hard-stop safety blocks materialization.
- Tournament/fight-week strategies remain conservative because the preview engine created them conservatively.
- The service does not infer numeric load progression.
- No generated sparring/contact is created.

Materialization output:
- `nextWeekPreviewToMicrocycle` converts preview rows into a persisted next-week microcycle and day plans.
- Protected anchors remain attached.
- Hard-day cap is enforced.
- Generated support remains explanatory summary text.
- No future generated session objects are created yet.

Primary files:
- `src/engine/training/nextWeekPreviewToMicrocycle.ts`
- `src/services/training/materializeNextWeekTrainingPlan.ts`
- `src/hooks/useNextWeekPreviewActions.ts`
- `src/app/screens/PlanScreen.tsx`

## Coach Approval Scaffold

Coach/team relationship scaffold:
- `athlete_coach_relationships` has `pending`, `active`, and `revoked`.
- Athlete clients can request pending rows.
- Participants can read their relationship rows.
- Participants can revoke rows.
- Clients cannot self-activate active coach authority.

Trusted approval skeleton:
- `supabase/functions/approve-coach-relationship/index.ts` reads `SUPABASE_SERVICE_ROLE_KEY` only from the Supabase function environment.
- It validates request shape and requires an Authorization header.
- It currently sets `authorizationVerified = false` and returns `403`.
- Production must verify athlete consent/admin authority and permission policy before any active relationship update is allowed.

Coach UI remains hidden. `PlanAdjustmentControls` exposes only athlete-safe actions.

## UI Surfaces

Plan:
- active block summary;
- persisted preview status;
- accept-preview action;
- materialize action only when the view model says the boundary is reached;
- hold-for-review copy;
- block history detail grouped into current block, week summaries, progression decisions, next-week preview, adjustments, safety events, and timeline.

Train:
- detailed generated sessions;
- progression/analytics;
- exercise history grouped into recent results, pain flags, RPE, strength notes, prescribed-only counts, and explicit no-fake-load-progression copy.

## Current Verification

Local:
- `cmd /c npm run typecheck`: passed during implementation.
- `cmd /c npm test`: passed, `222` tests passed and `1` skipped.
- Extended live smoke: passed, `1` test passed.

Remote:
- Supabase migration list shows `001` through `007` applied.
- Supabase dry run reports `Remote database is up to date.`
- Live smoke passes with ignored `.env` loaded and `CORNERIQ_LIVE_DB_SMOKE=1`.

Smoke coverage includes weekly summaries, progression decisions, timeline events, persisted next-week previews, accept-preview action, pre-boundary non-materialization, actor-scoped adjustment payloads, safe coach relationship RLS read, and scoped cleanup of smoke-created rows.

## Still Scaffolded

- Future generated session materialization from preview summaries is deferred.
- Numeric load progression is intentionally deferred until structured load fields exist.
- Active coach relationship approval needs production authorization in the Edge Function.
- Team memberships are deferred.
- Block history UI is a panel, not routed drill-down navigation.
- Exercise history UI is a panel, not full exercise drill-down navigation.
- Calendar drag/drop polish is intentionally deferred.

## Auditor Inspect First

1. `supabase/migrations/007_training_next_week_previews.sql`
2. `src/services/supabase/trainingNextWeekPreviewRepository.ts`
3. `src/services/engine/resolveAndPersistPerformanceState.ts`
4. `src/services/training/materializeNextWeekTrainingPlan.ts`
5. `src/engine/training/nextWeekPreviewToMicrocycle.ts`
6. `src/hooks/useNextWeekPreviewActions.ts`
7. `src/app/screens/PlanScreen.tsx`
8. `supabase/functions/approve-coach-relationship/index.ts`
9. `src/tests/live/liveDbSmoke.test.ts`
