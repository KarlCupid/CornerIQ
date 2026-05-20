# Training Block Lifecycle

Date: 2026-05-19

This document is for future Codex/ChatGPT audits of CornerIQ's weekly boxing programming lifecycle. It describes how blocks are created, how week summaries and roll-forward decisions persist, and where the current scaffolds still stop.

## Scope Rules

- Business logic lives in deterministic engine modules and service layers, not screens.
- The system is boxing-only. It does not generate sparring, contact drills, broad fitness plans, MMA language, or unsafe weight-cut instructions.
- Manual input is first-class. Wearables can raise confidence only when fresh and consistent.
- Missing data stays unknown; it is not treated as safe or successful.
- Cycle support is optional, private, and symptom-aware.

## Creation Flow

1. `resolvePerformanceState` builds a `TrainingState` from the athlete journey.
2. `resolveWeeklyTrainingPlan` and `trainingBlockEngine` create or preserve the active `TrainingBlock`, `TrainingMicrocycle`, and seven `TrainingDayPlan` records.
3. `resolveAndPersistPerformanceState` persists projections through `trainingBlockRepository`.
4. Active block identity is preserved when the current date is still inside the block. The block is updated rather than superseded for normal week-to-week evolution.
5. `weekIndex` is derived from calendar position and persisted summary/decision history, so history can advance it beyond the old scaffolded value of `1`.

Primary files:
- `src/engine/training/trainingBlockEngine.ts`
- `src/engine/training/weeklyPlanEngine.ts`
- `src/services/supabase/trainingBlockRepository.ts`
- `src/services/engine/resolveAndPersistPerformanceState.ts`

## Persistence Tables

Migration `005_training_block_weekly_progression.sql` adds three audit/progression tables:

- `training_week_summaries`: one idempotent user/block/week summary of what happened.
- `training_progression_decisions`: engine decisions for the next week, deduplicated by user/block/week/input/output hash.
- `training_block_timeline_events`: append-only timeline events for week completion, progression decisions, adjustments, deload requests, review flags, and block lifecycle markers.

All three tables:
- are scoped by `user_id`;
- have owner RLS policies using `auth.uid() = user_id`;
- are intended as engine audit/progression records, not medical or coaching directives;
- must not be mutated directly by screens.

Primary files:
- `supabase/migrations/005_training_block_weekly_progression.sql`
- `src/services/supabase/trainingProgressionRepository.ts`
- `src/services/supabase/database.types.ts`

## Week Summaries

`summarizeTrainingWeek` converts structured training evidence into `TrainingWeekSummary`.

It counts:
- completed, skipped, and prescribed-only session states;
- partial and completed exercise results;
- pain notes and exercise pain flags;
- structured session and exercise RPE averages;
- hard days, protected anchors, generated support sessions;
- under-fueling and high cycle symptom flags.

Important constraints:
- `prescribed_only` rows are not counted as completed actuals.
- Free-text `loadText` is not parsed for numeric progression.
- Missing data remains unknown and copy must stay non-shaming.

Primary files:
- `src/engine/training/trainingWeekSummaryEngine.ts`
- `src/tests/engine/trainingBlockProgression.test.ts`

## Progression Decisions

`decideNextWeekProgression` and `rollForwardTrainingBlock` produce `TrainingBlockRollForwardResult`.

Current decision rules:
- Fight-week and tournament context override normal progression with taper/conserve behavior.
- Red readiness and hard safety stops push toward recovery or deload.
- Pain/professional review flags push toward `coach_review` or `hold`.
- Under-fueling risk holds or deloads; it does not progress.
- Good completion, green readiness, and no pain can progress.
- Skipped/missed sessions repeat.
- High cycle symptoms can trim or hold optional volume without automatic deload.
- Missing history does not fake progress.

The current engine persists the decision and timeline, but it does not yet deeply materialize a future week with numeric load or dose changes.

Primary files:
- `src/engine/training/trainingRollForwardEngine.ts`
- `src/engine/training/trainingBlockHistoryTypes.ts`
- `src/services/engine/resolveAndPersistPerformanceState.ts`

## Timeline Events

Timeline rows are audit records. They should explain how the block evolved without turning UI copy into programming logic.

Current event types include:
- `block_started`
- `week_completed`
- `progression_decided`
- `adjustment_applied`
- `deload_requested`
- `block_superseded`
- `block_completed`
- `coach_review_flagged`

Plan renders the current week summary, latest decision, and recent timeline events. Profile renders a compact training audit card.

Primary files:
- `src/engine/presentation/planViewModel.ts`
- `src/engine/presentation/profileViewModel.ts`
- `src/app/screens/PlanScreen.tsx`
- `src/app/screens/ProfileScreen.tsx`

## Adjustment Actors

Plan adjustments now use a simple actor model:

- `athlete`: default for app UI.
- `coach`: accepted only when explicitly passed by trusted service/test code.
- `engine`: reserved for internal engine-owned restoration/block decisions.

Current permissions:
- Athlete can `protect_day`, `mark_unavailable`, `request_deload`, `restore_engine_plan`, and `note`.
- Coach can `coach_note`, `move_generated_session`, `protect_day`, `request_deload`, `mark_unavailable`, and `restore_engine_plan`.
- Engine can `restore_engine_plan`.

Rejected permission decisions are persisted with explanation. Coach actions are not exposed in UI yet because real coach/team relationships and RLS boundaries do not exist.

Primary files:
- `src/engine/training/planAdjustmentTypes.ts`
- `src/engine/training/planAdjustmentEngine.ts`
- `src/services/training/applyTrainingPlanAdjustment.ts`
- `src/hooks/useTrainingPlanAdjustments.ts`

## Current Verification

Local:
- `cmd /c npm run typecheck`: passed.
- `cmd /c npm test`: passed, `185` tests passed and `1` skipped.
- `cmd /c npm run quality`: passed, `185` tests passed and `1` skipped.
- `cmd /c npm run lint`: passed.

Remote:
- Supabase migration list shows `001` through `005` applied.
- Supabase dry run reports `Remote database is up to date.`
- Live smoke passes with ignored `.env` loaded and `CORNERIQ_LIVE_DB_SMOKE=1`.

Smoke coverage now includes weekly summaries, progression decisions, timeline events, actor-scoped adjustment payloads, and scoped cleanup of smoke-created rows.

## Still Scaffolded

- Progression decisions do not yet materialize a full next-week dose model.
- Numeric load progression is intentionally deferred until structured load fields exist.
- Block history UI is compact and audit-friendly, not a full timeline detail screen.
- Coach/team account permissions and RLS relationships are not implemented.
- Calendar drag/drop polish is intentionally deferred.
- Exercise-history detail remains missing.

## Auditor Inspect First

1. `supabase/migrations/005_training_block_weekly_progression.sql`
2. `src/engine/training/trainingWeekSummaryEngine.ts`
3. `src/engine/training/trainingRollForwardEngine.ts`
4. `src/services/supabase/trainingProgressionRepository.ts`
5. `src/services/engine/resolveAndPersistPerformanceState.ts`
6. `src/engine/training/planAdjustmentTypes.ts`
7. `src/engine/training/planAdjustmentEngine.ts`
8. `src/services/training/applyTrainingPlanAdjustment.ts`
9. `src/engine/presentation/planViewModel.ts`
10. `src/engine/presentation/profileViewModel.ts`
11. `src/tests/engine/trainingBlockProgression.test.ts`
12. `src/tests/live/liveDbSmoke.test.ts`
