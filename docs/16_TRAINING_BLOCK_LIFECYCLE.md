# Training Block Lifecycle

Date: 2026-05-20

This document is for future Codex/ChatGPT audits of CornerIQ's weekly boxing programming lifecycle. It describes how current week plans are generated, how summaries/decisions persist, how next-week preview materialization works, how adjustments and actors are handled, and where the current scaffolds still stop.

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

Current week is stable during next-week preview. Materialization does not mutate `state.training.dayPlans`.

Primary files:
- `src/engine/training/weeklyPlanEngine.ts`
- `src/engine/training/trainingBlockEngine.ts`
- `src/engine/training/microcycleEngine.ts`
- `src/engine/training/planAdjustmentEngine.ts`

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

Training projection/progression rows are user-owned where applicable, RLS-protected, and treated as engine audit/progression records. They are not medical directives and should not be mutated directly by screens.

## Week Summary Persistence

`summarizeTrainingWeek` converts structured training evidence into `TrainingWeekSummary`.

It counts:
- completed and skipped sessions;
- completed, partial, prescribed-only, and skipped exercise rows;
- pain notes and exercise pain flags;
- structured session and exercise RPE averages;
- hard days, protected anchors, generated support sessions;
- under-fueling and high cycle symptom flags.

Important constraints:
- `prescribed_only` rows are audited but not counted as completed actuals.
- Free-text `loadText` is not parsed for numeric progression.
- Missing data remains unknown and copy must stay non-shaming.

`resolveAndPersistPerformanceState` upserts the summary by user/block/week after block, microcycle, and day-plan persistence.

Primary files:
- `src/engine/training/trainingWeekSummaryEngine.ts`
- `src/services/supabase/trainingProgressionRepository.ts`
- `src/services/engine/resolveAndPersistPerformanceState.ts`

## Progression Decision Persistence

`decideNextWeekProgression` and `rollForwardTrainingBlock` produce persisted roll-forward decisions.

Decision rules:
- Fight week and tournament context override normal progression with taper/conserve behavior.
- Red readiness and hard safety stops push toward recovery or deload.
- Pain/professional review flags push toward `coach_review` or hold.
- Under-fueling risk holds or reduces pressure; it does not progress.
- Good completion, green readiness, and no pain can progress.
- Skipped/missed sessions repeat.
- High cycle symptoms can trim or hold optional volume without automatic deload.
- Missing history does not fake progress.

Decisions are inserted idempotently by user/block/week/input hash/output hash/decision. Timeline events record week completion, progression decisions, coach-review flags, adjustments, deload requests, and block lifecycle markers.

Primary files:
- `src/engine/training/trainingRollForwardEngine.ts`
- `src/engine/training/trainingBlockHistoryTypes.ts`
- `src/services/supabase/trainingProgressionRepository.ts`

## Next-Week Materialization Preview

`materializeNextWeekTrainingPlan` turns the latest persisted summary and progression decision into a read-only `NextWeekTrainingMaterialization`.

It outputs:
- `nextWeekIndex`, start date, and end date;
- materialized phase and decision;
- volume strategy: `progress_small`, `repeat_same`, `reduce_volume`, `deload`, `taper`, `tournament_conserve`, or `hold_for_review`;
- target hard-day cap;
- generated support bias;
- session family biases;
- blocked progression reasons;
- safety notes;
- day-plan preview rows.

Safety behavior:
- Progress requires no pain/review flags, no under-fueling, no hard stops, and green readiness.
- Under-fueling blocks progress.
- Fight week tapers and tournament week conserves.
- Heavy/high cycle symptoms trim optional volume without pretending the athlete failed the week.
- Coach review holds progression.
- Protected anchors remain protected.
- Free-text load logs are notes only; numeric load progression is not inferred.
- Preview rows are not fake persisted future sessions.

Persistence status:
- Current week block/microcycle/day plans persist.
- Week summaries, progression decisions, and timeline events persist.
- Next-week materialization is preview-only in this pass.
- A future `training_next_week_previews` projection table is recommended if preview audit history is needed.

Primary files:
- `src/engine/training/nextWeekMaterializationEngine.ts`
- `src/engine/training/weeklyPlanEngine.ts`
- `src/services/engine/resolveAndPersistPerformanceState.ts`
- `src/engine/presentation/planViewModel.ts`
- `src/app/screens/PlanScreen.tsx`

## Adjustment Flow

Plan adjustments use command objects and engine-owned decisions.

Current athlete-safe commands:
- `protect_day`
- `mark_unavailable`
- `request_deload`
- `restore_engine_plan`
- `note`

Coach-only/service-controlled commands:
- `coach_note`
- `move_generated_session`

Adjustments affect future resolves by being loaded into `AthleteJourney.trainingPlanAdjustments`, applied by `applyTrainingPlanAdjustments`, and surfaced in Plan history/audit copy. Rejected decisions are persisted with explanations and safety flags.

Primary files:
- `src/engine/training/planAdjustmentTypes.ts`
- `src/engine/training/planAdjustmentEngine.ts`
- `src/services/training/applyTrainingPlanAdjustment.ts`
- `src/hooks/useTrainingPlanAdjustments.ts`

## Actor And Permission Model

Actors:
- `athlete`: default app/UI actor.
- `coach`: allowed only with an active relationship lookup or a trusted test/service flag.
- `engine`: reserved for internal engine-owned restoration/block decisions.

Coach/team relationship scaffold:
- `athlete_coach_relationships` has `pending`, `active`, and `revoked`.
- Athlete clients can request pending rows.
- Participants can read their relationship rows.
- Participants can revoke rows.
- Clients cannot self-activate active coach authority.
- Active status requires a future trusted server-side approval path.

Coach UI remains hidden. `PlanAdjustmentControls` exposes only athlete-safe actions.

Primary files:
- `supabase/migrations/006_coach_team_relationships.sql`
- `src/services/supabase/coachRelationshipRepository.ts`
- `src/services/training/applyTrainingPlanAdjustment.ts`
- `src/app/screens/plan/PlanAdjustmentControls.tsx`

## UI Surfaces

Plan:
- active block summary;
- current week summary;
- latest progression decision;
- next-week preview card;
- block history detail panel;
- timeline and adjustment audit rows;
- athlete-safe adjustment controls.

Train:
- detailed generated sessions;
- progression/analytics;
- exercise history panel with recent results, counts, pain flags, RPE values, strength summary, and load caution.

Profile:
- compact training audit summary remains intentionally small.

Primary files:
- `src/app/screens/PlanScreen.tsx`
- `src/app/screens/plan/TrainingBlockHistoryPanel.tsx`
- `src/app/screens/TrainScreen.tsx`
- `src/app/screens/train/ExerciseHistoryPanel.tsx`
- `src/app/screens/ProfileScreen.tsx`

## Current Verification

Local:
- `cmd /c npm run typecheck`: passed.
- `cmd /c npm test`: passed, `198` tests passed and `1` skipped.
- `cmd /c npm run quality`: passed, `198` tests passed and `1` skipped.
- `cmd /c npm run lint`: passed.

Remote:
- Supabase migration list shows `001` through `006` applied.
- Supabase dry run reports `Remote database is up to date.`
- Live smoke passes with ignored `.env` loaded and `CORNERIQ_LIVE_DB_SMOKE=1`.

Smoke coverage includes weekly summaries, progression decisions, timeline events, next-week preview state through resolve, actor-scoped adjustment payloads, safe coach relationship RLS read, and scoped cleanup of smoke-created rows.

## Still Scaffolded

- Next-week preview is not persisted yet.
- Numeric load progression is intentionally deferred until structured load fields exist.
- Active coach relationship approval needs a trusted server-side path.
- Team memberships are deferred.
- Block history UI is a panel, not routed drill-down navigation.
- Exercise history UI is a panel, not full exercise drill-down navigation.
- Calendar drag/drop polish is intentionally deferred.

## Auditor Inspect First

1. `src/engine/training/nextWeekMaterializationEngine.ts`
2. `src/tests/engine/nextWeekMaterializationEngine.test.ts`
3. `src/engine/presentation/planViewModel.ts`
4. `src/app/screens/PlanScreen.tsx`
5. `src/app/screens/plan/TrainingBlockHistoryPanel.tsx`
6. `src/engine/presentation/exerciseHistoryViewModel.ts`
7. `src/app/screens/train/ExerciseHistoryPanel.tsx`
8. `supabase/migrations/006_coach_team_relationships.sql`
9. `src/services/supabase/coachRelationshipRepository.ts`
10. `src/services/training/applyTrainingPlanAdjustment.ts`
11. `src/tests/live/liveDbSmoke.test.ts`
